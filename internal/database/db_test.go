package database

import (
	"context"
	"os"
	"testing"
)

func TestDatabaseMigrationAndTables(t *testing.T) {
	testDBPath := "./test_data_db.sqlite"
	defer os.Remove(testDBPath)

	db, err := Open(testDBPath)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	defer db.Close()

	ctx := context.Background()

	// Verify schema_migrations has 3 rows
	var migCount int
	err = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM schema_migrations").Scan(&migCount)
	if err != nil {
		t.Fatalf("failed to query schema_migrations: %v", err)
	}
	if migCount != 3 {
		t.Errorf("expected 3 migrations applied, got %d", migCount)
	}

	// Verify tables exist
	tables := []string{"cameras", "discovery_jobs", "discovery_results", "audit_logs", "layouts", "layout_items", "groups", "camera_groups", "camera_tags"}
	for _, tbl := range tables {
		var name string
		err := db.QueryRowContext(ctx, "SELECT name FROM sqlite_master WHERE type='table' AND name=?", tbl).Scan(&name)
		if err != nil {
			t.Errorf("table %s not found: %v", tbl, err)
		}
	}
}
