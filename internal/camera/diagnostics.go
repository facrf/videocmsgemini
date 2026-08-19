package camera

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"videocms/internal/network"
	"videocms/internal/onvif"
)

// DiagnosticsRunner executes multi-stage camera diagnostics.
type DiagnosticsRunner struct {
	validator *network.NetworkValidator
}

// NewDiagnosticsRunner creates a diagnostics runner.
func NewDiagnosticsRunner(validator *network.NetworkValidator) *DiagnosticsRunner {
	return &DiagnosticsRunner{validator: validator}
}

// Run executes the 10 diagnostic stages on a camera.
func (d *DiagnosticsRunner) Run(ctx context.Context, cam *Camera, password string) *DiagnosticReport {
	report := &DiagnosticReport{
		CameraID:   cam.ID,
		CameraName: cam.Name,
		Host:       cam.Host,
		TestedAt:   time.Now().UTC(),
		Passed:     true,
		Stages:     make([]DiagnosticStage, 0),
		Capabilities: CameraCapabilities{
			Profiles: make([]StreamProfile, 0),
		},
	}

	// 1. Stage: Host & DNS Validation (SSRF Check)
	start := time.Now()
	ips, err := d.validator.ValidateHost(ctx, cam.Host)
	if err != nil {
		report.Stages = append(report.Stages, DiagnosticStage{
			Name:       "Host",
			Status:     "Failed",
			Details:    fmt.Sprintf("DNS/Network Validation error: %v", err),
			DurationMs: time.Since(start).Milliseconds(),
		})
		report.Passed = false
		report.Summary = "Host validation failed (Blocked or Unreachable)"
		return report
	}
	report.Stages = append(report.Stages, DiagnosticStage{
		Name:       "Host",
		Status:     "OK",
		Details:    fmt.Sprintf("Resolved IP(s): %v", ips),
		DurationMs: time.Since(start).Milliseconds(),
	})

	// 2. Stage: TCP Connection Check (HTTP Port)
	start = time.Now()
	port := cam.Port
	if port <= 0 {
		port = 80
	}
	dialer := d.validator.SafeDialer(2 * time.Second)
	tcpConn, err := dialer(ctx, "tcp", fmt.Sprintf("%s:%d", cam.Host, port))
	if err != nil {
		report.Stages = append(report.Stages, DiagnosticStage{
			Name:       fmt.Sprintf("Port %d (HTTP/Control)", port),
			Status:     "Failed",
			Details:    fmt.Sprintf("TCP dial failed: %v", err),
			DurationMs: time.Since(start).Milliseconds(),
		})
	} else {
		_ = tcpConn.Close()
		report.Stages = append(report.Stages, DiagnosticStage{
			Name:       fmt.Sprintf("Port %d (HTTP/Control)", port),
			Status:     "OK",
			Details:    "TCP port reachable and open",
			DurationMs: time.Since(start).Milliseconds(),
		})
	}

	// 3. Stage: HTTP Service
	start = time.Now()
	httpClient := d.validator.NewSafeHTTPClient(2 * time.Second)
	httpURL := fmt.Sprintf("http://%s:%d/", cam.Host, port)
	req, _ := http.NewRequestWithContext(ctx, "GET", httpURL, nil)
	httpResp, err := httpClient.Do(req)
	var serverHeader string
	if err != nil {
		report.Stages = append(report.Stages, DiagnosticStage{
			Name:       "HTTP",
			Status:     "Warning",
			Details:    fmt.Sprintf("HTTP root query returned: %v", err),
			DurationMs: time.Since(start).Milliseconds(),
		})
	} else {
		defer httpResp.Body.Close()
		serverHeader = httpResp.Header.Get("Server")
		report.Stages = append(report.Stages, DiagnosticStage{
			Name:       "HTTP",
			Status:     "OK",
			Details:    fmt.Sprintf("Status %d %s (Server: %s)", httpResp.StatusCode, httpResp.Status, serverHeader),
			DurationMs: time.Since(start).Milliseconds(),
		})
	}

	// 4. Stage: ONVIF Service Discovery
	start = time.Now()
	onvifURL := cam.ONVIFURL
	if onvifURL == "" {
		onvifURL = fmt.Sprintf("http://%s:%d/onvif/device_service", cam.Host, port)
	}
	onvifClient := onvif.NewClient(onvifURL, cam.Username, password, httpClient)
	_, onvifErr := onvifClient.SendSOAP(ctx, onvifURL, "http://www.onvif.org/ver10/device/wsdl/GetDeviceInformation", `<tds:GetDeviceInformation/>`)

	onvifSupported := false
	if onvifErr == nil || isAuthError(onvifErr) {
		onvifSupported = true
		report.Stages = append(report.Stages, DiagnosticStage{
			Name:       "ONVIF",
			Status:     "OK",
			Details:    fmt.Sprintf("Endpoint: %s", onvifURL),
			DurationMs: time.Since(start).Milliseconds(),
		})
	} else {
		report.Stages = append(report.Stages, DiagnosticStage{
			Name:       "ONVIF",
			Status:     "Warning",
			Details:    fmt.Sprintf("ONVIF service not detected: %v", onvifErr),
			DurationMs: time.Since(start).Milliseconds(),
		})
	}

	// 5. Stage: Authentication
	start = time.Now()
	var devInfo *onvif.DeviceInfo
	var caps *onvif.Capabilities
	var authPassed bool

	if onvifSupported {
		info, err := onvifClient.GetDeviceInformation(ctx)
		if err != nil {
			if isAuthError(err) {
				report.Stages = append(report.Stages, DiagnosticStage{
					Name:       "Authentication",
					Status:     "Failed",
					Details:    "Invalid credentials or authorization required",
					DurationMs: time.Since(start).Milliseconds(),
				})
			} else {
				report.Stages = append(report.Stages, DiagnosticStage{
					Name:       "Authentication",
					Status:     "Warning",
					Details:    fmt.Sprintf("Auth check query error: %v", err),
					DurationMs: time.Since(start).Milliseconds(),
				})
			}
		} else {
			authPassed = true
			devInfo = info
			authDetails := "Anonymous access permitted (no credentials required)"
			if cam.Username != "" {
				if password == "" {
					authDetails = fmt.Sprintf("Credentials validated for user %q (without password)", cam.Username)
				} else {
					authDetails = fmt.Sprintf("Credentials validated for user %q", cam.Username)
				}
			}
			report.Stages = append(report.Stages, DiagnosticStage{
				Name:       "Authentication",
				Status:     "OK",
				Details:    authDetails,
				DurationMs: time.Since(start).Milliseconds(),
			})
		}
	} else {
		report.Stages = append(report.Stages, DiagnosticStage{
			Name:       "Authentication",
			Status:     "Skipped",
			Details:    "Non-ONVIF device",
			DurationMs: time.Since(start).Milliseconds(),
		})
	}

	// 6. Stage: Device Information
	start = time.Now()
	if devInfo != nil {
		report.Stages = append(report.Stages, DiagnosticStage{
			Name:       "Device Information",
			Status:     "OK",
			Details:    fmt.Sprintf("Manufacturer: %s | Model: %s | Firmware: %s | Serial: %s", devInfo.Manufacturer, devInfo.Model, devInfo.FirmwareVersion, devInfo.SerialNumber),
			DurationMs: time.Since(start).Milliseconds(),
		})
	} else {
		report.Stages = append(report.Stages, DiagnosticStage{
			Name:       "Device Information",
			Status:     "Skipped",
			Details:    "Not available without ONVIF authentication",
			DurationMs: time.Since(start).Milliseconds(),
		})
	}

	// 7. Stage: Profiles & Capabilities
	start = time.Now()
	var profiles []onvif.Profile
	var streamCaps CameraCapabilities
	if authPassed && onvifClient != nil {
		c, err := onvifClient.GetCapabilities(ctx)
		if err == nil {
			caps = c
			profs, err := onvifClient.GetProfiles(ctx, caps.MediaXAddr)
			if err == nil && len(profs) > 0 {
				profiles = profs
				report.Stages = append(report.Stages, DiagnosticStage{
					Name:       "Profiles",
					Status:     "OK",
					Details:    fmt.Sprintf("Found %d video profile(s)", len(profs)),
					DurationMs: time.Since(start).Milliseconds(),
				})
				for _, p := range profs {
					streamCaps.Profiles = append(streamCaps.Profiles, StreamProfile{
						Name:        p.Name,
						Token:       p.Token,
						Encoder:     p.Encoding,
						Width:       p.Width,
						Height:      p.Height,
						FPS:         p.FPS,
						IsSubstream: strings.Contains(strings.ToLower(p.Name), "sub"),
					})
				}
				streamCaps.ONVIF = true
				streamCaps.PTZ = caps.PTZXAddr != ""
			}
		}
	}
	if len(profiles) == 0 {
		report.Stages = append(report.Stages, DiagnosticStage{
			Name:       "Profiles",
			Status:     "Warning",
			Details:    "No ONVIF media profiles returned",
			DurationMs: time.Since(start).Milliseconds(),
		})
	}

	// 8. Stage: RTSP Port & Handshake
	start = time.Now()
	rtspPort := cam.RTSPPort
	if rtspPort <= 0 {
		rtspPort = 554
	}
	rtspConn, err := dialer(ctx, "tcp", fmt.Sprintf("%s:%d", cam.Host, rtspPort))
	if err != nil {
		report.Stages = append(report.Stages, DiagnosticStage{
			Name:       fmt.Sprintf("RTSP (Port %d)", rtspPort),
			Status:     "Warning",
			Details:    fmt.Sprintf("RTSP port closed or unreachable: %v", err),
			DurationMs: time.Since(start).Milliseconds(),
		})
	} else {
		_ = rtspConn.Close()
		streamCaps.RTSP = true
		report.Stages = append(report.Stages, DiagnosticStage{
			Name:       fmt.Sprintf("RTSP (Port %d)", rtspPort),
			Status:     "OK",
			Details:    "RTSP service reachable",
			DurationMs: time.Since(start).Milliseconds(),
		})
	}

	// 9. Stage: Codec & Substream Detection
	start = time.Now()
	var codecStr = cam.Codec
	if codecStr == "" {
		codecStr = "H.264"
	}
	hasSub := false
	for _, p := range streamCaps.Profiles {
		if p.IsSubstream {
			hasSub = true
		}
		if p.Encoder != "" {
			codecStr = p.Encoder
		}
	}
	streamCaps.SubStream = hasSub
	report.Stages = append(report.Stages, DiagnosticStage{
		Name:       "Codec & Substream",
		Status:     "OK",
		Details:    fmt.Sprintf("Detected Codec: %s | Substream: %v", codecStr, hasSub),
		DurationMs: time.Since(start).Milliseconds(),
	})

	// 10. Stage: Snapshot availability
	start = time.Now()
	snapshotOK := false
	if onvifClient != nil && caps != nil && len(profiles) > 0 {
		snapURI, err := onvifClient.GetSnapshotURI(ctx, caps.MediaXAddr, profiles[0].Token)
		if err == nil && snapURI != "" {
			_, _, err := onvifClient.FetchSnapshot(ctx, snapURI)
			if err == nil {
				snapshotOK = true
			}
		}
	}
	if !snapshotOK && cam.SnapshotPath != "" {
		snapURL := fmt.Sprintf("http://%s:%d%s", cam.Host, port, cam.SnapshotPath)
		req, _ := http.NewRequestWithContext(ctx, "GET", snapURL, nil)
		if cam.Username != "" {
			req.SetBasicAuth(cam.Username, password)
		}
		resp, err := httpClient.Do(req)
		if err == nil && resp.StatusCode == http.StatusOK {
			snapshotOK = true
			resp.Body.Close()
		}
	}

	if snapshotOK {
		streamCaps.Snapshot = true
		report.Stages = append(report.Stages, DiagnosticStage{
			Name:       "Snapshot",
			Status:     "OK",
			Details:    "Snapshot image retrieved successfully",
			DurationMs: time.Since(start).Milliseconds(),
		})
	} else {
		report.Stages = append(report.Stages, DiagnosticStage{
			Name:       "Snapshot",
			Status:     "Warning",
			Details:    "Snapshot not available",
			DurationMs: time.Since(start).Milliseconds(),
		})
	}

	report.Capabilities = streamCaps
	report.Summary = fmt.Sprintf("Diagnostic finished: %d stages OK", countOK(report.Stages))
	return report
}

func isAuthError(err error) bool {
	if err == nil {
		return false
	}
	s := strings.ToLower(err.Error())
	return strings.Contains(s, "auth") || strings.Contains(s, "unauthorized") || strings.Contains(s, "401")
}

func countOK(stages []DiagnosticStage) int {
	var c int
	for _, s := range stages {
		if s.Status == "OK" {
			c++
		}
	}
	return c
}
