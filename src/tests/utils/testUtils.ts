import { ensureDir } from "https://deno.land/std@0.203.0/fs/mod.ts";
import { dirname, join } from "https://deno.land/std@0.203.0/path/mod.ts";
// Instead of directly importing SQLite, use a version that works better with tests
import "reflect-metadata";
import {
  DatabaseAdapter,
  DatabaseRecord,
  QueryParam,
  QueryResult as _QueryResult,
  VectorCapabilities as _VectorCapabilities,
} from "../../interfaces/DatabaseAdapter.ts";
import { ModelRegistry } from "../../models/ModelRegistry.ts";
import { User } from "../../models/User.ts";
import { Post } from "../../models/Post.ts";
import { GraphQLSchemaConfig } from "../../graphql/types.ts";
import { GraphQLServerWrapper } from "../../graphql/GraphQLServer.ts";
import type { Migration } from "../../migration/MigrationRunner.ts";
import type { TestConfig } from "../../types/config.ts";
import { MigrationTracker } from "../../migration/MigrationTracker.ts";
import "reflect-metadata";

export interface TestContext {
  config: TestConfig;
  adapter: DatabaseAdapter;
  testDir: string;
  dbPath: string;
  cleanup: () => Promise<void>;
}

// Define a proper interface for the mock database
interface MockDatabase {
  execute: (
    sql: string,
    params?: unknown[],
  ) => { rowCount: number; rows: unknown[] };
  query: (sql: string, params?: unknown[]) => unknown[];
  close: () => void;
}

export class TestUtils {
  // Define db as MockDatabase type
  private static db: MockDatabase | null = null;
  private static activeServers: Set<GraphQLServerWrapper> = new Set();
  private static activePorts: Set<number> = new Set();

  static async setupTestContext(
    baseName = "rex-orm-test",
  ): Promise<TestContext> {
    const testDir = await Deno.makeTempDir({ prefix: baseName });
    const dbPath = join(testDir, "test.db");
    const config = await this.createTestDb(dbPath);

    const adapter = this.createTestAdapter();
    await adapter.connect();

    await this.setupDatabase(adapter);

    return {
      config,
      testDir,
      dbPath,
      adapter,
      cleanup: async () => await this.cleanupTestEnvironment(testDir, config),
    };
  }

  static async createTestDb(dbPath?: string): Promise<TestConfig> {
    const path = dbPath || ":memory:";
    if (path !== ":memory:") {
      const dir = dirname(path);
      await ensureDir(dir);
    }

    const config: TestConfig = {
      database: "sqlite",
      databasePath: path,
    };

    try {
      // Instead of using the SQLite DB directly, we'll create a mockable interface
      // that doesn't rely on Deno.seekSync
      this.db = this.createMockDb(path);
      await this.setupMigrationsTable();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Unknown error";
      console.error(`Error creating test database: ${errorMessage}`);
      throw new Error(`Failed to create test database: ${errorMessage}`);
    }

    return config;
  }

  private static createMockDb(_path: string): MockDatabase {
    // Create a simple in-memory DB object that can be used for tests
    // This bypasses the SQLite module's usage of Deno.seekSync
    const tables: Record<string, unknown[]> = {};

    return {
      execute: (_sql: string, _params: unknown[] = []) => {
        // Simple SQL query handling for testing purposes
        console.log(`Mock executing: ${_sql}`);

        if (_sql.includes("CREATE TABLE")) {
          const tableName = _sql.match(/CREATE TABLE.*?(\w+)/i)?.[1] ||
            "unknown";
          tables[tableName] = [];
          return { rowCount: 0, rows: [] };
        }

        return { rowCount: 0, rows: [] };
      },
      query: (_sql: string, _params: unknown[] = []) => {
        // Return empty array for queries
        return [];
      },
      close: (): void => {
        // No-op for close
      },
    };
  }

  static async cleanupTestDb(config: TestConfig): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    if (config.databasePath !== ":memory:") {
      try {
        await Deno.remove(config.databasePath);
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) {
          throw error;
        }
      }
    }
  }

  private static async setupDatabase(adapter: DatabaseAdapter): Promise<void> {
    const tracker = new MigrationTracker(adapter);
    await tracker.ensureMigrationsTable();
  }

  private static async setupMigrationsTable(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS rex_orm_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  static createTestAdapter(): DatabaseAdapter {
    if (!this.db) throw new Error("Database not initialized");
    const db = this.db;

    // Create adapter as a variable so we can reference it within its methods
    const adapter: DatabaseAdapter = {
      connect: () => Promise.resolve(),
      disconnect: () => Promise.resolve(),
      execute: (
        query: string,
        params: QueryParam[] = [],
      ): Promise<{ rows: DatabaseRecord[]; rowCount: number }> => {
        const result = db.query(query, params as string[]);
        // Fix type safety by ensuring we're working with Record<string, unknown>
        const rows = Array.isArray(result)
          ? result.map((row) => {
            if (row && typeof row === "object") {
              return Object.fromEntries(
                Object.entries(row as Record<string, unknown>)
                  .map(([k, v]) => [k, v]),
              );
            }
            return {} as DatabaseRecord;
          })
          : [];

        return Promise.resolve({
          rows,
          rowCount: rows.length,
        });
      },
      // Add missing methods and properties required by DatabaseAdapter interface
      executeMany: (_query: string, _paramSets: QueryParam[][]) => {
        return Promise.resolve({
          rows: [],
          rowCount: 0,
        });
      },
      transaction: async <T>(
        callback: (adapter: DatabaseAdapter) => Promise<T>,
      ): Promise<T> => {
        try {
          await db.query("BEGIN");
          const result = await callback(adapter);
          await db.query("COMMIT");
          return result;
        } catch (error) {
          await db.query("ROLLBACK");
          throw error;
        }
      },
      beginTransaction: async () => {
        await db.query("BEGIN");
        return Promise.resolve();
      },
      commit: async () => {
        await db.query("COMMIT");
        return Promise.resolve();
      },
      rollback: async () => {
        await db.query("ROLLBACK");
        return Promise.resolve();
      },
      queryCount: 0,
      findById: () => Promise.resolve(null),
      findAll: () => Promise.resolve([]),
      connected: false,
      getType: () => "mock",
      query: (_sql: string, _params: QueryParam[] = []) => {
        return Promise.resolve({
          rows: [],
          rowCount: 0,
        });
      },
      getVectorCapabilities: () =>
        Promise.resolve({
          supportedIndexTypes: ["ivfflat", "hnsw"],
          supportedMetrics: ["cosine", "euclidean", "dot"],
          maxDimensions: 1536,
        }),
    };
    return adapter;
  }

  static createTestMigration(id: string, tableName: string): Migration {
    return {
      id,
      up: async (adapter: DatabaseAdapter) => {
        await adapter.execute(`
          CREATE TABLE IF NOT EXISTS ${tableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
          )
        `);
      },
      down: async (adapter: DatabaseAdapter) => {
        await adapter.execute(`DROP TABLE IF EXISTS ${tableName}`);
      },
    };
  }

  static async verifyTableExists(tableName: string): Promise<boolean> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
      [tableName],
    );
    return result.length > 0;
  }

  static async getFreePort(): Promise<number> {
    for (let port = 4000; port < 5000; port++) {
      if (!this.activePorts.has(port)) {
        try {
          const listener = await Deno.listen({ port });
          await listener.close();
          this.activePorts.add(port);
          return port;
        } catch {
          continue;
        }
      }
    }
    throw new Error("No free ports available");
  }

  static async setupGraphQLTest(
    adapter: DatabaseAdapter,
  ): Promise<{ port: number; server: GraphQLServerWrapper }> {
    const port = await this.getFreePort();

    ModelRegistry.clear();
    ModelRegistry.registerModel(User);
    ModelRegistry.registerModel(Post);

    if (!Reflect.hasMetadata("validations", Object.prototype)) {
      Reflect.defineMetadata("validations", {}, Object.prototype);
    }

    const server = new GraphQLServerWrapper(
      {} as GraphQLSchemaConfig,
      { adapter },
      { port },
    );

    this.activeServers.add(server);
    return { port, server };
  }

  private static async cleanupTestEnvironment(
    testDir: string,
    config: TestConfig,
  ): Promise<void> {
    await this.cleanupTestDb(config);

    for (const server of this.activeServers) {
      if (server.isServerRunning()) {
        await server.stop();
      }
    }
    this.activeServers.clear();
    this.activePorts.clear();

    try {
      await Deno.remove(testDir, { recursive: true });
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
  }

  static async withTransaction<T>(
    adapter: DatabaseAdapter,
    callback: () => Promise<T>,
  ): Promise<T> {
    await adapter.beginTransaction();
    try {
      const result = await callback();
      await adapter.commit();
      return result;
    } catch (error) {
      await adapter.rollback();
      throw error;
    }
  }

  static async cleanupTestContext(context: TestContext): Promise<void> {
    await this.cleanupTestEnvironment(context.testDir, context.config);
  }
}

// Initialize metadata
Reflect.defineMetadata("validations", {}, Object.prototype);
Reflect.defineMetadata("relations", [], Object.prototype);

// Export for legacy support
export const createTestDb = TestUtils.createTestDb.bind(TestUtils);
export const cleanupTestDb = TestUtils.cleanupTestDb.bind(TestUtils);
export const setupTestContext = TestUtils.setupTestContext.bind(TestUtils);
export const cleanupTestContext = TestUtils.cleanupTestContext.bind(TestUtils);
