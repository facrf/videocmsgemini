package onvif

import (
	"context"
	"net/http"
	"testing"
	"time"

	"videocms/internal/testutil/fakecamera"
)

func TestParseProbeMatches(t *testing.T) {
	sampleXML := `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <soap:Body>
    <d:ProbeMatches>
      <d:ProbeMatch>
        <wsa:EndpointReference xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
          <wsa:Address>urn:uuid:12345678-abcd-1234-abcd-1234567890ab</wsa:Address>
        </wsa:EndpointReference>
        <d:Types>dn:NetworkVideoTransmitter</d:Types>
        <d:Scopes>onvif://www.onvif.org/name/IPC-HFW1230S onvif://www.onvif.org/hardware/Dahua onvif://www.onvif.org/mac/a1:b2:c3:d4:e5:f6</d:Scopes>
        <d:XAddrs>http://192.168.1.50:80/onvif/device_service</d:XAddrs>
      </d:ProbeMatch>
    </d:ProbeMatches>
  </soap:Body>
</soap:Envelope>`

	devices := ParseProbeMatches(sampleXML)
	if len(devices) != 1 {
		t.Fatalf("expected 1 device, got %d", len(devices))
	}

	dev := devices[0]
	if dev.IP != "192.168.1.50" {
		t.Errorf("expected IP 192.168.1.50, got %s", dev.IP)
	}
	if dev.Port != 80 {
		t.Errorf("expected port 80, got %d", dev.Port)
	}
	if dev.Manufacturer != "Dahua" {
		t.Errorf("expected manufacturer Dahua, got %s", dev.Manufacturer)
	}
	if dev.Model != "IPC-HFW1230S" {
		t.Errorf("expected model IPC-HFW1230S, got %s", dev.Model)
	}
	if dev.MACAddress != "a1:b2:c3:d4:e5:f6" {
		t.Errorf("expected MAC a1:b2:c3:d4:e5:f6, got %s", dev.MACAddress)
	}
}

func TestONVIFClientAgainstFakeCamera(t *testing.T) {
	fake, err := fakecamera.NewFakeCamera("Intelbras", "VIP 1230 B", false)
	if err != nil {
		t.Fatalf("failed to start fake camera: %v", err)
	}
	defer fake.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	deviceURL := fake.HTTPServer.URL + "/onvif/device_service"
	client := NewClient(deviceURL, "admin", "secret123", http.DefaultClient)

	// 1. Test GetDeviceInformation
	info, err := client.GetDeviceInformation(ctx)
	if err != nil {
		t.Fatalf("GetDeviceInformation failed: %v", err)
	}
	if info.Manufacturer != "Intelbras" || info.Model != "VIP 1230 B" {
		t.Errorf("unexpected device info: %+v", info)
	}

	// 2. Test GetCapabilities
	caps, err := client.GetCapabilities(ctx)
	if err != nil {
		t.Fatalf("GetCapabilities failed: %v", err)
	}
	if caps.MediaXAddr == "" {
		t.Errorf("expected non-empty MediaXAddr")
	}

	// 3. Test GetProfiles
	profiles, err := client.GetProfiles(ctx, caps.MediaXAddr)
	if err != nil {
		t.Fatalf("GetProfiles failed: %v", err)
	}
	if len(profiles) < 2 {
		t.Fatalf("expected at least 2 profiles, got %d", len(profiles))
	}

	// 4. Test GetStreamUri
	mainURI, err := client.GetStreamURI(ctx, caps.MediaXAddr, profiles[0].Token)
	if err != nil {
		t.Fatalf("GetStreamURI failed: %v", err)
	}
	if mainURI == "" {
		t.Errorf("expected non-empty stream URI")
	}

	// 5. Test GetSnapshotUri and FetchSnapshot
	snapURI, err := client.GetSnapshotURI(ctx, caps.MediaXAddr, profiles[0].Token)
	if err != nil {
		t.Fatalf("GetSnapshotURI failed: %v", err)
	}
	snapData, contentType, err := client.FetchSnapshot(ctx, snapURI)
	if err != nil {
		t.Fatalf("FetchSnapshot failed: %v", err)
	}
	if len(snapData) == 0 || contentType != "image/jpeg" {
		t.Errorf("invalid snapshot returned, len=%d, type=%s", len(snapData), contentType)
	}
}
