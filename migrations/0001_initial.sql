-- Migration 0001: Initial schema for cameras, discovery jobs, discovery results, and audit logs

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS cameras (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 80,
    rtsp_port INTEGER NOT NULL DEFAULT 554,
    manufacturer TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    serial_number TEXT NOT NULL DEFAULT '',
    mac_address TEXT NOT NULL DEFAULT '',
    firmware_version TEXT NOT NULL DEFAULT '',
    onvif_url TEXT NOT NULL DEFAULT '',
    rtsp_path TEXT NOT NULL DEFAULT '',
    substream_path TEXT NOT NULL DEFAULT '',
    snapshot_path TEXT NOT NULL DEFAULT '',
    username TEXT NOT NULL DEFAULT '',
    encrypted_password TEXT NOT NULL DEFAULT '',
    preferred_profile TEXT NOT NULL DEFAULT 'main',
    preferred_transport TEXT NOT NULL DEFAULT 'tcp',
    codec TEXT NOT NULL DEFAULT 'H.264',
    capabilities_json TEXT NOT NULL DEFAULT '{}',
    enabled INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'unknown',
    status_message TEXT NOT NULL DEFAULT '',
    last_seen_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cameras_status ON cameras(status);
CREATE INDEX IF NOT EXISTS idx_cameras_host ON cameras(host);

CREATE TABLE IF NOT EXISTS discovery_jobs (
    id TEXT PRIMARY KEY,
    interface_name TEXT NOT NULL DEFAULT '',
    cidr TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'queued',
    progress INTEGER NOT NULL DEFAULT 0,
    total_hosts INTEGER NOT NULL DEFAULT 0,
    scanned_hosts INTEGER NOT NULL DEFAULT 0,
    found_devices INTEGER NOT NULL DEFAULT 0,
    error_message TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL,
    completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_discovery_jobs_status ON discovery_jobs(status);

CREATE TABLE IF NOT EXISTS discovery_results (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES discovery_jobs(id) ON DELETE CASCADE,
    ip TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 80,
    mac_address TEXT NOT NULL DEFAULT '',
    manufacturer TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    onvif_url TEXT NOT NULL DEFAULT '',
    discovered_via TEXT NOT NULL DEFAULT 'scan',
    probe_status TEXT NOT NULL DEFAULT 'pending',
    probe_details_json TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discovery_results_job ON discovery_results(job_id);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL DEFAULT '',
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
