import { DB } from "https://deno.land/x/sqlite@v3.7.0/mod.ts";
import { DatabaseAdapter, QueryResult } from "../interfaces/DatabaseAdapter.ts";

export class SQLiteAdapter implements DatabaseAdapter {
  private db: DB | null = null;

  constructor(private dbPath: string) {}

  async connect(): Promise<void> {
    this.db = new DB(this.dbPath);
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async query(sql: string, params?: any[]): Promise<any> {
    if (!this.db) throw new Error("Database not connected");
    return this.db.queryEntries(sql, params);
  }

  async execute(sql: string, params?: any[]): Promise<QueryResult> {
    if (!this.db) throw new Error("Database not connected");
    const result = this.db.query(sql, params);
    return {
      rows: Array.from(result),
      rowCount: result.length
    };
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    if (!this.db) throw new Error("Database not connected");
    
    try {
      this.db.query("BEGIN TRANSACTION");
      const result = await callback();
      this.db.query("COMMIT");
      return result;
    } catch (error) {
      this.db.query("ROLLBACK");
      throw error;
    }
  }

  async beginTransaction(): Promise<void> {
    if (!this.db) throw new Error("Database not connected");
    this.db.query("BEGIN TRANSACTION");
  }

  async commit(): Promise<void> {
    if (!this.db) throw new Error("Database not connected");
    this.db.query("COMMIT");
  }

  async rollback(): Promise<void> {
    if (!this.db) throw new Error("Database not connected");
    this.db.query("ROLLBACK");
  }

  async findById(model: any, id: any): Promise<any> {
    if (!this.db) throw new Error("Database not connected");
    const tableName = model.tableName || model.name.toLowerCase();
    const result = this.db.queryEntries(
      `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`,
      [id]
    );
    return result[0] || null;
  }

  async findAll(model: any): Promise<any[]> {
    if (!this.db) throw new Error("Database not connected");
    const tableName = model.tableName || model.name.toLowerCase();
    return this.db.queryEntries(`SELECT * FROM ${tableName}`);
  }
}