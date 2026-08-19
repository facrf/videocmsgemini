package camera

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"videocms/internal/events"
	"videocms/internal/network"
	"videocms/internal/onvif"
)

// Service provides high-level business operations for camera management.
type Service struct {
	repo        *Repository
	validator   *network.NetworkValidator
	registry    AdapterRegistry
	diagnostics *DiagnosticsRunner
	broker      *events.Broker
}

// NewService creates a new camera service.
func NewService(repo *Repository, validator *network.NetworkValidator, registry AdapterRegistry, broker *events.Broker) *Service {
	return &Service{
		repo:        repo,
		validator:   validator,
		registry:    registry,
		diagnostics: NewDiagnosticsRunner(validator),
		broker:      broker,
	}
}

// CreateCamera registers a new camera with validation and initial capability probe.
func (s *Service) CreateCamera(ctx context.Context, cam *Camera) error {
	if cam.Name == "" {
		return errors.New("camera name is required")
	}
	if cam.Host == "" {
		return errors.New("camera host is required")
	}

	// Validate SSRF
	if _, err := s.validator.ValidateHost(ctx, cam.Host); err != nil {
		return fmt.Errorf("host validation failed: %w", err)
	}

	// If capabilities are empty, try auto-discovery
	if !cam.Capabilities.RTSP && !cam.Capabilities.ONVIF && s.registry != nil {
		dev := DeviceInfo{
			Host:         cam.Host,
			Port:         cam.Port,
			RTSPPort:     cam.RTSPPort,
			Manufacturer: cam.Manufacturer,
			Model:        cam.Model,
			ONVIFURL:     cam.ONVIFURL,
		}
		adapter := s.registry.FindAdapter(ctx, dev)
		if adapter != nil {
			caps, err := adapter.DiscoverCapabilities(ctx, dev, Credentials{
				Username: cam.Username,
				Password: cam.Password,
			})
			if err == nil {
				cam.Capabilities = caps
				if len(caps.Profiles) > 0 && cam.RTSPPath == "" {
					cam.RTSPPath = caps.Profiles[0].RTSPURI
					if len(caps.Profiles) > 1 && cam.SubstreamPath == "" {
						cam.SubstreamPath = caps.Profiles[1].RTSPURI
					}
				}
			}
		}
	}

	if err := s.repo.Create(ctx, cam); err != nil {
		return err
	}

	s.broker.Publish("camera.created", map[string]interface{}{
		"id":   cam.ID,
		"name": cam.Name,
		"host": cam.Host,
	})

	return nil
}

// GetCamera retrieves a camera by ID.
func (s *Service) GetCamera(ctx context.Context, id string) (*Camera, error) {
	return s.repo.GetByID(ctx, id)
}

// ListCameras returns all registered cameras.
func (s *Service) ListCameras(ctx context.Context) ([]*Camera, error) {
	return s.repo.List(ctx)
}

// ListCamerasFiltered returns cameras matching optional query filters with pagination.
func (s *Service) ListCamerasFiltered(ctx context.Context, search, status, group, tag string, limit, offset int) ([]*Camera, int, error) {
	return s.repo.ListFiltered(ctx, search, status, group, tag, limit, offset)
}

// UpdateCamera updates camera settings and publishes an event.
func (s *Service) UpdateCamera(ctx context.Context, cam *Camera) error {
	if cam.Host != "" {
		if _, err := s.validator.ValidateHost(ctx, cam.Host); err != nil {
			return fmt.Errorf("host validation failed: %w", err)
		}
	}

	if err := s.repo.Update(ctx, cam); err != nil {
		return err
	}

	s.broker.Publish("camera.updated", map[string]interface{}{
		"id":   cam.ID,
		"name": cam.Name,
	})

	return nil
}

// UpdateCameraIP updates the IP and port of an existing camera (DHCP migration).
func (s *Service) UpdateCameraIP(ctx context.Context, id, newHost string, newPort int) error {
	if _, err := s.validator.ValidateHost(ctx, newHost); err != nil {
		return fmt.Errorf("host validation failed: %w", err)
	}

	if err := s.repo.UpdateHost(ctx, id, newHost, newPort); err != nil {
		return err
	}

	s.broker.Publish("camera.updated", map[string]interface{}{
		"id":       id,
		"new_host": newHost,
		"new_port": newPort,
	})

	return nil
}

// DeleteCamera deletes a camera and broadcasts the removal event.
func (s *Service) DeleteCamera(ctx context.Context, id string) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}

	s.broker.Publish("camera.deleted", map[string]interface{}{
		"id": id,
	})

	return nil
}

// TestCamera tests camera connectivity and authentication using its adapter.
func (s *Service) TestCamera(ctx context.Context, id, optionalPassword string) error {
	cam, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	pass := optionalPassword
	if pass == "" {
		pass, _ = s.repo.GetDecryptedPassword(ctx, id)
	}

	dev := DeviceInfo{
		Host:         cam.Host,
		Port:         cam.Port,
		RTSPPort:     cam.RTSPPort,
		Manufacturer: cam.Manufacturer,
		Model:        cam.Model,
		ONVIFURL:     cam.ONVIFURL,
	}

	if s.registry == nil {
		return errors.New("no adapter registry configured")
	}

	adapter := s.registry.FindAdapter(ctx, dev)
	if adapter == nil {
		return errors.New("no compatible adapter found for device")
	}

	return adapter.TestConnection(ctx, cam, pass)
}

// GetCapabilities probes live capabilities of a camera.
func (s *Service) GetCapabilities(ctx context.Context, id string) (CameraCapabilities, error) {
	cam, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return CameraCapabilities{}, err
	}

	pass, _ := s.repo.GetDecryptedPassword(ctx, id)
	dev := DeviceInfo{
		Host:         cam.Host,
		Port:         cam.Port,
		RTSPPort:     cam.RTSPPort,
		Manufacturer: cam.Manufacturer,
		Model:        cam.Model,
		ONVIFURL:     cam.ONVIFURL,
	}

	if s.registry == nil {
		return CameraCapabilities{}, errors.New("no adapter registry configured")
	}

	adapter := s.registry.FindAdapter(ctx, dev)
	if adapter == nil {
		return CameraCapabilities{}, errors.New("no adapter found")
	}

	caps, err := adapter.DiscoverCapabilities(ctx, dev, Credentials{
		Username: cam.Username,
		Password: pass,
	})
	if err != nil {
		return CameraCapabilities{}, err
	}

	// Update cached capabilities in repository
	cam.Capabilities = caps
	_ = s.repo.Update(ctx, cam)

	return caps, nil
}

// RunDiagnostics executes the full 10-step diagnostic report for a camera.
func (s *Service) RunDiagnostics(ctx context.Context, id string) (*DiagnosticReport, error) {
	cam, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	pass, _ := s.repo.GetDecryptedPassword(ctx, id)
	report := s.diagnostics.Run(ctx, cam, pass)

	// If report succeeded and found profiles, update camera capabilities in DB
	if report.Passed && len(report.Capabilities.Profiles) > 0 {
		cam.Capabilities = report.Capabilities
		_ = s.repo.Update(ctx, cam)
	}

	return report, nil
}

// GetSnapshot fetches a live snapshot image from the camera.
func (s *Service) GetSnapshot(ctx context.Context, id string) ([]byte, string, error) {
	cam, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, "", err
	}

	pass, _ := s.repo.GetDecryptedPassword(ctx, id)

	// 1. Try ONVIF Snapshot if ONVIF is configured
	if cam.Capabilities.ONVIF || cam.ONVIFURL != "" {
		port := cam.Port
		if port <= 0 {
			port = 80
		}
		onvifURL := cam.ONVIFURL
		if onvifURL == "" {
			onvifURL = fmt.Sprintf("http://%s:%d/onvif/device_service", cam.Host, port)
		}
		client := s.validator.NewSafeHTTPClient(3 * time.Second)
		onvifClient := onvif.NewClient(onvifURL, cam.Username, pass, client)

		caps, err := onvifClient.GetCapabilities(ctx)
		if err == nil && caps.MediaXAddr != "" {
			profs, err := onvifClient.GetProfiles(ctx, caps.MediaXAddr)
			if err == nil && len(profs) > 0 {
				snapURI, err := onvifClient.GetSnapshotURI(ctx, caps.MediaXAddr, profs[0].Token)
				if err == nil && snapURI != "" {
					data, ctype, err := onvifClient.FetchSnapshot(ctx, snapURI)
					if err == nil && len(data) > 0 {
						return data, ctype, nil
					}
				}
			}
		}
	}

	// 2. Fallback to HTTP Snapshot path
	port := cam.Port
	if port <= 0 {
		port = 80
	}
	snapPath := cam.SnapshotPath
	if snapPath == "" {
		if strings.Contains(strings.ToLower(cam.Manufacturer), "dahua") || strings.Contains(strings.ToLower(cam.Manufacturer), "intelbras") {
			snapPath = "/cgi-bin/snapshot.cgi?channel=1"
		} else {
			snapPath = "/onvif/snapshot"
		}
	}

	snapURL := fmt.Sprintf("http://%s:%d%s", cam.Host, port, snapPath)
	client := s.validator.NewSafeHTTPClient(3 * time.Second)
	req, err := http.NewRequestWithContext(ctx, "GET", snapURL, nil)
	if err != nil {
		return nil, "", err
	}
	if cam.Username != "" && pass != "" {
		req.SetBasicAuth(cam.Username, pass)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("snapshot request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("snapshot returned HTTP %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", err
	}

	ctype := resp.Header.Get("Content-Type")
	if ctype == "" {
		ctype = "image/jpeg"
	}

	return data, ctype, nil
}
