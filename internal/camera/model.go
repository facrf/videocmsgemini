package camera

import (
	"context"
	"encoding/json"
	"time"
)

// CameraStatus represents the operational status of a camera.
type CameraStatus string

const (
	StatusUnknown      CameraStatus = "unknown"
	StatusOnline       CameraStatus = "online"
	StatusOffline      CameraStatus = "offline"
	StatusAuthRequired CameraStatus = "auth_required"
	StatusUnsupported  CameraStatus = "unsupported"
	StatusError        CameraStatus = "error"
)

// CameraCapabilities describes the technical features supported by a camera.
type CameraCapabilities struct {
	ONVIF      bool            `json:"onvif"`
	RTSP       bool            `json:"rtsp"`
	PTZ        bool            `json:"ptz"`
	Audio      bool            `json:"audio"`
	Snapshot   bool            `json:"snapshot"`
	Events     bool            `json:"events"`
	MainStream bool            `json:"main_stream"`
	SubStream  bool            `json:"sub_stream"`
	Profiles   []StreamProfile `json:"profiles,omitempty"`
}

// StreamProfile represents a video stream profile provided by the camera.
type StreamProfile struct {
	Name        string `json:"name"`
	Token       string `json:"token"`
	Encoder     string `json:"encoder"` // H.264, H.265, MJPEG
	Width       int    `json:"width"`
	Height      int    `json:"height"`
	FPS         int    `json:"fps"`
	RTSPURI     string `json:"rtsp_uri,omitempty"`
	IsSubstream bool   `json:"is_substream"`
}

// Camera represents an IP camera registered in the VideoCMS system.
type Camera struct {
	ID                 string             `json:"id"`
	Name               string             `json:"name"`
	Host               string             `json:"host"`
	Port               int                `json:"port"`
	RTSPPort           int                `json:"rtsp_port"`
	Manufacturer       string             `json:"manufacturer"`
	Model              string             `json:"model"`
	SerialNumber       string             `json:"serial_number"`
	MACAddress         string             `json:"mac_address"`
	FirmwareVersion    string             `json:"firmware_version"`
	ONVIFURL           string             `json:"onvif_url"`
	RTSPPath           string             `json:"rtsp_path"`
	SubstreamPath      string             `json:"substream_path"`
	SnapshotPath       string             `json:"snapshot_path"`
	Username           string             `json:"username"`
	EncryptedPassword  string             `json:"-"` // Never expose in JSON responses
	HasPassword        bool               `json:"has_password"`
	Password           string             `json:"password,omitempty"`       // Only present during create/update requests (optional)
	ClearPassword      bool               `json:"clear_password,omitempty"` // Set to true to explicitly remove/clear the camera password
	PreferredProfile   string             `json:"preferred_profile"`
	PreferredTransport string             `json:"preferred_transport"` // "tcp" or "udp"
	Codec              string             `json:"codec"`
	Capabilities       CameraCapabilities `json:"capabilities"`
	Enabled            bool               `json:"enabled"`
	Status             CameraStatus       `json:"status"`
	StatusMessage      string             `json:"status_message"`
	LastSeenAt         *time.Time         `json:"last_seen_at"`
	CreatedAt          time.Time          `json:"created_at"`
	UpdatedAt          time.Time          `json:"updated_at"`
	Groups             []string           `json:"groups,omitempty"`
	Tags               []string           `json:"tags,omitempty"`
}

// MarshalCapabilities converts capabilities to JSON string for SQLite storage.
func (c *CameraCapabilities) MarshalCapabilities() string {
	b, err := json.Marshal(c)
	if err != nil {
		return "{}"
	}
	return string(b)
}

// UnmarshalCapabilities parses JSON string into CameraCapabilities.
func UnmarshalCapabilities(raw string) CameraCapabilities {
	caps := CameraCapabilities{
		Profiles: make([]StreamProfile, 0),
	}
	if raw == "" {
		return caps
	}
	_ = json.Unmarshal([]byte(raw), &caps)
	if caps.Profiles == nil {
		caps.Profiles = make([]StreamProfile, 0)
	}
	return caps
}

// DiagnosticStage represents one check in the camera diagnostic flow.
type DiagnosticStage struct {
	Name       string `json:"name"`
	Status     string `json:"status"` // OK, Warning, Failed, Skipped
	Details    string `json:"details"`
	DurationMs int64  `json:"duration_ms"`
}

// DiagnosticReport is the complete result of a camera diagnostic test.
type DiagnosticReport struct {
	CameraID     string             `json:"camera_id"`
	CameraName   string             `json:"camera_name"`
	Host         string             `json:"host"`
	Stages       []DiagnosticStage  `json:"stages"`
	Passed       bool               `json:"passed"`
	Summary      string             `json:"summary"`
	Capabilities CameraCapabilities `json:"capabilities"`
	TestedAt     time.Time          `json:"tested_at"`
}

// DeviceInfo contains discovered or configured connection info for an IP device.
type DeviceInfo struct {
	Host         string
	Port         int
	RTSPPort     int
	Manufacturer string
	Model        string
	MACAddress   string
	ONVIFURL     string
}

// Credentials contains user authentication data for device access.
type Credentials struct {
	Username string
	Password string
}

// CameraAdapter defines the pluggable interface for vendor and protocol implementations.
type CameraAdapter interface {
	Name() string
	Detect(ctx context.Context, device DeviceInfo) bool
	DiscoverCapabilities(ctx context.Context, device DeviceInfo, credentials Credentials) (CameraCapabilities, error)
	DiscoverStreams(ctx context.Context, device DeviceInfo, credentials Credentials) ([]StreamProfile, error)
	TestConnection(ctx context.Context, cam *Camera, password string) error
}

// AdapterRegistry resolves the appropriate camera adapter for a device.
type AdapterRegistry interface {
	FindAdapter(ctx context.Context, device DeviceInfo) CameraAdapter
	GetAdapter(name string) CameraAdapter
}
