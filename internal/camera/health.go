package camera

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"videocms/internal/events"
)

// HealthChecker periodically monitors online/offline status of all enabled cameras.
type HealthChecker struct {
	service  *Service
	broker   *events.Broker
	interval time.Duration
	stopCh   chan struct{}
}

// NewHealthChecker creates a HealthChecker.
func NewHealthChecker(service *Service, broker *events.Broker, interval time.Duration) *HealthChecker {
	if interval <= 0 {
		interval = 30 * time.Second
	}
	return &HealthChecker{
		service:  service,
		broker:   broker,
		interval: interval,
		stopCh:   make(chan struct{}),
	}
}

// Start begins the background health check loop.
func (h *HealthChecker) Start(ctx context.Context) {
	ticker := time.NewTicker(h.interval)
	defer ticker.Stop()

	// Initial check on start
	h.checkAll(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-h.stopCh:
			return
		case <-ticker.C:
			h.checkAll(ctx)
		}
	}
}

// Stop terminates the health check loop.
func (h *HealthChecker) Stop() {
	close(h.stopCh)
}

func (h *HealthChecker) checkAll(ctx context.Context) {
	cameras, err := h.service.ListCameras(ctx)
	if err != nil {
		slog.Error("Health checker failed to list cameras", "error", err)
		return
	}

	// Bounded worker pool (max 8 concurrent checks)
	const maxWorkers = 8
	jobs := make(chan *Camera, len(cameras))
	for _, c := range cameras {
		if c.Enabled {
			jobs <- c
		}
	}
	close(jobs)

	var wg sync.WaitGroup
	numWorkers := maxWorkers
	if len(cameras) < numWorkers {
		numWorkers = len(cameras)
	}
	if numWorkers == 0 {
		return
	}

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for cam := range jobs {
				h.checkCamera(ctx, cam)
			}
		}()
	}

	wg.Wait()
}

func (h *HealthChecker) checkCamera(ctx context.Context, cam *Camera) {
	checkCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	pass, _ := h.service.repo.GetDecryptedPassword(checkCtx, cam.ID)
	dev := DeviceInfo{
		Host:         cam.Host,
		Port:         cam.Port,
		RTSPPort:     cam.RTSPPort,
		Manufacturer: cam.Manufacturer,
		Model:        cam.Model,
		ONVIFURL:     cam.ONVIFURL,
	}

	var adapter CameraAdapter
	if h.service.registry != nil {
		adapter = h.service.registry.FindAdapter(checkCtx, dev)
	}

	var newStatus CameraStatus
	var message string
	now := time.Now().UTC()

	if adapter == nil {
		newStatus = StatusUnsupported
		message = "No matching adapter found"
	} else {
		err := adapter.TestConnection(checkCtx, cam, pass)
		if err == nil {
			newStatus = StatusOnline
			message = "OK"
		} else if isAuthError(err) {
			newStatus = StatusAuthRequired
			message = "Authentication required or invalid password"
		} else {
			newStatus = StatusOffline
			message = err.Error()
		}
	}

	prevStatus := cam.Status
	var lastSeen *time.Time
	if newStatus == StatusOnline {
		lastSeen = &now
	} else {
		lastSeen = cam.LastSeenAt
	}

	_ = h.service.repo.UpdateStatus(ctx, cam.ID, newStatus, message, lastSeen)

	if prevStatus != newStatus {
		h.broker.Publish(fmt.Sprintf("camera.%s", newStatus), map[string]interface{}{
			"camera_id":       cam.ID,
			"camera_name":     cam.Name,
			"previous_status": string(prevStatus),
			"new_status":      string(newStatus),
			"message":         message,
		})
	}
}
