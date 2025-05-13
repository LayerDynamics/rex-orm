import {
  DatabaseAdapter,
  DatabaseRecord,
  QueryParam,
  QueryResult,
  VectorCapabilities,
} from "../../interfaces/DatabaseAdapter.ts";

export class MockDatabaseAdapter implements DatabaseAdapter {
  executedQueries: { query: string; params: QueryParam[] }[] = [];
  protected appliedMigrations: Set<string> = new Set();
  connected = false;
  private lastQuery = "";
  private lastParams: QueryParam[] = [];
  public queryCount = 0;

  connect(): Promise<void> {
    this.connected = true;
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    this.connected = false;
    return Promise.resolve();
  }

  execute(query: string, params: QueryParam[] = []): Promise<QueryResult> {
    this.executedQueries.push({ query, params });
    this.lastQuery = query;
    this.lastParams = params;
    this.queryCount++;

    // Normalize query by removing whitespace for consistent comparison
    const normalizedQuery = query.replace(/\s+/g, " ").trim();

    const result: QueryResult = {
      rows: [],
      rowCount: 1,
      debug: {
        query: this.lastQuery,
        params: this.lastParams,
      },
    };

    if (normalizedQuery.startsWith("SELECT COUNT(*)")) {
      const migrationId = params[0]?.toString() ?? "";
      result.rows = [{
        count: this.appliedMigrations.has(migrationId) ? 1 : 0,
      }];
    }

    if (normalizedQuery.startsWith("INSERT INTO")) {
      if (params && params.length > 0) {
        const migrationId = params[0]?.toString() ?? "";
        this.appliedMigrations.add(migrationId);
      }
    }

    if (normalizedQuery.startsWith("DELETE FROM")) {
      if (params && params.length > 0) {
        const migrationId = params[0]?.toString() ?? "";
        this.appliedMigrations.delete(migrationId);
      }
    }

    return Promise.resolve(result);
  }

  // Implement executeMany method to execute multiple similar queries with different parameter sets
  executeMany(query: string, paramSets: QueryParam[][]): Promise<QueryResult> {
    let totalRowCount = 0;

    // Execute each query individually and accumulate results
    for (const params of paramSets) {
      this.executedQueries.push({ query, params });
      this.lastQuery = query;
      this.lastParams = params;
      this.queryCount++;
      totalRowCount++;
    }

    return Promise.resolve({
      rows: [],
      rowCount: totalRowCount,
      debug: {
        query: this.lastQuery,
        params: this.lastParams,
      },
    });
  }

  // Implement transaction method as a higher-level abstraction over transaction operations
  async transaction<T>(
    callback: (adapter: DatabaseAdapter) => Promise<T>,
  ): Promise<T> {
    await this.beginTransaction();
    try {
      const result = await callback(this);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  // Add helper methods
  isApplied(migrationId: string): boolean {
    return this.appliedMigrations.has(migrationId);
  }

  beginTransaction(): Promise<void> {
    this.execute("BEGIN TRANSACTION;", []);
    return Promise.resolve();
  }

  commit(): Promise<void> {
    this.execute("COMMIT;", []);
    return Promise.resolve();
  }

  rollback(): Promise<void> {
    this.execute("ROLLBACK;", []);
    return Promise.resolve();
  }

  findById(
    _model: DatabaseRecord,
    id: string | number,
  ): Promise<DatabaseRecord | null> {
    return Promise.resolve({ id, name: "Test User" });
  }

  findAll(_model: DatabaseRecord): Promise<DatabaseRecord[]> {
    return Promise.resolve([{ id: 1, name: "Test User" }]);
  }

  // Vector-specific methods implementation

  getType(): string {
    return "mock";
  }

  query(sql: string, params: QueryParam[] = []): Promise<QueryResult> {
    // Reuse execute method for query implementation
    return this.execute(sql, params);
  }

  getVectorCapabilities(): Promise<VectorCapabilities> {
    // Return mock vector capabilities for testing
    return Promise.resolve({
      supportedIndexTypes: ["flat", "ivf", "hnsw"],
      supportedMetrics: ["cosine", "euclidean", "dot"],
      maxDimensions: 1536,
    });
  }
}
