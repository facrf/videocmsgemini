package discovery

import (
	"encoding/json"
	"time"
)

// JobStatus represents the state of a discovery task.
type JobStatus string

const (
	StatusQueued    JobStatus = "queued"
	StatusRunning   JobStatus = "running"
	StatusCompleted JobStatus = "completed"
	StatusCancelled JobStatus = "cancelled"
	StatusFailed    JobStatus = "failed"
)

// DiscoveryJob holds execution state and progress of a network scan.
type DiscoveryJob struct {
	ID            string            `json:"id"`
	InterfaceName string            `json:"interface_name"`
	CIDR          string            `json:"cidr"`
	Status        JobStatus         `json:"status"`
	Progress      int               `json:"progress"` // 0-100%
	TotalHosts    int               `json:"total_hosts"`
	ScannedHosts  int               `json:"scanned_hosts"`
	FoundDevices  int               `json:"found_devices"`
	ErrorMessage  string            `json:"error_message,omitempty"`
	CreatedAt     time.Time         `json:"created_at"`
	CompletedAt   *time.Time        `json:"completed_at,omitempty"`
	Results       []DiscoveryResult `json:"results,omitempty"`
}

// DiscoveryResult represents a single discovered camera or device.
type DiscoveryResult struct {
	ID               string                 `json:"id"`
	JobID            string                 `json:"job_id"`
	IP               string                 `json:"ip"`
	Port             int                    `json:"port"`
	MACAddress       string                 `json:"mac_address"`
	Manufacturer     string                 `json:"manufacturer"`
	Model            string                 `json:"model"`
	ONVIFURL         string                 `json:"onvif_url"`
	DiscoveredVia    string                 `json:"discovered_via"` // "ws_discovery" or "scan"
	ProbeStatus      string                 `json:"probe_status"`   // "pending", "probed", "auth_required", "unsupported"
	ProbeDetailsJSON string                 `json:"-"`
	ProbeDetails     map[string]interface{} `json:"probe_details,omitempty"`
	CreatedAt        time.Time              `json:"created_at"`
}

// NetworkInterfaceInfo describes a local network card with its active subnets.
type NetworkInterfaceInfo struct {
	Name         string   `json:"name"`
	HardwareAddr string   `json:"hardware_addr"`
	IPs          []string `json:"ips"`
	Subnets      []string `json:"subnets"`
}

func (r *DiscoveryResult) MarshalProbeDetails() string {
	if r.ProbeDetails == nil {
		return "{}"
	}
	b, err := json.Marshal(r.ProbeDetails)
	if err != nil {
		return "{}"
	}
	return string(b)
}

func UnmarshalProbeDetails(raw string) map[string]interface{} {
	var details map[string]interface{}
	if raw == "" {
		return make(map[string]interface{})
	}
	_ = json.Unmarshal([]byte(raw), &details)
	return details
}
