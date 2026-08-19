package security

import (
	"testing"
)

func TestRedactURL(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{
			input:    "rtsp://admin:pass123@192.168.1.50:554/cam/realmonitor?channel=1&subtype=0",
			expected: "rtsp://192.168.1.50:554/cam/realmonitor?channel=1&subtype=0",
		},
		{
			input:    "http://user:secret@10.0.0.20:80/onvif/device_service",
			expected: "http://10.0.0.20:80/onvif/device_service",
		},
		{
			input:    "rtsp://192.168.1.50:554/live",
			expected: "rtsp://192.168.1.50:554/live",
		},
	}

	for _, tc := range tests {
		result := RedactURL(tc.input)
		if result != tc.expected {
			t.Errorf("RedactURL(%q) = %q; want %q", tc.input, result, tc.expected)
		}
	}
}

func TestRedactString(t *testing.T) {
	logMsg := `Connecting to rtsp://admin:secret123@192.168.1.100 with Authorization: Basic YWRtaW46c2VjcmV0 and {"password": "mypassword"}`
	sanitized := RedactString(logMsg)

	if contains(sanitized, "secret123") {
		t.Errorf("Sanitized log still contains secret123: %s", sanitized)
	}
	if contains(sanitized, "mypassword") {
		t.Errorf("Sanitized log still contains mypassword: %s", sanitized)
	}
	if contains(sanitized, "YWRtaW46c2VjcmV0") {
		t.Errorf("Sanitized log still contains basic auth token: %s", sanitized)
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || (len(s) > 0 && len(substr) > 0 && indexOf(s, substr) >= 0))
}

func indexOf(s, substr string) int {
	for i := 0; i+len(substr) <= len(s); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}
