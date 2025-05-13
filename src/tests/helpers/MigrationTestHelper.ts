// src/tests/helpers/MigrationTestHelper.ts

import { DatabaseAdapter } from "../../interfaces/DatabaseAdapter.ts";
import { Migration } from "../../migration/MigrationRunner.ts";
import { MigrationTracker } from "../../migration/MigrationTracker.ts";
import { SQLiteAdapter } from "../../adapters/SQLiteAdapter.ts";
import { ensureDir } from "https://deno.land/std@0.203.0/fs/mod.ts";
import { join } from "../../deps.ts";

export class MigrationTestHelper {
  private adapter: DatabaseAdapter;
  private tracker: MigrationTracker;

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
    this.tracker = new MigrationTracker(adapter);
  }

  async setupTestMigrations(): Promise<void> {
    await this.adapter.connect();
    await this.tracker.ensureMigrationsTable();

    // Verify migrations table
    const exists = await this.tracker.tableExists("rex_orm_migrations");
    if (!exists) {
      throw new Error("Failed to create migrations table");
    }
  }

  createTestMigration(id: string): Migration {
    return {
      id,
      up: async (adapter: DatabaseAdapter) => {
        await adapter.execute(`
          CREATE TABLE IF NOT EXISTS test_table_${id} (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL
          )
        `);
      },
      down: async (adapter: DatabaseAdapter) => {
        await adapter.execute(`DROP TABLE IF EXISTS test_table_${id}`);
      },
    };
  }

  async verifyTableExists(tableName: string): Promise<boolean> {
    const result = await this.adapter.execute(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName],
    );
    return result.rows.length > 0;
  }

  async cleanup(): Promise<void> {
    try {
      // Get all tables
      const result = await this.adapter.execute(
        `SELECT name FROM sqlite_master WHERE type='table'`,
      );

      // Drop all tables in reverse order
      for (const row of result.rows) {
        const tableName = (row as { name: string }).name;
        await this.adapter.execute(`DROP TABLE IF EXISTS ${tableName}`);
      }
    } finally {
      await this.adapter.disconnect();
    }
  }

  static async createTestDatabase(testDir: string): Promise<{
    adapter: DatabaseAdapter;
    tracker: MigrationTracker;
    dbPath: string;
  }> {
    const dbDir = join(testDir, "db");
    await ensureDir(dbDir);

    const dbPath = join(dbDir, "test.db");

    const adapter = new SQLiteAdapter({
      path: dbPath,
      // Set additional SQLite options if needed
      mode: "create",
    });

    await adapter.connect();
    const tracker = new MigrationTracker(adapter);
    await tracker.ensureMigrationsTable();

    return { adapter, tracker, dbPath };
  }

  static async cleanupTestDatabase(adapter: DatabaseAdapter): Promise<void> {
    try {
      await adapter.disconnect();
    } catch (error) {
      console.warn(
        "Error cleaning up test database:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  static createTestMigration(id: string, tableName: string): Migration {
    return {
      id,
      up: async (adapter: DatabaseAdapter) => {
        await adapter.execute(`
          CREATE TABLE IF NOT EXISTS ${tableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      },
      down: async (adapter: DatabaseAdapter) => {
        await adapter.execute(`DROP TABLE IF EXISTS ${tableName}`);
      },
    };
  }
}
