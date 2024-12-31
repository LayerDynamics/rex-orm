import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { PostgresAdapter } from "../adapters/PostgreSQLAdapter.ts";
import { SQLiteAdapter } from "../adapters/SQLiteAdapter.ts";

export class DatabaseFactory {
  static createAdapter(config: any): DatabaseAdapter {
    if (config.database === "postgres") {
      return new PostgresAdapter(config);
    } else if (config.database === "sqlite") {
      return new SQLiteAdapter(config.databasePath);
    } else {
      throw new Error(`Unsupported database type: ${config.database}`);
    }
  }
}
