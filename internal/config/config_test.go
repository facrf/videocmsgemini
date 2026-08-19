package config

import (
	"os"
	"testing"
	"time"
)

func TestLoadDefaults(t *testing.T) {
	// Clear env vars that might interfere
	vars := []string{"CMS_PORT", "CMS_HOST", "CMS_DB_PATH", "CMS_SECRET_KEY", "CMS_SCAN_ENABLED", "CMS_SCAN_MAX_CONCURRENCY", "CMS_SCAN_TIMEOUT", "CMS_ALLOWED_NETWORKS", "CMS_CAMERA_HEALTH_INTERVAL", "CMS_LOG_LEVEL", "CMS_STATIC_DIR"}
	for _, v := range vars {
		os.Unsetenv(v)
	}

	cfg := Load()
	if cfg.Port != 15000 {
		t.Errorf("expected port 15000, got %d", cfg.Port)
	}
	if cfg.Host != "0.0.0.0" {
		t.Errorf("expected host 0.0.0.0, got %s", cfg.Host)
	}
	if cfg.DBPath != "./data/cms.db" {
		t.Errorf("expected db path ./data/cms.db, got %s", cfg.DBPath)
	}
	if cfg.ScanEnabled != true {
		t.Errorf("expected scan enabled true, got %v", cfg.ScanEnabled)
	}
	if cfg.ScanMaxConcurrency != 32 {
		t.Errorf("expected scan concurrency 32, got %d", cfg.ScanMaxConcurrency)
	}
	if cfg.ScanTimeout != 2*time.Second {
		t.Errorf("expected scan timeout 2s, got %v", cfg.ScanTimeout)
	}
	if len(cfg.AllowedNetworks) == 0 {
		t.Errorf("expected non-empty allowed networks")
	}
	if cfg.CameraHealthInterval != 30*time.Second {
		t.Errorf("expected health interval 30s, got %v", cfg.CameraHealthInterval)
	}
}

func TestLoadCustom(t *testing.T) {
	os.Setenv("CMS_PORT", "16000")
	os.Setenv("CMS_HOST", "127.0.0.1")
	os.Setenv("CMS_DB_PATH", "/tmp/test.db")
	os.Setenv("CMS_SCAN_ENABLED", "false")
	os.Setenv("CMS_ALLOWED_NETWORKS", "192.168.1.0/24, 10.0.0.0/16")
	defer func() {
		os.Unsetenv("CMS_PORT")
		os.Unsetenv("CMS_HOST")
		os.Unsetenv("CMS_DB_PATH")
		os.Unsetenv("CMS_SCAN_ENABLED")
		os.Unsetenv("CMS_ALLOWED_NETWORKS")
	}()

	cfg := Load()
	if cfg.Port != 16000 {
		t.Errorf("expected port 16000, got %d", cfg.Port)
	}
	if cfg.Host != "127.0.0.1" {
		t.Errorf("expected host 127.0.0.1, got %s", cfg.Host)
	}
	if cfg.DBPath != "/tmp/test.db" {
		t.Errorf("expected db path /tmp/test.db, got %s", cfg.DBPath)
	}
	if cfg.ScanEnabled != false {
		t.Errorf("expected scan enabled false, got %v", cfg.ScanEnabled)
	}
	if len(cfg.AllowedNetworks) != 2 || cfg.AllowedNetworks[0] != "192.168.1.0/24" || cfg.AllowedNetworks[1] != "10.0.0.0/16" {
		t.Errorf("unexpected allowed networks: %v", cfg.AllowedNetworks)
	}
}
