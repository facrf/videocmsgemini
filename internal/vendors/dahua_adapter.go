package vendors

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"videocms/internal/camera"
	"videocms/internal/network"
)

// DahuaAdapter handles native Dahua cameras and DVRs.
type DahuaAdapter struct {
	validator *network.NetworkValidator
}

// NewDahuaAdapter creates a Dahua adapter.
func NewDahuaAdapter(validator *network.NetworkValidator) *DahuaAdapter {
	return &DahuaAdapter{validator: validator}
}

func (a *DahuaAdapter) Name() string {
	return "dahua"
}

func (a *DahuaAdapter) Detect(ctx context.Context, device DeviceInfo) bool {
	if strings.Contains(strings.ToLower(device.Manufacturer), "dahua") ||
		strings.HasPrefix(strings.ToUpper(device.Model), "DH-") ||
		strings.HasPrefix(strings.ToUpper(device.Model), "IPC-") {
		return true
	}

	port := device.Port
	if port <= 0 {
		port = 80
	}

	client := a.validator.NewSafeHTTPClient(1500 * time.Millisecond)
	url := fmt.Sprintf("http://%s:%d/cgi-bin/magicBox.cgi?action=getSystemInfo", device.Host, port)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return false
	}

	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusUnauthorized {
		return true
	}

	return false
}

func (a *DahuaAdapter) DiscoverCapabilities(ctx context.Context, device DeviceInfo, credentials Credentials) (camera.CameraCapabilities, error) {
	rtspPort := device.RTSPPort
	if rtspPort <= 0 {
		rtspPort = 554
	}

	mainRTSP := fmt.Sprintf("rtsp://%s:%d/cam/realmonitor?channel=1&subtype=0", device.Host, rtspPort)
	subRTSP := fmt.Sprintf("rtsp://%s:%d/cam/realmonitor?channel=1&subtype=1", device.Host, rtspPort)

	caps := camera.CameraCapabilities{
		ONVIF:      true,
		RTSP:       true,
		Snapshot:   true,
		MainStream: true,
		SubStream:  true,
		Profiles: []camera.StreamProfile{
			{
				Name:        "Main Stream (Dahua)",
				Token:       "main",
				Encoder:     "H.264",
				RTSPURI:     mainRTSP,
				IsSubstream: false,
			},
			{
				Name:        "Sub Stream (Dahua)",
				Token:       "sub",
				Encoder:     "H.264",
				RTSPURI:     subRTSP,
				IsSubstream: true,
			},
		},
	}

	return caps, nil
}

func (a *DahuaAdapter) DiscoverStreams(ctx context.Context, device DeviceInfo, credentials Credentials) ([]camera.StreamProfile, error) {
	caps, err := a.DiscoverCapabilities(ctx, device, credentials)
	if err != nil {
		return nil, err
	}
	return caps.Profiles, nil
}

func (a *DahuaAdapter) TestConnection(ctx context.Context, cam *camera.Camera, password string) error {
	port := cam.Port
	if port <= 0 {
		port = 80
	}

	client := a.validator.NewSafeHTTPClient(3 * time.Second)
	url := fmt.Sprintf("http://%s:%d/cgi-bin/magicBox.cgi?action=getSystemInfo", cam.Host, port)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}

	if cam.Username != "" && password != "" {
		req.SetBasicAuth(cam.Username, password)
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return fmt.Errorf("authentication failed: HTTP 401")
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}
