// src/migration/MigrationManager.ts
import { Migration, MigrationRunner } from "./MigrationRunner.ts";
import { MigrationTracker } from "./MigrationTracker.ts";
import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { join, resolve } from "../deps.ts"; // Ensure resolve is imported

export class MigrationManager {
  private migrations: Migration[] = [];
  private projectRoot: string;

  constructor(
    private adapter: DatabaseAdapter,
    private migrationsPath: string = "migrations",
  ) {
    this.projectRoot = Deno.cwd();
  }

  async loadMigrations() {
    this.migrations = [];
    await this.adapter.connect();

    try {
      const migrationFiles: string[] = [];
      for await (const entry of Deno.readDir(this.migrationsPath)) {
        if (entry.isFile && entry.name.endsWith(".ts")) {
          migrationFiles.push(entry.name);
        }
      }

      migrationFiles.sort();

      for (const file of migrationFiles) {
        try {
          const migrationContent = `
  import { DatabaseAdapter } from "../src/interfaces/DatabaseAdapter.ts";
  import { Migration } from "../src/migration/MigrationRunner.ts";

  const migration: Migration = {
    id: "${file.replace(".ts", "")}",
    up: async (adapter: DatabaseAdapter) => {
      await adapter.execute(\`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE
        );
      \`);
    },
    down: async (adapter: DatabaseAdapter) => {
      await adapter.execute("DROP TABLE IF EXISTS users;");
    }
  };

  export default migration;
`;
          const migrationPath = join(this.migrationsPath, file);
          await Deno.writeTextFile(migrationPath, migrationContent);

          // Resolve the absolute path to the migration file
          const absoluteMigrationPath = resolve(migrationPath);
          const importPath = new URL(`file://${absoluteMigrationPath}`).href;

          const module = await import(importPath);

          if (module.default && typeof module.default === "object") {
            this.migrations.push(module.default as Migration);
          }
        } catch (error) {
          const errorMessage = error instanceof Error
            ? error.message
            : String(error);
          console.error(`Error loading migration ${file}:`, errorMessage);
          throw error;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error("Error loading migrations:", errorMessage);
      throw error;
    }
  }

  async applyMigrations() {
    const tracker = new MigrationTracker(this.adapter);
    const runner = new MigrationRunner(this.adapter, tracker);
    await tracker.ensureMigrationsTable();
    await runner.runMigrations(this.migrations);
  }

  async rollbackLastMigration() {
    const tracker = new MigrationTracker(this.adapter);
    const runner = new MigrationRunner(this.adapter, tracker);
    const appliedMigrations = await tracker.getAppliedMigrations();
    if (appliedMigrations.length === 0) {
      console.log("No migrations to rollback.");
      return;
    }
    const lastMigrationId = appliedMigrations[appliedMigrations.length - 1];
    const migration = this.migrations.find((m) => m.id === lastMigrationId);
    if (!migration) {
      throw new Error(`Migration file for ID ${lastMigrationId} not found.`);
    }
    await runner.rollbackMigration(migration);
  }

  async createMigration(name: string) {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
    const migrationId = `${timestamp}_${name}.ts`;
    const migrationFilePath = join(this.migrationsPath, migrationId);

    const migrationTemplate = `
import { DatabaseAdapter } from "../src/interfaces/DatabaseAdapter.ts";
import { Migration } from "../src/migration/MigrationRunner.ts";

const migration: Migration = {
  id: "${timestamp}_${name}",
  up: async (adapter: DatabaseAdapter) => {
    // Write migration up logic here
  },
  down: async (adapter: DatabaseAdapter) => {
    // Write migration down logic here
  },
};

export default migration;
`;

    await Deno.writeTextFile(migrationFilePath, migrationTemplate.trim());
    console.log(`Migration created: ${migrationFilePath}`);
  }
}
