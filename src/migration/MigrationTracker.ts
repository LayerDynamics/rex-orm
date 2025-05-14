// src/migration/MigrationTracker.ts
import {
  DatabaseAdapter,
  DatabaseRecord,
} from "../interfaces/DatabaseAdapter.ts";
import { getErrorMessage } from "../utils/error_utils.ts";

interface MigrationRecord extends DatabaseRecord {
  id: string;
  count?: number;
}

export class MigrationTracker {
  private migrationsTable = "rex_orm_migrations";

  constructor(private adapter: DatabaseAdapter) {}

  async ensureMigrationsTable(): Promise<void> {
    try {
      // Use more compatible SQL syntax for the migrations table
      const query = `
        CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
          id TEXT PRIMARY KEY,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await this.adapter.execute(query);

      // Verify the table was created successfully - with more reliable approach
      try {
        // Just check if we can query the table
        await this.adapter.execute(
          `SELECT 1 FROM ${this.migrationsTable} LIMIT 1`,
        );
      } catch (_error) {
        // If there's an error, try the sqlite_master approach
        const tableExists = await this.tableExists(this.migrationsTable);
        if (!tableExists) {
          throw new Error(
            `Failed to create migrations table: ${this.migrationsTable}`,
          );
        }
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error(`Error ensuring migrations table: ${errorMessage}`);
      throw error;
    }
  }

  async tableExists(tableName: string): Promise<boolean> {
    try {
      // More compatible way to check for table existence
      const query =
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?";
      const result = await this.adapter.execute(query, [tableName]);
      return result.rows.length > 0;
    } catch (_error) {
      // If this fails, try an alternative approach for different databases
      try {
        await this.adapter.execute(`SELECT 1 FROM ${tableName} LIMIT 1`);
        return true;
      } catch {
        return false;
      }
    }
  }

  async isMigrationApplied(migrationId: string): Promise<boolean> {
    await this.ensureMigrationsTable();

    try {
      // Use numbered parameters for better SQLite compatibility
      const query =
        `SELECT COUNT(*) as count FROM ${this.migrationsTable} WHERE id = ?`;
      const result = await this.adapter.execute(query, [migrationId]);
      const row = result.rows[0] as MigrationRecord;
      return (row.count ?? 0) > 0;
    } catch (error) {
      console.error(
        `Error checking migration status: ${getErrorMessage(error)}`,
      );
      return false;
    }
  }

  async markMigrationAsApplied(migrationId: string): Promise<void> {
    await this.ensureMigrationsTable();

    const query = `INSERT INTO ${this.migrationsTable} (id) VALUES (?)`;
    await this.adapter.execute(query, [migrationId]);
  }

  async markMigrationAsRolledBack(migrationId: string): Promise<void> {
    await this.ensureMigrationsTable();

    const query = `DELETE FROM ${this.migrationsTable} WHERE id = ?`;
    await this.adapter.execute(query, [migrationId]);
  }

  async getAppliedMigrations(): Promise<string[]> {
    await this.ensureMigrationsTable();

    try {
      const query =
        `SELECT id FROM ${this.migrationsTable} ORDER BY applied_at ASC`;
      const result = await this.adapter.execute(query);
      return result.rows.map((row) => (row as MigrationRecord).id);
    } catch (error) {
      console.error(
        `Error getting applied migrations: ${getErrorMessage(error)}`,
      );
      return [];
    }
  }
}
