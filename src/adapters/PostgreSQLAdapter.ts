// src/adapters/PostgreSQLAdapter.ts
import { Pool, PoolClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import {
  DatabaseAdapter,
  DatabaseAdapterContext,
  DatabaseRecord,
  EnhancedDatabaseAdapter,
  QueryParam,
  QueryResult,
} from "../interfaces/DatabaseAdapter.ts";
import { CacheAdapter } from "../interfaces/CacheAdapter.ts";
import { getErrorMessage } from "../utils/error_utils.ts";
import { VectorCapabilities } from "../vector/capabilities/VectorCapabilities.ts";

interface Model extends DatabaseRecord {
  tableName?: string;
  name: string;
}

export class PostgreSQLAdapter
  implements DatabaseAdapter, EnhancedDatabaseAdapter<DatabaseRecord> {
  private pool: Pool;
  private client: PoolClient | null = null;
  private cache: CacheAdapter | null = null;
  private _queryCount = 0;
  private _isConnected = false;
  public context?: DatabaseAdapterContext;

  constructor(private connectionString: string, poolSize: number = 5) {
    this.pool = new Pool(this.connectionString, poolSize, true);
  }

  get queryCount(): number {
    return this._queryCount;
  }

  get connected(): boolean {
    return this._isConnected;
  }

  async connect(): Promise<void> {
    this.client = await this.pool.connect();
    this._isConnected = true;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.release();
      this.client = null;
    }
    await this.pool.end();
    this._isConnected = false;
    this._queryCount = 0;
  }

  async query(sql: string, params?: QueryParam[]): Promise<QueryResult> {
    if (!this.client) throw new Error("Database not connected.");
    this._queryCount++;

    // Check cache
    if (this.cache) {
      const cacheKey = `${sql}:${JSON.stringify(params)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) return { rows: cached, rowCount: cached.length };
    }

    const result = await this.client.queryObject({ text: sql, args: params });
    const rows = result.rows.map((row) => {
      if (typeof row === "object" && row !== null) {
        return Object.fromEntries(
          Object.entries(row as Record<string, unknown>),
        ) as DatabaseRecord;
      }
      return {} as DatabaseRecord;
    });

    // Update cache
    if (this.cache) {
      const cacheKey = `${sql}:${JSON.stringify(params)}`;
      await this.cache.set(cacheKey, rows);
    }

    return {
      rows,
      rowCount: rows.length,
      debug: {
        query: sql,
        params: params || [],
      },
    };
  }

  async execute(sql: string, params?: QueryParam[]): Promise<QueryResult> {
    if (!this.client) throw new Error("Database not connected.");
    this._queryCount++;

    // Check cache
    if (this.cache) {
      const cacheKey = `${sql}:${JSON.stringify(params)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { rows: cached, rowCount: cached.length };
      }
    }

    const result = await this.client.queryObject({ text: sql, args: params });
    const rows = result.rows.map((row) => {
      if (typeof row === "object" && row !== null) {
        return Object.fromEntries(
          Object.entries(row as Record<string, unknown>),
        ) as DatabaseRecord;
      }
      return {} as DatabaseRecord;
    });
    const rowCount = rows.length;

    // Update cache
    if (this.cache) {
      const cacheKey = `${sql}:${JSON.stringify(params)}`;
      await this.cache.set(cacheKey, rows);
    }

    return { rows, rowCount };
  }

  async executeMany(
    query: string,
    paramSets: QueryParam[][],
  ): Promise<QueryResult> {
    if (!this.connected) {
      await this.connect();
    }

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
          const result = await this.client!.queryObject(query, params);
          totalRowCount += result.rowCount ?? 0;
          allRows.push(...result.rows as DatabaseRecord[]);
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
        }ms: ${query} (${paramSets.length} sets)`,
      );

      return { rows: allRows, rowCount: totalRowCount };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error(`Error executing batch query: ${errorMessage}`);
      console.error(`Query: ${query}`);
      console.error(`ParamSets count: ${paramSets.length}`);
      throw error;
    }
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    if (!this.client) throw new Error("Database not connected.");
    try {
      await this.client.queryObject("BEGIN");
      const result = await callback();
      await this.client.queryObject("COMMIT");
      return result;
    } catch (error: unknown) {
      await this.client.queryObject("ROLLBACK");
      throw error;
    }
  }

  async beginTransaction(): Promise<void> {
    if (!this.client) throw new Error("Database not connected.");
    await this.client.queryObject("BEGIN");
  }

  async commit(): Promise<void> {
    if (!this.client) throw new Error("Database not connected.");
    await this.client.queryObject("COMMIT");
  }

  async rollback(): Promise<void> {
    if (!this.client) throw new Error("Database not connected.");
    await this.client.queryObject("ROLLBACK");
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

  async findById(
    model: Model,
    id: string | number,
  ): Promise<DatabaseRecord | null> {
    if (!this.client) throw new Error("Database not connected.");
    const tableName = model.tableName || model.name.toLowerCase();
    const result = await this.client.queryObject({
      text: `SELECT * FROM ${tableName} WHERE id = $1 LIMIT 1`,
      args: [id],
    });
    if (result.rows.length === 0) return null;
    return result.rows[0] as DatabaseRecord;
  }

  async findAll(model: Model): Promise<DatabaseRecord[]> {
    if (!this.client) throw new Error("Database not connected.");
    const tableName = model.tableName || model.name.toLowerCase();
    const result = await this.client.queryObject(`SELECT * FROM ${tableName}`);
    return result.rows.map((row) => row as DatabaseRecord);
  }

  // Vector-specific methods implementation
  getType(): string {
    return "postgres";
  }

  getVectorCapabilities(): Promise<VectorCapabilities> {
    return Promise.resolve({
      supportedMetrics: ["cosine", "euclidean", "dot"],
      supportedIndexTypes: ["flat", "ivf", "hnsw"],
      maxDimensions: 1536,
      defaultDimensions: 1536,
      supportsExactKnn: true,
      supportsApproximateKnn: true,
      supportsFilteredKnn: true,
      supportsHybridSearch: true,
      hasNativeVectorType: true,
      supportsVectorIndexing: true,
      supportsDistanceInSql: true,
      supportsBatchOperations: true,
      maxBatchSize: 1000,
      supportsAutoSchemaCreation: true,
      supportsSimilarityScore: true,
      similarityScoreType: "float" as const,
      supportsSimilaritySearch: true,
      supportsKnnSearch: true,
      supportsCustomMetrics: false,
      supportsIndexing: true,

      supportsMetric(metric: string): boolean {
        return ["cosine", "euclidean", "dot"].includes(metric);
      },

      getIndexOptions(indexType: string): Record<string, unknown> {
        switch (indexType) {
          case "flat":
            return {};
          case "ivf":
            return { lists: 100, nprobe: 10 };
          case "hnsw":
            return { m: 16, ef_construction: 100, ef: 100 };
          default:
            return {};
        }
      },

      getBestIndexType(
        metric: string,
        approximate: boolean,
        dimensions: number,
      ): string {
        // Use the metric parameter in determining the best index type
        if (!approximate) return "flat";

        if (metric === "cosine") {
          // Cosine similarity often works well with HNSW for high-dimensional vectors
          return dimensions > 500 ? "hnsw" : "ivf";
        } else if (metric === "euclidean") {
          // Euclidean distance has different optimal cutoffs
          return dimensions > 800 ? "hnsw" : "ivf";
        } else if (metric === "dot") {
          // Dot product might prefer different settings
          return dimensions > 700 ? "hnsw" : "ivf";
        }

        // Default case if metric is not recognized
        return dimensions > 1000 ? "hnsw" : "ivf";
      },
    });
  }
}
