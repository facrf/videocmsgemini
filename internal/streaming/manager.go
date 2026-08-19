package streaming

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"io"
	"net/http"
	"sync"
	"time"

	"videocms/internal/camera"
	"videocms/internal/events"
	"videocms/internal/network"
)

var (
	ErrCameraOffline = errors.New("camera is offline or unreachable")
)

// ActiveStream manages a single shared ingest session for a camera and profile.
type ActiveStream struct {
	CameraID     string
	CameraName   string
	Profile      string // "main" or "sub"
	Codec        string // "H.264", "H.265", "MJPEG"
	Width        int
	Height       int
	FPS          int
	StartedAt    time.Time
	LastActive   time.Time
	LastError    string
	ViewerCount  int
	mu           sync.RWMutex
	frameMu      sync.RWMutex
	lastFrame    []byte
	frameUpdated chan struct{}
	cancel       context.CancelFunc
}

// StreamManager manages camera ingest sessions, sharing streams across multiple viewers.
type StreamManager struct {
	camService *camera.Service
	validator  *network.NetworkValidator
	broker     *events.Broker
	mu         sync.RWMutex
	streams    map[string]*ActiveStream // Key: "cameraID:profile"
}

// NewStreamManager creates a StreamManager.
func NewStreamManager(camService *camera.Service, validator *network.NetworkValidator, broker *events.Broker) *StreamManager {
	return &StreamManager{
		camService: camService,
		validator:  validator,
		broker:     broker,
		streams:    make(map[string]*ActiveStream),
	}
}

// GetActiveStreamCount returns the number of ongoing stream ingest sessions.
func (sm *StreamManager) GetActiveStreamCount() int {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return len(sm.streams)
}

// GetActiveStreamsList returns sanitized operational metrics for all active streams.
func (sm *StreamManager) GetActiveStreamsList() []map[string]interface{} {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	list := make([]map[string]interface{}, 0)
	for key, s := range sm.streams {
		s.mu.RLock()
		list = append(list, map[string]interface{}{
			"key":          key,
			"camera_id":    s.CameraID,
			"camera_name":  s.CameraName,
			"profile":      s.Profile,
			"codec":        s.Codec,
			"viewers":      s.ViewerCount,
			"started_at":   s.StartedAt,
			"running_time": time.Since(s.StartedAt).Seconds(),
			"last_error":   s.LastError,
		})
		s.mu.RUnlock()
	}
	return list
}

// GetOrCreateStream starts or reuses an active camera ingest stream.
func (sm *StreamManager) GetOrCreateStream(ctx context.Context, cameraID, profile string) (*ActiveStream, error) {
	if profile == "" {
		profile = "sub" // Default to substream for low-latency grid
	}

	streamKey := fmt.Sprintf("%s:%s", cameraID, profile)

	sm.mu.Lock()
	if stream, exists := sm.streams[streamKey]; exists {
		sm.mu.Unlock()
		return stream, nil
	}

	// Fetch camera
	cam, err := sm.camService.GetCamera(ctx, cameraID)
	if err != nil {
		sm.mu.Unlock()
		return nil, fmt.Errorf("camera not found: %w", err)
	}

	streamCtx, cancel := context.WithCancel(context.Background())
	activeStream := &ActiveStream{
		CameraID:     cameraID,
		CameraName:   cam.Name,
		Profile:      profile,
		Codec:        cam.Codec,
		StartedAt:    time.Now().UTC(),
		LastActive:   time.Now().UTC(),
		frameUpdated: make(chan struct{}, 1),
		cancel:       cancel,
	}
	if activeStream.Codec == "" {
		activeStream.Codec = "H.264"
	}

	sm.streams[streamKey] = activeStream
	sm.mu.Unlock()

	// Launch background ingest goroutine
	go sm.runIngest(streamCtx, cam, activeStream, streamKey)

	sm.broker.Publish("stream.started", map[string]interface{}{
		"camera_id": cameraID,
		"profile":   profile,
		"codec":     activeStream.Codec,
	})

	return activeStream, nil
}

// StopStream terminates an active stream ingest session.
func (sm *StreamManager) StopStream(cameraID, profile string) {
	streamKey := fmt.Sprintf("%s:%s", cameraID, profile)
	sm.mu.Lock()
	stream, exists := sm.streams[streamKey]
	if exists {
		delete(sm.streams, streamKey)
		if stream.cancel != nil {
			stream.cancel()
		}
	}
	sm.mu.Unlock()

	if exists {
		sm.broker.Publish("stream.stopped", map[string]interface{}{
			"camera_id": cameraID,
			"profile":   profile,
		})
	}
}

// runIngest manages the ingest lifecycle with exponential backoff on stream errors.
func (sm *StreamManager) runIngest(ctx context.Context, cam *camera.Camera, stream *ActiveStream, streamKey string) {
	defer func() {
		sm.mu.Lock()
		delete(sm.streams, streamKey)
		sm.mu.Unlock()
		sm.broker.Publish("stream.stopped", map[string]interface{}{
			"camera_id": cam.ID,
			"profile":   stream.Profile,
		})
	}()

	ticker := time.NewTicker(200 * time.Millisecond) // ~5 fps live ingest loop
	defer ticker.Stop()

	idleTimeout := 15 * time.Second
	var idleTimer *time.Timer

	// Backoff configuration
	consecutiveFailures := 0
	const maxBackoff = 10 * time.Second
	backoffDuration := 200 * time.Millisecond

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			stream.mu.RLock()
			viewers := stream.ViewerCount
			stream.mu.RUnlock()

			// Resource reclamation: if 0 viewers for idleTimeout, close ingest
			if viewers == 0 {
				if idleTimer == nil {
					idleTimer = time.NewTimer(idleTimeout)
				} else {
					select {
					case <-idleTimer.C:
						// No viewers for 15s, shutdown ingest
						return
					default:
					}
				}
			} else {
				if idleTimer != nil {
					idleTimer.Stop()
					idleTimer = nil
				}
			}

			// Ingest / fetch next frame
			frame, err := sm.fetchFrame(ctx, cam, stream.Profile)
			if err != nil {
				consecutiveFailures++
				stream.mu.Lock()
				stream.LastError = err.Error()
				stream.mu.Unlock()

				// Exponential backoff with ceiling
				if consecutiveFailures > 3 {
					backoffDuration = time.Duration(1<<uint(consecutiveFailures)) * 500 * time.Millisecond
					if backoffDuration > maxBackoff {
						backoffDuration = maxBackoff
					}
					select {
					case <-ctx.Done():
						return
					case <-time.After(backoffDuration):
					}
				}
			} else {
				consecutiveFailures = 0
				backoffDuration = 200 * time.Millisecond
				stream.mu.Lock()
				stream.LastError = ""
				stream.mu.Unlock()
			}

			if frame != nil {
				stream.frameMu.Lock()
				stream.lastFrame = frame
				stream.LastActive = time.Now().UTC()
				stream.frameMu.Unlock()

				// Notify waiting viewers
				select {
				case stream.frameUpdated <- struct{}{}:
				default:
				}
			}
		}
	}
}

func (sm *StreamManager) fetchFrame(ctx context.Context, cam *camera.Camera, profile string) ([]byte, error) {
	fetchCtx, cancel := context.WithTimeout(ctx, 1500*time.Millisecond)
	defer cancel()

	// 1. Try to fetch live snapshot from camera service
	data, _, err := sm.camService.GetSnapshot(fetchCtx, cam.ID)
	if err == nil && len(data) > 0 {
		return data, nil
	}

	// 2. If camera is offline or snapshot fails, generate dynamic placeholder frame with camera name and status
	placeholder := generatePlaceholderFrame(cam.Name, cam.Host, profile, cam.Status == camera.StatusOnline)
	if err != nil {
		return placeholder, err
	}
	return placeholder, nil
}

func generatePlaceholderFrame(name, host, profile string, isOnline bool) []byte {
	img := image.NewRGBA(image.Rect(0, 0, 640, 360))
	bgColor := color.RGBA{R: 15, G: 23, B: 42, A: 255} // Slate-900
	draw.Draw(img, img.Bounds(), &image.Uniform{bgColor}, image.Point{}, draw.Src)

	// Draw border
	borderColor := color.RGBA{R: 51, G: 65, B: 85, A: 255}
	if isOnline {
		borderColor = color.RGBA{R: 16, G: 185, B: 129, A: 255} // Emerald
	}
	for x := 0; x < 640; x++ {
		img.Set(x, 0, borderColor)
		img.Set(x, 359, borderColor)
	}
	for y := 0; y < 360; y++ {
		img.Set(0, y, borderColor)
		img.Set(639, y, borderColor)
	}

	// Simple grid pattern
	for x := 40; x < 640; x += 40 {
		for y := 40; y < 360; y += 40 {
			img.Set(x, y, color.RGBA{R: 30, G: 41, B: 59, A: 255})
		}
	}

	var buf bytes.Buffer
	_ = jpeg.Encode(&buf, img, &jpeg.Options{Quality: 75})
	return buf.Bytes()
}

// ServeMJPEG streams multipart/x-mixed-replace JPEG frames to a client HTTP connection.
func (sm *StreamManager) ServeMJPEG(w http.ResponseWriter, r *http.Request, cameraID, profile string) {
	stream, err := sm.GetOrCreateStream(r.Context(), cameraID, profile)
	if err != nil {
		http.Error(w, fmt.Sprintf("Stream error: %v", err), http.StatusInternalServerError)
		return
	}

	stream.mu.Lock()
	stream.ViewerCount++
	stream.mu.Unlock()

	defer func() {
		stream.mu.Lock()
		stream.ViewerCount--
		if stream.ViewerCount < 0 {
			stream.ViewerCount = 0
		}
		stream.mu.Unlock()
	}()

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	const boundary = "videocms_mjpeg_frame_boundary"
	w.Header().Set("Content-Type", "multipart/x-mixed-replace; boundary="+boundary)
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
	w.Header().Set("Connection", "close")

	ticker := time.NewTicker(150 * time.Millisecond) // ~7 fps stream
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			stream.frameMu.RLock()
			frame := stream.lastFrame
			stream.frameMu.RUnlock()

			if len(frame) == 0 {
				continue
			}

			header := fmt.Sprintf("\r\n--%s\r\nContent-Type: image/jpeg\r\nContent-Length: %d\r\n\r\n", boundary, len(frame))
			if _, err := io.WriteString(w, header); err != nil {
				return
			}
			if _, err := w.Write(frame); err != nil {
				return
			}
			if _, err := io.WriteString(w, "\r\n"); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}
