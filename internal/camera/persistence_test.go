package camera_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"videocms/internal/camera"
	"videocms/internal/database"
)

func TestServerRestartAndPersistence(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "restart_test.db")
	secretKey := "super-secret-test-key-32-chars!!"

	ctx := context.Background()

	// 1. Initial Start: Initialize DB and create resources
	db1, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}

	repo1 := camera.NewRepository(db1, secretKey)

	cam1 := &camera.Camera{
		Name:         "Camera Portaria",
		Host:         "192.168.1.100",
		Port:         80,
		RTSPPort:     554,
		Manufacturer: "Intelbras",
		Model:        "VIP 1230 B",
		Username:     "admin",
		Password:     "SecretPassword123!",
		Tags:         []string{"externa", "portaria"},
		Groups:       []string{"Perímetro"},
		Enabled:      true,
		Status:       camera.StatusOnline,
	}

	if err := repo1.Create(ctx, cam1); err != nil {
		t.Fatalf("Failed to create camera: %v", err)
	}

	layout1 := &camera.Layout{
		Name:      "Layout Portaria",
		GridSize:  4,
		IsDefault: true,
		Items: []camera.LayoutItem{
			{Position: 0, CameraID: cam1.ID, PreferredProfile: "sub"},
		},
	}
	if err := repo1.CreateLayout(ctx, layout1); err != nil {
		t.Fatalf("Failed to create layout: %v", err)
	}

	// Close database (simulate server shutdown)
	if err := db1.Close(); err != nil {
		t.Fatalf("Failed to close DB: %v", err)
	}

	// 2. Server Restart: Reopen database and verify persistent state
	db2, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Failed to reopen database after restart: %v", err)
	}
	defer db2.Close()

	repo2 := camera.NewRepository(db2, secretKey)

	// Verify Camera persisted
	cams, err := repo2.List(ctx)
	if err != nil {
		t.Fatalf("Failed to list cameras after restart: %v", err)
	}
	if len(cams) != 1 {
		t.Fatalf("Expected 1 camera after restart, got %d", len(cams))
	}
	if cams[0].Name != "Camera Portaria" || cams[0].Host != "192.168.1.100" {
		t.Errorf("Camera data mismatch: %+v", cams[0])
	}

	// Verify password decryption after restart
	decryptedPass, err := repo2.GetDecryptedPassword(ctx, cam1.ID)
	if err != nil {
		t.Fatalf("Failed to decrypt password after restart: %v", err)
	}
	if decryptedPass != "SecretPassword123!" {
		t.Errorf("Expected password 'SecretPassword123!', got '%s'", decryptedPass)
	}

	// Verify Tags & Groups persisted
	if len(cams[0].Tags) != 2 || len(cams[0].Groups) != 1 {
		t.Errorf("Tags/Groups not persisted properly: tags=%v, groups=%v", cams[0].Tags, cams[0].Groups)
	}

	// Verify Layout persisted
	layouts, err := repo2.ListLayouts(ctx)
	if err != nil {
		t.Fatalf("Failed to list layouts after restart: %v", err)
	}
	if len(layouts) != 1 {
		t.Fatalf("Expected 1 layout after restart, got %d", len(layouts))
	}
	if layouts[0].Name != "Layout Portaria" || !layouts[0].IsDefault {
		t.Errorf("Layout mismatch: %+v", layouts[0])
	}
	if len(layouts[0].Items) != 1 || layouts[0].Items[0].CameraID != cam1.ID {
		t.Errorf("Layout items mismatch: %+v", layouts[0].Items)
	}

	// Clean test file
	_ = os.Remove(dbPath)
}
