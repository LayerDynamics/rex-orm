import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { DatabaseConfig, PostgresConfig, SQLiteConfig } from "../interfaces/DatabaseConfig.ts";
import { PostgresAdapter } from "../adapters/PostgreSQLAdapter.ts";
import { SQLiteAdapter } from "../adapters/SQLiteAdapter.ts";

export class DatabaseFactory {
  static createAdapter(config: DatabaseConfig): DatabaseAdapter {
    if (config.database === "postgres") {
      return new PostgresAdapter(config as PostgresConfig);
    } else if (config.database === "sqlite") {
      return new SQLiteAdapter((config as SQLiteConfig).databasePath);
    }
    throw new Error(`Unsupported database type: ${config.database}`);
  }
}
