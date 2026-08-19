-- Migration 0002: Layouts and Layout Items

CREATE TABLE IF NOT EXISTS layouts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grid_size INTEGER NOT NULL DEFAULT 4,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS layout_items (
    id TEXT PRIMARY KEY,
    layout_id TEXT NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    camera_id TEXT NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    preferred_profile TEXT NOT NULL DEFAULT 'auto',
    created_at DATETIME NOT NULL,
    UNIQUE(layout_id, position)
);

CREATE INDEX IF NOT EXISTS idx_layout_items_layout ON layout_items(layout_id);
