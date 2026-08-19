package camera

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

var (
	ErrLayoutNotFound = errors.New("layout not found")
)

// Layout represents a saved screen arrangement of camera slots.
type Layout struct {
	ID        string       `json:"id"`
	Name      string       `json:"name"`
	GridSize  int          `json:"grid_size"` // 1, 4, 6, 9, 12, 16, 25, 32
	IsDefault bool         `json:"is_default"`
	Items     []LayoutItem `json:"items"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

// LayoutItem places a camera in a specific position of the grid layout.
type LayoutItem struct {
	ID               string `json:"id"`
	LayoutID         string `json:"layout_id"`
	Position         int    `json:"position"`
	CameraID         string `json:"camera_id"`
	CameraName       string `json:"camera_name,omitempty"`
	CameraHost       string `json:"camera_host,omitempty"`
	PreferredProfile string `json:"preferred_profile"` // "auto", "main", "sub"
}

// Group represents a named tag or categorization for cameras.
type Group struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CameraCount int       `json:"camera_count"`
	CreatedAt   time.Time `json:"created_at"`
}

// CreateLayout inserts a layout and its items.
func (r *Repository) CreateLayout(ctx context.Context, layout *Layout) error {
	if layout.ID == "" {
		layout.ID = uuid.New().String()
	}
	if layout.GridSize <= 0 {
		layout.GridSize = 4
	}
	now := time.Now().UTC()
	layout.CreatedAt = now
	layout.UpdatedAt = now

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if layout.IsDefault {
		_, _ = tx.ExecContext(ctx, "UPDATE layouts SET is_default = 0")
	}

	_, err = tx.ExecContext(ctx, `INSERT INTO layouts (id, name, grid_size, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
		layout.ID, layout.Name, layout.GridSize, boolToInt(layout.IsDefault), layout.CreatedAt, layout.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert layout: %w", err)
	}

	for _, item := range layout.Items {
		if item.CameraID == "" {
			continue
		}
		itemID := item.ID
		if itemID == "" {
			itemID = uuid.New().String()
		}
		pref := item.PreferredProfile
		if pref == "" {
			pref = "auto"
		}
		_, err := tx.ExecContext(ctx, `INSERT INTO layout_items (id, layout_id, position, camera_id, preferred_profile, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
			itemID, layout.ID, item.Position, item.CameraID, pref, now)
		if err != nil {
			return fmt.Errorf("failed to insert layout item: %w", err)
		}
	}

	return tx.Commit()
}

// GetLayout retrieves a layout with all assigned camera slots.
func (r *Repository) GetLayout(ctx context.Context, id string) (*Layout, error) {
	var l Layout
	var isDefInt int
	err := r.db.QueryRowContext(ctx, "SELECT id, name, grid_size, is_default, created_at, updated_at FROM layouts WHERE id = ?", id).
		Scan(&l.ID, &l.Name, &l.GridSize, &isDefInt, &l.CreatedAt, &l.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrLayoutNotFound
	}
	if err != nil {
		return nil, err
	}
	l.IsDefault = isDefInt == 1

	rows, err := r.db.QueryContext(ctx, `
		SELECT li.id, li.layout_id, li.position, li.camera_id, li.preferred_profile, c.name, c.host
		FROM layout_items li
		JOIN cameras c ON li.camera_id = c.id
		WHERE li.layout_id = ?
		ORDER BY li.position ASC`, id)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var item LayoutItem
			if err := rows.Scan(&item.ID, &item.LayoutID, &item.Position, &item.CameraID, &item.PreferredProfile, &item.CameraName, &item.CameraHost); err == nil {
				l.Items = append(l.Items, item)
			}
		}
	}

	return &l, nil
}

// ListLayouts retrieves all layouts.
func (r *Repository) ListLayouts(ctx context.Context) ([]*Layout, error) {
	rows, err := r.db.QueryContext(ctx, "SELECT id, name, grid_size, is_default, created_at, updated_at FROM layouts ORDER BY name ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*Layout
	for rows.Next() {
		var l Layout
		var isDefInt int
		if err := rows.Scan(&l.ID, &l.Name, &l.GridSize, &isDefInt, &l.CreatedAt, &l.UpdatedAt); err == nil {
			l.IsDefault = isDefInt == 1
			list = append(list, &l)
		}
	}

	// Fetch items for each
	for _, l := range list {
		itemRows, err := r.db.QueryContext(ctx, `
			SELECT li.id, li.layout_id, li.position, li.camera_id, li.preferred_profile, c.name, c.host
			FROM layout_items li
			JOIN cameras c ON li.camera_id = c.id
			WHERE li.layout_id = ?
			ORDER BY li.position ASC`, l.ID)
		if err == nil {
			for itemRows.Next() {
				var item LayoutItem
				if err := itemRows.Scan(&item.ID, &item.LayoutID, &item.Position, &item.CameraID, &item.PreferredProfile, &item.CameraName, &item.CameraHost); err == nil {
					l.Items = append(l.Items, item)
				}
			}
			itemRows.Close()
		}
	}

	return list, nil
}

// UpdateLayout updates a layout and replaces its slot items.
func (r *Repository) UpdateLayout(ctx context.Context, layout *Layout) error {
	layout.UpdatedAt = time.Now().UTC()
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if layout.IsDefault {
		_, _ = tx.ExecContext(ctx, "UPDATE layouts SET is_default = 0")
	}

	res, err := tx.ExecContext(ctx, "UPDATE layouts SET name = ?, grid_size = ?, is_default = ?, updated_at = ? WHERE id = ?",
		layout.Name, layout.GridSize, boolToInt(layout.IsDefault), layout.UpdatedAt, layout.ID)
	if err != nil {
		return err
	}
	rowsAff, _ := res.RowsAffected()
	if rowsAff == 0 {
		return ErrLayoutNotFound
	}

	_, _ = tx.ExecContext(ctx, "DELETE FROM layout_items WHERE layout_id = ?", layout.ID)
	for _, item := range layout.Items {
		if item.CameraID == "" {
			continue
		}
		itemID := item.ID
		if itemID == "" {
			itemID = uuid.New().String()
		}
		pref := item.PreferredProfile
		if pref == "" {
			pref = "auto"
		}
		_, err := tx.ExecContext(ctx, "INSERT INTO layout_items (id, layout_id, position, camera_id, preferred_profile, created_at) VALUES (?, ?, ?, ?, ?, ?)",
			itemID, layout.ID, item.Position, item.CameraID, pref, layout.UpdatedAt)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// DeleteLayout deletes a layout.
func (r *Repository) DeleteLayout(ctx context.Context, id string) error {
	res, err := r.db.ExecContext(ctx, "DELETE FROM layouts WHERE id = ?", id)
	if err != nil {
		return err
	}
	rowsAff, _ := res.RowsAffected()
	if rowsAff == 0 {
		return ErrLayoutNotFound
	}
	return nil
}

// ListGroups returns all groups with count of member cameras.
func (r *Repository) ListGroups(ctx context.Context) ([]Group, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT g.id, g.name, g.description, g.created_at, COUNT(cg.camera_id) as camera_count
		FROM groups g
		LEFT JOIN camera_groups cg ON g.id = cg.group_id
		GROUP BY g.id, g.name, g.description, g.created_at
		ORDER BY g.name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []Group
	for rows.Next() {
		var g Group
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.CreatedAt, &g.CameraCount); err == nil {
			groups = append(groups, g)
		}
	}
	return groups, nil
}

// CreateGroup creates a new camera group.
func (r *Repository) CreateGroup(ctx context.Context, name, description string) (*Group, error) {
	g := &Group{
		ID:          uuid.New().String(),
		Name:        name,
		Description: description,
		CreatedAt:   time.Now().UTC(),
	}
	_, err := r.db.ExecContext(ctx, "INSERT INTO groups (id, name, description, created_at) VALUES (?, ?, ?, ?)",
		g.ID, g.Name, g.Description, g.CreatedAt)
	if err != nil {
		return nil, err
	}
	return g, nil
}

// DeleteGroup deletes a camera group by ID.
func (r *Repository) DeleteGroup(ctx context.Context, id string) error {
	_, _ = r.db.ExecContext(ctx, "DELETE FROM camera_groups WHERE group_id = ?", id)
	_, err := r.db.ExecContext(ctx, "DELETE FROM groups WHERE id = ?", id)
	return err
}

