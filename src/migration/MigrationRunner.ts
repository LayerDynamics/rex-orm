// src/migration/MigrationRunner.ts
import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { MigrationTracker } from "./MigrationTracker.ts";
import { getErrorMessage } from "../utils/error_utils.ts";

export interface Migration {
  id: string;
  up: (adapter: DatabaseAdapter) => Promise<void>;
  down: (adapter: DatabaseAdapter) => Promise<void>;
}

export class MigrationRunner {
  constructor(
    private adapter: DatabaseAdapter,
    private tracker: MigrationTracker,
  ) {}

  async runMigrations(migrations: Migration[]): Promise<void> {
    if (!migrations.length) {
      console.log("No migrations to run.");
      return;
    }

    let isConnected = false;

    try {
      // Check if we need to connect or if connection is already established
      if (!this.adapter.connected) {
        await this.adapter.connect();
        isConnected = true;
      }

      await this.tracker.ensureMigrationsTable();

      for (const migration of migrations) {
        try {
          const isApplied = await this.tracker.isMigrationApplied(migration.id);
          if (!isApplied) {
            console.log(`Applying migration: ${migration.id}`);
            await migration.up(this.adapter);
            await this.tracker.markMigrationAsApplied(migration.id);
            console.log(`Migration applied: ${migration.id}`);
            console.log(
              `Total executed queries so far: ${this.adapter.queryCount}`,
            );
          } else {
            console.log(`Migration already applied: ${migration.id}`);
          }
        } catch (error) {
          console.error(
            `Failed to apply migration ${migration.id}: ${
              getErrorMessage(error)
            }`,
          );
          throw error;
        }
      }
    } catch (error) {
      console.error(`Migration process failed: ${getErrorMessage(error)}`);
      throw error;
    } finally {
      // Only disconnect if we were the ones who initiated the connection
      if (isConnected) {
        try {
          await this.adapter.disconnect();
        } catch (error) {
          console.error(
            `Error disconnecting from database: ${getErrorMessage(error)}`,
          );
        }
      }
    }
  }

  async rollbackMigration(migration: Migration): Promise<void> {
    let isConnected = false;

    try {
      // Check if we need to connect or if connection is already established
      if (!this.adapter.connected) {
        await this.adapter.connect();
        isConnected = true;
      }

      await this.tracker.ensureMigrationsTable();

      const isApplied = await this.tracker.isMigrationApplied(migration.id);
      if (isApplied) {
        console.log(`Reverting migration: ${migration.id}`);
        await migration.down(this.adapter);
        await this.tracker.markMigrationAsRolledBack(migration.id);
        console.log(`Migration reverted: ${migration.id}`);
        console.log(`Total executed queries: ${this.adapter.queryCount}`);
      } else {
        console.log(`Migration not applied: ${migration.id}`);
      }
    } catch (error) {
      console.error(`Rollback failed: ${getErrorMessage(error)}`);
      throw error;
    } finally {
      // Only disconnect if we were the ones who initiated the connection
      if (isConnected) {
        try {
          await this.adapter.disconnect();
        } catch (error) {
          console.error(
            `Error disconnecting from database: ${getErrorMessage(error)}`,
          );
        }
      }
    }
  }
}
