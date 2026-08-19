package vendors

import (
	"context"
	"fmt"
	"strings"
	"time"

	"videocms/internal/camera"
	"videocms/internal/network"
	"videocms/internal/onvif"
)

// ONVIFAdapter handles cameras supporting standard ONVIF protocol.
type ONVIFAdapter struct {
	validator *network.NetworkValidator
}

// NewONVIFAdapter creates an ONVIF adapter with safe networking.
func NewONVIFAdapter(validator *network.NetworkValidator) *ONVIFAdapter {
	return &ONVIFAdapter{validator: validator}
}

func (a *ONVIFAdapter) Name() string {
	return "onvif"
}

func (a *ONVIFAdapter) Detect(ctx context.Context, device DeviceInfo) bool {
	if device.ONVIFURL != "" {
		return true
	}
	port := device.Port
	if port <= 0 {
		port = 80
	}
	// Try standard ONVIF device service
	client := a.validator.NewSafeHTTPClient(1500 * time.Millisecond)
	url := fmt.Sprintf("http://%s:%d/onvif/device_service", device.Host, port)
	onvifClient := onvif.NewClient(url, "", "", client)

	// Send an empty or basic GetDeviceInformation request
	_, err := onvifClient.SendSOAP(ctx, url, "http://www.onvif.org/ver10/device/wsdl/GetDeviceInformation", `<tds:GetDeviceInformation/>`)
	if err == nil || errorsIsAuth(err) {
		return true
	}
	return false
}

func (a *ONVIFAdapter) DiscoverCapabilities(ctx context.Context, device DeviceInfo, credentials Credentials) (camera.CameraCapabilities, error) {
	url := device.ONVIFURL
	if url == "" {
		port := device.Port
		if port <= 0 {
			port = 80
		}
		url = fmt.Sprintf("http://%s:%d/onvif/device_service", device.Host, port)
	}

	client := a.validator.NewSafeHTTPClient(3 * time.Second)
	onvifClient := onvif.NewClient(url, credentials.Username, credentials.Password, client)

	caps, err := onvifClient.GetCapabilities(ctx)
	if err != nil {
		return camera.CameraCapabilities{ONVIF: false}, err
	}

	camCaps := camera.CameraCapabilities{
		ONVIF:    true,
		RTSP:     true,
		PTZ:      caps.PTZXAddr != "",
		Events:   caps.EventsXAddr != "",
		Snapshot: true,
	}

	// Fetch Profiles
	profiles, err := onvifClient.GetProfiles(ctx, caps.MediaXAddr)
	if err == nil && len(profiles) > 0 {
		var streamProfiles []camera.StreamProfile
		for i, p := range profiles {
			isSub := i > 0 || strings.Contains(strings.ToLower(p.Name), "sub")
			sp := camera.StreamProfile{
				Name:        p.Name,
				Token:       p.Token,
				Encoder:     p.Encoding,
				Width:       p.Width,
				Height:      p.Height,
				FPS:         p.FPS,
				IsSubstream: isSub,
			}
			if isSub {
				camCaps.SubStream = true
			} else {
				camCaps.MainStream = true
			}

			// Try to retrieve RTSP stream URI
			if uri, err := onvifClient.GetStreamURI(ctx, caps.MediaXAddr, p.Token); err == nil {
				sp.RTSPURI = uri
			}
			streamProfiles = append(streamProfiles, sp)
		}
		camCaps.Profiles = streamProfiles
	}

	return camCaps, nil
}

func (a *ONVIFAdapter) DiscoverStreams(ctx context.Context, device DeviceInfo, credentials Credentials) ([]camera.StreamProfile, error) {
	caps, err := a.DiscoverCapabilities(ctx, device, credentials)
	if err != nil {
		return nil, err
	}
	return caps.Profiles, nil
}

func (a *ONVIFAdapter) TestConnection(ctx context.Context, cam *camera.Camera, password string) error {
	url := cam.ONVIFURL
	if url == "" {
		port := cam.Port
		if port <= 0 {
			port = 80
		}
		url = fmt.Sprintf("http://%s:%d/onvif/device_service", cam.Host, port)
	}

	client := a.validator.NewSafeHTTPClient(3 * time.Second)
	onvifClient := onvif.NewClient(url, cam.Username, password, client)

	_, err := onvifClient.GetDeviceInformation(ctx)
	return err
}

func errorsIsAuth(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "auth") || strings.Contains(msg, "unauthorized") || strings.Contains(msg, "401")
}
