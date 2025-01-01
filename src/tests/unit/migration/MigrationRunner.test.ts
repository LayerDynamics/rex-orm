import { assertEquals, assertThrows } from "../../../deps.ts";
import { MigrationRunner, Migration } from "../../../migration/MigrationRunner.ts";
import { MigrationTracker } from "../../../migration/MigrationTracker.ts";
import { MockDatabaseAdapter } from "../../mocks/MockDatabaseAdapter.ts";
import { DatabaseAdapter } from "../../../interfaces/DatabaseAdapter.ts";

Deno.test("MigrationRunner applies migrations correctly", async () => {
  const adapter = new MockDatabaseAdapter();
  const tracker = new MigrationTracker(adapter);
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

  await runner.runMigrations([migration]);

  // Get normalized queries for comparison
  const normalizedQueries = adapter.executedQueries.map(q => 
    q.query.replace(/\s+/g, ' ').trim()
  );

  // Verify query execution order and content
  assertEquals(adapter.executedQueries.length, 4, "Should execute 4 queries");
  
  // Check migrations table creation
  assertEquals(
    normalizedQueries[0].includes("CREATE TABLE IF NOT EXISTS rex_orm_migrations"),
    true,
    "Should create migrations table"
  );
  
  // Check migration status query
  assertEquals(
    normalizedQueries[1].includes("SELECT COUNT(*)"),
    true,
    "Should check migration status"
  );
  
  // Check test table creation
  assertEquals(
    normalizedQueries[2],
    "CREATE TABLE test (id INTEGER PRIMARY KEY)",
    "Should create test table"
  );
  
  // Check migration recording
  assertEquals(
    normalizedQueries[3].includes("INSERT INTO rex_orm_migrations"),
    true,
    "Should record migration"
  );

  // Verify final state
  assertEquals(adapter.connected, false, "Database should be disconnected after running migrations");
  assertEquals(await tracker.isMigrationApplied("test_migration_001"), true, 
    "Migration should be marked as applied");
});

// Add new test for migration rollback
Deno.test("MigrationRunner rolls back migrations correctly", async () => {
  const adapter = new MockDatabaseAdapter();
  const tracker = new MigrationTracker(adapter);
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
  
  // Then roll it back
  await runner.rollbackMigration(migration);

  assertEquals(await tracker.isMigrationApplied("test_migration_001"), false, 
    "Migration should be removed after rollback");
});
