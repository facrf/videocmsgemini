package onvif

import (
	"bytes"
	"context"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

var (
	ErrAuthFailed   = errors.New("ONVIF authentication failed")
	ErrInvalidResp  = errors.New("invalid ONVIF SOAP response")
	ErrServiceFault = errors.New("ONVIF SOAP fault returned by camera")
)

// DeviceInfo represents hardware and software metadata from GetDeviceInformation.
type DeviceInfo struct {
	Manufacturer    string
	Model           string
	FirmwareVersion string
	SerialNumber    string
	HardwareID      string
}

// Capabilities represents ONVIF service endpoints.
type Capabilities struct {
	DeviceXAddr string
	MediaXAddr  string
	PTZXAddr    string
	EventsXAddr string
}

// Profile represents an ONVIF Media Profile.
type Profile struct {
	Token       string
	Name        string
	Encoding    string // H264, H265, JPEG
	Width       int
	Height      int
	FPS         int
	RTSPURI     string
	SnapshotURI string
}

// Client represents an ONVIF SOAP client.
type Client struct {
	DeviceURL  string
	Username   string
	Password   string
	HTTPClient *http.Client
}

// NewClient creates a new ONVIF client.
func NewClient(deviceURL, username, password string, httpClient *http.Client) *Client {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 5 * time.Second}
	}
	return &Client{
		DeviceURL:  deviceURL,
		Username:   username,
		Password:   password,
		HTTPClient: httpClient,
	}
}

// SendSOAP sends a SOAP envelope to a specific endpoint and returns response body.
func (c *Client) SendSOAP(ctx context.Context, endpoint, action, bodyPayload string) ([]byte, error) {
	if endpoint == "" {
		endpoint = c.DeviceURL
	}

	envelope := wrapSOAPEnvelope(c.Username, c.Password, bodyPayload)

	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader([]byte(envelope)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/soap+xml; charset=utf-8; action=\""+action+"\"")
	if c.Username != "" && c.Password != "" {
		req.SetBasicAuth(c.Username, c.Password)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("soap request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read soap response: %w", err)
	}

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, ErrAuthFailed
	}

	if strings.Contains(string(respBody), "FailedAuthentication") || strings.Contains(string(respBody), "NotAuthorized") {
		return nil, ErrAuthFailed
	}

	if resp.StatusCode >= 400 && !strings.Contains(string(respBody), "Response") {
		return nil, fmt.Errorf("%w: HTTP status %d: %s", ErrServiceFault, resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// GetDeviceInformation retrieves device manufacturer, model, serial, and firmware version.
func (c *Client) GetDeviceInformation(ctx context.Context) (*DeviceInfo, error) {
	body := `<tds:GetDeviceInformation/>`
	action := "http://www.onvif.org/ver10/device/wsdl/GetDeviceInformation"

	respBytes, err := c.SendSOAP(ctx, c.DeviceURL, action, body)
	if err != nil {
		return nil, err
	}

	type GetDeviceInformationResponse struct {
		Manufacturer    string `xml:"Body>GetDeviceInformationResponse>Manufacturer"`
		Model           string `xml:"Body>GetDeviceInformationResponse>Model"`
		FirmwareVersion string `xml:"Body>GetDeviceInformationResponse>FirmwareVersion"`
		SerialNumber    string `xml:"Body>GetDeviceInformationResponse>SerialNumber"`
		HardwareID      string `xml:"Body>GetDeviceInformationResponse>HardwareId"`
	}

	var parsed GetDeviceInformationResponse
	if err := xml.Unmarshal(respBytes, &parsed); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidResp, err)
	}

	return &DeviceInfo{
		Manufacturer:    parsed.Manufacturer,
		Model:           parsed.Model,
		FirmwareVersion: parsed.FirmwareVersion,
		SerialNumber:    parsed.SerialNumber,
		HardwareID:      parsed.HardwareID,
	}, nil
}

// GetCapabilities retrieves the ONVIF service endpoints (Media, PTZ, Events).
func (c *Client) GetCapabilities(ctx context.Context) (*Capabilities, error) {
	body := `<tds:GetCapabilities><tds:Category>All</tds:Category></tds:GetCapabilities>`
	action := "http://www.onvif.org/ver10/device/wsdl/GetCapabilities"

	respBytes, err := c.SendSOAP(ctx, c.DeviceURL, action, body)
	if err != nil {
		return nil, err
	}

	type GetCapabilitiesResponse struct {
		MediaXAddr  string `xml:"Body>GetCapabilitiesResponse>Capabilities>Media>XAddr"`
		PTZXAddr    string `xml:"Body>GetCapabilitiesResponse>Capabilities>PTZ>XAddr"`
		EventsXAddr string `xml:"Body>GetCapabilitiesResponse>Capabilities>Events>XAddr"`
	}

	var parsed GetCapabilitiesResponse
	if err := xml.Unmarshal(respBytes, &parsed); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidResp, err)
	}

	return &Capabilities{
		DeviceXAddr: c.DeviceURL,
		MediaXAddr:  parsed.MediaXAddr,
		PTZXAddr:    parsed.PTZXAddr,
		EventsXAddr: parsed.EventsXAddr,
	}, nil
}

// GetProfiles retrieves media profiles from the Media service.
func (c *Client) GetProfiles(ctx context.Context, mediaXAddr string) ([]Profile, error) {
	if mediaXAddr == "" {
		mediaXAddr = c.DeviceURL
	}

	body := `<trt:GetProfiles/>`
	action := "http://www.onvif.org/ver10/media/wsdl/GetProfiles"

	respBytes, err := c.SendSOAP(ctx, mediaXAddr, action, body)
	if err != nil {
		return nil, err
	}

	type RawProfile struct {
		Token    string `xml:"token,attr"`
		Name     string `xml:"Name"`
		Encoding string `xml:"VideoEncoderConfiguration>Encoding"`
		Width    int    `xml:"VideoEncoderConfiguration>Resolution>Width"`
		Height   int    `xml:"VideoEncoderConfiguration>Resolution>Height"`
		FPS      int    `xml:"VideoEncoderConfiguration>RateControl>FrameRateLimit"`
	}

	type GetProfilesResponse struct {
		Profiles []RawProfile `xml:"Body>GetProfilesResponse>Profiles"`
	}

	var parsed GetProfilesResponse
	if err := xml.Unmarshal(respBytes, &parsed); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidResp, err)
	}

	var profiles []Profile
	for _, p := range parsed.Profiles {
		prof := Profile{
			Token:    p.Token,
			Name:     p.Name,
			Encoding: p.Encoding,
			Width:    p.Width,
			Height:   p.Height,
			FPS:      p.FPS,
		}
		if prof.Token == "" {
			prof.Token = p.Name
		}
		profiles = append(profiles, prof)
	}

	return profiles, nil
}

// GetStreamURI retrieves the RTSP stream URL for a given profile token.
func (c *Client) GetStreamURI(ctx context.Context, mediaXAddr, profileToken string) (string, error) {
	if mediaXAddr == "" {
		mediaXAddr = c.DeviceURL
	}

	body := fmt.Sprintf(`<trt:GetStreamUri>
    <trt:StreamSetup>
      <tt:Stream>RTP-Unicast</tt:Stream>
      <tt:Transport>
        <tt:Protocol>RTSP</tt:Protocol>
      </tt:Transport>
    </trt:StreamSetup>
    <trt:ProfileToken>%s</trt:ProfileToken>
  </trt:GetStreamUri>`, escapeXML(profileToken))
	action := "http://www.onvif.org/ver10/media/wsdl/GetStreamUri"

	respBytes, err := c.SendSOAP(ctx, mediaXAddr, action, body)
	if err != nil {
		return "", err
	}

	type GetStreamUriResponse struct {
		URI string `xml:"Body>GetStreamUriResponse>MediaUri>Uri"`
	}

	var parsed GetStreamUriResponse
	if err := xml.Unmarshal(respBytes, &parsed); err != nil {
		return "", fmt.Errorf("%w: %v", ErrInvalidResp, err)
	}

	return parsed.URI, nil
}

// GetSnapshotURI retrieves the HTTP Snapshot URL for a given profile token.
func (c *Client) GetSnapshotURI(ctx context.Context, mediaXAddr, profileToken string) (string, error) {
	if mediaXAddr == "" {
		mediaXAddr = c.DeviceURL
	}

	body := fmt.Sprintf(`<trt:GetSnapshotUri>
    <trt:ProfileToken>%s</trt:ProfileToken>
  </trt:GetSnapshotUri>`, escapeXML(profileToken))
	action := "http://www.onvif.org/ver10/media/wsdl/GetSnapshotUri"

	respBytes, err := c.SendSOAP(ctx, mediaXAddr, action, body)
	if err != nil {
		return "", err
	}

	type GetSnapshotUriResponse struct {
		URI string `xml:"Body>GetSnapshotUriResponse>MediaUri>Uri"`
	}

	var parsed GetSnapshotUriResponse
	if err := xml.Unmarshal(respBytes, &parsed); err != nil {
		return "", fmt.Errorf("%w: %v", ErrInvalidResp, err)
	}

	return parsed.URI, nil
}

// FetchSnapshot downloads an image from the snapshot URI using safe HTTP client.
func (c *Client) FetchSnapshot(ctx context.Context, snapshotURI string) ([]byte, string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", snapshotURI, nil)
	if err != nil {
		return nil, "", err
	}

	if c.Username != "" && c.Password != "" {
		req.SetBasicAuth(c.Username, c.Password)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("snapshot request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("snapshot HTTP returned status %d", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read snapshot body: %w", err)
	}

	return data, contentType, nil
}
