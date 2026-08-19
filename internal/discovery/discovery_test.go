package discovery_test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"videocms/internal/camera"
	"videocms/internal/database"
	"videocms/internal/discovery"
	"videocms/internal/events"
	"videocms/internal/network"
	"videocms/internal/testutil/fakecamera"
)

func TestExpandCIDR(t *testing.T) {
	ips, err := discovery.ExpandCIDR("192.168.1.0/29")
	if err != nil {
		t.Fatalf("ExpandCIDR failed: %v", err)
	}
	// /29 has 8 total addresses, minus network and broadcast = 6 host addresses
	if len(ips) != 6 {
		t.Errorf("expected 6 IPs, got %d", len(ips))
	}
}

func TestDiscoveryJobAndAddCamera(t *testing.T) {
	dbPath := "./test_disc_db.sqlite"
	defer os.Remove(dbPath)

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	fake, err := fakecamera.NewFakeCamera("Hikvision", "DS-2CD2042WD-I", false)
	if err != nil {
		t.Fatalf("failed to start fake camera: %v", err)
	}
	defer fake.Close()

	validator, err := network.NewNetworkValidator([]string{"127.0.0.1/32"})
	if err != nil {
		t.Fatalf("failed to create validator: %v", err)
	}

	secretKey := "test-secret-key-32-bytes-len!!!"
	camRepo := camera.NewRepository(db, secretKey)
	scanner := discovery.NewScanner(validator, 4, 1*time.Second)
	broker := events.NewBroker()
	discService := discovery.NewService(db, scanner, validator, broker, camRepo)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Start job with loopback IP /32
	job, err := discService.StartJob(ctx, "lo", "127.0.0.1/32")
	if err != nil {
		t.Fatalf("StartJob failed: %v", err)
	}

	// Wait briefly for job to complete
	time.Sleep(500 * time.Millisecond)

	fetchedJob, err := discService.GetJob(ctx, job.ID)
	if err != nil {
		t.Fatalf("GetJob failed: %v", err)
	}
	if fetchedJob.ID != job.ID {
		t.Errorf("job ID mismatch: %s vs %s", fetchedJob.ID, job.ID)
	}

	// Manually add a fake discovered result to test Probe and AddDeviceToCameras
	res := &discovery.DiscoveryResult{
		ID:            "dev-123",
		JobID:         job.ID,
		IP:            fake.Host,
		Port:          fake.HTTPPort,
		Manufacturer:  "Hikvision",
		Model:         "DS-2CD2042WD-I",
		ONVIFURL:      fake.HTTPServer.URL + "/onvif/device_service",
		DiscoveredVia: "scan",
		ProbeStatus:   "pending",
		CreatedAt:     time.Now().UTC(),
	}
	_, err = db.ExecContext(ctx, `INSERT INTO discovery_results (id, job_id, ip, port, manufacturer, model, onvif_url, discovered_via, probe_status, probe_details_json, created_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, res.ID, res.JobID, res.IP, res.Port, res.Manufacturer, res.Model, res.ONVIFURL, res.DiscoveredVia, res.ProbeStatus, "{}", res.CreatedAt)
	if err != nil {
		t.Fatalf("insert fake discovery result failed: %v", err)
	}

	// Test ProbeDevice
	probed, err := discService.ProbeDevice(ctx, job.ID, "dev-123", "admin", "secret123")
	if err != nil {
		t.Fatalf("ProbeDevice failed: %v", err)
	}
	if probed.ProbeStatus != "probed" {
		t.Errorf("expected probe status 'probed', got %s", probed.ProbeStatus)
	}

	// Test AddDeviceToCameras
	cam, err := discService.AddDeviceToCameras(ctx, job.ID, "dev-123", "New Discovered Camera", "admin", "secret123")
	if err != nil {
		t.Fatalf("AddDeviceToCameras failed: %v", err)
	}
	if cam.Name != "New Discovered Camera" || cam.Host != fake.Host {
		t.Errorf("saved camera mismatch: %+v", cam)
	}

	// Verify in camRepo
	saved, err := camRepo.GetByID(ctx, cam.ID)
	if err != nil {
		t.Fatalf("GetByID from camRepo failed: %v", err)
	}
	if saved.Name != "New Discovered Camera" {
		fmt.Printf("saved name: %s\n", saved.Name)
	}
}
