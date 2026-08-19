package network

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strings"
	"syscall"
	"time"
)

var (
	ErrDisallowedNetwork = errors.New("destination IP is not in the allowed network ranges (SSRF protection)")
	ErrInvalidAddress    = errors.New("invalid address or host")
	ErrNoValidIP         = errors.New("no valid IP address found for host")
	ErrRedirectBlocked   = errors.New("redirect blocked: destination IP is outside allowed networks")
)

// NetworkValidator checks if IPs or hostnames belong to allowed CIDR networks.
type NetworkValidator struct {
	allowedPrefixes []*net.IPNet
}

// NewNetworkValidator parses a list of CIDR strings into a NetworkValidator.
func NewNetworkValidator(allowedCIDRs []string) (*NetworkValidator, error) {
	var prefixes []*net.IPNet
	for _, cidr := range allowedCIDRs {
		cidr = strings.TrimSpace(cidr)
		if cidr == "" {
			continue
		}
		// If single IP without mask, append /32 or /128
		if !strings.Contains(cidr, "/") {
			if ip := net.ParseIP(cidr); ip != nil {
				if ip.To4() != nil {
					cidr += "/32"
				} else {
					cidr += "/128"
				}
			}
		}
		_, ipNet, err := net.ParseCIDR(cidr)
		if err != nil {
			return nil, fmt.Errorf("invalid CIDR %q: %w", cidr, err)
		}
		prefixes = append(prefixes, ipNet)
	}

	return &NetworkValidator{
		allowedPrefixes: prefixes,
	}, nil
}

// IsIPAllowed checks if a specific IP is allowed.
func (nv *NetworkValidator) IsIPAllowed(ip net.IP) bool {
	if ip == nil {
		return false
	}

	// Always block link-local metadata (169.254.169.254 / fe80::) unless explicitly permitted
	if ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
		for _, prefix := range nv.allowedPrefixes {
			if prefix.Contains(ip) {
				return true
			}
		}
		return false
	}

	for _, prefix := range nv.allowedPrefixes {
		if prefix.Contains(ip) {
			return true
		}
	}
	return false
}

// ValidateIP validates an IP string directly against the allowlist.
func (nv *NetworkValidator) ValidateIP(ipStr string) error {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return ErrInvalidAddress
	}
	if !nv.IsIPAllowed(ip) {
		return fmt.Errorf("%w: %s", ErrDisallowedNetwork, ipStr)
	}
	return nil
}

// ValidateHost checks if all resolved IPs for a host belong to allowed networks.
func (nv *NetworkValidator) ValidateHost(ctx context.Context, host string) ([]net.IP, error) {
	// Strip port if present
	h, _, err := net.SplitHostPort(host)
	if err != nil {
		h = host // host without port
	}

	// If direct IP
	if ip := net.ParseIP(h); ip != nil {
		if !nv.IsIPAllowed(ip) {
			return nil, fmt.Errorf("%w: %s", ErrDisallowedNetwork, ip.String())
		}
		return []net.IP{ip}, nil
	}

	// Resolve DNS
	resolver := net.DefaultResolver
	ips, err := resolver.LookupIP(ctx, "ip", h)
	if err != nil {
		return nil, fmt.Errorf("DNS resolution failed for %q: %w", h, err)
	}
	if len(ips) == 0 {
		return nil, ErrNoValidIP
	}

	for _, ip := range ips {
		if !nv.IsIPAllowed(ip) {
			return nil, fmt.Errorf("%w: resolved %s for %s", ErrDisallowedNetwork, ip.String(), h)
		}
	}

	return ips, nil
}

// SafeDialer returns a custom dial function that validates target IPs on every dial.
func (nv *NetworkValidator) SafeDialer(timeout time.Duration) func(ctx context.Context, network, addr string) (net.Conn, error) {
	dialer := &net.Dialer{
		Timeout: timeout,
		Control: func(network, address string, c syscall.RawConn) error {
			return nil
		},
	}

	return func(ctx context.Context, networkType, addr string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(addr)
		if err != nil {
			return nil, err
		}

		ips, err := nv.ValidateHost(ctx, host)
		if err != nil {
			return nil, err
		}

		// Dial the first valid resolved IP directly to avoid DNS rebinding race
		var lastErr error
		for _, ip := range ips {
			target := net.JoinHostPort(ip.String(), port)
			conn, err := dialer.DialContext(ctx, networkType, target)
			if err == nil {
				return conn, nil
			}
			lastErr = err
		}

		if lastErr != nil {
			return nil, lastErr
		}
		return nil, errors.New("failed to connect to resolved addresses")
	}
}

// NewSafeHTTPClient creates an http.Client with SSRF protection, timeout, and safe redirect checking.
func (nv *NetworkValidator) NewSafeHTTPClient(timeout time.Duration) *http.Client {
	transport := &http.Transport{
		DialContext:           nv.SafeDialer(timeout),
		TLSHandshakeTimeout:   timeout,
		ResponseHeaderTimeout: timeout,
		MaxIdleConns:          50,
		IdleConnTimeout:       30 * time.Second,
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   timeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return errors.New("stopped after 10 redirects")
			}
			host := req.URL.Hostname()
			if _, err := nv.ValidateHost(req.Context(), host); err != nil {
				return fmt.Errorf("%w: %v", ErrRedirectBlocked, err)
			}
			return nil
		},
	}

	return client
}
