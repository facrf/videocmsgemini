package api_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"videocms/internal/api"
	"videocms/internal/camera"
	"videocms/internal/config"
	"videocms/internal/database"
	"videocms/internal/discovery"
	"videocms/internal/events"
	"videocms/internal/network"
	"videocms/internal/streaming"
	"videocms/internal/vendors"
)

func setupTestServer(t *testing.T) (*httptest.Server, func()) {
	dbPath := "./test_api_db.sqlite"
	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}

	cfg := &config.Config{
		Port:            15000,
		Host:            "127.0.0.1",
		DBPath:          dbPath,
		SecretKey:       "test-secret-key-32-bytes-len!!!",
		ScanEnabled:     true,
		AllowedNetworks: []string{"127.0.0.1/32"},
	}

	validator, err := network.NewNetworkValidator(cfg.AllowedNetworks)
	if err != nil {
		t.Fatalf("failed to create validator: %v", err)
	}

	broker := events.NewBroker()
	camRepo := camera.NewRepository(db, cfg.SecretKey)
	registry := vendors.NewRegistry(validator)
	camService := camera.NewService(camRepo, validator, registry, broker)
	scanner := discovery.NewScanner(validator, 4, cfg.ScanTimeout)
	discService := discovery.NewService(db, scanner, validator, broker, camRepo)
	streamMgr := streaming.NewStreamManager(camService, validator, broker)

	srv := api.NewServer(cfg, db, camRepo, camService, discService, streamMgr, broker, api.VersionInfo{Version: "1.0.0", Commit: "test", BuildDate: "test"})
	ts := httptest.NewServer(srv.Routes())

	cleanup := func() {
		ts.Close()
		db.Close()
		os.Remove(dbPath)
	}

	return ts, cleanup
}

func TestHealthEndpoint(t *testing.T) {
	ts, cleanup := setupTestServer(t)
	defer cleanup()

	resp, err := http.Get(ts.URL + "/api/health")
	if err != nil {
		t.Fatalf("GET /api/health failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}

	var data map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&data)
	if data["status"] != "ok" {
		t.Errorf("expected status 'ok', got %v", data["status"])
	}
}

func TestCameraCRUDAPI(t *testing.T) {
	ts, cleanup := setupTestServer(t)
	defer cleanup()

	// 1. Create camera
	payload := map[string]interface{}{
		"name":         "Lobby Camera",
		"host":         "127.0.0.1",
		"port":         80,
		"rtsp_port":    554,
		"manufacturer": "Generic",
		"username":     "admin",
		"password":     "pass123",
	}
	bodyBytes, _ := json.Marshal(payload)
	resp, err := http.Post(ts.URL+"/api/cameras", "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		t.Fatalf("POST /api/cameras failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", resp.StatusCode)
	}

	var created camera.Camera
	_ = json.NewDecoder(resp.Body).Decode(&created)
	if created.ID == "" || created.Name != "Lobby Camera" {
		t.Errorf("unexpected created camera: %+v", created)
	}

	// 2. List cameras
	resp, err = http.Get(ts.URL + "/api/cameras")
	if err != nil {
		t.Fatalf("GET /api/cameras failed: %v", err)
	}
	defer resp.Body.Close()

	var list []*camera.Camera
	_ = json.NewDecoder(resp.Body).Decode(&list)
	if len(list) != 1 {
		t.Errorf("expected 1 camera, got %d", len(list))
	}

	// 3. Get single camera
	resp, err = http.Get(ts.URL + "/api/cameras/" + created.ID)
	if err != nil {
		t.Fatalf("GET /api/cameras/%s failed: %v", created.ID, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}

	// 4. Update camera
	updatePayload := map[string]interface{}{
		"name": "Main Lobby Cam",
		"host": "127.0.0.1",
		"port": 8080,
	}
	upBytes, _ := json.Marshal(updatePayload)
	req, _ := http.NewRequest("PUT", ts.URL+"/api/cameras/"+created.ID, bytes.NewReader(upBytes))
	req.Header.Set("Content-Type", "application/json")
	upResp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("PUT /api/cameras/%s failed: %v", created.ID, err)
	}
	upResp.Body.Close()
	if upResp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", upResp.StatusCode)
	}

	// 5. Delete camera
	delReq, _ := http.NewRequest("DELETE", ts.URL+"/api/cameras/"+created.ID, nil)
	delResp, err := http.DefaultClient.Do(delReq)
	if err != nil {
		t.Fatalf("DELETE /api/cameras/%s failed: %v", created.ID, err)
	}
	delResp.Body.Close()
	if delResp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", delResp.StatusCode)
	}
}

func TestLayoutsAPI(t *testing.T) {
	ts, cleanup := setupTestServer(t)
	defer cleanup()

	payload := map[string]interface{}{
		"name":      "Perimeter 4-Grid",
		"grid_size": 4,
		"items":     []interface{}{},
	}
	bodyBytes, _ := json.Marshal(payload)
	resp, err := http.Post(ts.URL+"/api/layouts", "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		t.Fatalf("POST /api/layouts failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		t.Errorf("expected status 201, got %d", resp.StatusCode)
	}

	// List
	resp, err = http.Get(ts.URL + "/api/layouts")
	if err != nil {
		t.Fatalf("GET /api/layouts failed: %v", err)
	}
	defer resp.Body.Close()
	var layouts []*camera.Layout
	_ = json.NewDecoder(resp.Body).Decode(&layouts)
	if len(layouts) != 1 {
		t.Errorf("expected 1 layout, got %d", len(layouts))
	}
}
