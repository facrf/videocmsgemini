package vendors

import (
	"context"
	"videocms/internal/camera"
	"videocms/internal/network"
)

// Registry manages and provides camera adapters in priority order.
type Registry struct {
	adapters []camera.CameraAdapter
}

// NewRegistry initializes the camera adapter registry with all supported adapters.
func NewRegistry(validator *network.NetworkValidator) *Registry {
	return &Registry{
		adapters: []camera.CameraAdapter{
			NewONVIFAdapter(validator),
			NewDahuaAdapter(validator),
			NewIntelbrasAdapter(validator),
			NewGenericRTSPAdapter(validator),
		},
	}
}

// FindAdapter finds the first adapter that detects the given device.
func (r *Registry) FindAdapter(ctx context.Context, device camera.DeviceInfo) camera.CameraAdapter {
	for _, adapter := range r.adapters {
		if adapter.Detect(ctx, device) {
			return adapter
		}
	}
	// Fallback to generic RTSP if nothing matched
	return r.GetAdapter("generic_rtsp")
}

// GetAdapter retrieves an adapter by its unique name.
func (r *Registry) GetAdapter(name string) camera.CameraAdapter {
	for _, adapter := range r.adapters {
		if adapter.Name() == name {
			return adapter
		}
	}
	return nil
}
