// src/cli/commands/migrate.ts

import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";
import { DatabaseFactory } from "../../factory/DatabaseFactory.ts";
import { MigrationManager } from "../../migration/MigrationManager.ts";
import { MigrationTracker } from "../../migration/MigrationTracker.ts";
import { DatabaseAdapter } from "../../interfaces/DatabaseAdapter.ts";
import { loadConfig } from "../utils/migrationUtils.ts";
import { join } from "../../deps.ts";
import { TestConfig } from "../../db/ConnectionManager.ts";

interface ExecuteOptions {
  config?: TestConfig;
  adapter?: DatabaseAdapter;
}

export const migrateCommand = new Command()
  .name("migrate")
  .description("Apply pending database migrations")
  .action(async () => {
    await execute({});
  });

// Separate execute function for testing
export async function execute(options: ExecuteOptions = {}) {
  let ownAdapter = false;
  let adapter = options.adapter;
  let config = options.config;

  try {
    if (!adapter) {
      ownAdapter = true;
      const loadedConfig = await loadConfig();
      config = config || loadedConfig as TestConfig;
      adapter = await DatabaseFactory.createAdapter(config);
      await adapter.connect();
    }

    // Always ensure migrations table exists first
    const tracker = new MigrationTracker(adapter);
    await tracker.ensureMigrationsTable();

    const migrationsPath = join(Deno.cwd(), "migrations");
    const manager = new MigrationManager(adapter, migrationsPath);

    await manager.loadMigrations();
    await manager.applyMigrations();

    console.log("Migrations applied successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    if (ownAdapter && adapter) {
      await adapter.disconnect();
    }
  }
}
