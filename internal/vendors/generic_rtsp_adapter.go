package vendors

import (
	"context"
	"fmt"
	"strings"
	"time"

	"videocms/internal/camera"
	"videocms/internal/network"
)

// GenericRTSPAdapter handles standard generic RTSP IP cameras.
type GenericRTSPAdapter struct {
	validator *network.NetworkValidator
}

// NewGenericRTSPAdapter creates a generic RTSP adapter.
func NewGenericRTSPAdapter(validator *network.NetworkValidator) *GenericRTSPAdapter {
	return &GenericRTSPAdapter{validator: validator}
}

func (a *GenericRTSPAdapter) Name() string {
	return "generic_rtsp"
}

func (a *GenericRTSPAdapter) Detect(ctx context.Context, device DeviceInfo) bool {
	rtspPort := device.RTSPPort
	if rtspPort <= 0 {
		rtspPort = 554
	}

	dialer := a.validator.SafeDialer(1500 * time.Millisecond)
	conn, err := dialer(ctx, "tcp", fmt.Sprintf("%s:%d", device.Host, rtspPort))
	if err != nil {
		return false
	}
	defer conn.Close()
	return true
}

func (a *GenericRTSPAdapter) DiscoverCapabilities(ctx context.Context, device DeviceInfo, credentials Credentials) (camera.CameraCapabilities, error) {
	rtspPort := device.RTSPPort
	if rtspPort <= 0 {
		rtspPort = 554
	}

	mainRTSP := fmt.Sprintf("rtsp://%s:%d/live/ch0", device.Host, rtspPort)
	subRTSP := fmt.Sprintf("rtsp://%s:%d/live/ch1", device.Host, rtspPort)

	caps := camera.CameraCapabilities{
		ONVIF:      false,
		RTSP:       true,
		Snapshot:   false,
		MainStream: true,
		SubStream:  true,
		Profiles: []camera.StreamProfile{
			{
				Name:        "Main Stream (RTSP)",
				Token:       "main",
				Encoder:     "H.264",
				RTSPURI:     mainRTSP,
				IsSubstream: false,
			},
			{
				Name:        "Sub Stream (RTSP)",
				Token:       "sub",
				Encoder:     "H.264",
				RTSPURI:     subRTSP,
				IsSubstream: true,
			},
		},
	}

	return caps, nil
}

func (a *GenericRTSPAdapter) DiscoverStreams(ctx context.Context, device DeviceInfo, credentials Credentials) ([]camera.StreamProfile, error) {
	caps, err := a.DiscoverCapabilities(ctx, device, credentials)
	if err != nil {
		return nil, err
	}
	return caps.Profiles, nil
}

func (a *GenericRTSPAdapter) TestConnection(ctx context.Context, cam *camera.Camera, password string) error {
	rtspPort := cam.RTSPPort
	if rtspPort <= 0 {
		rtspPort = 554
	}

	dialer := a.validator.SafeDialer(2 * time.Second)
	conn, err := dialer(ctx, "tcp", fmt.Sprintf("%s:%d", cam.Host, rtspPort))
	if err != nil {
		return fmt.Errorf("failed to reach RTSP port %d: %w", rtspPort, err)
	}
	defer conn.Close()

	// Send RTSP OPTIONS request
	_ = conn.SetDeadline(time.Now().Add(2 * time.Second))
	req := fmt.Sprintf("OPTIONS rtsp://%s:%d/ RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: VideoCMS/1.0\r\n\r\n", cam.Host, rtspPort)
	if _, err := conn.Write([]byte(req)); err != nil {
		return fmt.Errorf("failed to send RTSP OPTIONS: %w", err)
	}

	buf := make([]byte, 1024)
	n, err := conn.Read(buf)
	if err != nil || n == 0 {
		return fmt.Errorf("no response from RTSP server: %w", err)
	}

	resp := string(buf[:n])
	if !strings.HasPrefix(resp, "RTSP/1.0") {
		return fmt.Errorf("invalid RTSP banner: %q", resp)
	}

	return nil
}
