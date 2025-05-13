// src/adapters/SQLiteAdapter.ts

import { DB, QueryParameter } from "https://deno.land/x/sqlite@v3.7.0/mod.ts";
import {
  ConnectionOptions,
  DatabaseAdapter,
  DatabaseAdapterContext,
  DatabaseRecord,
  EnhancedDatabaseAdapter,
  QueryParam,
  QueryResult,
} from "../interfaces/DatabaseAdapter.ts";
import { CacheAdapter } from "../interfaces/CacheAdapter.ts";
import { getErrorMessage } from "../utils/error_utils.ts";
import { VectorCapabilities } from "../vector/interfaces/VectorCapabilities.ts";

interface DatabaseState {
  isConnected: boolean;
  db: DB | null;
}

interface ModelType extends DatabaseRecord {
  tableName?: string;
  name: string;
}

export interface SQLiteOptions extends ConnectionOptions {
  path: string;
  mode?: "read" | "write" | "create";
}

export class SQLiteAdapter
  implements DatabaseAdapter, EnhancedDatabaseAdapter<ModelType> {
  private state: DatabaseState = {
    isConnected: false,
    db: null,
  };

  protected cache: CacheAdapter | null = null;
  private _queryCount = 0;
  private readonly path: string;
  private readonly mode: "read" | "write" | "create";
  public context?: DatabaseAdapterContext;

  constructor(options: string | SQLiteOptions) {
    if (typeof options === "string") {
      this.path = options;
      this.mode = "create";
    } else {
      this.path = options.path;
      this.mode = options.mode || "create";
    }
  }

  get connected(): boolean {
    return this.state.isConnected;
  }

  get queryCount(): number {
    return this._queryCount;
  }

  async connect(): Promise<void> {
    try {
      if (this.state.isConnected && this.state.db) {
        return; // Already connected
      }

      // Initialize the database with proper error handling
      this.state.db = new DB(this.path);
      this.state.isConnected = true;

      // Enable foreign keys
      await this.execute("PRAGMA foreign_keys = ON;");

      console.log(`Connected to SQLite database at ${this.path}`);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error(`Failed to connect to SQLite database: ${errorMessage}`);
      throw new Error(`SQLite connection error: ${errorMessage}`);
    }
  }

  disconnect(): Promise<void> {
    if (this.state.isConnected && this.state.db) {
      try {
        this.state.db.close();
        this.state.db = null;
        this.state.isConnected = false;
        this._queryCount = 0;
      } catch (error) {
        console.error(
          `Error closing SQLite connection: ${getErrorMessage(error)}`,
        );
      }
    }
    return Promise.resolve();
  }

  protected verifyConnection(): asserts this is SQLiteAdapter {
    if (!this.state.isConnected || !this.state.db) {
      throw new Error("Database not connected");
    }
  }

  private getDb(): DB {
    this.verifyConnection();
    return this.state.db!;
  }

  async query(sql: string, params?: QueryParam[]): Promise<QueryResult> {
    if (!this.state.isConnected) {
      await this.connect();
    }

    this.verifyConnection();
    this._queryCount++;

    try {
      const rows = this.state.db!.queryEntries(sql, params) as DatabaseRecord[];
      const rowCount = rows.length;
      return { rows, rowCount };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error(`Error executing query: ${errorMessage}`);
      console.error(`Query: ${sql}`);
      console.error(`Params: ${JSON.stringify(params)}`);
      throw error;
    }
  }

  async execute(sql: string, params?: QueryParameter[]): Promise<QueryResult> {
    if (!this.state.isConnected) {
      await this.connect();
    }

    this.verifyConnection();
    this._queryCount++;

    // Check cache first
    if (this.cache) {
      const cacheKey = `${sql}:${JSON.stringify(params)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return {
          rows: cached as DatabaseRecord[],
          rowCount: cached.length,
        };
      }
    }

    try {
      const start = performance.now();

      // Execute query with better error handling
      // Use queryEntries directly instead of query + manual conversion
      const rows = this.state.db!.queryEntries(sql, params) as DatabaseRecord[];

      const end = performance.now();
      console.debug(`Query executed in ${(end - start).toFixed(2)}ms: ${sql}`);

      const rowCount = rows.length;

      // Store in cache if enabled
      if (this.cache) {
        const cacheKey = `${sql}:${JSON.stringify(params)}`;
        await this.cache.set(cacheKey, rows);
      }

      return { rows, rowCount };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error(`Error executing query: ${errorMessage}`);
      console.error(`Query: ${sql}`);
      console.error(`Params: ${JSON.stringify(params)}`);
      throw error;
    }
  }

  async executeMany(
    sql: string,
    paramSets: QueryParameter[][],
  ): Promise<QueryResult> {
    if (!this.state.isConnected) {
      await this.connect();
    }

    this.verifyConnection();

    try {
      const start = performance.now();
      let totalRowCount = 0;
      const allRows: DatabaseRecord[] = [];

      // Begin a transaction for better performance
      await this.beginTransaction();

      try {
        for (const params of paramSets) {
          this._queryCount++;
          // Execute each set of parameters in the same transaction
          const rows = this.state.db!.queryEntries(
            sql,
            params,
          ) as DatabaseRecord[];
          totalRowCount += rows.length;
          allRows.push(...rows);
        }

        // Commit the transaction
        await this.commit();
      } catch (error) {
        // Rollback on error
        await this.rollback();
        throw error;
      }

      const end = performance.now();
      console.debug(
        `Batch query executed in ${
          (end - start).toFixed(2)
        }ms: ${sql} (${paramSets.length} sets)`,
      );

      return { rows: allRows, rowCount: totalRowCount };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error(`Error executing batch query: ${errorMessage}`);
      console.error(`Query: ${sql}`);
      console.error(`ParamSets count: ${paramSets.length}`);
      throw error;
    }
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    this.verifyConnection();
    try {
      this.state.db!.query("BEGIN TRANSACTION");
      const result = await callback();
      this.state.db!.query("COMMIT");
      return result;
    } catch (error) {
      this.state.db!.query("ROLLBACK");
      console.error(`Transaction failed: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  beginTransaction(): Promise<void> {
    this.verifyConnection();
    try {
      this.state.db!.query("BEGIN TRANSACTION");
      return Promise.resolve();
    } catch (error) {
      console.error(`Failed to begin transaction: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  commit(): Promise<void> {
    this.verifyConnection();
    try {
      this.state.db!.query("COMMIT");
      return Promise.resolve();
    } catch (error) {
      console.error(`Failed to commit transaction: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  rollback(): Promise<void> {
    this.verifyConnection();
    try {
      this.state.db!.query("ROLLBACK");
      return Promise.resolve();
    } catch (error) {
      console.error(
        `Failed to rollback transaction: ${getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  setCache(adapter: CacheAdapter): void {
    this.cache = adapter;
  }

  getCache(): CacheAdapter | null {
    return this.cache;
  }

  setContext(context: DatabaseAdapterContext): void {
    this.context = context;
  }

  findById(
    model: ModelType,
    id: number | string,
  ): Promise<ModelType | null> {
    this.verifyConnection();
    try {
      const tableName = model.tableName || model.name.toLowerCase();
      const results = this.state.db!.queryEntries(
        `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`,
        [id],
      );
      return Promise.resolve((results[0] as ModelType) || null);
    } catch (error) {
      console.error(`Failed to find record by ID: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  findAll(model: ModelType): Promise<ModelType[]> {
    this.verifyConnection();
    try {
      const tableName = model.tableName || model.name.toLowerCase();
      const results = this.state.db!.queryEntries(`SELECT * FROM ${tableName}`);
      return Promise.resolve(results as ModelType[]);
    } catch (error) {
      console.error(`Failed to find all records: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  // Vector-specific methods implementation
  getType(): string {
    return "sqlite";
  }

  getVectorCapabilities(): Promise<VectorCapabilities> {
    return Promise.resolve({
      supportedIndexTypes: ["vss"],
      supportedMetrics: ["cosine", "euclidean", "dot"],
      maxDimensions: 1536,
      hasVectorSupport: true,
      supportsANN: true,
      supportsExactNN: true,
      supportsFiltering: true,
      supportsHybridSearch: true,
      supportsPagination: true,
      supportsMetadataFiltering: true,
      vectorIdType: "string",
      implementation: "vss",
      features: {
        hnsw: false,
        ivf: false,
        batchSearch: true,
        udf: false,
        normalization: true,
        maxBatchSize: 100,
      },
      version: "1.0.0",
      type: "sqlite_vss",
    });
  }
}
