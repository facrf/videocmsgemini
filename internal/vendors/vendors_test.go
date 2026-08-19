package vendors

import (
	"context"
	"testing"
	"time"

	"videocms/internal/camera"
	"videocms/internal/network"
	"videocms/internal/testutil/fakecamera"
)

func TestAdaptersWithFakeCamera(t *testing.T) {
	fake, err := fakecamera.NewFakeCamera("Intelbras", "VIP 3230 B", false)
	if err != nil {
		t.Fatalf("failed to start fake camera: %v", err)
	}
	defer fake.Close()

	validator, err := network.NewNetworkValidator([]string{"127.0.0.1/32"})
	if err != nil {
		t.Fatalf("failed to create validator: %v", err)
	}

	registry := NewRegistry(validator)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	dev := DeviceInfo{
		Host:         fake.Host,
		Port:         fake.HTTPPort,
		RTSPPort:     fake.RTSPPort,
		Manufacturer: "Intelbras",
		Model:        "VIP 3230 B",
		ONVIFURL:     fake.HTTPServer.URL + "/onvif/device_service",
	}

	adapter := registry.FindAdapter(ctx, dev)
	if adapter == nil {
		t.Fatalf("expected to find an adapter for fake camera")
	}

	caps, err := adapter.DiscoverCapabilities(ctx, dev, Credentials{Username: "admin", Password: "secret123"})
	if err != nil {
		t.Fatalf("DiscoverCapabilities failed: %v", err)
	}
	if !caps.RTSP {
		t.Errorf("expected RTSP capability to be true")
	}

	testCam := &camera.Camera{
		Host:     fake.Host,
		Port:     fake.HTTPPort,
		RTSPPort: fake.RTSPPort,
		ONVIFURL: fake.HTTPServer.URL + "/onvif/device_service",
		Username: "admin",
	}
	if err := adapter.TestConnection(ctx, testCam, "secret123"); err != nil {
		t.Fatalf("TestConnection failed: %v", err)
	}
}
