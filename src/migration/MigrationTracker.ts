
import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";

export class MigrationTracker {
  private migrationsTable = "rex_orm_migrations";

  constructor(private adapter: DatabaseAdapter) {}

  async ensureMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.adapter.execute(query);
  }

  async isMigrationApplied(migrationId: string): Promise<boolean> {
    const query = `SELECT COUNT(*) as count FROM ${this.migrationsTable} WHERE id = $1`;
    const result = await this.adapter.execute(query, [migrationId]);
    return result.rows[0].count > 0;
  }

  async markMigrationAsApplied(migrationId: string): Promise<void> {
    const query = `INSERT INTO ${this.migrationsTable} (id) VALUES ($1)`;
    await this.adapter.execute(query, [migrationId]);
  }

  async markMigrationAsRolledBack(migrationId: string): Promise<void> {
    const query = `DELETE FROM ${this.migrationsTable} WHERE id = $1`;
    await this.adapter.execute(query, [migrationId]);
  }

  async getAppliedMigrations(): Promise<string[]> {
    const query = `SELECT id FROM ${this.migrationsTable} ORDER BY applied_at ASC`;
    const result = await this.adapter.execute(query);
    return result.rows.map((row) => row.id);
  }
}