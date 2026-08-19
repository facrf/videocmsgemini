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

// IntelbrasAdapter handles native Intelbras cameras and DVRs.
type IntelbrasAdapter struct {
	validator *network.NetworkValidator
}

// NewIntelbrasAdapter creates an Intelbras adapter.
func NewIntelbrasAdapter(validator *network.NetworkValidator) *IntelbrasAdapter {
	return &IntelbrasAdapter{validator: validator}
}

func (a *IntelbrasAdapter) Name() string {
	return "intelbras"
}

func (a *IntelbrasAdapter) Detect(ctx context.Context, device DeviceInfo) bool {
	mfr := strings.ToLower(device.Manufacturer)
	model := strings.ToUpper(device.Model)
	if strings.Contains(mfr, "intelbras") ||
		strings.HasPrefix(model, "VIP ") ||
		strings.HasPrefix(model, "VHD ") ||
		strings.HasPrefix(model, "MHDX ") ||
		strings.HasPrefix(model, "iM") {
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

	// Check headers / body
	serverHdr := strings.ToLower(resp.Header.Get("Server"))
	if strings.Contains(serverHdr, "intelbras") {
		return true
	}

	bodyBytes, _ := io.ReadAll(resp.Body)
	if strings.Contains(strings.ToLower(string(bodyBytes)), "intelbras") {
		return true
	}

	return false
}

func (a *IntelbrasAdapter) DiscoverCapabilities(ctx context.Context, device DeviceInfo, credentials Credentials) (camera.CameraCapabilities, error) {
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
				Name:        "Main Stream (Intelbras)",
				Token:       "main",
				Encoder:     "H.264",
				RTSPURI:     mainRTSP,
				IsSubstream: false,
			},
			{
				Name:        "Sub Stream (Intelbras)",
				Token:       "sub",
				Encoder:     "H.264",
				RTSPURI:     subRTSP,
				IsSubstream: true,
			},
		},
	}

	return caps, nil
}

func (a *IntelbrasAdapter) DiscoverStreams(ctx context.Context, device DeviceInfo, credentials Credentials) ([]camera.StreamProfile, error) {
	caps, err := a.DiscoverCapabilities(ctx, device, credentials)
	if err != nil {
		return nil, err
	}
	return caps.Profiles, nil
}

func (a *IntelbrasAdapter) TestConnection(ctx context.Context, cam *camera.Camera, password string) error {
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

	if cam.Username != "" {
		req.SetBasicAuth(cam.Username, password)
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return fmt.Errorf("authentication failed: HTTP 401 (password required or invalid)")
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP status %d", resp.StatusCode)
	}

	return nil
}
