package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

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

var (
	Version   = "1.0.0"
	Commit    = "unknown"
	BuildDate = "unknown"
)

func main() {
	// Handle CLI subcommands (healthcheck, backup, version)
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "healthcheck":
			runHealthcheck()
			return
		case "backup":
			if len(os.Args) < 3 {
				fmt.Println("Usage: cms backup <destination-filepath.db>")
				os.Exit(1)
			}
			runBackup(os.Args[2])
			return
		case "version", "--version", "-v":
			fmt.Printf("VideoCMS v%s (commit: %s, built: %s)\n", Version, Commit, BuildDate)
			return
		}
	}

	cfg := config.Load()

	// Configure structured logging
	var logLevel slog.Level
	switch cfg.LogLevel {
	case "debug":
		logLevel = slog.LevelDebug
	case "warn":
		logLevel = slog.LevelWarn
	case "error":
		logLevel = slog.LevelError
	default:
		logLevel = slog.LevelInfo
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel}))
	slog.SetDefault(logger)

	slog.Info("Starting VideoCMS Server...",
		"version", Version,
		"commit", Commit,
		"build_date", BuildDate,
		"port", cfg.Port,
		"host", cfg.Host,
		"db_path", cfg.DBPath,
		"scan_enabled", cfg.ScanEnabled,
	)

	// Initialize Database and run migrations
	db, err := database.Open(cfg.DBPath)
	if err != nil {
		slog.Error("Failed to initialize database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	// Initialize SSRF and network validator
	validator, err := network.NewNetworkValidator(cfg.AllowedNetworks)
	if err != nil {
		slog.Error("Failed to initialize network validator", "error", err)
		os.Exit(1)
	}

	// Initialize core services
	broker := events.NewBroker()
	camRepo := camera.NewRepository(db, cfg.SecretKey)
	vendorRegistry := vendors.NewRegistry(validator)
	camService := camera.NewService(camRepo, validator, vendorRegistry, broker)

	// Start background health checker
	healthChecker := camera.NewHealthChecker(camService, broker, cfg.CameraHealthInterval)
	ctxHealth, cancelHealth := context.WithCancel(context.Background())
	defer cancelHealth()
	go healthChecker.Start(ctxHealth)

	// Initialize discovery service
	scanner := discovery.NewScanner(validator, cfg.ScanMaxConcurrency, cfg.ScanTimeout)
	discService := discovery.NewService(db, scanner, validator, broker, camRepo)

	// Initialize streaming manager
	streamMgr := streaming.NewStreamManager(camService, validator, broker)

	// Initialize HTTP server and API router
	versionInfo := api.VersionInfo{
		Version:   Version,
		Commit:    Commit,
		BuildDate: BuildDate,
	}
	apiServer := api.NewServer(cfg, db, camRepo, camService, discService, streamMgr, broker, versionInfo)
	routes := apiServer.Routes()

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	httpServer := &http.Server{
		Addr:              addr,
		Handler:           routes,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	// Run HTTP server in background
	go func() {
		slog.Info(fmt.Sprintf("VideoCMS listening on http://localhost:%d (host: %s)", cfg.Port, cfg.Host))
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("HTTP server error", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown handling (SIGINT, SIGTERM)
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)
	sig := <-stopChan

	slog.Info("Shutdown signal received, shutting down gracefully...", "signal", sig.String())

	cancelHealth()
	healthChecker.Stop()

	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelShutdown()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		slog.Error("Server forced to shutdown", "error", err)
	}

	slog.Info("VideoCMS server stopped successfully.")
}

// runHealthcheck performs self-healthcheck query for Docker container health check without curl.
func runHealthcheck() {
	cfg := config.Load()
	url := fmt.Sprintf("http://127.0.0.1:%d/api/health", cfg.Port)
	client := &http.Client{Timeout: 3 * time.Second}

	resp, err := client.Get(url)
	if err != nil || resp.StatusCode != http.StatusOK {
		if err != nil {
			fmt.Printf("Healthcheck failed: %v\n", err)
		} else {
			fmt.Printf("Healthcheck failed with HTTP status %d\n", resp.StatusCode)
		}
		os.Exit(1)
	}
	fmt.Println("Healthcheck OK")
	os.Exit(0)
}

// runBackup executes an atomic, safe online SQLite backup using VACUUM INTO.
func runBackup(destFile string) {
	cfg := config.Load()

	// Check if destination file already exists
	if _, err := os.Stat(destFile); err == nil {
		fmt.Printf("Error: destination backup file %q already exists. Refusing to overwrite.\n", destFile)
		os.Exit(1)
	}

	// Ensure parent directory exists
	dir := filepath.Dir(destFile)
	if dir != "." && dir != "" {
		_ = os.MkdirAll(dir, 0750)
	}

	db, err := database.Open(cfg.DBPath)
	if err != nil {
		fmt.Printf("Error opening database %q: %v\n", cfg.DBPath, err)
		os.Exit(1)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// VACUUM INTO creates a transactionally consistent copy of the SQLite database while in WAL mode
	query := fmt.Sprintf("VACUUM INTO '%s'", destFile)
	if _, err := db.ExecContext(ctx, query); err != nil {
		fmt.Printf("Backup failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Database backup created successfully at: %s\n", destFile)
}
