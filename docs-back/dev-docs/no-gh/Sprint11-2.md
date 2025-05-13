### Sprint 11: Advanced Features - Transactions, Caching, and Optimization

**Duration:** Weeks 21-22

---

## Overview

Sprint 11 enhances **Rex-ORM** with advanced features aimed at improving
robustness, performance, and scalability. The primary objectives include
implementing transaction management, introducing caching mechanisms, optimizing
query execution, supporting bulk operations, and expanding comprehensive
documentation. These enhancements ensure that Rex-ORM efficiently handles
complex database interactions while maintaining data integrity and delivering
high performance.

---

## Directory Structure

The project structure has been expanded to incorporate modules for transactions,
caching, and bulk operations, along with corresponding tests:

```
rex-orm/
├── src/
│   ├── adapters/
│   │   ├── PostgreSQLAdapter.ts
│   │   ├── SQLiteAdapter.ts
│   │   └── CacheAdapter.ts
│   ├── caching/
│   │   ├── InMemoryCache.ts
│   │   ├── RedisCache.ts
│   │   └── CacheService.ts
│   ├── transactions/
│   │   ├── TransactionManager.ts
│   │   └── types.ts
│   ├── bulk/
│   │   ├── BulkOperations.ts
│   │   └── types.ts
│   ├── graphql/
│   │   ├── GraphQLSchema.ts
│   │   ├── Resolvers.ts
│   │   ├── GraphQLServer.ts
│   │   └── types.ts
│   ├── models/
│   │   ├── ModelRegistry.ts
│   │   ├── BaseModel.ts
│   │   ├── User.ts
│   │   ├── Post.ts
│   │   └── ... (additional models)
│   ├── realtime/
│   │   ├── EventEmitter.ts
│   │   ├── WebSocketServer.ts
│   │   └── SubscriptionManager.ts
│   ├── migration/
│   │   ├── MigrationRunner.ts
│   │   ├── MigrationTracker.ts
│   │   └── MigrationManager.ts
│   ├── migrations/
│   │   ├── 001_create_users_table.ts
│   │   ├── 002_create_posts_table.ts
│   │   ├── 003_create_profiles_table.ts
│   │   ├── 004_create_post_tags_table.ts
│   │   └── ... (additional migration scripts)
│   ├── query/
│   │   └── QueryBuilder.ts
│   ├── serverless/
│   │   ├── handler.ts
│   │   ├── deploy.sh
│   │   └── serverless.yml
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── init.ts
│   │   │   ├── generateModel.ts
│   │   │   └── ... (additional CLI commands)
│   │   └── cli.ts
│   ├── factory/
│   │   └── DatabaseFactory.ts
│   ├── interfaces/
│   │   ├── DatabaseAdapter.ts
│   │   └── CacheAdapter.ts
│   ├── decorators/
│   │   ├── Entity.ts
│   │   ├── Column.ts
│   │   ├── PrimaryKey.ts
│   │   ├── OneToMany.ts
│   │   ├── ManyToOne.ts
│   │   ├── OneToOne.ts
│   │   ├── ManyToMany.ts
│   │   ├── Validate.ts
│   │   └── ValidateMultiple.ts
│   ├── tests/
│   │   └── unit/
│   │       ├── adapters/
│   │       │   ├── PostgreSQLAdapter.test.ts
│   │       │   ├── SQLiteAdapter.test.ts
│   │       │   └── CacheAdapter.test.ts
│   │       ├── caching/
│   │       │   ├── InMemoryCache.test.ts
│   │       │   ├── RedisCache.test.ts
│   │       │   └── CacheService.test.ts
│   │       ├── transactions/
│   │       │   ├── TransactionManager.test.ts
│   │       │   └── types.test.ts
│   │       ├── bulk/
│   │       │   ├── BulkOperations.test.ts
│   │       │   └── types.test.ts
│   │       ├── graphql/
│   │       │   ├── GraphQLSchema.test.ts
│   │       │   ├── Resolvers.test.ts
│   │       │   └── GraphQLServer.test.ts
│   │       ├── realtime/
│   │       │   ├── EventEmitter.test.ts
│   │       │   ├── WebSocketServer.test.ts
│   │       │   └── SubscriptionManager.test.ts
│   │       ├── migration/
│   │       │   ├── MigrationRunner.test.ts
│   │       │   ├── MigrationTracker.test.ts
│   │       │   └── MigrationManager.test.ts
│   │       ├── modelLayer/
│   │       │   ├── Decorators.test.ts
│   │       │   ├── ModelRegistry.test.ts
│   │       │   ├── RelationshipDecorators.test.ts
│   │       │   └── ValidationDecorators.test.ts
│   │       └── query/
│   │           └── QueryBuilder.test.ts
│   ├── config/
│   │   └── config.ts
│   └── ... (other directories)
├── import_map.json
├── deno.json
├── package.json
└── README.md
```

---

## Advanced Features

### 1. Transactions Support

**Objective:** Implement transaction management to allow atomic operations
across multiple database actions, ensuring data integrity and consistency.

#### Key Components:

- **Types Definition:** `src/transactions/types.ts`
- **Transaction Manager:** `src/transactions/TransactionManager.ts`
- **Database Adapter Integration:** Updated `DatabaseAdapter.ts`,
  `PostgreSQLAdapter.ts`, and `SQLiteAdapter.ts`
- **Unit Tests:** `src/tests/unit/transactions/TransactionManager.test.ts`

#### Implementation:

**Types Definition (`src/transactions/types.ts`):**

```typescript
export interface Transaction {
  id: string;
  begin: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

export interface TransactionManagerOptions {
  isolationLevel?: string; // e.g., "READ COMMITTED", "SERIALIZABLE"
}
```

**Transaction Manager (`src/transactions/TransactionManager.ts`):**

```typescript
import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { Transaction, TransactionManagerOptions } from "./types.ts";
import { v4 } from "https://deno.land/std@0.178.0/uuid/mod.ts";

export class TransactionManager {
  private adapter: DatabaseAdapter;
  private options: TransactionManagerOptions;

  constructor(
    adapter: DatabaseAdapter,
    options: TransactionManagerOptions = {},
  ) {
    this.adapter = adapter;
    this.options = options;
  }

  async beginTransaction(): Promise<Transaction> {
    const transactionId = v4.generate();
    await this.adapter.execute("BEGIN TRANSACTION;");
    return {
      id: transactionId,
      begin: async () => {
        await this.adapter.execute("BEGIN TRANSACTION;");
      },
      commit: async () => {
        await this.adapter.execute("COMMIT;");
      },
      rollback: async () => {
        await this.adapter.execute("ROLLBACK;");
      },
    };
  }

  async executeInTransaction<T>(
    fn: (tx: Transaction) => Promise<T>,
  ): Promise<T> {
    const transaction = await this.beginTransaction();
    try {
      const result = await fn(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
```

**Database Adapter Integration (`src/interfaces/DatabaseAdapter.ts`):**

```typescript
import { CacheAdapter } from "./CacheAdapter.ts";

export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute(
    query: string,
    params?: any[],
  ): Promise<{ rows: any[]; rowCount: number }>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  setCache(adapter: CacheAdapter): void;
  getCache(): CacheAdapter | null;
}
```

**PostgreSQL Adapter (`src/adapters/PostgreSQLAdapter.ts`):**

```typescript
import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { Pool, PoolClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { CacheAdapter } from "../interfaces/CacheAdapter.ts";

export class PostgreSQLAdapter implements DatabaseAdapter {
  private pool: Pool;
  private cache: CacheAdapter | null = null;
  private client: PoolClient | null = null;

  constructor(connectionString: string, poolSize: number = 10) {
    this.pool = new Pool(connectionString, poolSize, true);
  }

  async connect(): Promise<void> {
    this.client = await this.pool.connect();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.pool.release(this.client);
      this.client = null;
    }
    await this.pool.end();
  }

  async execute(
    query: string,
    params: any[] = [],
  ): Promise<{ rows: any[]; rowCount: number }> {
    if (this.cache) {
      const cacheKey = `${query}:${JSON.stringify(params)}`;
      const cachedResult = await this.cache.get(cacheKey);
      if (cachedResult) {
        return { rows: cachedResult, rowCount: cachedResult.length };
      }
    }

    if (!this.client) {
      throw new Error("Database not connected.");
    }

    const result = await this.client.queryObject(query, ...params);

    if (this.cache) {
      const cacheKey = `${query}:${JSON.stringify(params)}`;
      await this.cache.set(cacheKey, result.rows);
    }

    return { rows: result.rows, rowCount: result.rows.length };
  }

  async beginTransaction(): Promise<void> {
    if (!this.client) {
      throw new Error("Database not connected.");
    }
    await this.client.queryObject("BEGIN;");
  }

  async commit(): Promise<void> {
    if (!this.client) {
      throw new Error("Database not connected.");
    }
    await this.client.queryObject("COMMIT;");
  }

  async rollback(): Promise<void> {
    if (!this.client) {
      throw new Error("Database not connected.");
    }
    await this.client.queryObject("ROLLBACK;");
  }

  setCache(adapter: CacheAdapter): void {
    this.cache = adapter;
  }

  getCache(): CacheAdapter | null {
    return this.cache;
  }
}
```

**SQLite Adapter (`src/adapters/SQLiteAdapter.ts`):**

```typescript
import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { CacheAdapter } from "../interfaces/CacheAdapter.ts";

export class SQLiteAdapter implements DatabaseAdapter {
  private db: DB;
  private cache: CacheAdapter | null = null;

  constructor(dbPath: string) {
    this.db = new DB(dbPath);
  }

  async connect(): Promise<void> {
    // SQLite does not require explicit connection handling
  }

  async disconnect(): Promise<void> {
    this.db.close();
  }

  async execute(
    query: string,
    params: any[] = [],
  ): Promise<{ rows: any[]; rowCount: number }> {
    if (this.cache) {
      const cacheKey = `${query}:${JSON.stringify(params)}`;
      const cachedResult = await this.cache.get(cacheKey);
      if (cachedResult) {
        return { rows: cachedResult, rowCount: cachedResult.length };
      }
    }

    const stmt = this.db.prepareQuery(query, params);
    const rows: any[] = [];
    for (const row of stmt) {
      rows.push(row);
    }
    stmt.finalize();

    if (this.cache) {
      const cacheKey = `${query}:${JSON.stringify(params)}`;
      this.cache.set(cacheKey, rows);
    }

    return { rows, rowCount: rows.length };
  }

  async beginTransaction(): Promise<void> {
    this.db.query("BEGIN TRANSACTION;");
  }

  async commit(): Promise<void> {
    this.db.query("COMMIT;");
  }

  async rollback(): Promise<void> {
    this.db.query("ROLLBACK;");
  }

  setCache(adapter: CacheAdapter): void {
    this.cache = adapter;
  }

  getCache(): CacheAdapter | null {
    return this.cache;
  }
}
```

**Unit Tests (`src/tests/unit/transactions/TransactionManager.test.ts`):**

```typescript
import { assertEquals, assertThrowsAsync } from "../../../deps.ts";
import { TransactionManager } from "../../../transactions/TransactionManager.ts";
import { MockDatabaseAdapter } from "../../mocks/MockDatabaseAdapter.ts";

Deno.test("TransactionManager commits transactions correctly", async () => {
  const adapter = new MockDatabaseAdapter();
  const txManager = new TransactionManager(adapter);

  await txManager.executeInTransaction(async (tx) => {
    await adapter.execute("INSERT INTO users (name) VALUES ($1);", ["Alice"]);
    await adapter.execute("INSERT INTO posts (title) VALUES ($1);", [
      "First Post",
    ]);
  });

  assertEquals(adapter.getExecutedQueries(), [
    "BEGIN TRANSACTION;",
    "INSERT INTO users (name) VALUES ($1);",
    "INSERT INTO posts (title) VALUES ($1);",
    "COMMIT;",
  ]);
});

Deno.test("TransactionManager rolls back transactions on error", async () => {
  const adapter = new MockDatabaseAdapter();
  const txManager = new TransactionManager(adapter);

  await assertThrowsAsync(
    async () => {
      await txManager.executeInTransaction(async (tx) => {
        await adapter.execute("INSERT INTO users (name) VALUES ($1);", ["Bob"]);
        throw new Error("Test error");
      });
    },
    Error,
    "Test error",
  );

  assertEquals(adapter.getExecutedQueries(), [
    "BEGIN TRANSACTION;",
    "INSERT INTO users (name) VALUES ($1);",
    "ROLLBACK;",
  ]);
});
```

### 2. Caching Mechanisms

**Objective:** Introduce caching strategies to enhance query performance and
reduce database load. Supports both in-memory caching and Redis integration.

#### Key Components:

- **Cache Adapter Interface:** `src/interfaces/CacheAdapter.ts`
- **In-Memory Cache:** `src/caching/InMemoryCache.ts`
- **Redis Cache:** `src/caching/RedisCache.ts`
- **Cache Service:** `src/caching/CacheService.ts`
- **Unit Tests:**
  - `src/tests/unit/caching/InMemoryCache.test.ts`
  - `src/tests/unit/caching/RedisCache.test.ts`
  - `src/tests/unit/caching/CacheService.test.ts`

#### Implementation:

**Cache Adapter Interface (`src/interfaces/CacheAdapter.ts`):**

```typescript
export interface CacheAdapter {
  set(key: string, value: any): void | Promise<void>;
  get(key: string): any | null | Promise<any | null>;
  delete(key: string): void | Promise<void>;
  clear(): void | Promise<void>;
}
```

**In-Memory Cache (`src/caching/InMemoryCache.ts`):**

```typescript
import { CacheAdapter } from "../interfaces/CacheAdapter.ts";

interface CacheEntry {
  data: any;
  expiry: number;
}

export class InMemoryCache implements CacheAdapter {
  private cache: Map<string, CacheEntry>;
  private ttl: number; // Time-to-live in milliseconds

  constructor(ttl: number = 60000) { // Default TTL: 60 seconds
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key: string, value: any): void {
    const expiry = Date.now() + this.ttl;
    this.cache.set(key, { data: value, expiry });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
```

**Redis Cache (`src/caching/RedisCache.ts`):**

```typescript
import { CacheAdapter } from "../interfaces/CacheAdapter.ts";
import { connect, Redis } from "https://deno.land/x/redis@v0.28.2/mod.ts";

export class RedisCache implements CacheAdapter {
  private client: Redis;
  private ttl: number; // Time-to-live in seconds

  constructor(url: string, ttl: number = 60) { // Default TTL: 60 seconds
    this.client = await connect({
      hostname: new URL(url).hostname,
      port: parseInt(new URL(url).port) || 6379,
    });
    this.ttl = ttl;
  }

  async set(key: string, value: any): Promise<void> {
    await this.client.set(key, JSON.stringify(value), { ex: this.ttl });
  }

  async get(key: string): Promise<any | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    return JSON.parse(data);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async clear(): Promise<void> {
    await this.client.flushdb();
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }
}
```

**Cache Service (`src/caching/CacheService.ts`):**

```typescript
import { CacheAdapter } from "../interfaces/CacheAdapter.ts";
import { InMemoryCache } from "./InMemoryCache.ts";
import { RedisCache } from "./RedisCache.ts";

export class CacheService {
  private static instance: CacheService;
  private cache: CacheAdapter | null = null;

  private constructor() {}

  /**
   * Retrieves the singleton instance of CacheService.
   * @returns {CacheService} The singleton instance.
   */
  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Initializes the cache adapter based on the specified type.
   * @param {"in-memory" | "redis"} type - The type of cache to initialize.
   * @param {any} options - Configuration options for the cache adapter.
   */
  initializeCache(type: "in-memory" | "redis", options?: any): void {
    switch (type) {
      case "in-memory":
        this.cache = new InMemoryCache(options?.ttl);
        break;
      case "redis":
        if (!options?.url) {
          throw new Error("Redis URL must be provided for RedisCache.");
        }
        this.cache = new RedisCache(options.url, options.ttl);
        break;
      default:
        throw new Error(`Unsupported cache type: ${type}`);
    }
  }

  /**
   * Retrieves the current cache adapter.
   * @returns {CacheAdapter | null} The cache adapter instance or null if not initialized.
   */
  getCacheAdapter(): CacheAdapter | null {
    return this.cache;
  }

  /**
   * Clears all entries from the cache.
   * @returns {Promise<void> | void} A promise if the cache adapter is asynchronous.
   */
  clearCache(): void | Promise<void> {
    if (!this.cache) return;
    return this.cache.clear();
  }

  /**
   * Disconnects from the cache adapter if applicable (e.g., Redis).
   * @returns {Promise<void> | void} A promise if the cache adapter is asynchronous.
   */
  disconnectCache(): void | Promise<void> {
    if (!this.cache) return;
    if ("disconnect" in this.cache) {
      return (this.cache as any).disconnect();
    }
  }
}
```

**Unit Tests:**

- **In-Memory Cache Tests (`src/tests/unit/caching/InMemoryCache.test.ts`):**
  ```typescript
  import { assertEquals } from "../../../deps.ts";
  import { InMemoryCache } from "../../../caching/InMemoryCache.ts";

  Deno.test("InMemoryCache sets and gets values correctly", () => {
    const cache = new InMemoryCache(1000); // 1-second TTL
    cache.set("key1", { data: "value1" });
    const value = cache.get("key1");
    assertEquals(value, { data: "value1" });
  });

  Deno.test("InMemoryCache expires values after TTL", async () => {
    const cache = new InMemoryCache(100); // 100ms TTL
    cache.set("key2", { data: "value2" });
    await delay(200);
    const value = cache.get("key2");
    assertEquals(value, null);
  });

  Deno.test("InMemoryCache deletes values correctly", () => {
    const cache = new InMemoryCache();
    cache.set("key3", "value3");
    cache.delete("key3");
    const value = cache.get("key3");
    assertEquals(value, null);
  });

  Deno.test("InMemoryCache clears all values correctly", () => {
    const cache = new InMemoryCache();
    cache.set("key4", "value4");
    cache.set("key5", "value5");
    cache.clear();
    assertEquals(cache.get("key4"), null);
    assertEquals(cache.get("key5"), null);
  });

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  ```

- **Redis Cache Tests (`src/tests/unit/caching/RedisCache.test.ts`):**
  ```typescript
  import { assertEquals } from "../../../deps.ts";
  import { RedisCache } from "../../../caching/RedisCache.ts";

  // Note: These tests require a running Redis instance.
  // Ensure Redis is running on localhost:6379 or adjust the URL accordingly.

  Deno.test("RedisCache sets and gets values correctly", async () => {
    const cache = new RedisCache("redis://localhost:6379", 60);
    await cache.set("redisKey1", { data: "redisValue1" });
    const value = await cache.get("redisKey1");
    assertEquals(value, { data: "redisValue1" });
    await cache.delete("redisKey1");
    await cache.disconnect();
  });

  Deno.test("RedisCache expires values after TTL", async () => {
    const cache = new RedisCache("redis://localhost:6379", 1); // 1-second TTL
    await cache.set("redisKey2", "redisValue2");
    await delay(2000); // Wait for 2 seconds
    const value = await cache.get("redisKey2");
    assertEquals(value, null);
    await cache.disconnect();
  });

  Deno.test("RedisCache deletes values correctly", async () => {
    const cache = new RedisCache("redis://localhost:6379");
    await cache.set("redisKey3", "redisValue3");
    await cache.delete("redisKey3");
    const value = await cache.get("redisKey3");
    assertEquals(value, null);
    await cache.disconnect();
  });

  Deno.test("RedisCache clears all values correctly", async () => {
    const cache = new RedisCache("redis://localhost:6379");
    await cache.set("redisKey4", "redisValue4");
    await cache.set("redisKey5", "redisValue5");
    await cache.clear();
    const value1 = await cache.get("redisKey4");
    const value2 = await cache.get("redisKey5");
    assertEquals(value1, null);
    assertEquals(value2, null);
    await cache.disconnect();
  });

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  ```

- **Cache Service Tests (`src/tests/unit/caching/CacheService.test.ts`):**
  ```typescript
  import { assertEquals, assertThrowsAsync } from "../../../deps.ts";
  import { CacheService } from "../../../caching/CacheService.ts";
  import { InMemoryCache } from "../../../caching/InMemoryCache.ts";
  import { RedisCache } from "../../../caching/RedisCache.ts";

  Deno.test("CacheService initializes InMemoryCache correctly", () => {
    const cacheService = CacheService.getInstance();
    cacheService.initializeCache("in-memory", { ttl: 5000 });
    const cacheAdapter = cacheService.getCacheAdapter();
    assertEquals(cacheAdapter instanceof InMemoryCache, true);
    assertEquals((cacheAdapter as InMemoryCache)["ttl"], 5000);
  });

  Deno.test("CacheService initializes RedisCache correctly", async () => {
    const cacheService = CacheService.getInstance();
    const redisUrl = "redis://localhost:6379";
    cacheService.initializeCache("redis", { url: redisUrl, ttl: 120 });
    const cacheAdapter = cacheService.getCacheAdapter();
    assertEquals(cacheAdapter instanceof RedisCache, true);
    assertEquals((cacheAdapter as RedisCache)["ttl"], 120);
    await cacheService.disconnectCache();
  });

  Deno.test("CacheService throws error for unsupported cache type", () => {
    const cacheService = CacheService.getInstance();
    assertThrowsAsync(
      async () => {
        cacheService.initializeCache("unsupported" as any, {});
      },
      Error,
      "Unsupported cache type: unsupported",
    );
  });

  Deno.test("CacheService throws error when Redis URL is missing", () => {
    const cacheService = CacheService.getInstance();
    assertThrowsAsync(
      async () => {
        cacheService.initializeCache("redis", { ttl: 100 });
      },
      Error,
      "Redis URL must be provided for RedisCache.",
    );
  });
  ```

### 3. Bulk Operations

**Objective:** Support bulk insertions, updates, and deletions for handling
large datasets efficiently, minimizing database round-trips, and optimizing
performance.

#### Key Components:

- **Types Definition:** `src/bulk/types.ts`
- **Bulk Operations Class:** `src/bulk/BulkOperations.ts`
- **Unit Tests:** `src/tests/unit/bulk/BulkOperations.test.ts`

#### Implementation:

**Types Definition (`src/bulk/types.ts`):**

```typescript
export interface BulkOperationResult {
  inserted: number;
  updated: number;
  deleted: number;
}

export interface BulkOptions {
  ignoreDuplicates?: boolean;
}
```

**Bulk Operations Class (`src/bulk/BulkOperations.ts`):**

```typescript
import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { BulkOperationResult, BulkOptions } from "./types.ts";
import { BaseModel } from "../models/BaseModel.ts";

export class BulkOperations {
  private adapter: DatabaseAdapter;

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  /**
   * Inserts multiple records into the database in a single operation.
   * @param {T[]} models - An array of models to insert.
   * @param {BulkOptions} options - Configuration options for the bulk insertion.
   * @returns {Promise<BulkOperationResult>} The result of the bulk insertion.
   */
  async bulkInsert<T extends BaseModel>(
    models: T[],
    options: BulkOptions = {},
  ): Promise<BulkOperationResult> {
    if (models.length === 0) return { inserted: 0, updated: 0, deleted: 0 };

    const tableName = models[0].constructor.name.toLowerCase() + "s";
    const columns = Object.keys(models[0]).filter((key) => key !== "id");
    const values = models.map((model) =>
      columns.map((col) => (model as any)[col])
    );

    const placeholders = values.map(
      (_, index) =>
        `(${
          columns.map((_, i) => `$${index * columns.length + i + 1}`).join(", ")
        })`,
    ).join(", ");

    const flatValues = values.flat();

    const insertQuery = `
      INSERT INTO ${tableName} (${columns.join(", ")})
      VALUES ${placeholders}
      ${options.ignoreDuplicates ? "ON CONFLICT DO NOTHING" : ""}
    `;

    const result = await this.adapter.execute(insertQuery, flatValues);
    return { inserted: result.rowCount, updated: 0, deleted: 0 };
  }

  /**
   * Updates multiple records in the database based on a unique key.
   * @param {T[]} models - An array of models to update.
   * @param {string} key - The unique key to identify records (default is "id").
   * @returns {Promise<BulkOperationResult>} The result of the bulk update.
   */
  async bulkUpdate<T extends BaseModel>(
    models: T[],
    key: string = "id",
  ): Promise<BulkOperationResult> {
    if (models.length === 0) return { inserted: 0, updated: 0, deleted: 0 };

    const tableName = models[0].constructor.name.toLowerCase() + "s";
    const columns = Object.keys(models[0]).filter((col) => col !== key);
    let updatedCount = 0;

    for (const model of models) {
      const setClause = columns.map((col) =>
        `${col} = $${columns.indexOf(col) + 1}`
      ).join(", ");
      const updateQuery =
        `UPDATE ${tableName} SET ${setClause} WHERE ${key} = $${
          columns.length + 1
        };`;
      const params = columns.map((col) => (model as any)[col]);
      params.push((model as any)[key]);
      const result = await this.adapter.execute(updateQuery, params);
      updatedCount += result.rowCount;
    }

    return { inserted: 0, updated: updatedCount, deleted: 0 };
  }

  /**
   * Deletes multiple records from the database based on a unique key.
   * @param {T[]} models - An array of models to delete.
   * @param {string} key - The unique key to identify records (default is "id").
   * @returns {Promise<BulkOperationResult>} The result of the bulk deletion.
   */
  async bulkDelete<T extends BaseModel>(
    models: T[],
    key: string = "id",
  ): Promise<BulkOperationResult> {
    if (models.length === 0) return { inserted: 0, updated: 0, deleted: 0 };

    const tableName = models[0].constructor.name.toLowerCase() + "s";
    const keys = models.map((model) => (model as any)[key]);

    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const deleteQuery = `
      DELETE FROM ${tableName}
      WHERE ${key} IN (${placeholders});
    `;

    const result = await this.adapter.execute(deleteQuery, keys);
    return { inserted: 0, updated: 0, deleted: result.rowCount };
  }
}
```

**Unit Tests (`src/tests/unit/bulk/BulkOperations.test.ts`):**

```typescript
import { assertEquals } from "../../../deps.ts";
import { BulkOperations } from "../../../bulk/BulkOperations.ts";
import { MockDatabaseAdapter } from "../../mocks/MockDatabaseAdapter.ts";
import { BaseModel } from "../../../models/BaseModel.ts";

class User extends BaseModel {
  id!: number;
  name!: string;
  email!: string;
}

Deno.test("BulkOperations handles bulkInsert correctly", async () => {
  const adapter = new MockDatabaseAdapter();
  const bulkOps = new BulkOperations(adapter);

  const users = [
    Object.assign(new User(), { name: "Alice", email: "alice@example.com" }),
    Object.assign(new User(), { name: "Bob", email: "bob@example.com" }),
  ];

  const result = await bulkOps.bulkInsert(users, { ignoreDuplicates: true });

  assertEquals(result, { inserted: 2, updated: 0, deleted: 0 });
  assertEquals(adapter.getExecutedQueries(), [
    `INSERT INTO users (name, email) VALUES ($1, $2), ($3, $4) ON CONFLICT DO NOTHING`,
  ]);
});

Deno.test("BulkOperations handles bulkUpdate correctly", async () => {
  const adapter = new MockDatabaseAdapter();
  const bulkOps = new BulkOperations(adapter);

  const users = [
    Object.assign(new User(), {
      id: 1,
      name: "Alice Updated",
      email: "alice_new@example.com",
    }),
    Object.assign(new User(), {
      id: 2,
      name: "Bob Updated",
      email: "bob_new@example.com",
    }),
  ];

  const result = await bulkOps.bulkUpdate(users);

  assertEquals(result, { inserted: 0, updated: 2, deleted: 0 });
  assertEquals(adapter.getExecutedQueries(), [
    `UPDATE users SET name = $1, email = $2 WHERE id = $3;`,
    `UPDATE users SET name = $1, email = $2 WHERE id = $3;`,
  ]);
});

Deno.test("BulkOperations handles bulkDelete correctly", async () => {
  const adapter = new MockDatabaseAdapter();
  const bulkOps = new BulkOperations(adapter);

  const users = [
    Object.assign(new User(), {
      id: 1,
      name: "Alice",
      email: "alice@example.com",
    }),
    Object.assign(new User(), { id: 2, name: "Bob", email: "bob@example.com" }),
  ];

  const result = await bulkOps.bulkDelete(users);

  assertEquals(result, { inserted: 0, updated: 0, deleted: 2 });
  assertEquals(adapter.getExecutedQueries(), [
    `DELETE FROM users WHERE id IN ($1, $2);`,
  ]);
});
```

### 4. Integration with Models

**Objective:** Ensure that ORM models can leverage transaction management,
caching, and bulk operations seamlessly, providing a robust and efficient
interface for data manipulation.

#### Key Components:

- **Base Model Enhancements:** `src/models/BaseModel.ts`

#### Implementation:

**Base Model (`src/models/BaseModel.ts`):**

```typescript
import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { TransactionManager } from "../transactions/TransactionManager.ts";
import { CacheService } from "../caching/CacheService.ts";
import { BulkOperations } from "../bulk/BulkOperations.ts";
import { RealTimeSync } from "../realtime/EventEmitter.ts";

export class BaseModel {
  static realTimeSync: RealTimeSync | null = null;

  /**
   * Initializes real-time synchronization for the model.
   * @param {RealTimeSync} sync - The real-time synchronization instance.
   */
  static initializeRealTimeSync(sync: RealTimeSync) {
    this.realTimeSync = sync;
  }

  /**
   * Saves the current model instance to the database.
   * Handles both insertion and update operations within a transaction.
   * Emits real-time events upon successful operation.
   * @param {DatabaseAdapter} adapter - The database adapter to use for the operation.
   */
  async save(adapter: DatabaseAdapter): Promise<void> {
    const transactionManager = new TransactionManager(adapter);
    const bulkOps = new BulkOperations(adapter);

    await transactionManager.executeInTransaction(async (tx) => {
      const isNew = !(this as any).id;
      if (isNew) {
        const columns = Object.keys(this).filter((key) => key !== "id");
        const values = columns.map((col) => (this as any)[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
        const query = `INSERT INTO ${this.constructor.name.toLowerCase()}s (${
          columns.join(", ")
        }) VALUES (${placeholders}) RETURNING id;`;
        const result = await adapter.execute(query, values);
        if (result.rowCount > 0) {
          (this as any).id = result.rows[0].id;
        }
      } else {
        const columns = Object.keys(this).filter((key) => key !== "id");
        const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(
          ", ",
        );
        const query =
          `UPDATE ${this.constructor.name.toLowerCase()}s SET ${setClause} WHERE id = $${
            columns.length + 1
          };`;
        const params = columns.map((col) => (this as any)[col]);
        params.push((this as any).id);
        await adapter.execute(query, params);
      }
    });

    // Emit real-time events
    if (BaseModel.realTimeSync) {
      const eventType = !(this as any).id ? "CREATE" : "UPDATE";
      BaseModel.realTimeSync.emit({ type: eventType, payload: this });
    }
  }

  /**
   * Deletes the current model instance from the database.
   * Executes the deletion within a transaction and emits a real-time event upon success.
   * @param {DatabaseAdapter} adapter - The database adapter to use for the operation.
   */
  async delete(adapter: DatabaseAdapter): Promise<void> {
    if (!(this as any).id) {
      throw new Error("Cannot delete a record without an ID.");
    }

    const transactionManager = new TransactionManager(adapter);

    await transactionManager.executeInTransaction(async (tx) => {
      const query =
        `DELETE FROM ${this.constructor.name.toLowerCase()}s WHERE id = $1;`;
      await adapter.execute(query, [(this as any).id]);
    });

    // Emit real-time event
    if (BaseModel.realTimeSync) {
      BaseModel.realTimeSync.emit({ type: "DELETE", payload: this });
    }
  }
}
```

**Explanation:**

- **Real-Time Synchronization:**
  - **`realTimeSync` Static Property:** Holds an instance responsible for
    emitting real-time events (e.g., via WebSockets) when CRUD operations occur.
  - **`initializeRealTimeSync(sync)`:** Assigns the `RealTimeSync` instance to
    enable event emission upon operations.

- **CRUD Operations with Transaction Management:**
  - **`save(adapter)`:** Handles both insertion and updating of records within a
    transaction.
    - **Insertion:**
      - Checks if the model instance is new by verifying the absence of an `id`.
      - Constructs and executes an `INSERT` query, updating the model's `id`
        based on the database response.
    - **Update:**
      - Constructs and executes an `UPDATE` query for existing records.
  - **`delete(adapter)`:** Deletes the model instance from the database within a
    transaction.

- **Transaction Management:**
  - Utilizes the `TransactionManager` to ensure that operations are executed
    atomically.
  - Ensures that either all operations within the transaction succeed or all are
    rolled back in case of failure.

- **Real-Time Events:**
  - After successful CRUD operations, emits corresponding real-time events
    (`CREATE`, `UPDATE`, `DELETE`) using the `RealTimeSync` instance.
  - Facilitates real-time features in applications, such as live updates in user
    interfaces.

- **Error Handling:**
  - Throws an error if attempting to delete a record without an `id`, preventing
    unintended behaviors.

---

## Unit Testing

Comprehensive unit tests have been developed for all advanced features to ensure
reliability and correctness. These tests utilize mock adapters to simulate
database interactions, enabling isolated and efficient testing.

### Mock Database Adapter (`src/tests/mocks/MockDatabaseAdapter.ts`)

```typescript
import { DatabaseAdapter } from "../../interfaces/DatabaseAdapter.ts";

export class MockDatabaseAdapter implements DatabaseAdapter {
  private executedQueries: string[] = [];
  private data: { [key: string]: any[] } = {};

  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {}

  async execute(
    query: string,
    params: any[] = [],
  ): Promise<{ rows: any[]; rowCount: number }> {
    this.executedQueries.push(query.trim());
    // Simulate query execution based on the query type
    if (query.startsWith("INSERT")) {
      return { rows: [], rowCount: 1 };
    } else if (query.startsWith("UPDATE")) {
      return { rows: [], rowCount: 1 };
    } else if (query.startsWith("DELETE")) {
      return { rows: [], rowCount: 1 };
    } else if (
      query.startsWith("BEGIN TRANSACTION") || query.startsWith("COMMIT") ||
      query.startsWith("ROLLBACK")
    ) {
      return { rows: [], rowCount: 0 };
    }
    return { rows: [], rowCount: 0 };
  }

  /**
   * Retrieves the list of executed queries.
   * @returns {string[]} An array of executed SQL query strings.
   */
  getExecutedQueries(): string[] {
    return this.executedQueries;
  }

  /**
   * Clears the log of executed queries.
   */
  clearExecutedQueries(): void {
    this.executedQueries = [];
  }
}
```

---

## Best Practices

1. **Use Transactions for Atomic Operations:**
   - Wrap related database operations within transactions to ensure that either
     all operations succeed or none do, maintaining data integrity.
   - **Example:**
     ```typescript
     const transactionManager = new TransactionManager(adapter);
     await transactionManager.executeInTransaction(async (tx) => {
       await adapter.execute("INSERT INTO users (name) VALUES ($1);", [
         "Alice",
       ]);
       await adapter.execute("INSERT INTO posts (title) VALUES ($1);", [
         "First Post",
       ]);
     });
     ```

2. **Leverage Caching to Improve Performance:**
   - Enable caching for frequently executed queries to reduce latency and
     database load.
   - Choose the appropriate caching strategy based on your application's
     requirements (e.g., in-memory for simplicity, Redis for scalability).
   - **Example:**
     ```typescript
     const cacheService = CacheService.getInstance();
     cacheService.initializeCache("redis", {
       url: "redis://localhost:6379",
       ttl: 120,
     });
     const cacheAdapter = cacheService.getCacheAdapter();
     adapter.setCache(cacheAdapter);
     ```

3. **Utilize Bulk Operations for Large Datasets:**
   - When dealing with large volumes of data, use bulk operations to minimize
     the number of database interactions.
   - **Example:**
     ```typescript
     const bulkOps = new BulkOperations(adapter);
     const users = [/* array of User models */];
     const result = await bulkOps.bulkInsert(users, { ignoreDuplicates: true });
     console.log(`${result.inserted} users inserted.`);
     ```

4. **Ensure Proper Error Handling:**
   - Implement try-catch blocks around transactional operations to handle errors
     gracefully and perform necessary rollbacks.
   - **Example:**
     ```typescript
     try {
       await transactionManager.executeInTransaction(async (tx) => {
         // Database operations
       });
     } catch (error) {
       console.error("Transaction failed:", error);
     }
     ```

5. **Maintain Clear and Comprehensive Documentation:**
   - Document advanced features, usage patterns, and best practices to guide
     developers in effectively utilizing the ORM's capabilities.
   - Ensure that code comments and README files are kept up-to-date with the
     latest features and changes.

6. **Write Comprehensive Unit Tests:**
   - Develop unit tests for all new features to ensure reliability and catch
     regressions early.
   - Use mock adapters to simulate database interactions, enabling isolated and
     fast-running tests.
   - **Example:**
     ```typescript
     Deno.test("BulkOperations handles bulkInsert correctly", async () => {
       // Test implementation
     });
     ```

7. **Optimize Query Execution:**
   - Analyze and optimize frequently used queries to reduce latency and improve
     throughput.
   - Consider indexing critical columns and avoiding unnecessary data retrieval.

8. **Monitor and Profile Performance:**
   - Implement monitoring tools to track the performance of database operations
     and caching.
   - Use profiling to identify and address bottlenecks in the ORM's operation.

---

## Getting Started with Advanced Features

### Setting Up Caching

1. **Initialize the Cache Service:**
   ```typescript
   import { CacheService } from "./caching/CacheService.ts";

   const cacheService = CacheService.getInstance();
   cacheService.initializeCache("redis", {
     url: "redis://localhost:6379",
     ttl: 120,
   });
   const cacheAdapter = cacheService.getCacheAdapter();
   ```

2. **Assign the Cache Adapter to the Database Adapter:**
   ```typescript
   import { PostgreSQLAdapter } from "./adapters/PostgreSQLAdapter.ts";

   const dbAdapter = new PostgreSQLAdapter(
     "postgres://user:password@localhost:5432/mydb",
   );
   dbAdapter.setCache(cacheAdapter);
   await dbAdapter.connect();
   ```

### Performing Transactions

1. **Create a Transaction Manager Instance:**
   ```typescript
   import { TransactionManager } from "./transactions/TransactionManager.ts";

   const transactionManager = new TransactionManager(dbAdapter);
   ```

2. **Execute Operations Within a Transaction:**
   ```typescript
   await transactionManager.executeInTransaction(async (tx) => {
     await dbAdapter.execute("INSERT INTO users (name) VALUES ($1);", [
       "Alice",
     ]);
     await dbAdapter.execute("INSERT INTO posts (title) VALUES ($1);", [
       "First Post",
     ]);
   });
   ```

### Using Bulk Operations

1. **Instantiate BulkOperations:**
   ```typescript
   import { BulkOperations } from "./bulk/BulkOperations.ts";

   const bulkOps = new BulkOperations(dbAdapter);
   ```

2. **Perform Bulk Insert:**
   ```typescript
   const users = [
     Object.assign(new User(), { name: "Alice", email: "alice@example.com" }),
     Object.assign(new User(), { name: "Bob", email: "bob@example.com" }),
   ];

   const result = await bulkOps.bulkInsert(users, { ignoreDuplicates: true });
   console.log(`${result.inserted} users inserted.`);
   ```

3. **Perform Bulk Update:**
   ```typescript
   const updatedUsers = [
     Object.assign(new User(), {
       id: 1,
       name: "Alice Updated",
       email: "alice_new@example.com",
     }),
     Object.assign(new User(), {
       id: 2,
       name: "Bob Updated",
       email: "bob_new@example.com",
     }),
   ];

   const updateResult = await bulkOps.bulkUpdate(updatedUsers);
   console.log(`${updateResult.updated} users updated.`);
   ```

4. **Perform Bulk Delete:**
   ```typescript
   const usersToDelete = [
     Object.assign(new User(), { id: 1 }),
     Object.assign(new User(), { id: 2 }),
   ];

   const deleteResult = await bulkOps.bulkDelete(usersToDelete);
   console.log(`${deleteResult.deleted} users deleted.`);
   ```

---

## Conclusion

Sprint 11 successfully integrates advanced features into **Rex-ORM**,
significantly enhancing its capabilities in transaction management, caching, and
bulk operations. These enhancements not only improve the robustness and
performance of the ORM but also provide developers with powerful tools to handle
complex database interactions efficiently. With comprehensive documentation and
thorough unit testing, Rex-ORM is well-equipped to support scalable and
high-performance applications.

---

## Contributing

Contributions are welcome! Please follow the
[contribution guidelines](CONTRIBUTING.md) to get started.

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

For any questions or support, please contact
[your-email@example.com](mailto:your-email@example.com).
