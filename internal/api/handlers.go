package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gorilla/mux"

	"videocms/internal/camera"
	"videocms/internal/config"
	"videocms/internal/database"
	"videocms/internal/discovery"
	"videocms/internal/events"
	"videocms/internal/onvif"
	"videocms/internal/streaming"
)

// VersionInfo holds build metadata.
type VersionInfo struct {
	Version   string `json:"version"`
	Commit    string `json:"commit"`
	BuildDate string `json:"build_date"`
}

// Server coordinates all HTTP REST endpoints, streaming and UI static serving.
type Server struct {
	cfg        *config.Config
	db         *database.DB
	camRepo    *camera.Repository
	camService *camera.Service
	discServ   *discovery.Service
	streamMgr  *streaming.StreamManager
	broker     *events.Broker
	version    VersionInfo
}

// NewServer creates a new API server.
func NewServer(
	cfg *config.Config,
	db *database.DB,
	camRepo *camera.Repository,
	camService *camera.Service,
	discServ *discovery.Service,
	streamMgr *streaming.StreamManager,
	broker *events.Broker,
	version VersionInfo,
) *Server {
	return &Server{
		cfg:        cfg,
		db:         db,
		camRepo:    camRepo,
		camService: camService,
		discServ:   discServ,
		streamMgr:  streamMgr,
		broker:     broker,
		version:    version,
	}
}

// Routes builds the http.Handler router using Gorilla Mux for method-based routing.
func (s *Server) Routes() http.Handler {
	router := mux.NewRouter()

	// Root API Info & System / Stats / Health
	router.HandleFunc("/api", s.handleAPIIndex).Methods("GET")
	router.HandleFunc("/api/health", s.handleHealth).Methods("GET")
	router.HandleFunc("/api/stats", s.handleStats).Methods("GET")
	router.HandleFunc("/api/dashboard", s.handleDashboard).Methods("GET")
	router.HandleFunc("/api/tags", s.handleListTags).Methods("GET")
	router.HandleFunc("/api/network/interfaces", s.handleNetworkInterfaces).Methods("GET")

	// SSE Events
	router.Handle("/api/events", s.broker).Methods("GET")

	// Cameras REST
	router.HandleFunc("/api/cameras", s.handleListCameras).Methods("GET")
	router.HandleFunc("/api/cameras", s.handleCreateCamera).Methods("POST")
	router.HandleFunc("/api/cameras/test-all", s.handleTestAllCameras).Methods("POST")
	router.HandleFunc("/api/cameras/{id}", s.handleGetCamera).Methods("GET")
	router.HandleFunc("/api/cameras/{id}", s.handleUpdateCamera).Methods("PUT")
	router.HandleFunc("/api/cameras/{id}", s.handleDeleteCamera).Methods("DELETE")
	router.HandleFunc("/api/cameras/{id}/update-ip", s.handleUpdateCameraIP).Methods("POST")
	router.HandleFunc("/api/cameras/{id}/test", s.handleTestCamera).Methods("POST")
	router.HandleFunc("/api/cameras/{id}/capabilities", s.handleGetCameraCapabilities).Methods("GET")
	router.HandleFunc("/api/cameras/{id}/diagnostics", s.handleGetCameraDiagnostics).Methods("GET")
	router.HandleFunc("/api/cameras/{id}/snapshot", s.handleGetCameraSnapshot).Methods("GET")
	router.HandleFunc("/api/cameras/{id}/live", s.handleLiveStream).Methods("GET")

	// Camera PTZ Controls
	router.HandleFunc("/api/cameras/{id}/ptz/move", s.handlePTZMove).Methods("POST")
	router.HandleFunc("/api/cameras/{id}/ptz/stop", s.handlePTZStop).Methods("POST")
	router.HandleFunc("/api/cameras/{id}/ptz/presets", s.handlePTZGetPresets).Methods("GET")
	router.HandleFunc("/api/cameras/{id}/ptz/presets/{presetId}/goto", s.handlePTZGotoPreset).Methods("POST")

	// Discovery REST
	router.HandleFunc("/api/discovery", s.handleStartDiscovery).Methods("POST")
	router.HandleFunc("/api/discovery", s.handleListDiscoveryJobs).Methods("GET")
	router.HandleFunc("/api/discovery/{id}", s.handleGetDiscoveryJob).Methods("GET")
	router.HandleFunc("/api/discovery/{id}/cancel", s.handleCancelDiscoveryJob).Methods("POST")
	router.HandleFunc("/api/discovery/{id}/devices/{deviceId}/probe", s.handleProbeDevice).Methods("POST")
	router.HandleFunc("/api/discovery/{id}/devices/{deviceId}/add", s.handleAddDiscoveredDevice).Methods("POST")

	// Layouts REST
	router.HandleFunc("/api/layouts", s.handleListLayouts).Methods("GET")
	router.HandleFunc("/api/layouts", s.handleCreateLayout).Methods("POST")
	router.HandleFunc("/api/layouts/{id}", s.handleGetLayout).Methods("GET")
	router.HandleFunc("/api/layouts/{id}", s.handleUpdateLayout).Methods("PUT")
	router.HandleFunc("/api/layouts/{id}", s.handleDeleteLayout).Methods("DELETE")
	router.HandleFunc("/api/layouts/{id}/default", s.handleSetDefaultLayout).Methods("POST")
	router.HandleFunc("/api/layouts/{id}/set-default", s.handleSetDefaultLayout).Methods("POST")
	router.HandleFunc("/api/layouts/{id}/pin", s.handleSetDefaultLayout).Methods("POST")

	// Groups REST
	router.HandleFunc("/api/groups", s.handleListGroups).Methods("GET")
	router.HandleFunc("/api/groups", s.handleCreateGroup).Methods("POST")
	router.HandleFunc("/api/groups/{id}", s.handleDeleteGroup).Methods("DELETE")

	// Streams REST
	router.HandleFunc("/api/streams", s.handleListStreams).Methods("GET")

	// Static SPA Serving for all other routes
	router.PathPrefix("/").HandlerFunc(s.handleStaticSPA)

	// Wrap middlewares
	handler := Chain(router,
		RecoveryMiddleware,
		TrailingSlashMiddleware,
		LoggingMiddleware,
		CORSMiddleware,
		SecurityHeadersMiddleware,
	)

	return handler
}

// handleAPIIndex returns root API documentation and server summary.
func (s *Server) handleAPIIndex(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"service":    "VideoCMS REST API",
		"version":    s.version.Version,
		"commit":     s.version.Commit,
		"build_date": s.version.BuildDate,
		"status":     "ok",
		"endpoints": map[string]string{
			"health":     "/api/health",
			"stats":      "/api/stats",
			"dashboard":  "/api/dashboard",
			"tags":       "/api/tags",
			"cameras":    "/api/cameras",
			"discovery":  "/api/discovery",
			"layouts":    "/api/layouts",
			"groups":     "/api/groups",
			"streams":    "/api/streams",
			"events":     "/api/events",
			"interfaces": "/api/network/interfaces",
		},
	})
}

// Health check
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	dbStatus := "ok"
	if s.db != nil {
		if err := s.db.PingContext(r.Context()); err != nil {
			dbStatus = "error: " + err.Error()
		}
	}

	versionStr := s.version.Version
	if versionStr == "" {
		versionStr = "1.0.0"
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"service":    "VideoCMS",
		"status":     "ok",
		"database":   dbStatus,
		"version":    versionStr,
		"commit":     s.version.Commit,
		"build_date": s.version.BuildDate,
	})
}

// System stats
func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cameras, err := s.camService.ListCameras(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	var total, online, offline, authReq, errorCount int
	for _, c := range cameras {
		total++
		switch c.Status {
		case camera.StatusOnline:
			online++
		case camera.StatusOffline:
			offline++
		case camera.StatusAuthRequired:
			authReq++
		default:
			errorCount++
		}
	}

	jobs, _ := s.discServ.ListJobs(ctx)
	activeStreams := s.streamMgr.GetActiveStreamCount()
	subscribers := s.broker.SubscriberCount()

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"total_cameras":  total,
		"online":         online,
		"offline":        offline,
		"auth_required":  authReq,
		"error_status":   errorCount,
		"active_streams": activeStreams,
		"sse_clients":    subscribers,
		"recent_jobs":    len(jobs),
	})
}

// Complete dashboard aggregated summary endpoint
func (s *Server) handleDashboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cameras, err := s.camService.ListCameras(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	var total, online, offline, authReq, errorCount int
	for _, c := range cameras {
		total++
		switch c.Status {
		case camera.StatusOnline:
			online++
		case camera.StatusOffline:
			offline++
		case camera.StatusAuthRequired:
			authReq++
		default:
			errorCount++
		}
	}

	jobs, _ := s.discServ.ListJobs(ctx)
	if jobs == nil {
		jobs = make([]*discovery.DiscoveryJob, 0)
	}

	layouts, _ := s.camRepo.ListLayouts(ctx)
	if layouts == nil {
		layouts = make([]*camera.Layout, 0)
	}

	tags, _ := s.camService.ListTags(ctx)
	if tags == nil {
		tags = make([]string, 0)
	}

	groups, _ := s.camRepo.ListGroups(ctx)
	if groups == nil {
		groups = make([]camera.Group, 0)
	}

	activeStreams := s.streamMgr.GetActiveStreamCount()
	subscribers := s.broker.SubscriberCount()

	if cameras == nil {
		cameras = make([]*camera.Camera, 0)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":     "ok",
		"service":    "VideoCMS",
		"version":    s.version.Version,
		"commit":     s.version.Commit,
		"build_date": s.version.BuildDate,
		"stats": map[string]interface{}{
			"total_cameras":  total,
			"online":         online,
			"offline":        offline,
			"auth_required":  authReq,
			"error_status":   errorCount,
			"active_streams": activeStreams,
			"sse_clients":    subscribers,
			"recent_jobs":    len(jobs),
		},
		"cameras":     cameras,
		"recent_jobs": jobs,
		"layouts":     layouts,
		"groups":      groups,
		"tags":        tags,
	})
}

// List all distinct tags across cameras
func (s *Server) handleListTags(w http.ResponseWriter, r *http.Request) {
	tags, err := s.camService.ListTags(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if tags == nil {
		tags = make([]string, 0)
	}
	writeJSON(w, http.StatusOK, tags)
}

// List network interfaces
func (s *Server) handleNetworkInterfaces(w http.ResponseWriter, r *http.Request) {
	ifaces, err := s.discServ.GetLocalInterfaces()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "NETWORK_ERROR", err.Error())
		return
	}
	if ifaces == nil {
		ifaces = make([]discovery.NetworkInterfaceInfo, 0)
	}
	writeJSON(w, http.StatusOK, ifaces)
}

// List cameras with query filtering & pagination support (Section 73)
func (s *Server) handleListCameras(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	search := q.Get("search")
	status := q.Get("status")
	group := q.Get("group")
	tag := q.Get("tag")

	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	cameras, total, err := s.camService.ListCamerasFiltered(r.Context(), search, status, group, tag, limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if cameras == nil {
		cameras = make([]*camera.Camera, 0)
	}

	w.Header().Set("X-Total-Count", strconv.Itoa(total))
	writeJSON(w, http.StatusOK, cameras)
}

// Create camera
func (s *Server) handleCreateCamera(w http.ResponseWriter, r *http.Request) {
	var cam camera.Camera
	if err := json.NewDecoder(r.Body).Decode(&cam); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request payload: "+err.Error())
		return
	}

	if err := s.camService.CreateCamera(r.Context(), &cam); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, cam)
}

// Get camera
func (s *Server) handleGetCamera(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	cam, err := s.camService.GetCamera(r.Context(), id)
	if errors.Is(err, camera.ErrCameraNotFound) {
		writeError(w, http.StatusNotFound, "CAMERA_NOT_FOUND", "Camera not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, cam)
}

// Update camera
func (s *Server) handleUpdateCamera(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var cam camera.Camera
	if err := json.NewDecoder(r.Body).Decode(&cam); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request payload: "+err.Error())
		return
	}
	cam.ID = id

	if err := s.camService.UpdateCamera(r.Context(), &cam); err != nil {
		if errors.Is(err, camera.ErrCameraNotFound) {
			writeError(w, http.StatusNotFound, "CAMERA_NOT_FOUND", "Camera not found")
			return
		}
		writeError(w, http.StatusBadRequest, "UPDATE_FAILED", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, cam)
}

// Update camera IP (DHCP migration)
func (s *Server) handleUpdateCameraIP(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var req struct {
		Host string `json:"host"`
		Port int    `json:"port,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Host == "" {
		writeError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Valid host is required")
		return
	}
	if req.Port <= 0 {
		req.Port = 80
	}

	if err := s.camService.UpdateCameraIP(r.Context(), id, req.Host, req.Port); err != nil {
		writeError(w, http.StatusBadRequest, "UPDATE_IP_FAILED", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"message":  fmt.Sprintf("Camera IP updated to %s:%d", req.Host, req.Port),
		"id":       id,
		"new_host": req.Host,
	})
}

// Delete camera
func (s *Server) handleDeleteCamera(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	s.streamMgr.StopStream(id, "main")
	s.streamMgr.StopStream(id, "sub")

	if err := s.camService.DeleteCamera(r.Context(), id); err != nil {
		if errors.Is(err, camera.ErrCameraNotFound) {
			writeError(w, http.StatusNotFound, "CAMERA_NOT_FOUND", "Camera not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Camera deleted successfully"})
}

// Test camera connection
func (s *Server) handleTestCamera(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var req struct {
		Password string `json:"password,omitempty"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	if err := s.camService.TestCamera(r.Context(), id, req.Password); err != nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Connection test succeeded",
	})
}

// Get camera capabilities
func (s *Server) handleGetCameraCapabilities(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	caps, err := s.camService.GetCapabilities(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "PROBE_FAILED", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, caps)
}

// Get camera diagnostics
func (s *Server) handleGetCameraDiagnostics(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	report, err := s.camService.RunDiagnostics(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DIAGNOSTICS_FAILED", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, report)
}

// Get camera snapshot
func (s *Server) handleGetCameraSnapshot(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	data, ctype, err := s.camService.GetSnapshot(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "SNAPSHOT_FAILED", "Failed to get snapshot: "+err.Error())
		return
	}

	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	_, _ = w.Write(data)
}

// Live stream (MJPEG)
func (s *Server) handleLiveStream(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	profile := r.URL.Query().Get("profile")
	if profile == "" {
		profile = "sub"
	}
	s.streamMgr.ServeMJPEG(w, r, id, profile)
}

// List active streams
func (s *Server) handleListStreams(w http.ResponseWriter, r *http.Request) {
	streams := s.streamMgr.GetActiveStreamsList()
	if streams == nil {
		streams = make([]map[string]interface{}, 0)
	}
	writeJSON(w, http.StatusOK, streams)
}

// Discovery handlers
func (s *Server) handleStartDiscovery(w http.ResponseWriter, r *http.Request) {
	var req struct {
		InterfaceName string `json:"interface_name"`
		CIDR          string `json:"cidr"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	job, err := s.discServ.StartJob(r.Context(), req.InterfaceName, req.CIDR)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_CIDR", err.Error())
		return
	}

	writeJSON(w, http.StatusAccepted, job)
}

func (s *Server) handleListDiscoveryJobs(w http.ResponseWriter, r *http.Request) {
	jobs, err := s.discServ.ListJobs(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if jobs == nil {
		jobs = make([]*discovery.DiscoveryJob, 0)
	}
	writeJSON(w, http.StatusOK, jobs)
}

func (s *Server) handleGetDiscoveryJob(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	job, err := s.discServ.GetJob(r.Context(), id)
	if errors.Is(err, discovery.ErrJobNotFound) {
		writeError(w, http.StatusNotFound, "JOB_NOT_FOUND", "Discovery job not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if job != nil && job.Results == nil {
		job.Results = make([]discovery.DiscoveryResult, 0)
	}

	writeJSON(w, http.StatusOK, job)
}

func (s *Server) handleCancelDiscoveryJob(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if err := s.discServ.CancelJob(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "CANCEL_FAILED", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "Job cancellation requested"})
}

func (s *Server) handleProbeDevice(w http.ResponseWriter, r *http.Request) {
	jobID := mux.Vars(r)["id"]
	deviceID := mux.Vars(r)["deviceId"]

	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	res, err := s.discServ.ProbeDevice(r.Context(), jobID, deviceID, req.Username, req.Password)
	if err != nil {
		writeError(w, http.StatusBadRequest, "PROBE_FAILED", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, res)
}

func (s *Server) handleAddDiscoveredDevice(w http.ResponseWriter, r *http.Request) {
	jobID := mux.Vars(r)["id"]
	deviceID := mux.Vars(r)["deviceId"]

	var req struct {
		Name     string `json:"name"`
		Username string `json:"username"`
		Password string `json:"password"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	cam, err := s.discServ.AddDeviceToCameras(r.Context(), jobID, deviceID, req.Name, req.Username, req.Password)
	if err != nil {
		writeError(w, http.StatusBadRequest, "ADD_FAILED", err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, cam)
}

// Layout handlers
func (s *Server) handleListLayouts(w http.ResponseWriter, r *http.Request) {
	layouts, err := s.camRepo.ListLayouts(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if layouts == nil {
		layouts = make([]*camera.Layout, 0)
	}
	writeJSON(w, http.StatusOK, layouts)
}

func (s *Server) handleCreateLayout(w http.ResponseWriter, r *http.Request) {
	var l camera.Layout
	if err := json.NewDecoder(r.Body).Decode(&l); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid layout JSON: "+err.Error())
		return
	}

	if err := s.camRepo.CreateLayout(r.Context(), &l); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
		return
	}

	s.broker.Publish("layout.updated", map[string]interface{}{"id": l.ID, "name": l.Name})
	writeJSON(w, http.StatusCreated, l)
}

func (s *Server) handleGetLayout(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	layout, err := s.camRepo.GetLayout(r.Context(), id)
	if errors.Is(err, camera.ErrLayoutNotFound) {
		writeError(w, http.StatusNotFound, "LAYOUT_NOT_FOUND", "Layout not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if layout != nil && layout.Items == nil {
		layout.Items = make([]camera.LayoutItem, 0)
	}
	writeJSON(w, http.StatusOK, layout)
}

func (s *Server) handleUpdateLayout(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var l camera.Layout
	if err := json.NewDecoder(r.Body).Decode(&l); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid layout JSON: "+err.Error())
		return
	}
	l.ID = id

	if err := s.camRepo.UpdateLayout(r.Context(), &l); err != nil {
		if errors.Is(err, camera.ErrLayoutNotFound) {
			writeError(w, http.StatusNotFound, "LAYOUT_NOT_FOUND", "Layout not found")
			return
		}
		writeError(w, http.StatusBadRequest, "UPDATE_FAILED", err.Error())
		return
	}

	s.broker.Publish("layout.updated", map[string]interface{}{"id": l.ID, "name": l.Name})
	writeJSON(w, http.StatusOK, l)
}

func (s *Server) handleDeleteLayout(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if err := s.camRepo.DeleteLayout(r.Context(), id); err != nil {
		if errors.Is(err, camera.ErrLayoutNotFound) {
			writeError(w, http.StatusNotFound, "LAYOUT_NOT_FOUND", "Layout not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	s.broker.Publish("layout.deleted", map[string]interface{}{"id": id})
	writeJSON(w, http.StatusOK, map[string]string{"message": "Layout deleted successfully"})
}

// Set layout as default / pinned layout
func (s *Server) handleSetDefaultLayout(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if err := s.camRepo.SetDefaultLayout(r.Context(), id); err != nil {
		if errors.Is(err, camera.ErrLayoutNotFound) {
			writeError(w, http.StatusNotFound, "LAYOUT_NOT_FOUND", "Layout not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	layout, err := s.camRepo.GetLayout(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	s.broker.Publish("layout.updated", map[string]interface{}{"id": id, "name": layout.Name, "is_default": true})
	writeJSON(w, http.StatusOK, layout)
}

// Groups handlers
func (s *Server) handleListGroups(w http.ResponseWriter, r *http.Request) {
	groups, err := s.camRepo.ListGroups(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if groups == nil {
		groups = make([]camera.Group, 0)
	}
	writeJSON(w, http.StatusOK, groups)
}

func (s *Server) handleCreateGroup(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "MISSING_FIELD", "Group name is required")
		return
	}

	g, err := s.camRepo.CreateGroup(r.Context(), req.Name, req.Description)
	if err != nil {
		writeError(w, http.StatusBadRequest, "CREATE_FAILED", err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, g)
}

// Test all cameras in batch
func (s *Server) handleTestAllCameras(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cameras, err := s.camService.ListCameras(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	type TestResult struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		Host    string `json:"host"`
		Success bool   `json:"success"`
		Error   string `json:"error,omitempty"`
	}

	results := make([]TestResult, 0, len(cameras))
	for _, cam := range cameras {
		testErr := s.camService.TestCamera(ctx, cam.ID, "")
		res := TestResult{
			ID:      cam.ID,
			Name:    cam.Name,
			Host:    cam.Host,
			Success: testErr == nil,
		}
		if testErr != nil {
			res.Error = testErr.Error()
		}
		results = append(results, res)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"total":   len(cameras),
		"results": results,
	})
}

// PTZ Move handler
func (s *Server) handlePTZMove(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var req struct {
		Pan  float64 `json:"pan"`
		Tilt float64 `json:"tilt"`
		Zoom float64 `json:"zoom"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	if err := s.camService.PTZMove(r.Context(), id, req.Pan, req.Tilt, req.Zoom); err != nil {
		writeError(w, http.StatusBadRequest, "PTZ_FAILED", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "PTZ Move command sent",
	})
}

// PTZ Stop handler
func (s *Server) handlePTZStop(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if err := s.camService.PTZStop(r.Context(), id); err != nil {
		writeError(w, http.StatusBadRequest, "PTZ_FAILED", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "PTZ Stop command sent",
	})
}

// PTZ Get Presets handler
func (s *Server) handlePTZGetPresets(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	presets, err := s.camService.PTZGetPresets(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "PTZ_FAILED", err.Error())
		return
	}
	if presets == nil {
		presets = make([]onvif.PTZPreset, 0)
	}

	writeJSON(w, http.StatusOK, presets)
}

// PTZ Goto Preset handler
func (s *Server) handlePTZGotoPreset(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	presetId := mux.Vars(r)["presetId"]

	if err := s.camService.PTZGotoPreset(r.Context(), id, presetId); err != nil {
		writeError(w, http.StatusBadRequest, "PTZ_FAILED", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Moved to preset %s", presetId),
	})
}

// Delete group
func (s *Server) handleDeleteGroup(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if err := s.camRepo.DeleteGroup(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "Group deleted successfully"})
}

// Static SPA Handler
func (s *Server) handleStaticSPA(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, "/api") {
		writeError(w, http.StatusNotFound, "NOT_FOUND", fmt.Sprintf("API endpoint %s %s not found", r.Method, r.URL.Path))
		return
	}

	staticDir := s.cfg.StaticDir
	if staticDir == "" {
		staticDir = "./web/dist"
	}

	filePath := filepath.Join(staticDir, filepath.Clean(r.URL.Path))
	fileInfo, err := os.Stat(filePath)

	if err == nil && !fileInfo.IsDir() {
		http.ServeFile(w, r, filePath)
		return
	}

	indexPath := filepath.Join(staticDir, "index.html")
	if indexInfo, err := os.Stat(indexPath); err == nil && !indexInfo.IsDir() {
		http.ServeFile(w, r, indexPath)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = io.WriteString(w, `<!DOCTYPE html>
<html>
<head><title>VideoCMS</title><meta charset="utf-8"/><style>body{font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:40px;text-align:center;}</style></head>
<body>
  <h1>VideoCMS Server Running</h1>
  <p>The backend API is functional at <code>/api/...</code>.</p>
  <p>Please build the frontend assets (<code>make frontend</code> or <code>make build</code>) to access the complete web console.</p>
</body>
</html>`)
}

func writeJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(data)
}

type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ErrorEnvelope struct {
	Error APIError `json:"error"`
}

func writeError(w http.ResponseWriter, statusCode int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(ErrorEnvelope{
		Error: APIError{
			Code:    code,
			Message: message,
		},
	})
}
