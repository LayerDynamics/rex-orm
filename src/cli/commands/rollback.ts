// src/cli/commands/rollback.ts

import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";
import { MigrationRunner } from "../../migration/MigrationRunner.ts";
import { MigrationTracker } from "../../migration/MigrationTracker.ts";
import { DatabaseFactory } from "../../factory/DatabaseFactory.ts";
import { loadConfig } from "../utils/migrationUtils.ts";

export const rollbackCommand = new Command()
  .name("rollback")
  .description("Revert the last applied database migration")
  .action(async (_options: void) => { // Added options parameter
    let adapter;
    try {
      const config = await loadConfig();
      adapter = await DatabaseFactory.createAdapter(config);
      await adapter.connect(); // Ensure connection is established
      const tracker = new MigrationTracker(adapter);
      const runner = new MigrationRunner(adapter, tracker);
      const applied = await tracker.getAppliedMigrations();
      const lastMigrationId = applied.pop();
      if (lastMigrationId) {
        await runner.rollbackMigration({
          id: lastMigrationId,
          up: async () => {},
          down: async () => {},
        });
        console.log("Last migration rolled back successfully!");
      }
      await adapter.disconnect();
    } catch (error) {
      console.error("Rollback failed:", error);
      throw error;
    }
  });
