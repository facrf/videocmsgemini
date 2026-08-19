package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all configuration parameters for VideoCMS.
type Config struct {
	Port                 int
	Host                 string
	DBPath               string
	SecretKey            string
	ScanEnabled          bool
	ScanMaxConcurrency   int
	ScanTimeout          time.Duration
	AllowedNetworks      []string
	CameraHealthInterval time.Duration
	LogLevel             string
	StaticDir            string
}

// Load loads the configuration from environment variables with sensible defaults.
func Load() *Config {
	cfg := &Config{
		Port:                 15000,
		Host:                 "0.0.0.0",
		DBPath:               "./data/cms.db",
		SecretKey:            "default-video-cms-secret-key-32b!",
		ScanEnabled:          true,
		ScanMaxConcurrency:   32,
		ScanTimeout:          2 * time.Second,
		AllowedNetworks:      []string{"10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "127.0.0.0/8", "::1/128"},
		CameraHealthInterval: 30 * time.Second,
		LogLevel:             "info",
		StaticDir:            "./web/dist",
	}

	if portStr := os.Getenv("CMS_PORT"); portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil && p > 0 && p <= 65535 {
			cfg.Port = p
		}
	}

	if host := os.Getenv("CMS_HOST"); host != "" {
		cfg.Host = host
	}

	if dbPath := os.Getenv("CMS_DB_PATH"); dbPath != "" {
		cfg.DBPath = dbPath
	}

	if secretKey := os.Getenv("CMS_SECRET_KEY"); secretKey != "" {
		cfg.SecretKey = secretKey
	}

	if scanEnabledStr := os.Getenv("CMS_SCAN_ENABLED"); scanEnabledStr != "" {
		cfg.ScanEnabled = strings.ToLower(scanEnabledStr) == "true" || scanEnabledStr == "1"
	}

	if maxConcurrencyStr := os.Getenv("CMS_SCAN_MAX_CONCURRENCY"); maxConcurrencyStr != "" {
		if mc, err := strconv.Atoi(maxConcurrencyStr); err == nil && mc > 0 {
			cfg.ScanMaxConcurrency = mc
		}
	}

	if scanTimeoutStr := os.Getenv("CMS_SCAN_TIMEOUT"); scanTimeoutStr != "" {
		if d, err := time.ParseDuration(scanTimeoutStr); err == nil && d > 0 {
			cfg.ScanTimeout = d
		}
	}

	if allowedNets := os.Getenv("CMS_ALLOWED_NETWORKS"); allowedNets != "" {
		nets := strings.Split(allowedNets, ",")
		var cleaned []string
		for _, n := range nets {
			trimmed := strings.TrimSpace(n)
			if trimmed != "" {
				cleaned = append(cleaned, trimmed)
			}
		}
		if len(cleaned) > 0 {
			cfg.AllowedNetworks = cleaned
		}
	}

	if healthIntervalStr := os.Getenv("CMS_CAMERA_HEALTH_INTERVAL"); healthIntervalStr != "" {
		if d, err := time.ParseDuration(healthIntervalStr); err == nil && d > 0 {
			cfg.CameraHealthInterval = d
		}
	}

	if logLevel := os.Getenv("CMS_LOG_LEVEL"); logLevel != "" {
		cfg.LogLevel = strings.ToLower(logLevel)
	}

	if staticDir := os.Getenv("CMS_STATIC_DIR"); staticDir != "" {
		cfg.StaticDir = staticDir
	}

	return cfg
}
