package database

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"videocms/migrations"

	_ "modernc.org/sqlite"
)

// DB wraps sql.DB with helper methods for VideoCMS.
type DB struct {
	*sql.DB
}

// Open initializes the SQLite database connection, applies PRAGMAs and runs pending migrations.
func Open(dbPath string) (*DB, error) {
	if dbPath == "" {
		dbPath = "./data/cms.db"
	}

	// Ensure directory exists if path contains directories
	dir := filepath.Dir(dbPath)
	if dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0750); err != nil {
			return nil, fmt.Errorf("failed to create database directory %s: %w", dir, err)
		}
	}

	// DSN with busy_timeout, foreign_keys, and WAL
	dsn := fmt.Sprintf("%s?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)", dbPath)
	rawDB, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	// Set connection pool limits appropriate for SQLite
	rawDB.SetMaxOpenConns(25)
	rawDB.SetMaxIdleConns(5)
	rawDB.SetConnMaxLifetime(time.Hour)

	db := &DB{DB: rawDB}
	if err := db.Ping(); err != nil {
		rawDB.Close()
		return nil, fmt.Errorf("failed to ping sqlite database: %w", err)
	}

	if err := db.migrate(); err != nil {
		rawDB.Close()
		return nil, fmt.Errorf("failed to apply migrations: %w", err)
	}

	return db, nil
}

type migrationFile struct {
	version int
	name    string
	content string
}

func (db *DB) migrate() error {
	ctx := context.Background()

	// Ensure schema_migrations table exists
	initQuery := `
	CREATE TABLE IF NOT EXISTS schema_migrations (
		version INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		applied_at DATETIME NOT NULL
	);`
	if _, err := db.ExecContext(ctx, initQuery); err != nil {
		return fmt.Errorf("failed to init schema_migrations: %w", err)
	}

	// Read migration files from embedded FS
	entries, err := migrations.FS.ReadDir(".")
	if err != nil {
		return fmt.Errorf("failed to read embedded migrations dir: %w", err)
	}

	var migFiles []migrationFile
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		parts := strings.SplitN(entry.Name(), "_", 2)
		if len(parts) < 2 {
			continue
		}
		ver, err := strconv.Atoi(parts[0])
		if err != nil {
			continue
		}

		contentBytes, err := migrations.FS.ReadFile(entry.Name())
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", entry.Name(), err)
		}

		migFiles = append(migFiles, migrationFile{
			version: ver,
			name:    entry.Name(),
			content: string(contentBytes),
		})
	}

	sort.Slice(migFiles, func(i, j int) bool {
		return migFiles[i].version < migFiles[j].version
	})

	for _, m := range migFiles {
		var count int
		err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM schema_migrations WHERE version = ?", m.version).Scan(&count)
		if err != nil {
			return fmt.Errorf("failed to check migration version %d: %w", m.version, err)
		}
		if count > 0 {
			continue // Already applied
		}

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("failed to begin tx for migration %s: %w", m.name, err)
		}

		if _, err := tx.ExecContext(ctx, m.content); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to execute migration %s: %w", m.name, err)
		}

		if _, err := tx.ExecContext(ctx, "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
			m.version, m.name, time.Now().UTC()); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to record migration %s: %w", m.name, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", m.name, err)
		}
	}

	return nil
}
