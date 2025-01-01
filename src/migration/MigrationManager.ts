
import { MigrationRunner, Migration } from "./MigrationRunner.ts";
import { MigrationTracker } from "./MigrationTracker.ts";
import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { join } from "../deps.ts";

export class MigrationManager {
  private migrations: Migration[] = [];

  constructor(
    private adapter: DatabaseAdapter,
    private migrationsPath: string = "./src/migrations/"
  ) {}

  async loadMigrations() {
    await this.adapter.connect();
    const migrationFiles = [];
    for await (const entry of Deno.readDir(this.migrationsPath)) {
      if (entry.isFile && entry.name.endsWith(".ts")) {
        migrationFiles.push(entry.name);
      }
    }
    migrationFiles.sort();
    for (const file of migrationFiles) {
      const migrationModule = await import(join(Deno.cwd(), this.migrationsPath, file));
      if (migrationModule.default) {
        this.migrations.push(migrationModule.default as Migration);
      }
    }
    await this.adapter.disconnect();
  }

  async applyMigrations() {
    const tracker = new MigrationTracker(this.adapter);
    const runner = new MigrationRunner(this.adapter, tracker);
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
import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { Migration } from "../migration/MigrationRunner.ts";

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