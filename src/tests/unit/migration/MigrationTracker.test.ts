// src/tests/unit/migration/MigrationTracker.test.ts
import { assertEquals } from "../../../deps.ts";
import { MigrationTracker } from "../../../migration/MigrationTracker.ts";
import { MockDatabaseAdapter } from "../../mocks/MockDatabaseAdapter.ts";

// Mock implementation of tableExists to make the test work
class EnhancedMockAdapter extends MockDatabaseAdapter {
  tableExists = false;

  override execute(query: string, params: any[] = []): Promise<any> {
    // Add special handling for table existence check
    if (query.includes("sqlite_master") || query.includes("SELECT 1 FROM")) {
      return Promise.resolve({
        rows: this.tableExists ? [{ name: "rex_orm_migrations" }] : [],
        rowCount: this.tableExists ? 1 : 0,
      });
    }

    // Handle create table statement
    if (query.includes("CREATE TABLE")) {
      this.tableExists = true;
      return Promise.resolve({ rows: [], rowCount: 0 });
    }

    return super.execute(query, params);
  }
}

Deno.test("MigrationTracker tracks migrations correctly", async () => {
  const adapter = new EnhancedMockAdapter();
  const tracker = new MigrationTracker(adapter);

  await tracker.ensureMigrationsTable();
  const migrationId = "test_migration";

  // Verify initial state
  const isAppliedBefore = await tracker.isMigrationApplied(migrationId);
  assertEquals(
    isAppliedBefore,
    false,
    "Migration should not be applied initially",
  );

  // Apply migration
  await tracker.markMigrationAsApplied(migrationId);
  const isAppliedAfter = await tracker.isMigrationApplied(migrationId);
  assertEquals(
    isAppliedAfter,
    true,
    "Migration should be applied after marking",
  );

  // Rollback migration
  await tracker.markMigrationAsRolledBack(migrationId);
  const isAppliedFinal = await tracker.isMigrationApplied(migrationId);
  assertEquals(
    isAppliedFinal,
    false,
    "Migration should not be applied after rollback",
  );
});
