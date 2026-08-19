package network

import (
	"context"
	"net"
	"testing"
	"time"
)

func TestNetworkValidatorAllowed(t *testing.T) {
	allowed := []string{"192.168.0.0/16", "10.0.0.0/8", "127.0.0.1/32"}
	nv, err := NewNetworkValidator(allowed)
	if err != nil {
		t.Fatalf("failed to create validator: %v", err)
	}

	// Allowed test cases
	allowedIPs := []string{
		"192.168.1.1",
		"192.168.100.55",
		"10.20.30.40",
		"127.0.0.1",
	}
	for _, ipStr := range allowedIPs {
		ip := net.ParseIP(ipStr)
		if !nv.IsIPAllowed(ip) {
			t.Errorf("expected IP %s to be allowed", ipStr)
		}
	}

	// Blocked test cases (Public, Cloud metadata, etc)
	blockedIPs := []string{
		"8.8.8.8",
		"1.1.1.1",
		"169.254.169.254", // AWS/GCP metadata
		"172.20.0.1",      // Not in allowlist
		"0.0.0.0",
	}
	for _, ipStr := range blockedIPs {
		ip := net.ParseIP(ipStr)
		if nv.IsIPAllowed(ip) {
			t.Errorf("expected IP %s to be blocked", ipStr)
		}
	}
}

func TestValidateHost(t *testing.T) {
	nv, err := NewNetworkValidator([]string{"127.0.0.1/32", "192.168.0.0/16"})
	if err != nil {
		t.Fatalf("failed to create validator: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// Direct IP
	ips, err := nv.ValidateHost(ctx, "192.168.1.50:80")
	if err != nil || len(ips) == 0 {
		t.Errorf("expected direct valid IP to pass, got error: %v", err)
	}

	// Public IP should fail
	_, err = nv.ValidateHost(ctx, "93.184.216.34:80") // example.com
	if err == nil {
		t.Errorf("expected public IP validation to fail SSRF check")
	}
}
