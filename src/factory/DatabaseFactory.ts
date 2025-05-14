// src/factory/DatabaseFactory.ts

import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { PostgreSQLAdapter } from "../adapters/PostgreSQLAdapter.ts";
import { SQLiteAdapter } from "../adapters/SQLiteAdapter.ts";

export type DatabaseConfig = {
  database: string;
  databasePath?: string;
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  databaseName?: string;
  [key: string]: unknown;
};

export class DatabaseFactory {
  static create(_arg0: { type: string; database: string }) {
    throw new Error("Method not implemented.");
  }
  private static instances: Map<string, DatabaseAdapter> = new Map();
  private static defaultType: string | null = null;

  static createAdapter(config: DatabaseConfig): DatabaseAdapter {
    const dbType = config.database.toLowerCase();
    this.defaultType = dbType;

    if (dbType === "sqlite") {
      if (!config.databasePath) {
        throw new Error("databasePath is required for SQLite");
      }
      const adapter = new SQLiteAdapter(config.databasePath);
      this.instances.set(dbType, adapter);
      return adapter;
    }

    if (this.instances.has(dbType)) {
      return this.instances.get(dbType)!;
    }

    let instance: DatabaseAdapter;
    switch (dbType) {
      case "postgres": {
        // For PostgreSQL, build a connection string from the config
        if (!config.databaseName) {
          throw new Error("databaseName is required for PostgreSQL");
        }

        // Create connection string from config or use databasePath directly if provided
        const connectionString = config.databasePath ||
          `postgres://${config.user || "postgres"}:${
            config.password || "postgres"
          }@${config.host || "localhost"}:${
            config.port || 5432
          }/${config.databaseName}`;

        instance = new PostgreSQLAdapter(connectionString);
        break;
      }
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }

    this.instances.set(dbType, instance);
    return instance;
  }

  static getAdapter(): DatabaseAdapter {
    if (this.instances.size === 0) {
      throw new Error(
        "Database adapter not initialized. Call createAdapter first.",
      );
    }

    if (this.defaultType && this.instances.has(this.defaultType)) {
      return this.instances.get(this.defaultType)!;
    }

    const firstAdapter = this.instances.values().next().value;
    if (!firstAdapter) {
      throw new Error("No database adapter available.");
    }

    return firstAdapter;
  }

  static reset(): void {
    this.instances.clear();
    this.defaultType = null;
  }
}
