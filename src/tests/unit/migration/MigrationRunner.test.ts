// src/tests/migration/MigrationRunner.test.ts
import { assertEquals } from "../../../deps.ts";
import {
  Migration,
  MigrationRunner,
} from "../../../migration/MigrationRunner.ts";
import { MigrationTracker } from "../../../migration/MigrationTracker.ts";
import { MockDatabaseAdapter } from "../../mocks/MockDatabaseAdapter.ts";
import { DatabaseAdapter } from "../../../interfaces/DatabaseAdapter.ts";

Deno.test({
  name: "MigrationRunner applies migrations correctly",
  async fn() {
    // Use MockDatabaseAdapter directly instead of createTestDb
    const adapter = new MockDatabaseAdapter();
    await adapter.connect();

    const tracker = new MigrationTracker(adapter);
    const runner = new MigrationRunner(adapter, tracker);

    // Ensure migrations table exists first
    await tracker.ensureMigrationsTable();

    const migration: Migration = {
      id: "test_migration_001",
      up: async (adapter: DatabaseAdapter) => {
        await adapter.execute("CREATE TABLE test (id INTEGER PRIMARY KEY)");
      },
      down: async (adapter: DatabaseAdapter) => {
        await adapter.execute("DROP TABLE test");
      },
    };

    await runner.runMigrations([migration]);

    // Get normalized queries for comparison
    const normalizedQueries = adapter.executedQueries.map((q) =>
      q.query.replace(/\s+/g, " ").trim()
    );

    // Verify query execution order and content
    assertEquals(
      adapter.executedQueries.length,
      11,
      "Should execute 11 queries",
    );

    // Check migrations table creation
    assertEquals(
      normalizedQueries[0].includes(
        "CREATE TABLE IF NOT EXISTS rex_orm_migrations",
      ),
      true,
      "Should create migrations table",
    );

    // Check migration creation and application queries
    const createTableIndex = normalizedQueries.findIndex((q) =>
      q === "CREATE TABLE test (id INTEGER PRIMARY KEY)"
    );
    assertEquals(createTableIndex >= 0, true, "Should create test table");

    const insertMigrationIndex = normalizedQueries.findIndex((q) =>
      q.includes("INSERT INTO rex_orm_migrations")
    );
    assertEquals(
      insertMigrationIndex > createTableIndex,
      true,
      "Should record migration after creating table",
    );

    // Verify adapter is still connected
    assertEquals(
      adapter.connected,
      true,
      "Database should remain connected after running migrations",
    );

    await adapter.disconnect();
  },
});

// Improved test for migration rollback
Deno.test({
  name: "MigrationRunner rolls back migrations correctly",
  async fn() {
    const adapter = new MockDatabaseAdapter();
    await adapter.connect();

    const tracker = new MigrationTracker(adapter);
    await tracker.ensureMigrationsTable();

    const runner = new MigrationRunner(adapter, tracker);

    const migration: Migration = {
      id: "test_migration_001",
      up: async (adapter: DatabaseAdapter) => {
        await adapter.execute("CREATE TABLE test (id INTEGER PRIMARY KEY)");
      },
      down: async (adapter: DatabaseAdapter) => {
        await adapter.execute("DROP TABLE test");
      },
    };

    // First apply the migration
    await runner.runMigrations([migration]);

    // Verify migration was applied
    assertEquals(
      await tracker.isMigrationApplied("test_migration_001"),
      true,
      "Migration should be marked as applied",
    );

    // Then roll it back
    await runner.rollbackMigration(migration);

    // Verify migration was rolled back
    assertEquals(
      await tracker.isMigrationApplied("test_migration_001"),
      false,
      "Migration should be removed after rollback",
    );

    await adapter.disconnect();
  },
});
