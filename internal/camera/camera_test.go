package camera_test

import (
	"context"
	"os"
	"testing"
	"time"

	"videocms/internal/camera"
	"videocms/internal/database"
	"videocms/internal/events"
	"videocms/internal/network"
	"videocms/internal/testutil/fakecamera"
	"videocms/internal/vendors"
)

func TestCameraCRUDAndDiagnostics(t *testing.T) {
	dbPath := "./test_cam_db.sqlite"
	defer os.Remove(dbPath)

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	fake, err := fakecamera.NewFakeCamera("Dahua", "IPC-HFW4431R-Z", false)
	if err != nil {
		t.Fatalf("failed to start fake camera: %v", err)
	}
	defer fake.Close()

	validator, err := network.NewNetworkValidator([]string{"127.0.0.1/32"})
	if err != nil {
		t.Fatalf("failed to create validator: %v", err)
	}

	secretKey := "test-secret-key-32-bytes-len!!!"
	repo := camera.NewRepository(db, secretKey)
	registry := vendors.NewRegistry(validator)
	broker := events.NewBroker()
	service := camera.NewService(repo, validator, registry, broker)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cam := &camera.Camera{
		Name:         "Entrance Dahua",
		Host:         fake.Host,
		Port:         fake.HTTPPort,
		RTSPPort:     fake.RTSPPort,
		Manufacturer: "Dahua",
		Model:        "IPC-HFW4431R-Z",
		Username:     "admin",
		Password:     "secret123",
		Tags:         []string{"entrance", "gate"},
		Groups:       []string{"Perimeter"},
	}

	// 1. Create
	if err := service.CreateCamera(ctx, cam); err != nil {
		t.Fatalf("CreateCamera failed: %v", err)
	}

	// 2. GetByID
	fetched, err := service.GetCamera(ctx, cam.ID)
	if err != nil {
		t.Fatalf("GetCamera failed: %v", err)
	}
	if fetched.Name != "Entrance Dahua" || fetched.Host != fake.Host {
		t.Errorf("fetched camera mismatch: %+v", fetched)
	}
	if !fetched.HasPassword {
		t.Errorf("expected HasPassword to be true")
	}
	if len(fetched.Tags) != 2 || len(fetched.Groups) != 1 {
		t.Errorf("tags/groups not populated: tags=%v, groups=%v", fetched.Tags, fetched.Groups)
	}

	// 3. TestConnection
	if err := service.TestCamera(ctx, cam.ID, ""); err != nil {
		t.Fatalf("TestCamera failed: %v", err)
	}

	// 4. Run Diagnostics
	report, err := service.RunDiagnostics(ctx, cam.ID)
	if err != nil {
		t.Fatalf("RunDiagnostics failed: %v", err)
	}
	if !report.Passed {
		t.Errorf("expected diagnostic report to pass, got summary: %s", report.Summary)
	}
	if len(report.Stages) != 10 {
		t.Errorf("expected 10 diagnostic stages, got %d", len(report.Stages))
	}

	// 5. Get Snapshot
	snapData, ctype, err := service.GetSnapshot(ctx, cam.ID)
	if err != nil {
		t.Fatalf("GetSnapshot failed: %v", err)
	}
	if len(snapData) == 0 || ctype != "image/jpeg" {
		t.Errorf("invalid snapshot returned")
	}

	// 6. Delete
	if err := service.DeleteCamera(ctx, cam.ID); err != nil {
		t.Fatalf("DeleteCamera failed: %v", err)
	}

	// 7. Verify deletion
	_, err = service.GetCamera(ctx, cam.ID)
	if err == nil {
		t.Errorf("expected ErrCameraNotFound after delete, got nil")
	}
}
