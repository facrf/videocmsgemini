package network

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"videocms/internal/security"
)

func TestSecurityPublicIPRejection(t *testing.T) {
	// Standard private allowlist
	validator, err := NewNetworkValidator([]string{"10.0.0.0/8", "192.168.0.0/16", "172.16.0.0/12"})
	if err != nil {
		t.Fatalf("Failed to create validator: %v", err)
	}

	publicIPs := []string{
		"8.8.8.8",
		"1.1.1.1",
		"142.250.190.46",
		"169.254.169.254", // Cloud metadata
		"200.147.3.157",
	}

	for _, ip := range publicIPs {
		err := validator.ValidateIP(ip)
		if err == nil {
			t.Errorf("Expected public/cloud IP %s to be rejected by SSRF validator, but was allowed", ip)
		}
	}
}

func TestSecurityInvalidCIDRNoPanic(t *testing.T) {
	invalidCIDRs := []string{
		"invalid",
		"999.999.999.999/99",
		"192.168.1.1/33",
		"-1",
		"http://192.168.1.1",
	}

	for _, cidr := range invalidCIDRs {
		_, err := NewNetworkValidator([]string{cidr})
		// Should return an error, but NEVER panic
		if err == nil {
			t.Errorf("Expected invalid CIDR '%s' to return error", cidr)
		}
	}
}

func TestSecuritySafeHTTPRedirectProtection(t *testing.T) {
	// Setup malicious redirect server that tries to redirect to blocked public IP
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "http://169.254.169.254/latest/meta-data/", http.StatusFound)
	}))
	defer ts.Close()

	validator, err := NewNetworkValidator([]string{"127.0.0.0/8"})
	if err != nil {
		t.Fatalf("Validator init failed: %v", err)
	}

	client := validator.NewSafeHTTPClient(2 * time.Second)
	req, err := http.NewRequestWithContext(context.Background(), "GET", ts.URL, nil)
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}

	_, err = client.Do(req)
	if err == nil {
		t.Errorf("Expected redirect to 169.254.169.254 to be blocked by SafeHTTPClient, but it succeeded")
	}
}

func TestSecurityPasswordRedaction(t *testing.T) {
	rawLog := "Connecting to rtsp://admin:P@ssw0rd123!@192.168.1.50:554/live and Authorization: Basic YWRtaW46cGFzc3dvcmQ="
	sanitized := security.RedactString(rawLog)

	if sanitized == rawLog {
		t.Errorf("Expected password to be redacted from log string")
	}

	redactedURL := security.RedactURL("rtsp://user:secret123@192.168.1.1:554/cam")
	if redactedURL != "rtsp://192.168.1.1:554/cam" {
		t.Errorf("Expected URL credentials to be stripped, got %q", redactedURL)
	}
}
