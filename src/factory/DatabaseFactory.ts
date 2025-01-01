import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { PostgreSQLAdapter } from "../adapters/PostgreSQLAdapter.ts";
import { SQLiteAdapter } from "../adapters/SQLiteAdapter.ts";

export class DatabaseFactory {
  private static instance: DatabaseAdapter;

  static createAdapter(config: { database: string; databasePath: string }): DatabaseAdapter {
    if (this.instance) return this.instance;

    switch (config.database) {
      case "postgres":
        this.instance = new PostgreSQLAdapter(config.databasePath);
        break;
      case "sqlite":
      default:
        this.instance = new SQLiteAdapter(config.databasePath);
    }

    return this.instance;
  }

  static getAdapter(): DatabaseAdapter {
    if (!this.instance) {
      throw new Error("Database adapter not initialized");
    }
    return this.instance;
  }
}
