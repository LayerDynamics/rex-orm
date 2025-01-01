
import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { MigrationTracker } from "./MigrationTracker.ts";

export interface Migration {
  id: string;
  up: (adapter: DatabaseAdapter) => Promise<void>;
  down: (adapter: DatabaseAdapter) => Promise<void>;
}

export class MigrationRunner {
  constructor(private adapter: DatabaseAdapter, private tracker: MigrationTracker) {}

  async runMigrations(migrations: Migration[]) {
    await this.adapter.connect();
    await this.tracker.ensureMigrationsTable();

    for (const migration of migrations) {
      const isApplied = await this.tracker.isMigrationApplied(migration.id);
      if (!isApplied) {
        console.log(`Applying migration: ${migration.id}`);
        await migration.up(this.adapter);
        await this.tracker.markMigrationAsApplied(migration.id);
        console.log(`Migration applied: ${migration.id}`);
      } else {
        console.log(`Migration already applied: ${migration.id}`);
      }
    }

    await this.adapter.disconnect();
  }

  async rollbackMigration(migration: Migration) {
    await this.adapter.connect();
    await this.tracker.ensureMigrationsTable();

    const isApplied = await this.tracker.isMigrationApplied(migration.id);
    if (isApplied) {
      console.log(`Reverting migration: ${migration.id}`);
      await migration.down(this.adapter);
      await this.tracker.markMigrationAsRolledBack(migration.id);
      console.log(`Migration reverted: ${migration.id}`);
    } else {
      console.log(`Migration not applied: ${migration.id}`);
    }

    await this.adapter.disconnect();
  }
}