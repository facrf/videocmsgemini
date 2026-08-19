package streaming_test

import (
	"context"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"videocms/internal/camera"
	"videocms/internal/database"
	"videocms/internal/events"
	"videocms/internal/network"
	"videocms/internal/streaming"
	"videocms/internal/testutil/fakecamera"
	"videocms/internal/vendors"
)

func TestStreamManagerLifecycle(t *testing.T) {
	dbPath := "./test_stream_db.sqlite"
	defer os.Remove(dbPath)

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	fake, err := fakecamera.NewFakeCamera("Intelbras", "VIP 1230", false)
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
	camService := camera.NewService(repo, validator, registry, broker)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cam := &camera.Camera{
		Name:         "Stream Test Cam",
		Host:         fake.Host,
		Port:         fake.HTTPPort,
		RTSPPort:     fake.RTSPPort,
		Manufacturer: "Intelbras",
		Model:        "VIP 1230",
		Username:     "admin",
		Password:     "secret123",
	}
	if err := camService.CreateCamera(ctx, cam); err != nil {
		t.Fatalf("CreateCamera failed: %v", err)
	}

	streamMgr := streaming.NewStreamManager(camService, validator, broker)

	// 1. Start or reuse stream
	stream1, err := streamMgr.GetOrCreateStream(ctx, cam.ID, "sub")
	if err != nil {
		t.Fatalf("GetOrCreateStream failed: %v", err)
	}

	// 2. Second viewer requests the same camera stream - must share the stream
	stream2, err := streamMgr.GetOrCreateStream(ctx, cam.ID, "sub")
	if err != nil {
		t.Fatalf("GetOrCreateStream 2 failed: %v", err)
	}
	if stream1 != stream2 {
		t.Errorf("expected stream1 and stream2 to be the exact same shared instance")
	}

	if streamMgr.GetActiveStreamCount() != 1 {
		t.Errorf("expected 1 active stream, got %d", streamMgr.GetActiveStreamCount())
	}

	// 3. Test HTTP MJPEG handler with short request context
	reqCtx, reqCancel := context.WithTimeout(context.Background(), 400*time.Millisecond)
	defer reqCancel()

	req := httptest.NewRequest("GET", "/api/cameras/"+cam.ID+"/live", nil).WithContext(reqCtx)
	rec := httptest.NewRecorder()

	streamMgr.ServeMJPEG(rec, req, cam.ID, "sub")

	if rec.Header().Get("Content-Type") != "multipart/x-mixed-replace; boundary=videocms_mjpeg_frame_boundary" {
		t.Errorf("unexpected content type: %s", rec.Header().Get("Content-Type"))
	}

	// 4. Stop stream
	streamMgr.StopStream(cam.ID, "sub")
	if streamMgr.GetActiveStreamCount() != 0 {
		t.Errorf("expected 0 active streams after stop, got %d", streamMgr.GetActiveStreamCount())
	}
}
