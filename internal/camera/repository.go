package camera

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"videocms/internal/database"
	"videocms/internal/security"

	"github.com/google/uuid"
)

var (
	ErrCameraNotFound = errors.New("camera not found")
)

// Repository handles database operations for cameras.
type Repository struct {
	db        *database.DB
	secretKey string
}

// NewRepository creates a new Camera Repository.
func NewRepository(db *database.DB, secretKey string) *Repository {
	return &Repository{
		db:        db,
		secretKey: secretKey,
	}
}

// Create inserts a new camera into SQLite.
func (r *Repository) Create(ctx context.Context, cam *Camera) error {
	if cam.ID == "" {
		cam.ID = uuid.New().String()
	}
	now := time.Now().UTC()
	cam.CreatedAt = now
	cam.UpdatedAt = now

	// Encrypt password if provided
	if cam.Password != "" {
		encrypted, err := security.Encrypt(cam.Password, r.secretKey)
		if err != nil {
			return fmt.Errorf("failed to encrypt password: %w", err)
		}
		cam.EncryptedPassword = encrypted
		cam.HasPassword = true
	} else {
		cam.EncryptedPassword = ""
		cam.HasPassword = false
	}

	if cam.Port <= 0 {
		cam.Port = 80
	}
	if cam.RTSPPort <= 0 {
		cam.RTSPPort = 554
	}
	if cam.PreferredProfile == "" {
		cam.PreferredProfile = "main"
	}
	if cam.PreferredTransport == "" {
		cam.PreferredTransport = "tcp"
	}
	if cam.Codec == "" {
		cam.Codec = "H.264"
	}
	if cam.Status == "" {
		cam.Status = StatusUnknown
	}

	capsJSON := cam.Capabilities.MarshalCapabilities()

	query := `
	INSERT INTO cameras (
		id, name, host, port, rtsp_port, manufacturer, model, serial_number, mac_address,
		firmware_version, onvif_url, rtsp_path, substream_path, snapshot_path, username,
		encrypted_password, preferred_profile, preferred_transport, codec, capabilities_json,
		enabled, status, status_message, last_seen_at, created_at, updated_at
	) VALUES (
		?, ?, ?, ?, ?, ?, ?, ?, ?,
		?, ?, ?, ?, ?, ?,
		?, ?, ?, ?, ?,
		?, ?, ?, ?, ?, ?
	)`

	_, err := r.db.ExecContext(ctx, query,
		cam.ID, cam.Name, cam.Host, cam.Port, cam.RTSPPort, cam.Manufacturer, cam.Model, cam.SerialNumber, cam.MACAddress,
		cam.FirmwareVersion, cam.ONVIFURL, cam.RTSPPath, cam.SubstreamPath, cam.SnapshotPath, cam.Username,
		cam.EncryptedPassword, cam.PreferredProfile, cam.PreferredTransport, cam.Codec, capsJSON,
		boolToInt(cam.Enabled), string(cam.Status), cam.StatusMessage, cam.LastSeenAt, cam.CreatedAt, cam.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert camera: %w", err)
	}

	// Save tags if present
	if len(cam.Tags) > 0 {
		_ = r.SetTags(ctx, cam.ID, cam.Tags)
	}

	// Save groups if present
	if len(cam.Groups) > 0 {
		_ = r.SetGroups(ctx, cam.ID, cam.Groups)
	}

	return nil
}

// GetByID retrieves a single camera by ID.
func (r *Repository) GetByID(ctx context.Context, id string) (*Camera, error) {
	query := `
	SELECT
		id, name, host, port, rtsp_port, manufacturer, model, serial_number, mac_address,
		firmware_version, onvif_url, rtsp_path, substream_path, snapshot_path, username,
		encrypted_password, preferred_profile, preferred_transport, codec, capabilities_json,
		enabled, status, status_message, last_seen_at, created_at, updated_at
	FROM cameras
	WHERE id = ?`

	var cam Camera
	var enabledInt int
	var statusStr string
	var capsJSON string

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&cam.ID, &cam.Name, &cam.Host, &cam.Port, &cam.RTSPPort, &cam.Manufacturer, &cam.Model, &cam.SerialNumber, &cam.MACAddress,
		&cam.FirmwareVersion, &cam.ONVIFURL, &cam.RTSPPath, &cam.SubstreamPath, &cam.SnapshotPath, &cam.Username,
		&cam.EncryptedPassword, &cam.PreferredProfile, &cam.PreferredTransport, &cam.Codec, &capsJSON,
		&enabledInt, &statusStr, &cam.StatusMessage, &cam.LastSeenAt, &cam.CreatedAt, &cam.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrCameraNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query camera %s: %w", id, err)
	}

	cam.Enabled = enabledInt == 1
	cam.Status = CameraStatus(statusStr)
	cam.Capabilities = UnmarshalCapabilities(capsJSON)
	cam.HasPassword = cam.EncryptedPassword != ""

	// Fetch tags and groups
	cam.Tags, _ = r.GetTags(ctx, cam.ID)
	cam.Groups, _ = r.GetGroups(ctx, cam.ID)

	return &cam, nil
}

// FindByHardware attempts to find an existing camera by MAC address, serial number, or ONVIF URL.
func (r *Repository) FindByHardware(ctx context.Context, mac, serial, onvifURL, host string) (*Camera, error) {
	if mac != "" {
		var id string
		err := r.db.QueryRowContext(ctx, "SELECT id FROM cameras WHERE mac_address = ? AND mac_address != ''", mac).Scan(&id)
		if err == nil && id != "" {
			return r.GetByID(ctx, id)
		}
	}

	if serial != "" {
		var id string
		err := r.db.QueryRowContext(ctx, "SELECT id FROM cameras WHERE serial_number = ? AND serial_number != ''", serial).Scan(&id)
		if err == nil && id != "" {
			return r.GetByID(ctx, id)
		}
	}

	if onvifURL != "" {
		var id string
		err := r.db.QueryRowContext(ctx, "SELECT id FROM cameras WHERE onvif_url = ? AND onvif_url != ''", onvifURL).Scan(&id)
		if err == nil && id != "" {
			return r.GetByID(ctx, id)
		}
	}

	if host != "" {
		var id string
		err := r.db.QueryRowContext(ctx, "SELECT id FROM cameras WHERE host = ?", host).Scan(&id)
		if err == nil && id != "" {
			return r.GetByID(ctx, id)
		}
	}

	return nil, ErrCameraNotFound
}

// UpdateHost updates the host IP and port of a camera (useful for DHCP updates).
func (r *Repository) UpdateHost(ctx context.Context, id string, newHost string, newPort int) error {
	now := time.Now().UTC()
	query := `UPDATE cameras SET host = ?, port = ?, updated_at = ? WHERE id = ?`
	res, err := r.db.ExecContext(ctx, query, newHost, newPort, now, id)
	if err != nil {
		return err
	}
	rowsAff, err := res.RowsAffected()
	if err != nil || rowsAff == 0 {
		return ErrCameraNotFound
	}
	return nil
}

// GetDecryptedPassword returns the decrypted password for camera operations.
func (r *Repository) GetDecryptedPassword(ctx context.Context, id string) (string, error) {
	var encPass string
	err := r.db.QueryRowContext(ctx, "SELECT encrypted_password FROM cameras WHERE id = ?", id).Scan(&encPass)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrCameraNotFound
	}
	if err != nil {
		return "", err
	}
	if encPass == "" {
		return "", nil
	}

	return security.Decrypt(encPass, r.secretKey)
}

// List returns all cameras.
func (r *Repository) List(ctx context.Context) ([]*Camera, error) {
	cams, _, err := r.ListFiltered(ctx, "", "", "", "", 0, 0)
	return cams, err
}

// ListFiltered returns cameras matching optional query filters with pagination.
func (r *Repository) ListFiltered(ctx context.Context, search, status, group, tag string, limit, offset int) ([]*Camera, int, error) {
	var whereClauses []string
	var args []interface{}

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		whereClauses = append(whereClauses, "(LOWER(name) LIKE ? OR LOWER(host) LIKE ? OR LOWER(manufacturer) LIKE ? OR LOWER(model) LIKE ?)")
		args = append(args, searchPattern, searchPattern, searchPattern, searchPattern)
	}

	if status != "" && status != "all" {
		whereClauses = append(whereClauses, "status = ?")
		args = append(args, status)
	}

	if group != "" {
		whereClauses = append(whereClauses, "id IN (SELECT cg.camera_id FROM camera_groups cg JOIN groups g ON cg.group_id = g.id WHERE LOWER(g.name) = ?)")
		args = append(args, strings.ToLower(group))
	}

	if tag != "" {
		whereClauses = append(whereClauses, "id IN (SELECT camera_id FROM camera_tags WHERE LOWER(tag) = ?)")
		args = append(args, strings.ToLower(tag))
	}

	whereSQL := ""
	if len(whereClauses) > 0 {
		whereSQL = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	// Count total matching
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM cameras %s", whereSQL)
	var totalCount int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount); err != nil {
		return nil, 0, fmt.Errorf("failed to count cameras: %w", err)
	}

	// Select rows with limit/offset
	query := fmt.Sprintf(`
	SELECT
		id, name, host, port, rtsp_port, manufacturer, model, serial_number, mac_address,
		firmware_version, onvif_url, rtsp_path, substream_path, snapshot_path, username,
		encrypted_password, preferred_profile, preferred_transport, codec, capabilities_json,
		enabled, status, status_message, last_seen_at, created_at, updated_at
	FROM cameras
	%s
	ORDER BY name ASC`, whereSQL)

	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit)
		if offset > 0 {
			query += fmt.Sprintf(" OFFSET %d", offset)
		}
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query cameras: %w", err)
	}
	defer rows.Close()

	cameras := make([]*Camera, 0)
	for rows.Next() {
		var cam Camera
		var enabledInt int
		var statusStr string
		var capsJSON string

		err := rows.Scan(
			&cam.ID, &cam.Name, &cam.Host, &cam.Port, &cam.RTSPPort, &cam.Manufacturer, &cam.Model, &cam.SerialNumber, &cam.MACAddress,
			&cam.FirmwareVersion, &cam.ONVIFURL, &cam.RTSPPath, &cam.SubstreamPath, &cam.SnapshotPath, &cam.Username,
			&cam.EncryptedPassword, &cam.PreferredProfile, &cam.PreferredTransport, &cam.Codec, &capsJSON,
			&enabledInt, &statusStr, &cam.StatusMessage, &cam.LastSeenAt, &cam.CreatedAt, &cam.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan camera row: %w", err)
		}

		cam.Enabled = enabledInt == 1
		cam.Status = CameraStatus(statusStr)
		cam.Capabilities = UnmarshalCapabilities(capsJSON)
		cam.HasPassword = cam.EncryptedPassword != ""

		// Fetch tags and groups
		cam.Tags, _ = r.GetTags(ctx, cam.ID)
		cam.Groups, _ = r.GetGroups(ctx, cam.ID)

		cameras = append(cameras, &cam)
	}

	return cameras, totalCount, nil
}

// Update updates an existing camera.
func (r *Repository) Update(ctx context.Context, cam *Camera) error {
	cam.UpdatedAt = time.Now().UTC()

	var encPass string
	if cam.Password != "" {
		encrypted, err := security.Encrypt(cam.Password, r.secretKey)
		if err != nil {
			return fmt.Errorf("failed to encrypt password: %w", err)
		}
		encPass = encrypted
		cam.EncryptedPassword = encPass
		cam.HasPassword = true
	} else {
		_ = r.db.QueryRowContext(ctx, "SELECT encrypted_password FROM cameras WHERE id = ?", cam.ID).Scan(&encPass)
		cam.EncryptedPassword = encPass
		cam.HasPassword = encPass != ""
	}

	capsJSON := cam.Capabilities.MarshalCapabilities()

	query := `
	UPDATE cameras SET
		name = ?, host = ?, port = ?, rtsp_port = ?, manufacturer = ?, model = ?,
		serial_number = ?, mac_address = ?, firmware_version = ?, onvif_url = ?,
		rtsp_path = ?, substream_path = ?, snapshot_path = ?, username = ?,
		encrypted_password = ?, preferred_profile = ?, preferred_transport = ?,
		codec = ?, capabilities_json = ?, enabled = ?, status = ?,
		status_message = ?, updated_at = ?
	WHERE id = ?`

	res, err := r.db.ExecContext(ctx, query,
		cam.Name, cam.Host, cam.Port, cam.RTSPPort, cam.Manufacturer, cam.Model,
		cam.SerialNumber, cam.MACAddress, cam.FirmwareVersion, cam.ONVIFURL,
		cam.RTSPPath, cam.SubstreamPath, cam.SnapshotPath, cam.Username,
		encPass, cam.PreferredProfile, cam.PreferredTransport,
		cam.Codec, capsJSON, boolToInt(cam.Enabled), string(cam.Status),
		cam.StatusMessage, cam.UpdatedAt, cam.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update camera: %w", err)
	}

	rowsAff, err := res.RowsAffected()
	if err != nil || rowsAff == 0 {
		return ErrCameraNotFound
	}

	// Update tags and groups
	_ = r.SetTags(ctx, cam.ID, cam.Tags)
	_ = r.SetGroups(ctx, cam.ID, cam.Groups)

	return nil
}

// UpdateStatus updates just the status, message and last_seen_at of a camera.
func (r *Repository) UpdateStatus(ctx context.Context, id string, status CameraStatus, message string, lastSeen *time.Time) error {
	query := `UPDATE cameras SET status = ?, status_message = ?, last_seen_at = ?, updated_at = ? WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, string(status), message, lastSeen, time.Now().UTC(), id)
	return err
}

// Delete removes a camera by ID.
func (r *Repository) Delete(ctx context.Context, id string) error {
	res, err := r.db.ExecContext(ctx, "DELETE FROM cameras WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete camera: %w", err)
	}
	rowsAff, err := res.RowsAffected()
	if err != nil || rowsAff == 0 {
		return ErrCameraNotFound
	}
	return nil
}

// GetTags returns tags for a camera.
func (r *Repository) GetTags(ctx context.Context, cameraID string) ([]string, error) {
	rows, err := r.db.QueryContext(ctx, "SELECT tag FROM camera_tags WHERE camera_id = ? ORDER BY tag", cameraID)
	if err != nil {
		return make([]string, 0), err
	}
	defer rows.Close()

	tags := make([]string, 0)
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err == nil {
			tags = append(tags, tag)
		}
	}
	return tags, nil
}

// SetTags replaces all tags for a camera.
func (r *Repository) SetTags(ctx context.Context, cameraID string, tags []string) error {
	_, _ = r.db.ExecContext(ctx, "DELETE FROM camera_tags WHERE camera_id = ?", cameraID)
	for _, tag := range tags {
		if tag == "" {
			continue
		}
		_, _ = r.db.ExecContext(ctx, "INSERT OR IGNORE INTO camera_tags (camera_id, tag) VALUES (?, ?)", cameraID, tag)
	}
	return nil
}

// GetGroups returns groups for a camera.
func (r *Repository) GetGroups(ctx context.Context, cameraID string) ([]string, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT g.name FROM groups g
		JOIN camera_groups cg ON g.id = cg.group_id
		WHERE cg.camera_id = ?
		ORDER BY g.name`, cameraID)
	if err != nil {
		return make([]string, 0), err
	}
	defer rows.Close()

	groups := make([]string, 0)
	for rows.Next() {
		var g string
		if err := rows.Scan(&g); err == nil {
			groups = append(groups, g)
		}
	}
	return groups, nil
}

// SetGroups associates a camera with named groups (creates groups if they don't exist).
func (r *Repository) SetGroups(ctx context.Context, cameraID string, groupNames []string) error {
	_, _ = r.db.ExecContext(ctx, "DELETE FROM camera_groups WHERE camera_id = ?", cameraID)
	for _, name := range groupNames {
		if name == "" {
			continue
		}
		var groupID string
		err := r.db.QueryRowContext(ctx, "SELECT id FROM groups WHERE name = ?", name).Scan(&groupID)
		if errors.Is(err, sql.ErrNoRows) {
			groupID = uuid.New().String()
			_, _ = r.db.ExecContext(ctx, "INSERT INTO groups (id, name, created_at) VALUES (?, ?, ?)", groupID, name, time.Now().UTC())
		}
		if groupID != "" {
			_, _ = r.db.ExecContext(ctx, "INSERT OR IGNORE INTO camera_groups (camera_id, group_id) VALUES (?, ?)", cameraID, groupID)
		}
	}
	return nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
