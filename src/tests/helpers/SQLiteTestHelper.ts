import { DB } from "https://deno.land/x/sqlite@v3.7.0/mod.ts";
import {
  DatabaseAdapter,
  DatabaseRecord,
  QueryParam,
  QueryResult,
  VectorCapabilities,
} from "../../interfaces/DatabaseAdapter.ts";
import { MigrationTracker } from "../../migration/MigrationTracker.ts";

export class SQLiteTestHelper implements DatabaseAdapter<DatabaseRecord> {
  private db: DB;
  public readonly dbPath: string;
  private migrationTracker: MigrationTracker;
  private _queryCount = 0;
  private _connected = true; // Initialize as true since connection happens in constructor

  constructor(dbPathOrMemory: string) {
    this.dbPath = dbPathOrMemory;
    this.db = new DB(dbPathOrMemory);
    this.migrationTracker = new MigrationTracker(this);
  }

  get connected(): boolean {
    return this._connected;
  }

  async connect(): Promise<void> {
    // Connection is established in constructor
  }

  disconnect(): Promise<void> {
    this.db.close();
    this._connected = false;
    return Promise.resolve();
  }

  async beginTransaction(): Promise<void> {
    await this.execute("BEGIN TRANSACTION");
  }

  async commit(): Promise<void> {
    await this.execute("COMMIT");
  }

  async rollback(): Promise<void> {
    await this.execute("ROLLBACK");
  }

  // Add transaction method to satisfy the interface
  async transaction<T>(
    callback: (adapter: DatabaseAdapter<DatabaseRecord>) => Promise<T>,
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

  // Add executeMany method to satisfy the interface
  async executeMany(
    query: string,
    paramSets: QueryParam[][],
  ): Promise<QueryResult> {
    let totalRowCount = 0;
    const allRows: DatabaseRecord[] = [];

    for (const params of paramSets) {
      const result = await this.execute(query, params);
      totalRowCount += result.rowCount;
      allRows.push(...result.rows);
    }

    return {
      rows: allRows,
      rowCount: totalRowCount,
    };
  }

  async getTableNames(): Promise<string[]> {
    const result = await this.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    );
    return result.rows.map((row) => String(row.name));
  }

  async initialize(): Promise<void> {
    // Initialize basic database structure
    await this.migrationTracker.ensureMigrationsTable();
  }

  async setupMigrationEnvironment(): Promise<void> {
    // Create mock migration tables directly in the database
    // This simulates what would happen when migrations run
    await this.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      )
    `);

    await this.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        user_id INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    await this.execute(`
      CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bio TEXT,
        user_id INTEGER UNIQUE,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);
  }

  execute(query: string, params: unknown[] = []): Promise<QueryResult> {
    try {
      this._queryCount++;

      // Log query for debugging
      console.log(`Executing query: ${query}`);

      if (query.trim().toLowerCase().startsWith("select")) {
        // Convert params to proper type for SQLite
        const typedParams = params as Array<
          string | number | boolean | null | Uint8Array
        >;

        // Get the result rows
        const queryResult = this.db.query(query, typedParams);

        // Convert result to required format
        const rows: Record<string, unknown>[] = [];

        // Extract column names from query result
        const columnNames: string[] = [];

        // Get column names from the first result
        if (queryResult.length > 0 && queryResult[0]) {
          // For SQLite, try to extract column names - this is simplified for test purposes
          for (let i = 0; i < queryResult[0].length; i++) {
            columnNames.push(`column_${i}`);
          }
        }

        // Convert each row to an object with column names as keys
        for (const row of queryResult) {
          const obj: Record<string, unknown> = {};
          for (let i = 0; i < row.length; i++) {
            obj[columnNames[i]] = row[i];
          }
          rows.push(obj);
        }

        return {
          rows,
          rowCount: queryResult.length,
        };
      } else {
        // For non-SELECT queries (CREATE, INSERT, UPDATE, DELETE)
        const typedParams = params as Array<
          string | number | boolean | null | Uint8Array
        >;
        this.db.query(query, typedParams);

        // For CREATE TABLE queries, ensure they succeed
        if (query.trim().toLowerCase().includes("create table")) {
          console.log(
            `Table creation successful: ${
              query.split("CREATE TABLE")[1].split("(")[0].trim()
            }`,
          );
        }

        return {
          rows: [],
          rowCount: this.db.changes,
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error(`Database error in execute: ${errorMessage}`);
      console.error(`Failed query: ${query}`);
      console.error(`Parameters: ${JSON.stringify(params)}`);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    await this.disconnect();
  }

  async findById(
    model: DatabaseRecord,
    id: string | number,
  ): Promise<DatabaseRecord | null> {
    // Extract table name from model - assume it has a constructor with name or tableName property
    const tableName = this.getTableNameFromModel(model);
    const result = await this.execute(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [id],
    );
    return result.rows.length > 0 ? result.rows[0] as DatabaseRecord : null;
  }

  async findAll(model: DatabaseRecord): Promise<DatabaseRecord[]> {
    const tableName = this.getTableNameFromModel(model);
    const result = await this.execute(`SELECT * FROM ${tableName}`);
    return result.rows as DatabaseRecord[];
  }

  // Helper method to extract table name from model
  private getTableNameFromModel(model: DatabaseRecord): string {
    // If model has a tableName property
    if ("tableName" in model && model.tableName) {
      return model.tableName as string;
    }

    // If model is an instance of a class, use the class name
    if (model.constructor && model.constructor.name) {
      const constructor = model.constructor as { name: string };
      // Convert CamelCase to snake_case and pluralize
      return constructor.name.replace(/([a-z])([A-Z])/g, "$1_$2")
        .toLowerCase() + "s";
    }

    // Default fallback
    return "unknown_table";
  }

  // Implement queryCount as a getter that returns the actual count
  get queryCount(): number {
    return this._queryCount;
  }

  // Keep the method implementation but with a different name
  async queryCountMethod(
    query: string,
    params: unknown[] = [],
  ): Promise<number> {
    // Modify the query to count results
    let countQuery = query;
    if (!query.toLowerCase().includes("count(")) {
      countQuery = `SELECT COUNT(*) as count FROM (${query})`;
    }

    try {
      const result = await this.execute(countQuery, params);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return typeof row.count === "number" ? Number(row.count) : 0;
      }
      return 0;
    } catch (error) {
      console.error(`Error in queryCountMethod: ${error}`);
      return 0;
    }
  }

  // Add a method to directly check if a table exists
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [tableName],
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error(`Error checking if table exists: ${error}`);
      return false;
    }
  }

  // Implement remaining methods required by DatabaseAdapter interface
  query(sql: string, params: QueryParam[] = []): Promise<QueryResult> {
    return this.execute(sql, params);
  }

  getType(): string {
    return "sqlite-test";
  }

  getVectorCapabilities(): Promise<VectorCapabilities> {
    return Promise.resolve({
      hasVectorSupport: true,
      supportsANN: true,
      supportsExactNN: true,
      maxDimensions: 1536,
      supportedMetrics: ["cosine", "euclidean", "dot"],
      supportedIndexTypes: ["vss"],
      supportsFiltering: true,
      supportsHybridSearch: false,
      features: {
        hnsw: false,
        ivf: false,
        batchSearch: true,
        normalization: true,
      },
      version: "1.0",
      type: "sqlite-vss",
    });
  }
}
