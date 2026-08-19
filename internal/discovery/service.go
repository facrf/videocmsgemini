package discovery

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"

	"videocms/internal/camera"
	"videocms/internal/database"
	"videocms/internal/events"
	"videocms/internal/network"
	"videocms/internal/onvif"

	"github.com/google/uuid"
)

var (
	ErrJobNotFound    = errors.New("discovery job not found")
	ErrDeviceNotFound = errors.New("discovered device not found")
)

// Service coordinates network discovery tasks and device onboarding.
type Service struct {
	db        *database.DB
	scanner   *Scanner
	validator *network.NetworkValidator
	broker    *events.Broker
	camRepo   *camera.Repository

	mu        sync.Mutex
	cancelMap map[string]context.CancelFunc
}

// NewService creates a discovery Service.
func NewService(db *database.DB, scanner *Scanner, validator *network.NetworkValidator, broker *events.Broker, camRepo *camera.Repository) *Service {
	return &Service{
		db:        db,
		scanner:   scanner,
		validator: validator,
		broker:    broker,
		camRepo:   camRepo,
		cancelMap: make(map[string]context.CancelFunc),
	}
}

// StartJob creates and launches a discovery job in the background.
func (s *Service) StartJob(ctx context.Context, ifaceName, cidr string) (*DiscoveryJob, error) {
	if cidr == "" && ifaceName == "" {
		subnets, err := s.GetLocalSubnets()
		if err == nil && len(subnets) > 0 {
			cidr = subnets[0]
		} else {
			cidr = "192.168.1.0/24"
		}
	}

	job := &DiscoveryJob{
		ID:            uuid.New().String(),
		InterfaceName: ifaceName,
		CIDR:          cidr,
		Status:        StatusRunning,
		Progress:      0,
		CreatedAt:     time.Now().UTC(),
	}

	query := `INSERT INTO discovery_jobs (id, interface_name, cidr, status, progress, total_hosts, scanned_hosts, found_devices, created_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.ExecContext(ctx, query, job.ID, job.InterfaceName, job.CIDR, string(job.Status), job.Progress, job.TotalHosts, job.ScannedHosts, job.FoundDevices, job.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create discovery job in db: %w", err)
	}

	scanCtx, cancel := context.WithCancel(context.Background())
	s.mu.Lock()
	s.cancelMap[job.ID] = cancel
	s.mu.Unlock()

	s.broker.Publish("discovery.started", map[string]interface{}{
		"job_id": job.ID,
		"cidr":   job.CIDR,
	})

	// Background worker execution
	go s.runJob(scanCtx, job)

	return job, nil
}

func (s *Service) runJob(ctx context.Context, job *DiscoveryJob) {
	defer func() {
		s.mu.Lock()
		delete(s.cancelMap, job.ID)
		s.mu.Unlock()
	}()

	now := time.Now().UTC()
	results, err := s.scanner.ScanCIDR(ctx, job.CIDR, func(scanned, found, total int, newDev *DiscoveryResult) {
		progress := 0
		if total > 0 {
			progress = (scanned * 100) / total
		}
		if newDev != nil {
			newDev.ID = uuid.New().String()
			newDev.JobID = job.ID
			if newDev.ProbeDetails == nil {
				newDev.ProbeDetails = make(map[string]interface{})
			}

			// Check for hardware identity match with existing cameras in catalog (Section 71 & 72)
			if s.camRepo != nil {
				existingCam, err := s.camRepo.FindByHardware(ctx, newDev.MACAddress, "", newDev.ONVIFURL, newDev.IP)
				if err == nil && existingCam != nil {
					newDev.ProbeDetails["matched_camera_id"] = existingCam.ID
					newDev.ProbeDetails["matched_camera_name"] = existingCam.Name
					if existingCam.Host != newDev.IP {
						newDev.ProbeDetails["ip_changed"] = true
						newDev.ProbeDetails["old_ip"] = existingCam.Host
						newDev.ProbeDetails["notice"] = fmt.Sprintf("IP alterado de %s para %s (DHCP detectado)", existingCam.Host, newDev.IP)
					}
				}
			}

			s.saveResult(context.Background(), newDev)

			s.broker.Publish("discovery.device_found", map[string]interface{}{
				"job_id": job.ID,
				"device": newDev,
			})
		}

		s.broker.Publish("discovery.progress", map[string]interface{}{
			"job_id":        job.ID,
			"progress":      progress,
			"scanned_hosts": scanned,
			"total_hosts":   total,
			"found_devices": found,
		})

		_, _ = s.db.ExecContext(context.Background(),
			"UPDATE discovery_jobs SET progress = ?, scanned_hosts = ?, total_hosts = ?, found_devices = ? WHERE id = ?",
			progress, scanned, total, found, job.ID)
	})

	finalStatus := StatusCompleted
	var errMsg string
	if errors.Is(ctx.Err(), context.Canceled) {
		finalStatus = StatusCancelled
	} else if err != nil {
		finalStatus = StatusFailed
		errMsg = err.Error()
	}

	_, _ = s.db.ExecContext(context.Background(),
		"UPDATE discovery_jobs SET status = ?, progress = 100, found_devices = ?, error_message = ?, completed_at = ? WHERE id = ?",
		string(finalStatus), len(results), errMsg, now, job.ID)

	s.broker.Publish("discovery.completed", map[string]interface{}{
		"job_id":        job.ID,
		"status":        string(finalStatus),
		"found_devices": len(results),
	})
}

func (s *Service) saveResult(ctx context.Context, res *DiscoveryResult) {
	query := `INSERT INTO discovery_results (
		id, job_id, ip, port, mac_address, manufacturer, model, onvif_url, discovered_via, probe_status, probe_details_json, created_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, _ = s.db.ExecContext(ctx, query,
		res.ID, res.JobID, res.IP, res.Port, res.MACAddress, res.Manufacturer, res.Model, res.ONVIFURL,
		res.DiscoveredVia, res.ProbeStatus, res.MarshalProbeDetails(), res.CreatedAt,
	)
}

// GetJob retrieves a job and its associated discovered devices.
func (s *Service) GetJob(ctx context.Context, id string) (*DiscoveryJob, error) {
	query := `SELECT id, interface_name, cidr, status, progress, total_hosts, scanned_hosts, found_devices, error_message, created_at, completed_at
	FROM discovery_jobs WHERE id = ?`

	var job DiscoveryJob
	var statusStr string
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&job.ID, &job.InterfaceName, &job.CIDR, &statusStr, &job.Progress, &job.TotalHosts, &job.ScannedHosts, &job.FoundDevices, &job.ErrorMessage, &job.CreatedAt, &job.CompletedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrJobNotFound
	}
	if err != nil {
		return nil, err
	}
	job.Status = JobStatus(statusStr)
	job.Results = make([]DiscoveryResult, 0)

	// Fetch results
	resRows, err := s.db.QueryContext(ctx, `
		SELECT id, job_id, ip, port, mac_address, manufacturer, model, onvif_url, discovered_via, probe_status, probe_details_json, created_at
		FROM discovery_results WHERE job_id = ? ORDER BY created_at ASC`, id)
	if err == nil {
		defer resRows.Close()
		for resRows.Next() {
			var r DiscoveryResult
			var detailsJSON string
			if err := resRows.Scan(&r.ID, &r.JobID, &r.IP, &r.Port, &r.MACAddress, &r.Manufacturer, &r.Model, &r.ONVIFURL, &r.DiscoveredVia, &r.ProbeStatus, &detailsJSON, &r.CreatedAt); err == nil {
				r.ProbeDetails = UnmarshalProbeDetails(detailsJSON)
				job.Results = append(job.Results, r)
			}
		}
	}

	return &job, nil
}

// ListJobs retrieves recent discovery jobs.
func (s *Service) ListJobs(ctx context.Context) ([]*DiscoveryJob, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, interface_name, cidr, status, progress, total_hosts, scanned_hosts, found_devices, error_message, created_at, completed_at
		FROM discovery_jobs ORDER BY created_at DESC LIMIT 20`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	jobs := make([]*DiscoveryJob, 0)
	for rows.Next() {
		var j DiscoveryJob
		var statusStr string
		if err := rows.Scan(&j.ID, &j.InterfaceName, &j.CIDR, &statusStr, &j.Progress, &j.TotalHosts, &j.ScannedHosts, &j.FoundDevices, &j.ErrorMessage, &j.CreatedAt, &j.CompletedAt); err == nil {
			j.Status = JobStatus(statusStr)
			j.Results = make([]DiscoveryResult, 0)
			jobs = append(jobs, &j)
		}
	}
	return jobs, nil
}

// CancelJob cancels an actively running discovery scan.
func (s *Service) CancelJob(ctx context.Context, id string) error {
	s.mu.Lock()
	cancel, exists := s.cancelMap[id]
	s.mu.Unlock()

	if exists && cancel != nil {
		cancel()
		return nil
	}

	// Update DB directly if not in memory
	_, err := s.db.ExecContext(ctx, "UPDATE discovery_jobs SET status = ? WHERE id = ? AND status = ?", string(StatusCancelled), id, string(StatusRunning))
	return err
}

// ProbeDevice sends credentials to a discovered device to query its ONVIF metadata and capabilities.
func (s *Service) ProbeDevice(ctx context.Context, jobID, deviceID string, username, password string) (*DiscoveryResult, error) {
	var res DiscoveryResult
	var detailsJSON string
	err := s.db.QueryRowContext(ctx, `
		SELECT id, job_id, ip, port, mac_address, manufacturer, model, onvif_url, discovered_via, probe_status, probe_details_json, created_at
		FROM discovery_results WHERE id = ? AND job_id = ?`, deviceID, jobID).Scan(
		&res.ID, &res.JobID, &res.IP, &res.Port, &res.MACAddress, &res.Manufacturer, &res.Model, &res.ONVIFURL, &res.DiscoveredVia, &res.ProbeStatus, &detailsJSON, &res.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrDeviceNotFound
	}
	if err != nil {
		return nil, err
	}
	res.ProbeDetails = UnmarshalProbeDetails(detailsJSON)

	onvifURL := res.ONVIFURL
	if onvifURL == "" {
		onvifURL = fmt.Sprintf("http://%s:%d/onvif/device_service", res.IP, res.Port)
	}

	httpClient := s.validator.NewSafeHTTPClient(3 * time.Second)
	client := onvif.NewClient(onvifURL, username, password, httpClient)

	info, err := client.GetDeviceInformation(ctx)
	if err != nil {
		res.ProbeStatus = "auth_required"
		res.ProbeDetails["error"] = err.Error()
	} else {
		res.ProbeStatus = "probed"
		res.Manufacturer = info.Manufacturer
		res.Model = info.Model
		res.ProbeDetails["firmware"] = info.FirmwareVersion
		res.ProbeDetails["serial"] = info.SerialNumber

		// Check hardware match
		if s.camRepo != nil {
			existingCam, err := s.camRepo.FindByHardware(ctx, res.MACAddress, info.SerialNumber, res.ONVIFURL, res.IP)
			if err == nil && existingCam != nil {
				res.ProbeDetails["matched_camera_id"] = existingCam.ID
				res.ProbeDetails["matched_camera_name"] = existingCam.Name
				if existingCam.Host != res.IP {
					res.ProbeDetails["ip_changed"] = true
					res.ProbeDetails["old_ip"] = existingCam.Host
					res.ProbeDetails["notice"] = fmt.Sprintf("IP alterado de %s para %s (DHCP detectado)", existingCam.Host, res.IP)
				}
			}
		}

		// Try to query profiles
		caps, err := client.GetCapabilities(ctx)
		if err == nil {
			profs, err := client.GetProfiles(ctx, caps.MediaXAddr)
			if err == nil {
				res.ProbeDetails["profiles_count"] = len(profs)
			}
		}
	}

	_, _ = s.db.ExecContext(ctx, `UPDATE discovery_results SET manufacturer = ?, model = ?, probe_status = ?, probe_details_json = ? WHERE id = ?`,
		res.Manufacturer, res.Model, res.ProbeStatus, res.MarshalProbeDetails(), res.ID)

	return &res, nil
}

// AddDeviceToCameras imports a discovered device into the Camera repository or updates existing camera IP if matched.
func (s *Service) AddDeviceToCameras(ctx context.Context, jobID, deviceID, name, username, password string) (*camera.Camera, error) {
	var res DiscoveryResult
	var detailsJSON string
	err := s.db.QueryRowContext(ctx, "SELECT id, ip, port, mac_address, manufacturer, model, onvif_url, probe_details_json FROM discovery_results WHERE id = ? AND job_id = ?", deviceID, jobID).
		Scan(&res.ID, &res.IP, &res.Port, &res.MACAddress, &res.Manufacturer, &res.Model, &res.ONVIFURL, &detailsJSON)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrDeviceNotFound
	}
	if err != nil {
		return nil, err
	}
	res.ProbeDetails = UnmarshalProbeDetails(detailsJSON)

	// Check if already matches an existing camera (avoid duplicate, perform DHCP IP update)
	if matchedID, ok := res.ProbeDetails["matched_camera_id"].(string); ok && matchedID != "" {
		existingCam, err := s.camRepo.GetByID(ctx, matchedID)
		if err == nil && existingCam != nil {
			existingCam.Host = res.IP
			existingCam.Port = res.Port
			if username != "" {
				existingCam.Username = username
			}
			if password != "" {
				existingCam.Password = password
			}
			if err := s.camRepo.Update(ctx, existingCam); err == nil {
				s.broker.Publish("camera.updated", map[string]interface{}{
					"id":   existingCam.ID,
					"name": existingCam.Name,
					"host": existingCam.Host,
				})
				return existingCam, nil
			}
		}
	}

	if name == "" {
		name = fmt.Sprintf("%s %s (%s)", res.Manufacturer, res.Model, res.IP)
	}

	cam := &camera.Camera{
		Name:         name,
		Host:         res.IP,
		Port:         res.Port,
		RTSPPort:     554,
		Manufacturer: res.Manufacturer,
		Model:        res.Model,
		MACAddress:   res.MACAddress,
		ONVIFURL:     res.ONVIFURL,
		Username:     username,
		Password:     password,
		Enabled:      true,
		Status:       camera.StatusUnknown,
	}

	if err := s.camRepo.Create(ctx, cam); err != nil {
		return nil, fmt.Errorf("failed to save camera: %w", err)
	}

	s.broker.Publish("camera.created", map[string]interface{}{
		"id":   cam.ID,
		"name": cam.Name,
		"host": cam.Host,
	})

	return cam, nil
}

// GetLocalInterfaces lists available local network interfaces and their IPv4 subnets.
func (s *Service) GetLocalInterfaces() ([]NetworkInterfaceInfo, error) {
	ifaces, err := net.Interfaces()
	if err != nil {
		return make([]NetworkInterfaceInfo, 0), err
	}

	result := make([]NetworkInterfaceInfo, 0)
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		ips := make([]string, 0)
		subnets := make([]string, 0)
		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if ok && ipNet.IP.To4() != nil {
				ips = append(ips, ipNet.IP.String())
				subnets = append(subnets, ipNet.String())
			}
		}

		if len(ips) > 0 {
			result = append(result, NetworkInterfaceInfo{
				Name:         iface.Name,
				HardwareAddr: iface.HardwareAddr.String(),
				IPs:          ips,
				Subnets:      subnets,
			})
		}
	}

	return result, nil
}

// GetLocalSubnets extracts all active IPv4 CIDR subnets on the machine.
func (s *Service) GetLocalSubnets() ([]string, error) {
	ifaces, err := s.GetLocalInterfaces()
	if err != nil {
		return make([]string, 0), err
	}
	subnets := make([]string, 0)
	for _, iface := range ifaces {
		for _, sub := range iface.Subnets {
			if !strings.HasPrefix(sub, "127.") {
				subnets = append(subnets, sub)
			}
		}
	}
	return subnets, nil
}
