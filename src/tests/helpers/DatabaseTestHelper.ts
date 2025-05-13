import { DatabaseAdapter } from "../../interfaces/DatabaseAdapter.ts";
import { MigrationTracker } from "../../migration/MigrationTracker.ts";
import { exists } from "https://deno.land/std@0.203.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.203.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.203.0/fs/mod.ts";

export class DatabaseTestHelper {
  private adapter: DatabaseAdapter;
  private migrationTracker: MigrationTracker;
  private initialized = false;

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
    this.migrationTracker = new MigrationTracker(adapter);
  }

  async initializeDatabase(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.adapter.connect();

      // Ensure migrations table exists
      const query = `
        CREATE TABLE IF NOT EXISTS rex_orm_migrations (
          id TEXT PRIMARY KEY,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      await this.adapter.execute(query);

      // Verify table creation
      const result = await this.adapter.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='rex_orm_migrations'",
      );

      if (result.rows.length === 0) {
        throw new Error("Failed to create migrations table");
      }

      this.initialized = true;
    } catch (error) {
      console.error("Database initialization failed:", error);
      throw error;
    }
  }

  async createTestTables(): Promise<void> {
    if (!this.initialized) {
      await this.initializeDatabase();
    }

    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE
      );`,
      `CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
    ];

    for (const table of tables) {
      await this.adapter.execute(table);
    }
  }

  async cleanupDatabase(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // Drop all tables in reverse order to handle dependencies
      const tables = ["posts", "users", "rex_orm_migrations"];
      for (const table of tables) {
        await this.adapter.execute(`DROP TABLE IF EXISTS ${table}`);
      }
    } finally {
      await this.adapter.disconnect();
      this.initialized = false;
    }
  }

  static async createTestDatabase(dbPath: string): Promise<void> {
    const dbDir = dbPath.substring(0, dbPath.lastIndexOf("/"));
    if (dbDir) {
      await ensureDir(dbDir);
    }
  }

  static async setupTestEnvironment(testDir: string): Promise<string> {
    await ensureDir(testDir);
    const dbPath = join(testDir, "test.db");
    await this.createTestDatabase(dbPath);
    return dbPath;
  }
}
