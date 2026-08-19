package fakecamera

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"time"
)

// FakeCamera simulates an ONVIF / RTSP IP camera for unit and integration testing.
type FakeCamera struct {
	HTTPServer   *httptest.Server
	RTSPListener net.Listener
	Host         string
	HTTPPort     int
	RTSPPort     int
	Manufacturer string
	Model        string
	SerialNumber string
	Username     string
	Password     string
	AuthRequired bool
}

// NewFakeCamera starts an in-memory mock IP camera.
func NewFakeCamera(manufacturer, model string, authRequired bool) (*FakeCamera, error) {
	fc := &FakeCamera{
		Manufacturer: manufacturer,
		Model:        model,
		SerialNumber: "FAKE-CAM-" + strconv.FormatInt(time.Now().UnixNano()%10000, 10),
		Username:     "admin",
		Password:     "secret123",
		AuthRequired: authRequired,
	}

	// Setup RTSP dummy TCP listener on random port
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, fmt.Errorf("failed to listen on rtsp port: %w", err)
	}
	fc.RTSPListener = ln
	fc.RTSPPort = ln.Addr().(*net.TCPAddr).Port

	// Goroutine to handle RTSP connections with dummy RTSP DESCRIBE/SETUP responses
	go fc.handleRTSP()

	// Setup HTTP Server for ONVIF SOAP and Snapshot
	mux := http.NewServeMux()
	mux.HandleFunc("/onvif/device_service", fc.handleONVIF)
	mux.HandleFunc("/onvif/media_service", fc.handleONVIF)
	mux.HandleFunc("/onvif/snapshot", fc.handleSnapshot)
	mux.HandleFunc("/cgi-bin/snapshot.cgi", fc.handleSnapshot)
	mux.HandleFunc("/cgi-bin/magicBox.cgi", fc.handleDahuaCGI)

	server := httptest.NewServer(mux)
	fc.HTTPServer = server

	addr := server.Listener.Addr().(*net.TCPAddr)
	fc.Host = addr.IP.String()
	fc.HTTPPort = addr.Port

	return fc, nil
}

// Close shuts down the fake camera test server.
func (fc *FakeCamera) Close() {
	if fc.HTTPServer != nil {
		fc.HTTPServer.Close()
	}
	if fc.RTSPListener != nil {
		_ = fc.RTSPListener.Close()
	}
}

func (fc *FakeCamera) handleRTSP() {
	for {
		conn, err := fc.RTSPListener.Accept()
		if err != nil {
			return
		}
		go func(c net.Conn) {
			defer c.Close()
			buf := make([]byte, 2048)
			n, err := c.Read(buf)
			if err != nil || n == 0 {
				return
			}
			req := string(buf[:n])
			cSeq := "1"
			for _, line := range strings.Split(req, "\r\n") {
				if strings.HasPrefix(strings.ToLower(line), "cseq:") {
					cSeq = strings.TrimSpace(line[5:])
				}
			}

			if strings.HasPrefix(req, "OPTIONS") {
				resp := fmt.Sprintf("RTSP/1.0 200 OK\r\nCSeq: %s\r\nPublic: OPTIONS, DESCRIBE, SETUP, PLAY, PAUSE, TEARDOWN\r\n\r\n", cSeq)
				_, _ = c.Write([]byte(resp))
			} else if strings.HasPrefix(req, "DESCRIBE") {
				sdp := "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=FakeCamera Stream\r\nt=0 0\r\nm=video 0 RTP/AVP 96\r\na=rtpmap:96 H264/90000\r\n"
				resp := fmt.Sprintf("RTSP/1.0 200 OK\r\nCSeq: %s\r\nContent-Type: application/sdp\r\nContent-Length: %d\r\n\r\n%s", cSeq, len(sdp), sdp)
				_, _ = c.Write([]byte(resp))
			} else {
				resp := fmt.Sprintf("RTSP/1.0 200 OK\r\nCSeq: %s\r\n\r\n", cSeq)
				_, _ = c.Write([]byte(resp))
			}
		}(conn)
	}
}

func (fc *FakeCamera) handleSnapshot(w http.ResponseWriter, r *http.Request) {
	if fc.AuthRequired {
		user, pass, ok := r.BasicAuth()
		if !ok || user != fc.Username || pass != fc.Password {
			w.Header().Set("WWW-Authenticate", `Basic realm="FakeCamera"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
	}

	// Generate a 320x240 test pattern JPEG image
	img := image.NewRGBA(image.Rect(0, 0, 320, 240))
	draw.Draw(img, img.Bounds(), &image.Uniform{color.RGBA{R: 20, G: 40, B: 60, A: 255}}, image.Point{}, draw.Src)

	// Draw decorative color stripes
	for x := 0; x < 320; x += 40 {
		for y := 0; y < 240; y++ {
			img.Set(x, y, color.RGBA{R: 0, G: 200, B: 255, A: 255})
		}
	}

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 85}); err != nil {
		http.Error(w, "Failed to encode JPEG", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Content-Length", strconv.Itoa(buf.Len()))
	_, _ = w.Write(buf.Bytes())
}

func (fc *FakeCamera) handleDahuaCGI(w http.ResponseWriter, r *http.Request) {
	action := r.URL.Query().Get("action")
	if action == "getSystemInfo" {
		resp := fmt.Sprintf("appAutoStart=true\ndeviceType=%s\nhardwareVersion=1.00\nprocessor=Fake\nserialNumber=%s\n", fc.Model, fc.SerialNumber)
		w.Header().Set("Content-Type", "text/plain")
		_, _ = w.Write([]byte(resp))
		return
	}
	http.NotFound(w, r)
}

func (fc *FakeCamera) handleONVIF(w http.ResponseWriter, r *http.Request) {
	bodyBytes, _ := io.ReadAll(r.Body)
	body := string(bodyBytes)

	if fc.AuthRequired {
		// Check for UsernameToken or Basic Auth
		if !strings.Contains(body, fc.Username) {
			user, pass, ok := r.BasicAuth()
			if !ok || user != fc.Username || pass != fc.Password {
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body><s:Fault><s:Code><s:Value>s:Sender</s:Value><s:Subcode><s:Value xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">wsse:FailedAuthentication</s:Value></s:Subcode></s:Code><s:Reason><s:Text xml:lang="en">Authentication failed</s:Text></s:Reason></s:Fault></s:Body></s:Envelope>`))
				return
			}
		}
	}

	w.Header().Set("Content-Type", "application/soap+xml; charset=utf-8")

	if strings.Contains(body, "GetDeviceInformation") {
		resp := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
  <soap:Body>
    <tds:GetDeviceInformationResponse>
      <tds:Manufacturer>%s</tds:Manufacturer>
      <tds:Model>%s</tds:Model>
      <tds:FirmwareVersion>2.800.0000000.1.R</tds:FirmwareVersion>
      <tds:SerialNumber>%s</tds:SerialNumber>
      <tds:HardwareId>1.0</tds:HardwareId>
    </tds:GetDeviceInformationResponse>
  </soap:Body>
</soap:Envelope>`, fc.Manufacturer, fc.Model, fc.SerialNumber)
		_, _ = w.Write([]byte(resp))
		return
	}

	if strings.Contains(body, "GetCapabilities") {
		mediaURL := fmt.Sprintf("http://127.0.0.1:%d/onvif/media_service", fc.HTTPPort)
		resp := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tds="http://www.onvif.org/ver10/device/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema">
  <soap:Body>
    <tds:GetCapabilitiesResponse>
      <tds:Capabilities>
        <tt:Media>
          <tt:XAddr>%s</tt:XAddr>
          <tt:StreamingCapabilities>
            <tt:RTPMulticast>false</tt:RTPMulticast>
            <tt:RTP_TCP>true</tt:RTP_TCP>
            <tt:RTP_RTSP_TCP>true</tt:RTP_RTSP_TCP>
          </tt:StreamingCapabilities>
        </tt:Media>
        <tt:PTZ>
          <tt:XAddr>%s</tt:XAddr>
        </tt:PTZ>
      </tds:Capabilities>
    </tds:GetCapabilitiesResponse>
  </soap:Body>
</soap:Envelope>`, mediaURL, mediaURL)
		_, _ = w.Write([]byte(resp))
		return
	}

	if strings.Contains(body, "GetProfiles") {
		resp := `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:trt="http://www.onvif.org/ver10/media/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema">
  <soap:Body>
    <trt:GetProfilesResponse>
      <trt:Profiles token="Profile_Main" fixed="true">
        <tt:Name>MainProfile_H264</tt:Name>
        <tt:VideoEncoderConfiguration>
          <tt:Encoding>H264</tt:Encoding>
          <tt:Resolution>
            <tt:Width>1920</tt:Width>
            <tt:Height>1080</tt:Height>
          </tt:Resolution>
          <tt:RateControl>
            <tt:FrameRateLimit>30</tt:FrameRateLimit>
          </tt:RateControl>
        </tt:VideoEncoderConfiguration>
      </trt:Profiles>
      <trt:Profiles token="Profile_Sub" fixed="true">
        <tt:Name>SubProfile_H264</tt:Name>
        <tt:VideoEncoderConfiguration>
          <tt:Encoding>H264</tt:Encoding>
          <tt:Resolution>
            <tt:Width>640</tt:Width>
            <tt:Height>360</tt:Height>
          </tt:Resolution>
          <tt:RateControl>
            <tt:FrameRateLimit>15</tt:FrameRateLimit>
          </tt:RateControl>
        </tt:VideoEncoderConfiguration>
      </trt:Profiles>
    </trt:GetProfilesResponse>
  </soap:Body>
</soap:Envelope>`
		_, _ = w.Write([]byte(resp))
		return
	}

	if strings.Contains(body, "GetStreamUri") {
		streamPath := "/live/main"
		if strings.Contains(body, "Profile_Sub") {
			streamPath = "/live/sub"
		}
		rtspURI := fmt.Sprintf("rtsp://127.0.0.1:%d%s", fc.RTSPPort, streamPath)
		resp := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:trt="http://www.onvif.org/ver10/media/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema">
  <soap:Body>
    <trt:GetStreamUriResponse>
      <trt:MediaUri>
        <tt:Uri>%s</tt:Uri>
        <tt:InvalidAfterConnect>false</tt:InvalidAfterConnect>
        <tt:InvalidAfterReboot>false</tt:InvalidAfterReboot>
        <tt:Timeout>PT30S</tt:Timeout>
      </trt:MediaUri>
    </trt:GetStreamUriResponse>
  </soap:Body>
</soap:Envelope>`, rtspURI)
		_, _ = w.Write([]byte(resp))
		return
	}

	if strings.Contains(body, "GetSnapshotUri") {
		snapURI := fmt.Sprintf("http://127.0.0.1:%d/onvif/snapshot", fc.HTTPPort)
		resp := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:trt="http://www.onvif.org/ver10/media/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema">
  <soap:Body>
    <trt:GetSnapshotUriResponse>
      <trt:MediaUri>
        <tt:Uri>%s</tt:Uri>
        <tt:Timeout>PT30S</tt:Timeout>
      </trt:MediaUri>
    </trt:GetSnapshotUriResponse>
  </soap:Body>
</soap:Envelope>`, snapURI)
		_, _ = w.Write([]byte(resp))
		return
	}

	w.WriteHeader(http.StatusOK)
}
