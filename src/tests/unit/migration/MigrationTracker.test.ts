import { assertEquals } from "../../../deps.ts";
import { MigrationTracker } from "../../../migration/MigrationTracker.ts";
import { MockDatabaseAdapter } from "../../mocks/MockDatabaseAdapter.ts";

Deno.test("MigrationTracker tracks migrations correctly", async () => {
  const adapter = new MockDatabaseAdapter();
  const tracker = new MigrationTracker(adapter);

  await tracker.ensureMigrationsTable();
  const migrationId = "test_migration";

  // Verify initial state
  const isAppliedBefore = await tracker.isMigrationApplied(migrationId);
  assertEquals(isAppliedBefore, false, "Migration should not be applied initially");

  // Apply migration
  await tracker.markMigrationAsApplied(migrationId);
  const isAppliedAfter = await tracker.isMigrationApplied(migrationId);
  assertEquals(isAppliedAfter, true, "Migration should be applied after marking");

  // Rollback migration
  await tracker.markMigrationAsRolledBack(migrationId);
  const isAppliedFinal = await tracker.isMigrationApplied(migrationId);
  assertEquals(isAppliedFinal, false, "Migration should not be applied after rollback");
});
