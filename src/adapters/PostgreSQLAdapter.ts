import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { DatabaseAdapter, QueryResult } from "../interfaces/DatabaseAdapter.ts";

export class PostgreSQLAdapter implements DatabaseAdapter {
  private client: Client | null = null;

  constructor(private connectionString: string) {}

  async connect(): Promise<void> {
    this.client = new Client(this.connectionString);
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  async query(sql: string, params?: any[]): Promise<any> {
    if (!this.client) throw new Error("Database not connected");
    const result = await this.client.queryObject({ text: sql, args: params });
    return result.rows;
  }

  async execute(sql: string, params?: any[]): Promise<QueryResult> {
    if (!this.client) throw new Error("Database not connected");
    const result = await this.client.queryObject({ text: sql, args: params });
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? 0  // Use nullish coalescing to ensure number
    };
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    if (!this.client) throw new Error("Database not connected");
    
    try {
      await this.client.queryObject("BEGIN");
      const result = await callback();
      await this.client.queryObject("COMMIT");
      return result;
    } catch (error) {
      await this.client.queryObject("ROLLBACK");
      throw error;
    }
  }

  async beginTransaction(): Promise<void> {
    if (!this.client) throw new Error("Database not connected");
    await this.client.queryObject("BEGIN");
  }

  async commit(): Promise<void> {
    if (!this.client) throw new Error("Database not connected");
    await this.client.queryObject("COMMIT");
  }

  async rollback(): Promise<void> {
    if (!this.client) throw new Error("Database not connected");
    await this.client.queryObject("ROLLBACK");
  }

  async findById(model: any, id: any): Promise<any> {
    if (!this.client) throw new Error("Database not connected");
    const tableName = model.tableName || model.name.toLowerCase();
    const result = await this.client.queryObject({
      text: `SELECT * FROM ${tableName} WHERE id = $1 LIMIT 1`,
      args: [id],
    });
    return result.rows[0] || null;
  }

  async findAll(model: any): Promise<any[]> {
    if (!this.client) throw new Error("Database not connected");
    const tableName = model.tableName || model.name.toLowerCase();
    const result = await this.client.queryObject(`SELECT * FROM ${tableName}`);
    return result.rows;
  }
}
