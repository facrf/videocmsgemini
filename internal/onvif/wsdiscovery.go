package onvif

import (
	"context"
	"encoding/xml"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// DiscoveredDevice represents a device located via WS-Discovery or active probe.
type DiscoveredDevice struct {
	IP           string   `json:"ip"`
	Port         int      `json:"port"`
	XAddrs       []string `json:"xaddrs"`
	Types        string   `json:"types"`
	Scopes       []string `json:"scopes"`
	EndpointRef  string   `json:"endpoint_ref"`
	Manufacturer string   `json:"manufacturer"`
	Model        string   `json:"model"`
	MACAddress   string   `json:"mac_address"`
}

const wsDiscoveryMulticastAddr = "239.255.255.250:3702"

// BuildProbeXML creates a WS-Discovery SOAP Probe XML.
func BuildProbeXML() string {
	msgID := "urn:uuid:" + uuid.New().String()
	return fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing"
               xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
               xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <soap:Header>
    <wsa:MessageID>%s</wsa:MessageID>
    <wsa:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>
    <wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
  </soap:Header>
  <soap:Body>
    <d:Probe>
      <d:Types>dn:NetworkVideoTransmitter</d:Types>
    </d:Probe>
  </soap:Body>
</soap:Envelope>`, msgID)
}

// DiscoverWS sends multicast probes and collects responses.
func DiscoverWS(ctx context.Context, timeout time.Duration) ([]DiscoveredDevice, error) {
	addr, err := net.ResolveUDPAddr("udp4", wsDiscoveryMulticastAddr)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve ws-discovery multicast: %w", err)
	}

	conn, err := net.ListenUDP("udp4", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to bind UDP listener: %w", err)
	}
	defer conn.Close()

	probeMsg := []byte(BuildProbeXML())
	if _, err := conn.WriteTo(probeMsg, addr); err != nil {
		return nil, fmt.Errorf("failed to send multicast probe: %w", err)
	}

	var results []DiscoveredDevice
	seenIPs := make(map[string]bool)

	deadline := time.Now().Add(timeout)
	_ = conn.SetReadDeadline(deadline)

	buf := make([]byte, 8192)
	for {
		select {
		case <-ctx.Done():
			return results, nil
		default:
		}

		n, srcAddr, err := conn.ReadFrom(buf)
		if err != nil {
			// Timeout reached
			break
		}

		rawXML := string(buf[:n])
		devices := ParseProbeMatches(rawXML)
		for _, dev := range devices {
			if dev.IP == "" && srcAddr != nil {
				if udpAddr, ok := srcAddr.(*net.UDPAddr); ok {
					dev.IP = udpAddr.IP.String()
				}
			}
			key := fmt.Sprintf("%s:%d", dev.IP, dev.Port)
			if !seenIPs[key] && dev.IP != "" {
				seenIPs[key] = true
				results = append(results, dev)
			}
		}
	}

	return results, nil
}

type probeMatchesEnvelope struct {
	XMLName xml.Name `xml:"Envelope"`
	Body    struct {
		ProbeMatches struct {
			Matches []struct {
				EndpointReference struct {
					Address string `xml:"Address"`
				} `xml:"EndpointReference"`
				Types  string `xml:"Types"`
				Scopes string `xml:"Scopes"`
				XAddrs string `xml:"XAddrs"`
			} `xml:"ProbeMatch"`
		} `xml:"ProbeMatches"`
	} `xml:"Body"`
}

// ParseProbeMatches parses WS-Discovery XML response bytes into DiscoveredDevice items.
func ParseProbeMatches(rawXML string) []DiscoveredDevice {
	var env probeMatchesEnvelope
	if err := xml.Unmarshal([]byte(rawXML), &env); err != nil {
		return nil
	}

	var devices []DiscoveredDevice
	for _, match := range env.Body.ProbeMatches.Matches {
		xaddrs := strings.Fields(match.XAddrs)
		dev := DiscoveredDevice{
			EndpointRef: match.EndpointReference.Address,
			Types:       match.Types,
			Scopes:      strings.Fields(match.Scopes),
			XAddrs:      xaddrs,
			Port:        80,
		}

		// Extract IP, Port from first XAddr
		for _, xa := range xaddrs {
			if u, err := url.Parse(xa); err == nil {
				host := u.Hostname()
				dev.IP = host
				if u.Port() != "" {
					if p, err := strconv.Atoi(u.Port()); err == nil {
						dev.Port = p
					}
				} else if u.Scheme == "https" {
					dev.Port = 443
				}
				break
			}
		}

		// Parse Scopes for onvif://www.onvif.org/name/..., /hardware/..., /location/..., /mac/...
		for _, scope := range dev.Scopes {
			lower := strings.ToLower(scope)
			if strings.Contains(lower, "/name/") {
				parts := strings.Split(scope, "/name/")
				if len(parts) > 1 {
					dev.Model = unescapeScope(parts[1])
				}
			} else if strings.Contains(lower, "/hardware/") {
				parts := strings.Split(scope, "/hardware/")
				if len(parts) > 1 {
					val := unescapeScope(parts[1])
					if dev.Manufacturer == "" {
						dev.Manufacturer = val
					} else if dev.Model == "" {
						dev.Model = val
					}
				}
			} else if strings.Contains(lower, "/manufacturer/") || strings.Contains(lower, "/mfr/") {
				parts := strings.Split(scope, "/")
				if len(parts) > 0 {
					dev.Manufacturer = unescapeScope(parts[len(parts)-1])
				}
			} else if strings.Contains(lower, "/mac/") {
				parts := strings.Split(scope, "/mac/")
				if len(parts) > 1 {
					dev.MACAddress = parts[1]
				}
			}
		}

		// Heuristics for manufacturer if found in scopes or endpoint
		if dev.Manufacturer == "" {
			for _, scope := range dev.Scopes {
				s := strings.ToLower(scope)
				if strings.Contains(s, "dahua") {
					dev.Manufacturer = "Dahua"
				} else if strings.Contains(s, "intelbras") {
					dev.Manufacturer = "Intelbras"
				} else if strings.Contains(s, "hikvision") {
					dev.Manufacturer = "Hikvision"
				} else if strings.Contains(s, "axis") {
					dev.Manufacturer = "Axis"
				} else if strings.Contains(s, "bosch") {
					dev.Manufacturer = "Bosch"
				} else if strings.Contains(s, "hanwha") {
					dev.Manufacturer = "Hanwha"
				}
			}
		}

		devices = append(devices, dev)
	}

	return devices
}

func unescapeScope(s string) string {
	decoded, err := url.QueryUnescape(s)
	if err != nil {
		return s
	}
	return decoded
}
