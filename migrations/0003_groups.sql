-- Migration 0003: Groups and Tags

CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS camera_groups (
    camera_id TEXT NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (camera_id, group_id)
);

CREATE TABLE IF NOT EXISTS camera_tags (
    camera_id TEXT NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (camera_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_camera_tags_tag ON camera_tags(tag);
