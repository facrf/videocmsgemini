package discovery

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"videocms/internal/network"
	"videocms/internal/onvif"
)

var defaultCandidatePorts = []int{80, 554, 8000, 8080, 8899, 443}

// Scanner performs controlled network scanning and fingerprinting.
type Scanner struct {
	validator      *network.NetworkValidator
	maxConcurrency int
	scanTimeout    time.Duration
}

// NewScanner creates a new Scanner.
func NewScanner(validator *network.NetworkValidator, maxConcurrency int, scanTimeout time.Duration) *Scanner {
	if maxConcurrency <= 0 {
		maxConcurrency = 32
	}
	if scanTimeout <= 0 {
		scanTimeout = 2 * time.Second
	}
	return &Scanner{
		validator:      validator,
		maxConcurrency: maxConcurrency,
		scanTimeout:    scanTimeout,
	}
}

// ExpandCIDR parses a CIDR and returns all host IPs.
func ExpandCIDR(cidr string) ([]net.IP, error) {
	ip, ipNet, err := net.ParseCIDR(cidr)
	if err != nil {
		return nil, err
	}

	var ips []net.IP
	for currentIP := ip.Mask(ipNet.Mask); ipNet.Contains(currentIP); incIP(currentIP) {
		// Clone IP
		dup := make(net.IP, len(currentIP))
		copy(dup, currentIP)
		ips = append(ips, dup)
	}

	// Remove network and broadcast addresses for IPv4 /24 to /30
	if len(ips) > 2 && ip.To4() != nil {
		return ips[1 : len(ips)-1], nil
	}
	return ips, nil
}

func incIP(ip net.IP) {
	for j := len(ip) - 1; j >= 0; j-- {
		ip[j]++
		if ip[j] > 0 {
			break
		}
	}
}

// ScanResultCallback is called whenever a new device is found or progress updates.
type ScanProgressCallback func(scannedCount, foundCount, total int, newDevice *DiscoveryResult)

// ScanCIDR executes the full scan over the specified CIDR.
func (s *Scanner) ScanCIDR(ctx context.Context, cidr string, onProgress ScanProgressCallback) ([]DiscoveryResult, error) {
	var results []DiscoveryResult
	var resultsMu sync.Mutex
	seen := make(map[string]bool)

	// 1. Run WS-Discovery first (or in parallel) to find active ONVIF devices quickly
	wsDevices, _ := onvif.DiscoverWS(ctx, 1200*time.Millisecond)
	for _, wsDev := range wsDevices {
		if wsDev.IP == "" {
			continue
		}
		ipParsed := net.ParseIP(wsDev.IP)
		if !s.validator.IsIPAllowed(ipParsed) {
			continue
		}

		key := fmt.Sprintf("%s:%d", wsDev.IP, wsDev.Port)
		if !seen[key] {
			seen[key] = true
			onvifURL := ""
			if len(wsDev.XAddrs) > 0 {
				onvifURL = wsDev.XAddrs[0]
			}
			res := DiscoveryResult{
				IP:            wsDev.IP,
				Port:          wsDev.Port,
				MACAddress:    wsDev.MACAddress,
				Manufacturer:  wsDev.Manufacturer,
				Model:         wsDev.Model,
				ONVIFURL:      onvifURL,
				DiscoveredVia: "ws_discovery",
				ProbeStatus:   "pending",
				CreatedAt:     time.Now().UTC(),
			}
			results = append(results, res)
			if onProgress != nil {
				onProgress(0, len(results), 0, &res)
			}
		}
	}

	if cidr == "" {
		return results, nil
	}

	ips, err := ExpandCIDR(cidr)
	if err != nil {
		return results, fmt.Errorf("invalid CIDR %q: %w", cidr, err)
	}

	// Filter out disallowed IPs per SSRF policy
	var allowedIPs []net.IP
	for _, ip := range ips {
		if s.validator.IsIPAllowed(ip) {
			allowedIPs = append(allowedIPs, ip)
		}
	}

	total := len(allowedIPs)
	if total == 0 {
		return results, nil
	}

	// Bounded worker pool
	jobs := make(chan net.IP, total)
	for _, ip := range allowedIPs {
		jobs <- ip
	}
	close(jobs)

	var scannedCount int64
	var wg sync.WaitGroup
	workers := s.maxConcurrency
	if total < workers {
		workers = total
	}

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for ip := range jobs {
				select {
				case <-ctx.Done():
					return
				default:
				}

				dev := s.probeIP(ctx, ip.String())
				curScanned := int(atomic.AddInt64(&scannedCount, 1))

				if dev != nil {
					key := fmt.Sprintf("%s:%d", dev.IP, dev.Port)
					resultsMu.Lock()
					if !seen[key] {
						seen[key] = true
						results = append(results, *dev)
						resultsMu.Unlock()
						if onProgress != nil {
							onProgress(curScanned, len(results), total, dev)
						}
					} else {
						resultsMu.Unlock()
						if onProgress != nil {
							onProgress(curScanned, len(results), total, nil)
						}
					}
				} else {
					if onProgress != nil && (curScanned%5 == 0 || curScanned == total) {
						resultsMu.Lock()
						found := len(results)
						resultsMu.Unlock()
						onProgress(curScanned, found, total, nil)
					}
				}
			}
		}()
	}

	wg.Wait()
	return results, nil
}

func (s *Scanner) probeIP(ctx context.Context, ipStr string) *DiscoveryResult {
	dialer := s.validator.SafeDialer(s.scanTimeout)

	var openPorts []int
	for _, port := range defaultCandidatePorts {
		select {
		case <-ctx.Done():
			return nil
		default:
		}

		conn, err := dialer(ctx, "tcp", fmt.Sprintf("%s:%d", ipStr, port))
		if err == nil {
			_ = conn.Close()
			openPorts = append(openPorts, port)
		}
	}

	if len(openPorts) == 0 {
		return nil
	}

	primaryPort := openPorts[0]
	res := &DiscoveryResult{
		IP:            ipStr,
		Port:          primaryPort,
		DiscoveredVia: "scan",
		ProbeStatus:   "pending",
		CreatedAt:     time.Now().UTC(),
		ProbeDetails: map[string]interface{}{
			"open_ports": openPorts,
		},
	}

	// Fingerprint HTTP / ONVIF / RTSP
	httpClient := s.validator.NewSafeHTTPClient(1500 * time.Millisecond)

	for _, port := range openPorts {
		if port == 554 {
			continue
		}
		// Test ONVIF SOAP endpoint
		onvifURL := fmt.Sprintf("http://%s:%d/onvif/device_service", ipStr, port)
		onvifClient := onvif.NewClient(onvifURL, "", "", httpClient)
		_, err := onvifClient.SendSOAP(ctx, onvifURL, "http://www.onvif.org/ver10/device/wsdl/GetDeviceInformation", `<tds:GetDeviceInformation/>`)
		if err == nil || isAuthError(err) {
			res.Port = port
			res.ONVIFURL = onvifURL
			res.ProbeStatus = "probed"
			break
		}

		// Try HTTP banner probe
		httpURL := fmt.Sprintf("http://%s:%d/", ipStr, port)
		req, _ := http.NewRequestWithContext(ctx, "GET", httpURL, nil)
		if resp, err := httpClient.Do(req); err == nil {
			serverHdr := strings.ToLower(resp.Header.Get("Server"))
			if strings.Contains(serverHdr, "dahua") {
				res.Manufacturer = "Dahua"
			} else if strings.Contains(serverHdr, "hikvision") {
				res.Manufacturer = "Hikvision"
			} else if strings.Contains(serverHdr, "intelbras") {
				res.Manufacturer = "Intelbras"
			}
			resp.Body.Close()
		}
	}

	return res
}

func isAuthError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "auth") || strings.Contains(msg, "unauthorized") || strings.Contains(msg, "401")
}
