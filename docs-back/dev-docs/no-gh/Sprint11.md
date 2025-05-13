### Sprint 11: Advanced Features - Transactions, Caching, and Optimization

**Duration:** Weeks 21-22

---

## Overview

Sprint 11 focuses on enhancing **Rex-ORM** with advanced features to improve its
robustness, performance, and scalability. The key objectives of this sprint
include implementing transaction management, introducing caching mechanisms,
optimizing query execution, supporting bulk operations, and providing
comprehensive documentation. These enhancements ensure that Rex-ORM can handle
complex database interactions efficiently while maintaining data integrity and
delivering high performance.

**Key Objectives:**

1. **Transactions Support:**
   - Implement transaction management to allow atomic operations across multiple
     database actions.

2. **Caching Mechanisms:**
   - Introduce caching strategies (e.g., in-memory caching, Redis integration)
     to enhance query performance.

3. **Performance Optimization:**
   - Optimize query execution and resource utilization to reduce latency and
     improve throughput.

4. **Bulk Operations:**
   - Support bulk insertions, updates, and deletions for handling large datasets
     efficiently.

5. **Documentation:**
   - Document advanced features, usage patterns, and best practices for
     leveraging these capabilities.

---

## Directory Structure

The project directory is expanded to include modules for transactions, caching,
and bulk operations, along with their corresponding tests:

rex-orm/ ├── src/ │ ├── adapters/ │ │ ├── PostgreSQLAdapter.ts │ │ ├──
SQLiteAdapter.ts │ │ └── CacheAdapter.ts │ ├── caching/ │ │ ├── InMemoryCache.ts
│ │ └── RedisCache.ts │ ├── transactions/ │ │ ├── TransactionManager.ts │ │ └──
types.ts │ ├── bulk/ │ │ ├── BulkOperations.ts │ │ └── types.ts │ ├── graphql/ │
│ ├── GraphQLSchema.ts │ │ ├── Resolvers.ts │ │ ├── GraphQLServer.ts │ │ └──
types.ts │ ├── models/ │ │ ├── ModelRegistry.ts │ │ ├── BaseModel.ts │ │ ├──
User.ts │ │ ├── Post.ts │ │ └── ... (additional models) │ ├── realtime/ │ │ ├──
EventEmitter.ts │ │ ├── WebSocketServer.ts │ │ └── SubscriptionManager.ts │ ├──
migration/ │ │ ├── MigrationRunner.ts │ │ ├── MigrationTracker.ts │ │ └──
MigrationManager.ts │ ├── migrations/ │ │ ├── 001_create_users_table.ts │ │ ├──
002_create_posts_table.ts │ │ ├── 003_create_profiles_table.ts │ │ ├──
004_create_post_tags_table.ts │ │ └── ... (additional migration scripts) │ ├──
query/ │ │ └── QueryBuilder.ts │ ├── serverless/ │ │ ├── handler.ts │ │ ├──
deploy.sh │ │ └── serverless.yml │ ├── cli/ │ │ ├── commands/ │ │ │ ├── init.ts
│ │ │ ├── generateModel.ts │ │ │ └── ... (additional CLI commands) │ │ └──
cli.ts │ ├── factory/ │ │ └── DatabaseFactory.ts │ ├── interfaces/ │ │ └──
DatabaseAdapter.ts │ ├── decorators/ │ │ ├── Entity.ts │ │ ├── Column.ts │ │ ├──
PrimaryKey.ts │ │ ├── OneToMany.ts │ │ ├── ManyToOne.ts │ │ ├── OneToOne.ts │ │
├── ManyToMany.ts │ │ ├── Validate.ts │ │ └── ValidateMultiple.ts │ ├── tests/ │
│ └── unit/ │ │ ├── adapters/ │ │ │ ├── PostgreSQLAdapter.test.ts │ │ │ ├──
SQLiteAdapter.test.ts │ │ │ └── CacheAdapter.test.ts │ │ ├── caching/ │ │ │ ├──
InMemoryCache.test.ts │ │ │ └── RedisCache.test.ts │ │ ├── transactions/ │ │ │
├── TransactionManager.test.ts │ │ │ └── types.test.ts │ │ ├── bulk/ │ │ │ ├──
BulkOperations.test.ts │ │ │ └── types.test.ts │ │ ├── graphql/ │ │ │ ├──
GraphQLSchema.test.ts │ │ │ ├── Resolvers.test.ts │ │ │ └──
GraphQLServer.test.ts │ │ ├── realtime/ │ │ │ ├── EventEmitter.test.ts │ │ │ ├──
WebSocketServer.test.ts │ │ │ └── SubscriptionManager.test.ts │ │ ├── migration/
│ │ │ ├── MigrationRunner.test.ts │ │ │ ├── MigrationTracker.test.ts │ │ │ └──
MigrationManager.test.ts │ │ ├── modelLayer/ │ │ │ ├── Decorators.test.ts │ │ │
├── ModelRegistry.test.ts │ │ │ ├── RelationshipDecorators.test.ts │ │ │ └──
ValidationDecorators.test.ts │ │ └── query/ │ │ └── QueryBuilder.test.ts │ ├──
config/ │ │ └── config.ts │ └── ... (other directories) ├── import_map.json ├──
deno.json ├── package.json └── README.md

---

## File Breakdown

Below are the key files to be created in **Sprint 11**, along with their
respective code and explanations.

---

### 1. src/transactions/types.ts

**Description:** Defines the types and interfaces related to transaction
management.

typescript // src/transactions/types.ts

export interface Transaction { id: string; begin: () => Promise<void>; commit:
() => Promise<void>; rollback: () => Promise<void>; }

export interface TransactionManagerOptions { isolationLevel?: string; // e.g.,
"READ COMMITTED", "SERIALIZABLE" }

**Explanation:**

- **Interfaces:**
  - Transaction: Represents a database transaction with methods to begin,
    commit, and rollback the transaction.
  - TransactionManagerOptions: Configuration options for the TransactionManager,
    such as setting the isolation level.

---

### 2. src/transactions/TransactionManager.ts

**Description:** Manages database transactions, allowing atomic operations
across multiple database actions.

typescript // src/transactions/TransactionManager.ts

import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts"; import {
Transaction, TransactionManagerOptions } from "./types.ts"; import { v4 } from
"https://deno.land/std@0.178.0/uuid/mod.ts";

export class TransactionManager { private adapter: DatabaseAdapter; private
options: TransactionManagerOptions;

constructor(adapter: DatabaseAdapter, options: TransactionManagerOptions = {}) {
this.adapter = adapter; this.options = options; }

async beginTransaction(): Promise<Transaction> { const transactionId =
v4.generate(); await this.adapter.execute("BEGIN TRANSACTION;"); return { id:
transactionId, begin: async () => { await this.adapter.execute("BEGIN
TRANSACTION;"); }, commit: async () => { await this.adapter.execute("COMMIT;");
}, rollback: async () => { await this.adapter.execute("ROLLBACK;"); }, }; }

async executeInTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
const transaction = await this.beginTransaction(); try { const result = await
fn(transaction); await transaction.commit(); return result; } catch (error) {
await transaction.rollback(); throw error; } } }

**Explanation:**

- **TransactionManager Class:**
  - **Constructor:** Accepts a DatabaseAdapter instance and optional
    configuration options.
  - **beginTransaction Method:** Starts a new database transaction and returns a
    Transaction object with begin, commit, and rollback methods.
  - **executeInTransaction Method:** Executes a provided asynchronous function
    within a transaction context. Commits the transaction if the function
    succeeds or rolls back if an error occurs.

**Notes:**

- **UUID for Transaction ID:** Uses the uuid module to generate unique
  transaction IDs for tracking.
- **Isolation Levels:** Currently, the isolation level is not dynamically set.
  To implement different isolation levels, modify the beginTransaction method to
  include the desired level in the SQL command, e.g., BEGIN TRANSACTION
  ISOLATION LEVEL SERIALIZABLE;.

---

### 3. src/caching/InMemoryCache.ts

**Description:** Implements an in-memory caching mechanism to store and retrieve
query results, reducing database load and improving performance.

typescript // src/caching/InMemoryCache.ts

import { CacheAdapter } from "../interfaces/CacheAdapter.ts";

interface CacheEntry { data: any; expiry: number; }

export class InMemoryCache implements CacheAdapter { private cache: Map<string,
CacheEntry>; private ttl: number; // Time-to-live in milliseconds

constructor(ttl: number = 60000) { // Default TTL: 60 seconds this.cache = new
Map(); this.ttl = ttl; }

set(key: string, value: any): void { const expiry = Date.now() + this.ttl;
this.cache.set(key, { data: value, expiry }); }

get(key: string): any | null { const entry = this.cache.get(key); if (!entry)
return null; if (Date.now() > entry.expiry) { this.cache.delete(key); return
null; } return entry.data; }

delete(key: string): void { this.cache.delete(key); }

clear(): void { this.cache.clear(); } }

**Explanation:**

- **InMemoryCache Class:**
  - **Implements:** CacheAdapter interface.
  - **Properties:**
    - cache: A Map storing cached data with their expiration times.
    - ttl: Time-to-live for cache entries in milliseconds.
  - **Methods:**
    - set(key, value): Stores a value in the cache with an expiration time.
    - get(key): Retrieves a value from the cache if it exists and hasn't
      expired; otherwise, returns null.
    - delete(key): Removes a specific entry from the cache.
    - clear(): Clears all entries from the cache.

**Notes:**

- **TTL Management:** Each cache entry has an expiration time. Expired entries
  are automatically deleted upon access.
- **Scalability:** Suitable for applications with limited caching needs. For
  distributed systems or larger datasets, consider using an external caching
  solution like Redis.

---

### 4. src/caching/RedisCache.ts

**Description:** Implements a Redis-based caching mechanism to store and
retrieve query results, providing a scalable and persistent caching solution.

typescript // src/caching/RedisCache.ts

import { CacheAdapter } from "../interfaces/CacheAdapter.ts"; import { connect,
Redis } from "https://deno.land/x/redis@v0.28.2/mod.ts";

export class RedisCache implements CacheAdapter { private client: Redis; private
ttl: number; // Time-to-live in seconds

constructor(url: string, ttl: number = 60) { // Default TTL: 60 seconds
this.client = await connect({ hostname: new URL(url).hostname, port:
parseInt(new URL(url).port) || 6379 }); this.ttl = ttl; }

async set(key: string, value: any): Promise<void> { await this.client.set(key,
JSON.stringify(value), { ex: this.ttl }); }

async get(key: string): Promise<any | null> { const data = await
this.client.get(key); if (!data) return null; return JSON.parse(data); }

async delete(key: string): Promise<void> { await this.client.del(key); }

async clear(): Promise<void> { await this.client.flushdb(); }

async disconnect(): Promise<void> { await this.client.close(); } }

**Explanation:**

- **RedisCache Class:**
  - **Implements:** CacheAdapter interface.
  - **Properties:**
    - client: Redis client instance for interacting with the Redis server.
    - ttl: Time-to-live for cache entries in seconds.
  - **Constructor:**
    - Connects to the Redis server using the provided URL.
  - **Methods:**
    - set(key, value): Stores a JSON-stringified value in Redis with an
      expiration time.
    - get(key): Retrieves and parses a JSON value from Redis; returns null if
      the key doesn't exist.
    - delete(key): Removes a specific key from Redis.
    - clear(): Flushes the entire Redis database.
    - disconnect(): Closes the Redis client connection.

**Notes:**

- **Asynchronous Operations:** All methods interacting with Redis are
  asynchronous and return Promises.
- **Error Handling:** In production, implement proper error handling to manage
  connection issues or command failures.
- **Connection Management:** Ensure that the disconnect method is called
  appropriately to close Redis connections gracefully.

---

### 5. src/interfaces/CacheAdapter.ts

**Description:** Defines the CacheAdapter interface that both InMemoryCache and
RedisCache implement, ensuring consistency in caching mechanisms.

typescript // src/interfaces/CacheAdapter.ts

export interface CacheAdapter { set(key: string, value: any): void |
Promise<void>; get(key: string): any | null | Promise<any | null>; delete(key:
string): void | Promise<void>; clear(): void | Promise<void>; }

**Explanation:**

- **CacheAdapter Interface:**
  - Defines the standard methods required for any caching mechanism.
  - Both synchronous (InMemoryCache) and asynchronous (RedisCache)
    implementations must adhere to this interface.

---

### 6. src/adapters/DatabaseAdapter.ts (Updated)

**Description:** Extends the DatabaseAdapter interface to include methods for
transaction management and caching support.

typescript // src/interfaces/DatabaseAdapter.ts

export interface DatabaseAdapter { connect(): Promise<void>; disconnect():
Promise<void>; execute(query: string, params?: any[]): Promise<{ rows: any[];
rowCount: number }>; beginTransaction(): Promise<void>; commit(): Promise<void>;
rollback(): Promise<void>; setCache(adapter: CacheAdapter): void; getCache():
CacheAdapter | null; }

**Explanation:**

- **Enhanced DatabaseAdapter Interface:**
  - **Methods Added:**
    - beginTransaction(): Starts a new transaction.
    - commit(): Commits the current transaction.
    - rollback(): Rolls back the current transaction.
    - setCache(adapter): Assigns a cache adapter for caching query results.
    - getCache(): Retrieves the assigned cache adapter.

**Notes:**

- **Transaction Management:** Provides a standard way to handle transactions
  across different database adapters.
- **Caching Integration:** Allows database adapters to utilize caching
  mechanisms transparently.

---

### 7. src/adapters/PostgreSQLAdapter.ts (Updated)

**Description:** Updates the PostgreSQLAdapter to support transaction management
and caching.

typescript // src/adapters/PostgreSQLAdapter.ts

import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts"; import {
Pool, PoolClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts"; import {
CacheAdapter } from "../interfaces/CacheAdapter.ts";

export class PostgreSQLAdapter implements DatabaseAdapter { private pool: Pool;
private cache: CacheAdapter | null = null; private client: PoolClient | null =
null;

constructor(connectionString: string, poolSize: number = 10) { this.pool = new
Pool(connectionString, poolSize, true); }

async connect(): Promise<void> { this.client = await this.pool.connect(); }

async disconnect(): Promise<void> { if (this.client) {
this.pool.release(this.client); this.client = null; } await this.pool.end(); }

async execute(query: string, params: any[] = []): Promise<{ rows: any[];
rowCount: number }> { if (this.cache) { const cacheKey =
`${query}:${JSON.stringify(params)}`; const cachedResult = await
this.cache.get(cacheKey); if (cachedResult) { return { rows: cachedResult,
rowCount: cachedResult.length }; } }

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

async beginTransaction(): Promise<void> { if (!this.client) { throw new
Error("Database not connected."); } await this.client.queryObject("BEGIN;"); }

async commit(): Promise<void> { if (!this.client) { throw new Error("Database
not connected."); } await this.client.queryObject("COMMIT;"); }

async rollback(): Promise<void> { if (!this.client) { throw new Error("Database
not connected."); } await this.client.queryObject("ROLLBACK;"); }

setCache(adapter: CacheAdapter): void { this.cache = adapter; }

getCache(): CacheAdapter | null { return this.cache; } }

**Explanation:**

- **PostgreSQLAdapter Class:**
  - **Properties:**
    - pool: Connection pool for PostgreSQL.
    - cache: Optional cache adapter (InMemoryCache or RedisCache).
    - client: Active database client from the pool.
  - **Methods:**
    - **execute Method:**
      - Checks the cache for existing query results.
      - If cached, returns the cached data.
      - If not cached, executes the query against the database.
      - Stores the result in the cache if caching is enabled.
    - **Transaction Methods:**
      - beginTransaction(), commit(), and rollback() manage database
        transactions.
    - **Caching Methods:**
      - setCache(adapter): Assigns a cache adapter.
      - getCache(): Retrieves the assigned cache adapter.

**Notes:**

- **Caching Integration:** Enhances query performance by caching frequently
  executed queries.
- **Error Handling:** Throws errors if database operations are attempted without
  an active connection.
- **Connection Management:** Ensures that database clients are properly managed
  within the connection pool.

---

### 8. src/adapters/SQLiteAdapter.ts (Updated)

**Description:** Updates the SQLiteAdapter to support transaction management and
caching.

typescript // src/adapters/SQLiteAdapter.ts

import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts"; import { DB
} from "https://deno.land/x/sqlite/mod.ts"; import { CacheAdapter } from
"../interfaces/CacheAdapter.ts";

export class SQLiteAdapter implements DatabaseAdapter { private db: DB; private
cache: CacheAdapter | null = null;

constructor(dbPath: string) { this.db = new DB(dbPath); }

async connect(): Promise<void> { // SQLite does not require explicit connection
handling }

async disconnect(): Promise<void> { this.db.close(); }

async execute(query: string, params: any[] = []): Promise<{ rows: any[];
rowCount: number }> { if (this.cache) { const cacheKey =
`${query}:${JSON.stringify(params)}`; const cachedResult =
this.cache.get(cacheKey); if (cachedResult) { return { rows: cachedResult,
rowCount: cachedResult.length }; } }

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

async beginTransaction(): Promise<void> { this.db.query("BEGIN TRANSACTION;"); }

async commit(): Promise<void> { this.db.query("COMMIT;"); }

async rollback(): Promise<void> { this.db.query("ROLLBACK;"); }

setCache(adapter: CacheAdapter): void { this.cache = adapter; }

getCache(): CacheAdapter | null { return this.cache; } }

**Explanation:**

- **SQLiteAdapter Class:**
  - **Properties:**
    - db: SQLite database instance.
    - cache: Optional cache adapter (InMemoryCache or RedisCache).
  - **Methods:**
    - **execute Method:**
      - Checks the cache for existing query results.
      - If cached, returns the cached data.
      - If not cached, executes the query against the database.
      - Stores the result in the cache if caching is enabled.
    - **Transaction Methods:**
      - beginTransaction(), commit(), and rollback() manage database
        transactions.
    - **Caching Methods:**
      - setCache(adapter): Assigns a cache adapter.
      - getCache(): Retrieves the assigned cache adapter.

**Notes:**

- **Caching Integration:** Enhances query performance by caching frequently
  executed queries.
- **Error Handling:** Ensure proper error handling, especially for
  transaction-related operations.
- **Connection Management:** SQLite operates on a file-based system, so explicit
  connection handling is minimal.

---

### 9. src/caching/CacheService.ts

**Description:** Provides a centralized service for managing caching mechanisms,
allowing easy switching between different cache adapters.

typescript // src/caching/CacheService.ts

import { CacheAdapter } from "../interfaces/CacheAdapter.ts"; import {
InMemoryCache } from "./InMemoryCache.ts"; import { RedisCache } from
"./RedisCache.ts";

export class CacheService { private static instance: CacheService; private
cache: CacheAdapter | null = null;

private constructor() {}

static getInstance(): CacheService { if (!CacheService.instance) {
CacheService.instance = new CacheService(); } return CacheService.instance; }

initializeCache(type: "in-memory" | "redis", options?: any): void { switch
(type) { case "in-memory": this.cache = new InMemoryCache(options?.ttl); break;
case "redis": if (!options?.url) { throw new Error("Redis URL must be provided
for RedisCache."); } this.cache = new RedisCache(options.url, options.ttl);
break; default: throw new Error(`Unsupported cache type: ${type}`); } }

getCacheAdapter(): CacheAdapter | null { return this.cache; }

clearCache(): void | Promise<void> { if (!this.cache) return; return
this.cache.clear(); }

disconnectCache(): void | Promise<void> { if (!this.cache) return; if
("disconnect" in this.cache) { return (this.cache as any).disconnect(); } } }

**Explanation:**

- **CacheService Class:**
  - **Singleton Pattern:** Ensures only one instance of the cache service exists
    throughout the application.
  - **Methods:**
    - getInstance(): Retrieves the singleton instance.
    - initializeCache(type, options): Initializes the cache adapter based on the
      specified type (in-memory or redis) and options.
    - getCacheAdapter(): Retrieves the current cache adapter.
    - clearCache(): Clears all cache entries.
    - disconnectCache(): Disconnects from the cache (only applicable for Redis).

**Notes:**

- **Flexibility:** Allows developers to easily switch between different caching
  mechanisms without modifying the core ORM code.
- **Configuration:** Cache initialization can be configured through environment
  variables or configuration files.

---

### 10. src/bulk/types.ts

**Description:** Defines the types and interfaces related to bulk operations.

typescript // src/bulk/types.ts

export interface BulkOperationResult { inserted: number; updated: number;
deleted: number; }

export interface BulkOptions { ignoreDuplicates?: boolean; }

**Explanation:**

- **Interfaces:**
  - BulkOperationResult: Represents the outcome of bulk operations, indicating
    the number of records inserted, updated, and deleted.
  - BulkOptions: Configuration options for bulk operations, such as ignoring
    duplicate entries.

---

### 11. src/bulk/BulkOperations.ts

**Description:** Implements bulk operations (insertions, updates, deletions) to
handle large datasets efficiently.

typescript // src/bulk/BulkOperations.ts

import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts"; import {
BulkOperationResult, BulkOptions } from "./types.ts"; import { BaseModel } from
"../models/BaseModel.ts";

export class BulkOperations { private adapter: DatabaseAdapter;

constructor(adapter: DatabaseAdapter) { this.adapter = adapter; }

async bulkInsert<T extends BaseModel>(models: T[], options: BulkOptions = {}):
Promise<BulkOperationResult> { if (models.length === 0) return { inserted: 0,
updated: 0, deleted: 0 };

    const tableName = models[0].constructor.name.toLowerCase() + "s";
    const columns = Object.keys(models[0]).filter(key => key !== "id");
    const values = models.map(model => columns.map(col => model[col]));

    const placeholders = values.map(
      (_, index) => `(${columns.map((_, i) => `$${index * columns.length + i + 1}`).join(", ")})`
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

async bulkUpdate<T extends BaseModel>(models: T[], key: string = "id"):
Promise<BulkOperationResult> { if (models.length === 0) return { inserted: 0,
updated: 0, deleted: 0 };

    const tableName = models[0].constructor.name.toLowerCase() + "s";
    const columns = Object.keys(models[0]).filter(col => col !== key);
    let updatedCount = 0;

    for (const model of models) {
      const setClause = columns.map(col => `${col} = $${columns.indexOf(col) + 1}`).join(", ");
      const updateQuery = `UPDATE ${tableName} SET ${setClause} WHERE ${key} = $${columns.length + 1};`;
      const params = columns.map(col => model[col]);
      params.push(model[key]);
      const result = await this.adapter.execute(updateQuery, params);
      updatedCount += result.rowCount;
    }

    return { inserted: 0, updated: updatedCount, deleted: 0 };

}

async bulkDelete<T extends BaseModel>(models: T[], key: string = "id"):
Promise<BulkOperationResult> { if (models.length === 0) return { inserted: 0,
updated: 0, deleted: 0 };

    const tableName = models[0].constructor.name.toLowerCase() + "s";
    const keys = models.map(model => model[key]);

    const deleteQuery = `
      DELETE FROM ${tableName}
      WHERE ${key} IN (${keys.map((_, i) => `$${i + 1}`).join(", ")});
    `;

    const result = await this.adapter.execute(deleteQuery, keys);
    return { inserted: 0, updated: 0, deleted: result.rowCount };

} }

**Explanation:**

- **BulkOperations Class:**
  - **Constructor:** Accepts a DatabaseAdapter instance.
  - **Methods:**
    - bulkInsert(models, options): Inserts multiple records into the database.
      Supports options like ignoring duplicate entries.
    - bulkUpdate(models, key): Updates multiple records based on a unique key
      (default is id).
    - bulkDelete(models, key): Deletes multiple records based on a unique key
      (default is id).

**Notes:**

- **Parameterized Queries:** Uses parameterized queries to prevent SQL
  injection.
- **Performance:** Bulk operations reduce the number of database round-trips,
  enhancing performance for large datasets.
- **Error Handling:** In a production environment, implement robust error
  handling to manage partial failures during bulk operations.

---

### 12. src/models/BaseModel.ts (Updated)

**Description:** Updates the BaseModel to integrate transaction management,
caching, and bulk operations.

typescript // src/models/BaseModel.ts

import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts"; import {
TransactionManager } from "../transactions/TransactionManager.ts"; import {
CacheService } from "../caching/CacheService.ts"; import { BulkOperations } from
"../bulk/BulkOperations.ts"; import { RealTimeSync } from
"../realtime/index.ts";

export class BaseModel { static realTimeSync: RealTimeSync | null = null;

static initializeRealTimeSync(sync: RealTimeSync) { this.realTimeSync = sync; }

// Example CRUD operation with transaction and caching async save(adapter:
DatabaseAdapter): Promise<void> { const transactionManager = new
TransactionManager(adapter); const bulkOps = new BulkOperations(adapter);

    await transactionManager.executeInTransaction(async (tx) => {
      // Implement bulk operations if needed
      // For single insert/update, use individual execute
      const isNew = !(this as any).id;
      if (isNew) {
        const columns = Object.keys(this).filter(key => key !== "id");
        const values = columns.map(col => (this as any)[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
        const query = `INSERT INTO ${this.constructor.name.toLowerCase()}s (${columns.join(", ")}) VALUES (${placeholders}) RETURNING id;`;
        const result = await adapter.execute(query, values);
        if (result.rowCount > 0) {
          (this as any).id = result.rows[0].id;
        }
      } else {
        const columns = Object.keys(this).filter(key => key !== "id");
        const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(", ");
        const query = `UPDATE ${this.constructor.name.toLowerCase()}s SET ${setClause} WHERE id = $${columns.length + 1};`;
        const params = columns.map(col => (this as any)[col]);
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

async delete(adapter: DatabaseAdapter): Promise<void> { if (!(this as any).id) {
throw new Error("Cannot delete a record without an ID."); }

    const transactionManager = new TransactionManager(adapter);

    await transactionManager.executeInTransaction(async (tx) => {
      const query = `DELETE FROM ${this.constructor.name.toLowerCase()}s WHERE id = $1;`;
      await adapter.execute(query, [(this as any).id]);
    });

    // Emit real-time event
    if (BaseModel.realTimeSync) {
      BaseModel.realTimeSync.emit({ type: "DELETE", payload: this });
    }

} }

**Explanation:**

- **BaseModel Class Enhancements:**
  - **Real-Time Synchronization:**
    - initializeRealTimeSync(sync): Assigns the RealTimeSync instance for
      emitting events upon CRUD operations.
  - **Transaction Management:**
    - Utilizes TransactionManager to execute CRUD operations within
      transactions, ensuring atomicity.
  - **Bulk Operations Integration:**
    - Provides hooks to integrate BulkOperations for handling multiple records
      efficiently.
  - **Caching Integration:**
    - Not directly integrated here, but caching is handled at the
      DatabaseAdapter level during query execution.
  - **CRUD Methods:**
    - **save():** Handles both insertions and updates within a transaction.
      Emits real-time events based on the operation type.
    - **delete():** Deletes a record within a transaction and emits a real-time
      delete event.

**Notes:**

- **Extensibility:** The BaseModel can be further enhanced to include additional
  methods or hooks as needed.
- **Error Handling:** Ensure that errors within transactions are properly caught
  and managed to maintain data integrity.

---

### 13. src/adapters/CacheAdapter.ts (New)

**Description:** Defines the CacheAdapter interface to standardize caching
mechanisms across different adapters.

typescript // src/interfaces/CacheAdapter.ts

export interface CacheAdapter { set(key: string, value: any): void |
Promise<void>; get(key: string): any | null | Promise<any | null>; delete(key:
string): void | Promise<void>; clear(): void | Promise<void>; }

**Explanation:**

- **CacheAdapter Interface:**
  - Ensures consistency across different caching implementations.
  - Defines standard methods for setting, getting, deleting, and clearing cache
    entries.

---

### 14. src/caching/InMemoryCache.test.ts

**Description:** Unit tests for the InMemoryCache class, ensuring correct
caching behavior.

typescript // src/tests/unit/caching/InMemoryCache.test.ts

import { assertEquals, assertThrowsAsync } from "../../../deps.ts"; import {
InMemoryCache } from "../../../caching/InMemoryCache.ts";

Deno.test("InMemoryCache sets and gets values correctly", () => { const cache =
new InMemoryCache(1000); // 1-second TTL cache.set("key1", { data: "value1" });
const value = cache.get("key1"); assertEquals(value, { data: "value1" }); });

Deno.test("InMemoryCache expires values after TTL", async () => { const cache =
new InMemoryCache(100); // 100ms TTL cache.set("key2", { data: "value2" });
await delay(200); const value = cache.get("key2"); assertEquals(value, null);
});

Deno.test("InMemoryCache deletes values correctly", () => { const cache = new
InMemoryCache(); cache.set("key3", "value3"); cache.delete("key3"); const value
= cache.get("key3"); assertEquals(value, null); });

Deno.test("InMemoryCache clears all values correctly", () => { const cache = new
InMemoryCache(); cache.set("key4", "value4"); cache.set("key5", "value5");
cache.clear(); assertEquals(cache.get("key4"), null);
assertEquals(cache.get("key5"), null); });

function delay(ms: number) { return new Promise(resolve => setTimeout(resolve,
ms)); }

**Explanation:**

- **Tests:**
  1. **Set and Get Values:** Verifies that values are correctly stored and
     retrieved.
  2. **TTL Expiration:** Ensures that cached values expire after the specified
     TTL.
  3. **Delete Values:** Confirms that individual keys can be deleted.
  4. **Clear Cache:** Checks that all cache entries can be cleared
     simultaneously.

**Notes:**

- **Asynchronous Testing:** Uses await delay to simulate TTL expiration.

---

### 15. src/caching/RedisCache.test.ts

**Description:** Unit tests for the RedisCache class, ensuring correct caching
behavior with Redis.

typescript // src/tests/unit/caching/RedisCache.test.ts

import { assertEquals, assertThrowsAsync } from "../../../deps.ts"; import {
RedisCache } from "../../../caching/RedisCache.ts";

// Note: These tests require a running Redis instance. // Ensure Redis is
running on localhost:6379 or adjust the URL accordingly.

Deno.test("RedisCache sets and gets values correctly", async () => { const cache
= new RedisCache("redis://localhost:6379", 60); await cache.set("redisKey1", {
data: "redisValue1" }); const value = await cache.get("redisKey1");
assertEquals(value, { data: "redisValue1" }); await cache.delete("redisKey1");
await cache.disconnect(); });

Deno.test("RedisCache expires values after TTL", async () => { const cache = new
RedisCache("redis://localhost:6379", 1); // 1-second TTL await
cache.set("redisKey2", "redisValue2"); await delay(2000); // Wait for 2 seconds
const value = await cache.get("redisKey2"); assertEquals(value, null); await
cache.disconnect(); });

Deno.test("RedisCache deletes values correctly", async () => { const cache = new
RedisCache("redis://localhost:6379"); await cache.set("redisKey3",
"redisValue3"); await cache.delete("redisKey3"); const value = await
cache.get("redisKey3"); assertEquals(value, null); await cache.disconnect(); });

Deno.test("RedisCache clears all values correctly", async () => { const cache =
new RedisCache("redis://localhost:6379"); await cache.set("redisKey4",
"redisValue4"); await cache.set("redisKey5", "redisValue5"); await
cache.clear(); const value1 = await cache.get("redisKey4"); const value2 = await
cache.get("redisKey5"); assertEquals(value1, null); assertEquals(value2, null);
await cache.disconnect(); });

function delay(ms: number) { return new Promise(resolve => setTimeout(resolve,
ms)); }

**Explanation:**

- **Tests:**
  1. **Set and Get Values:** Verifies that values are correctly stored and
     retrieved from Redis.
  2. **TTL Expiration:** Ensures that cached values expire after the specified
     TTL.
  3. **Delete Values:** Confirms that individual keys can be deleted from Redis.
  4. **Clear Cache:** Checks that all cache entries can be cleared from Redis.

**Notes:**

- **Redis Dependency:** These tests require a running Redis instance. Ensure
  Redis is operational on the specified URL before running the tests.
- **Cleanup:** Each test deletes or clears the cache to prevent interference
  between tests.
- **Error Handling:** Additional tests can be added to handle connection
  failures or Redis errors.

---

### 16. src/transactions/TransactionManager.test.ts

**Description:** Unit tests for the TransactionManager class, ensuring correct
transaction handling.

typescript // src/tests/unit/transactions/TransactionManager.test.ts

import { assertEquals, assertThrowsAsync } from "../../../deps.ts"; import {
TransactionManager } from "../../../transactions/TransactionManager.ts"; import
{ MockDatabaseAdapter } from "../../mocks/MockDatabaseAdapter.ts";

Deno.test("TransactionManager commits transactions correctly", async () => {
const adapter = new MockDatabaseAdapter(); const txManager = new
TransactionManager(adapter);

await txManager.executeInTransaction(async (tx) => { await
adapter.execute("INSERT INTO users (name) VALUES ($1);", ["Alice"]);
    await adapter.execute("INSERT INTO posts (title) VALUES ($1);", ["First
Post"]); });

assertEquals(adapter.getExecutedQueries(), [ "BEGIN TRANSACTION;", "INSERT INTO
users (name) VALUES ($1);",
    "INSERT INTO posts (title) VALUES ($1);", "COMMIT;", ]); });

Deno.test("TransactionManager rolls back transactions on error", async () => {
const adapter = new MockDatabaseAdapter(); const txManager = new
TransactionManager(adapter);

await assertThrowsAsync( async () => { await
txManager.executeInTransaction(async (tx) => { await adapter.execute("INSERT
INTO users (name) VALUES ($1);", ["Bob"]); throw new Error("Test error"); }); },
Error, "Test error", );

assertEquals(adapter.getExecutedQueries(), [ "BEGIN TRANSACTION;", "INSERT INTO
users (name) VALUES ($1);", "ROLLBACK;", ]); });

**Explanation:**

- **Tests:**
  1. **Commit Transactions:** Ensures that transactions are committed when
     operations succeed.
  2. **Rollback Transactions:** Verifies that transactions are rolled back when
     an error occurs during operations.

**Notes:**

- **MockDatabaseAdapter:** Utilizes a mock adapter to simulate database
  operations without requiring an actual database connection. The implementation
  of MockDatabaseAdapter is assumed to track executed queries for verification.

---

### 17. src/bulk/BulkOperations.test.ts

**Description:** Unit tests for the BulkOperations class, ensuring correct
handling of bulk insertions, updates, and deletions.

typescript // src/tests/unit/bulk/BulkOperations.test.ts

import { assertEquals } from "../../../deps.ts"; import { BulkOperations } from
"../../../bulk/BulkOperations.ts"; import { MockDatabaseAdapter } from
"../../mocks/MockDatabaseAdapter.ts"; import { BaseModel } from
"../../../models/BaseModel.ts";

class User extends BaseModel { id!: number; name!: string; email!: string; }

Deno.test("BulkOperations handles bulkInsert correctly", async () => { const
adapter = new MockDatabaseAdapter(); const bulkOps = new
BulkOperations(adapter);

const users = [ Object.assign(new User(), { name: "Alice", email:
"alice@example.com" }), Object.assign(new User(), { name: "Bob", email:
"bob@example.com" }), ];

const result = await bulkOps.bulkInsert(users, { ignoreDuplicates: true });

assertEquals(result, { inserted: 2, updated: 0, deleted: 0 });
assertEquals(adapter.getExecutedQueries(), [
`INSERT INTO users (name, email) VALUES ($1, $2), ($3, $4) ON CONFLICT DO NOTHING`,
]); });

Deno.test("BulkOperations handles bulkUpdate correctly", async () => { const
adapter = new MockDatabaseAdapter(); const bulkOps = new
BulkOperations(adapter);

const users = [ Object.assign(new User(), { id: 1, name: "Alice Updated", email:
"alice_new@example.com" }), Object.assign(new User(), { id: 2, name: "Bob
Updated", email: "bob_new@example.com" }), ];

const result = await bulkOps.bulkUpdate(users);

assertEquals(result, { inserted: 0, updated: 2, deleted: 0 });
assertEquals(adapter.getExecutedQueries(), [
`UPDATE users SET name = $1, email = $2 WHERE id = $3;`,
`UPDATE users SET name = $1, email = $2 WHERE id = $3;`, ]); });

Deno.test("BulkOperations handles bulkDelete correctly", async () => { const
adapter = new MockDatabaseAdapter(); const bulkOps = new
BulkOperations(adapter);

const users = [ Object.assign(new User(), { id: 1, name: "Alice", email:
"alice@example.com" }), Object.assign(new User(), { id: 2, name: "Bob", email:
"bob@example.com" }), ];

const result = await bulkOps.bulkDelete(users);

assertEquals(result, { inserted: 0, updated: 0, deleted: 2 });
assertEquals(adapter.getExecutedQueries(), [
`DELETE FROM users WHERE id IN ($1, $2);`, ]); });

**Explanation:**

- **Tests:**
  1. **Bulk Insert:** Verifies that multiple records are inserted correctly and
     that duplicate handling (ignoreDuplicates) works as intended.
  2. **Bulk Update:** Ensures that multiple records are updated correctly based
     on a unique key (id).
  3. **Bulk Delete:** Confirms that multiple records are deleted correctly based
     on a unique key (id).

**Notes:**

- **MockDatabaseAdapter:** Simulates database operations and tracks executed
  queries for verification.
- **BaseModel Integration:** Demonstrates how bulk operations interact with ORM
  models.

---

### 18. src/adapters/MockDatabaseAdapter.ts (New)

**Description:** Implements a mock database adapter for testing purposes,
tracking executed queries without performing actual database operations.

typescript // src/tests/mocks/MockDatabaseAdapter.ts

import { DatabaseAdapter } from "../../interfaces/DatabaseAdapter.ts";

export class MockDatabaseAdapter implements DatabaseAdapter { private
executedQueries: string[] = []; private data: { [key: string]: any[] } = {};

async connect(): Promise<void> {}

async disconnect(): Promise<void> {}

async execute(query: string, params: any[] = []): Promise<{ rows: any[];
rowCount: number }> { this.executedQueries.push(query); // Simulate query
execution based on the query type if (query.startsWith("INSERT")) { return {
rows: [], rowCount: 1 }; } else if (query.startsWith("UPDATE")) { return { rows:
[], rowCount: 1 }; } else if (query.startsWith("DELETE")) { return { rows: [],
rowCount: 1 }; } else if (query.startsWith("BEGIN TRANSACTION") ||
query.startsWith("COMMIT") || query.startsWith("ROLLBACK")) { return { rows: [],
rowCount: 0 }; } return { rows: [], rowCount: 0 }; }

getExecutedQueries(): string[] { return this.executedQueries; }

clearExecutedQueries(): void { this.executedQueries = []; } }

**Explanation:**

- **MockDatabaseAdapter Class:**
  - **Purpose:** Simulates a database adapter by tracking executed queries
    without performing real database operations.
  - **Properties:**
    - executedQueries: Array storing all executed query strings.
    - data: In-memory data store (optional for more advanced simulations).
  - **Methods:**
    - **execute Method:** Logs the executed query and simulates a response based
      on the query type.
    - **getExecutedQueries Method:** Retrieves the list of executed queries for
      verification in tests.
    - **clearExecutedQueries Method:** Clears the log of executed queries.

**Notes:**

- **Simplicity:** Designed for straightforward tracking of queries. For more
  complex testing scenarios, enhance the mock to simulate data changes.
- **Integration with Other Tests:** Used in transaction and bulk operations
  tests to verify correct query execution.

---

### 19. README.md (Updated)

**Description:** Updates the project README to include information about
advanced features, their usage, and best practices.

markdown

# Rex-ORM - Sprint 11: Advanced Features - Transactions, Caching, and Optimization

## Overview

Sprint 11 enhances **Rex-ORM** with advanced features, including transaction
management, caching mechanisms, performance optimizations, and bulk operations.
These enhancements ensure data integrity, improve query performance, and enable
efficient handling of large datasets. Comprehensive documentation and unit tests
accompany these features to guide developers and ensure reliability.

## Directory Structure

## rex-orm/ ├── src/ │ ├── adapters/ │ │ ├── PostgreSQLAdapter.ts │ │ ├── SQLiteAdapter.ts │ │ └── CacheAdapter.ts │ ├── caching/ │ │ ├── InMemoryCache.ts │ │ ├── RedisCache.ts │ │ └── CacheService.ts │ ├── transactions/ │ │ ├── TransactionManager.ts │ │ └── types.ts │ ├── bulk/ │ │ ├── BulkOperations.ts │ │ └── types.ts │ ├── graphql/ │ │ ├── GraphQLSchema.ts │ │ ├── Resolvers.ts │ │ ├── GraphQLServer.ts │ │ └── types.ts │ ├── models/ │ │ ├── ModelRegistry.ts │ │ ├── BaseModel.ts │ │ ├── User.ts │ │ ├── Post.ts │ │ └── ... (additional models) │ ├── realtime/ │ │ ├── EventEmitter.ts │ │ ├── WebSocketServer.ts │ │ └── SubscriptionManager.ts │ ├── migration/ │ │ ├── MigrationRunner.ts │ │ ├── MigrationTracker.ts │ │ └── MigrationManager.ts │ ├── migrations/ │ │ ├── 001_create_users_table.ts │ │ ├── 002_create_posts_table.ts │ │ ├── 003_create_profiles_table.ts │ │ ├── 004_create_post_tags_table.ts │ │ └── ... (additional migration scripts) │ ├── query/ │ │ └── QueryBuilder.ts │ ├── serverless/ │ │ ├── handler.ts │ │ ├── deploy.sh │ │ └── serverless.yml │ ├── cli/ │ │ ├── commands/ │ │ │ ├── init.ts │ │ │ ├── generateModel.ts │ │ │ └── ... (additional CLI commands) │ │ └── cli.ts │ ├── factory/ │ │ └── DatabaseFactory.ts │ ├── interfaces/ │ │ ├── DatabaseAdapter.ts │ │ └── CacheAdapter.ts │ ├── decorators/ │ │ ├── Entity.ts │ │ ├── Column.ts │ │ ├── PrimaryKey.ts │ │ ├── OneToMany.ts │ │ ├── ManyToOne.ts │ │ ├── OneToOne.ts │ │ ├── ManyToMany.ts │ │ ├── Validate.ts │ │ └── ValidateMultiple.ts │ ├── tests/ │ │ └── unit/ │ │ ├── adapters/ │ │ │ ├── PostgreSQLAdapter.test.ts │ │ │ ├── SQLiteAdapter.test.ts │ │ │ └── CacheAdapter.test.ts │ │ ├── caching/ │ │ │ ├── InMemoryCache.test.ts │ │ │ ├── RedisCache.test.ts │ │ │ └── CacheService.test.ts │ │ ├── transactions/ │ │ │ ├── TransactionManager.test.ts │ │ │ └── types.test.ts │ │ ├── bulk/ │ │ │ ├── BulkOperations.test.ts │ │ │ └── types.test.ts │ │ ├── graphql/ │ │ │ ├── GraphQLSchema.test.ts │ │ │ ├── Resolvers.test.ts │ │ │ └── GraphQLServer.test.ts │ │ ├── realtime/ │ │ │ ├── EventEmitter.test.ts │ │ │ ├── WebSocketServer.test.ts │ │ │ └── SubscriptionManager.test.ts │ │ ├── migration/ │ │ │ ├── MigrationRunner.test.ts │ │ │ ├── MigrationTracker.test.ts │ │ │ └── MigrationManager.test.ts │ │ ├── modelLayer/ │ │ │ ├── Decorators.test.ts │ │ │ ├── ModelRegistry.test.ts │ │ │ ├── RelationshipDecorators.test.ts │ │ │ └── ValidationDecorators.test.ts │ │ └── query/ │ │ └── QueryBuilder.test.ts │ ├── config/ │ │ └── config.ts │ └── ... (other directories) ├── import_map.json ├── deno.json ├── package.json └── README.md

### 1. `src/transactions/types.ts`

**Description:** Defines the types and interfaces related to transaction
management. typescript // src/transactions/types.ts

export interface Transaction { id: string; begin: () => Promise<void>; commit:
() => Promise<void>; rollback: () => Promise<void>; }

export interface TransactionManagerOptions { isolationLevel?: string; // e.g.,
"READ COMMITTED", "SERIALIZABLE" } **Explanation:**

- **Interfaces:**
  - `Transaction`: Represents a database transaction with methods to begin,
    commit, and rollback.
  - `TransactionManagerOptions`: Configuration options for the
    `TransactionManager`, such as setting the isolation level.

---

### 2. `src/transactions/TransactionManager.ts`

**Description:** Manages database transactions, allowing atomic operations
across multiple database actions. typescript //
src/transactions/TransactionManager.ts

import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts"; import {
Transaction, TransactionManagerOptions } from "./types.ts"; import { v4 } from
"https://deno.land/std@0.178.0/uuid/mod.ts";

export class TransactionManager { private adapter: DatabaseAdapter; private
options: TransactionManagerOptions;

constructor(adapter: DatabaseAdapter, options: TransactionManagerOptions = {}) {
this.adapter = adapter; this.options = options; }

async beginTransaction(): Promise<Transaction> { const transactionId =
v4.generate(); await this.adapter.execute("BEGIN TRANSACTION;"); return { id:
transactionId, begin: async () => { await this.adapter.execute("BEGIN
TRANSACTION;"); }, commit: async () => { await this.adapter.execute("COMMIT;");
}, rollback: async () => { await this.adapter.execute("ROLLBACK;"); }, }; }

async executeInTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
const transaction = await this.beginTransaction(); try { const result = await
fn(transaction); await transaction.commit(); return result; } catch (error) {
await transaction.rollback(); throw error; } } } **Explanation:**

- **TransactionManager Class:**
  - **Constructor:** Accepts a `DatabaseAdapter` instance and optional
    configuration options.
  - **`beginTransaction` Method:** Starts a new database transaction and returns
    a `Transaction` object with `begin`, `commit`, and `rollback` methods.
  - **`executeInTransaction` Method:** Executes a provided asynchronous function
    within a transaction context. Commits the transaction if the function
    succeeds or rolls back if an error occurs.

**Notes:**

- **UUID for Transaction ID:** Uses the `uuid` module to generate unique
  transaction IDs for tracking.
- **Isolation Levels:** Currently, the isolation level is not dynamically set.
  To implement different isolation levels, modify the `beginTransaction` method
  to include the desired level in the SQL command, e.g.,
  `BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;`.

---

### 3. `src/caching/InMemoryCache.ts`

**Description:** Implements an in-memory caching mechanism to store and retrieve
query results, reducing database load and improving performance. typescript //
src/caching/InMemoryCache.ts

import { CacheAdapter } from "../interfaces/CacheAdapter.ts";

interface CacheEntry { data: any; expiry: number; }

export class InMemoryCache implements CacheAdapter { private cache: Map<string,
CacheEntry>; private ttl: number; // Time-to-live in milliseconds

constructor(ttl: number = 60000) { // Default TTL: 60 seconds this.cache = new
Map(); this.ttl = ttl; }

set(key: string, value: any): void { const expiry = Date.now() + this.ttl;
this.cache.set(key, { data: value, expiry }); }

get(key: string): any | null { const entry = this.cache.get(key); if (!entry)
return null; if (Date.now() > entry.expiry) { this.cache.delete(key); return
null; } return entry.data; }

delete(key: string): void { this.cache.delete(key); }

clear(): void { this.cache.clear(); } } **Explanation:**

- **InMemoryCache Class:**
  - **Implements:** `CacheAdapter` interface.
  - **Properties:**
    - `cache`: A `Map` storing cached data with their expiration times.
    - `ttl`: Time-to-live for cache entries in milliseconds.
  - **Methods:**
    - `set(key, value)`: Stores a value in the cache with an expiration time.
    - `get(key)`: Retrieves a value from the cache if it exists and hasn't
      expired; otherwise, returns `null`.
    - `delete(key)`: Removes a specific entry from the cache.
    - `clear()`: Clears all entries from the cache.

**Notes:**

- **TTL Management:** Each cache entry has an expiration time. Expired entries
  are automatically deleted upon access.
- **Scalability:** Suitable for applications with limited caching needs. For
  distributed systems or larger datasets, consider using an external caching
  solution like Redis.

---

### 4. `src/caching/RedisCache.ts`

**Description:** Implements a Redis-based caching mechanism to store and
retrieve query results, providing a scalable and persistent caching solution.
typescript // src/caching/RedisCache.ts

import { CacheAdapter } from "../interfaces/CacheAdapter.ts"; import { connect,
Redis } from "https://deno.land/x/redis@v0.28.2/mod.ts";

export class RedisCache implements CacheAdapter { private client: Redis; private
ttl: number; // Time-to-live in seconds

constructor(url: string, ttl: number = 60) { // Default TTL: 60 seconds
this.client = await connect({ hostname: new URL(url).hostname, port:
parseInt(new URL(url).port) || 6379 }); this.ttl = ttl; }

async set(key: string, value: any): Promise<void> { await this.client.set(key,
JSON.stringify(value), { ex: this.ttl }); }

async get(key: string): Promise<any | null> { const data = await
this.client.get(key); if (!data) return null; return JSON.parse(data); }

async delete(key: string): Promise<void> { await this.client.del(key); }

async clear(): Promise<void> { await this.client.flushdb(); }

async disconnect(): Promise<void> { await this.client.close(); } }
**Explanation:**

- **RedisCache Class:**
  - **Implements:** `CacheAdapter` interface.
  - **Properties:**
    - `client`: Redis client instance for interacting with the Redis server.
    - `ttl`: Time-to-live for cache entries in seconds.
  - **Constructor:**
    - Connects to the Redis server using the provided URL.
  - **Methods:**
    - `set(key, value)`: Stores a JSON-stringified value in Redis with an
      expiration time.
    - `get(key)`: Retrieves and parses a JSON value from Redis; returns `null`
      if the key doesn't exist.
    - `delete(key)`: Removes a specific key from Redis.
    - `clear()`: Flushes the entire Redis database.
    - `disconnect()`: Closes the Redis client connection.

**Notes:**

- **Asynchronous Operations:** All methods interacting with Redis are
  asynchronous and return Promises.
- **Error Handling:** In production, implement proper error handling to manage
  connection issues or command failures.
- **Connection Management:** Ensure that the `disconnect` method is called
  appropriately to close Redis connections gracefully.

---

### 5. `src/caching/CacheService.ts`

**Description:** Provides a centralized service for managing caching mechanisms,
allowing easy switching between different cache adapters such as in-memory
caching and Redis. This service follows the Singleton pattern to ensure that
only one instance manages the caching throughout the application.

```typescript
// src/caching/CacheService.ts

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

**Explanation:**

- **Singleton Pattern:** The `CacheService` class uses the Singleton pattern to
  ensure that only one instance manages the caching mechanisms across the entire
  application. This prevents the creation of multiple cache instances, which
  could lead to inconsistent caching behavior.

- **Methods:**
  - `getInstance()`: Retrieves the singleton instance of the `CacheService`. If
    it doesn't exist, it creates one.
  - `initializeCache(type, options)`: Initializes the cache adapter based on the
    specified type (`"in-memory"` or `"redis"`) and configuration options. For
    Redis, it requires a `url` to connect to the Redis server.
  - `getCacheAdapter()`: Returns the current cache adapter instance. Returns
    `null` if the cache hasn't been initialized.
  - `clearCache()`: Clears all entries from the cache. If the cache adapter
    supports asynchronous operations (like Redis), it returns a promise.
  - `disconnectCache()`: Disconnects from the cache adapter if applicable. For
    example, Redis connections need to be gracefully closed to prevent memory
    leaks.

- **Flexibility:** By abstracting the caching mechanisms behind the
  `CacheService`, developers can easily switch between different caching
  strategies without modifying the core ORM code. This promotes flexibility and
  scalability, allowing the application to adapt to different caching
  requirements as it grows.

- **Configuration:** The `initializeCache` method allows for configuration
  through parameters, making it easy to set up caching based on environment
  variables or configuration files. For instance, in a production environment,
  Redis caching can be enabled, while in a development environment, in-memory
  caching might suffice.

---

### 6. `src/adapters/DatabaseAdapter.ts` (Updated)

**Description:** Extends the `DatabaseAdapter` interface to include methods for
transaction management and caching support, ensuring that all database adapters
conform to a standard interface for these advanced features.

```typescript
// src/interfaces/DatabaseAdapter.ts

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

**Explanation:**

- **Enhanced Interface:** The `DatabaseAdapter` interface now includes methods
  for handling transactions (`beginTransaction`, `commit`, `rollback`) and
  caching (`setCache`, `getCache`).

- **Transaction Methods:**
  - `beginTransaction()`: Initiates a new database transaction.
  - `commit()`: Commits the current transaction.
  - `rollback()`: Rolls back the current transaction.

- **Caching Methods:**
  - `setCache(adapter)`: Assigns a cache adapter to the database adapter. This
    allows the database adapter to utilize caching mechanisms transparently.
  - `getCache()`: Retrieves the currently assigned cache adapter, if any.

- **Consistency:** By defining these methods in the interface, all concrete
  implementations of `DatabaseAdapter` (e.g., `PostgreSQLAdapter`,
  `SQLiteAdapter`) are required to provide these functionalities, ensuring
  consistent behavior across different database systems.

- **Type Import:** The `CacheAdapter` interface is imported to ensure that
  caching mechanisms conform to the expected structure.

---

### 7. `src/adapters/PostgreSQLAdapter.ts` (Updated)

**Description:** Updates the `PostgreSQLAdapter` to support transaction
management and caching, enhancing its capability to handle complex database
interactions efficiently.

```typescript
// src/adapters/PostgreSQLAdapter.ts

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

**Explanation:**

- **Caching Integration:**
  - The `execute` method first checks if caching is enabled by verifying if a
    `cache` adapter is set.
  - If caching is active, it generates a unique `cacheKey` based on the query
    and its parameters.
  - It attempts to retrieve the result from the cache. If a cached result
    exists, it returns the cached data, bypassing the actual database query.
  - If no cached result is found, it executes the query against the database,
    caches the result if caching is enabled, and then returns the result.

- **Transaction Management:**
  - Implements `beginTransaction`, `commit`, and `rollback` methods to manage
    database transactions.
  - These methods ensure that multiple database operations can be executed
    atomically, maintaining data integrity.

- **Connection Handling:**
  - Manages a pool of database connections using `Pool` from the PostgreSQL
    module.
  - Ensures that a client is acquired from the pool before executing any
    queries.
  - Properly releases the client back to the pool upon disconnection.

- **Error Handling:**
  - Throws errors if database operations are attempted without an active
    connection, preventing unexpected behaviors.

- **Cache Adapter Assignment:**
  - `setCache(adapter)`: Assigns a cache adapter (e.g., `InMemoryCache`,
    `RedisCache`) to the adapter.
  - `getCache()`: Retrieves the currently assigned cache adapter.

- **Scalability and Performance:**
  - By integrating caching and transaction management, the `PostgreSQLAdapter`
    enhances performance by reducing redundant queries and ensuring efficient
    handling of complex database operations.

---

### 8. `src/adapters/SQLiteAdapter.ts` (Updated)

**Description:** Updates the `SQLiteAdapter` to support transaction management
and caching, enabling it to handle atomic operations and improve query
performance through caching.

```typescript
// src/adapters/SQLiteAdapter.ts

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

**Explanation:**

- **Caching Integration:**
  - Similar to the `PostgreSQLAdapter`, the `execute` method in `SQLiteAdapter`
    checks for cached query results before executing the actual query.
  - If a cached result is found, it returns the cached data, enhancing
    performance by avoiding unnecessary database access.
  - If not cached, it executes the query, caches the result if a cache adapter
    is set, and then returns the result.

- **Transaction Management:**
  - Implements `beginTransaction`, `commit`, and `rollback` methods to manage
    database transactions.
  - SQLite inherently supports transactions, allowing multiple operations to be
    executed atomically.

- **Connection Handling:**
  - SQLite operates on a file-based system, so explicit connection handling is
    minimal.
  - The `connect` method is a no-op, while the `disconnect` method closes the
    database connection.

- **Error Handling:**
  - Unlike PostgreSQL, SQLite's `DB` class methods throw errors automatically if
    something goes wrong, so additional error handling may not be necessary
    unless implementing custom behaviors.

- **Cache Adapter Assignment:**
  - `setCache(adapter)`: Assigns a cache adapter to the SQLite adapter.
  - `getCache()`: Retrieves the currently assigned cache adapter.

- **Simplicity and Efficiency:**
  - The `SQLiteAdapter` maintains simplicity by leveraging SQLite's lightweight
    nature while still providing advanced features like caching and transaction
    management to ensure efficient and reliable database interactions.

---

### 9. `src/caching/CacheService.test.ts`

**Description:** Unit tests for the `CacheService` class, ensuring that it
correctly initializes and manages different cache adapters.

```typescript
// src/tests/unit/caching/CacheService.test.ts

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

**Explanation:**

- **Tests:**
  1. **Initialize InMemoryCache:**
     - Verifies that the `CacheService` correctly initializes an `InMemoryCache`
       with the specified TTL (Time-to-Live).
     - Checks that the cache adapter instance is of type `InMemoryCache` and
       that the TTL is set correctly.

  2. **Initialize RedisCache:**
     - Ensures that the `CacheService` correctly initializes a `RedisCache` with
       the provided Redis URL and TTL.
     - Confirms that the cache adapter instance is of type `RedisCache` and that
       the TTL is set as expected.
     - Disconnects from Redis after the test to clean up resources.

  3. **Unsupported Cache Type:**
     - Tests that the `CacheService` throws an error when attempting to
       initialize an unsupported cache type.
     - Ensures that the error message matches the expected output.

  4. **Missing Redis URL:**
     - Checks that initializing a `RedisCache` without providing a Redis URL
       results in an error.
     - Validates that the error message accurately reflects the missing
       configuration.

- **Dependencies:**
  - **Mocking Redis:** The `RedisCache` tests assume that a Redis instance is
    running locally on `localhost:6379`. For isolated testing, consider using a
    Redis mock or a test-specific Redis instance.

- **Assertions:**
  - Uses `assertEquals` to verify that the cache adapters are correctly
    instantiated.
  - Utilizes `assertThrowsAsync` to ensure that appropriate errors are thrown
    under invalid conditions.

- **Cleanup:**
  - The Redis connection is disconnected after testing to prevent lingering
    connections that could interfere with subsequent tests or application
    behavior.

---

### 10. `src/bulk/types.ts`

**Description:** Defines the types and interfaces related to bulk operations,
facilitating structured and type-safe interactions when performing bulk
insertions, updates, and deletions.

```typescript
// src/bulk/types.ts

export interface BulkOperationResult {
  inserted: number;
  updated: number;
  deleted: number;
}

export interface BulkOptions {
  ignoreDuplicates?: boolean;
}
```

**Explanation:**

- **Interfaces:**
  - `BulkOperationResult`: Represents the outcome of bulk operations, indicating
    the number of records inserted, updated, and deleted. This provides a
    standardized way to report the results of bulk operations, enabling better
    tracking and error handling.

  - `BulkOptions`: Configuration options for bulk operations. Currently
    includes:
    - `ignoreDuplicates` (optional): A boolean flag indicating whether to ignore
      duplicate entries during bulk insertions. When set to `true`, the ORM will
      skip inserting records that would cause duplicate key conflicts,
      preventing errors and allowing the operation to continue smoothly.

- **Purpose:**
  - These interfaces ensure that bulk operations are executed in a consistent
    and predictable manner. By defining the expected structure of operation
    results and configuration options, developers can interact with bulk
    operations confidently, knowing the types and behaviors involved.

- **Extensibility:**
  - Additional options and result fields can be added to these interfaces as
    needed, allowing the ORM to support more complex bulk operation scenarios in
    the future.

---

### 11. `src/bulk/BulkOperations.ts`

**Description:** Implements bulk operations (insertions, updates, deletions) to
handle large datasets efficiently, reducing the number of database round-trips
and improving performance.

```typescript
// src/bulk/BulkOperations.ts

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

**Explanation:**

- **Purpose:** The `BulkOperations` class provides methods to perform bulk
  insertions, updates, and deletions, enabling efficient handling of large
  datasets by minimizing the number of database interactions.

- **Methods:**
  1. **`bulkInsert`:**
     - **Functionality:** Inserts multiple records into the database in a single
       SQL `INSERT` statement.
     - **Parameters:**
       - `models`: An array of models to insert.
       - `options`: Configuration options, such as `ignoreDuplicates` to handle
         duplicate entries gracefully.
     - **Implementation:**
       - Constructs a dynamic `INSERT` query with appropriate placeholders for
         parameterized queries.
       - Flattens the values array to match the placeholders.
       - Executes the query using the provided `DatabaseAdapter`.
       - Returns the number of records inserted.

  2. **`bulkUpdate`:**
     - **Functionality:** Updates multiple records based on a unique key
       (default is `id`).
     - **Parameters:**
       - `models`: An array of models to update.
       - `key`: The unique key to identify records for updating.
     - **Implementation:**
       - Iterates over each model and constructs an `UPDATE` query with
         placeholders.
       - Executes each `UPDATE` statement individually.
       - Accumulates the number of records updated.
       - Returns the total number of records updated.

  3. **`bulkDelete`:**
     - **Functionality:** Deletes multiple records based on a unique key
       (default is `id`).
     - **Parameters:**
       - `models`: An array of models to delete.
       - `key`: The unique key to identify records for deletion.
     - **Implementation:**
       - Extracts the unique keys from the models.
       - Constructs a `DELETE` query using the `IN` clause with appropriate
         placeholders.
       - Executes the query using the provided `DatabaseAdapter`.
       - Returns the number of records deleted.

- **Advantages:**
  - **Performance:** Bulk operations reduce the number of round-trips to the
    database, significantly improving performance when dealing with large
    datasets.
  - **Atomicity:** While `bulkInsert` performs a single `INSERT` statement,
    `bulkUpdate` executes multiple `UPDATE` statements. To ensure atomicity
    across all operations, consider wrapping these methods within a transaction
    using the `TransactionManager`.
  - **Flexibility:** The methods are generic and can handle any model extending
    `BaseModel`, making them versatile for different parts of the application.

- **Security:**
  - **Parameterized Queries:** All SQL statements use parameterized queries to
    prevent SQL injection attacks, ensuring that user input is safely handled.

- **Extensibility:**
  - Additional bulk operations or customization options can be added as needed,
    such as batch sizes or conditional updates/deletions.

---

### 12. `src/models/BaseModel.ts` (Updated)

**Description:** Updates the `BaseModel` to integrate transaction management,
caching, and bulk operations, providing a foundational structure for all ORM
models to perform CRUD operations efficiently and reliably.

```typescript
// src/models/BaseModel.ts

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
  - **`realTimeSync` Static Property:** Holds an instance of `RealTimeSync`,
    responsible for emitting real-time events (e.g., via WebSockets) when CRUD
    operations occur.
  - **`initializeRealTimeSync(sync)`:** Allows initializing the real-time
    synchronization mechanism, enabling the emission of events upon model
    operations.

- **CRUD Operations with Transaction Management:**
  - **`save(adapter)`:** Handles both insertion and updating of records.
    - **Insertion:**
      - Checks if the model instance is new by verifying the absence of an `id`.
      - Constructs an `INSERT` query with appropriate placeholders.
      - Executes the query within a transaction using `TransactionManager`.
      - Updates the model's `id` based on the database response.
    - **Update:**
      - Constructs an `UPDATE` query for existing records.
      - Executes the query within a transaction.
  - **`delete(adapter)`:** Deletes the model instance from the database.
    - Ensures that the instance has an `id` before attempting deletion.
    - Executes a `DELETE` query within a transaction.

- **Transaction Management:**
  - Utilizes the `TransactionManager` to ensure that operations are executed
    atomically.
  - If any part of the transaction fails, the entire operation is rolled back,
    maintaining data integrity.

- **Caching Integration:**
  - While caching isn't directly handled in the `BaseModel`, it's managed at the
    `DatabaseAdapter` level. Queries executed within CRUD operations benefit
    from caching if a cache adapter is set.

- **Real-Time Events:**
  - After successful CRUD operations, emits real-time events (`CREATE`,
    `UPDATE`, `DELETE`) using the `RealTimeSync` instance.
  - This facilitates real-time features in applications, such as live updates in
    user interfaces.

- **Error Handling:**
  - Throws an error if attempting to delete a record without an `id`, preventing
    unintended behaviors.

- **Extensibility:**
  - The `BaseModel` serves as a foundation for all ORM models, providing
    standardized CRUD operations.
  - Additional methods or hooks can be added to enhance functionality as needed.

---

### 13. `src/interfaces/CacheAdapter.ts` (New)

**Description:** Defines the `CacheAdapter` interface to standardize caching
mechanisms across different adapters, ensuring consistency in how caching is
implemented and interacted with within the ORM.

```typescript
// src/interfaces/CacheAdapter.ts

export interface CacheAdapter {
  set(key: string, value: any): void | Promise<void>;
  get(key: string): any | null | Promise<any | null>;
  delete(key: string): void | Promise<void>;
  clear(): void | Promise<void>;
}
```

**Explanation:**

- **Interface Definition:**
  - `CacheAdapter` is an interface that outlines the essential methods any cache
    implementation must provide. This standardization ensures that different
    caching mechanisms (e.g., in-memory, Redis) can be used interchangeably
    within the ORM.

- **Methods:**
  1. **`set(key: string, value: any)`:**
     - **Purpose:** Stores a value in the cache associated with the specified
       key.
     - **Return Type:** Can be synchronous (`void`) or asynchronous
       (`Promise<void>`), accommodating both in-memory and external caches.

  2. **`get(key: string)`:**
     - **Purpose:** Retrieves the value associated with the specified key from
       the cache.
     - **Return Type:** Returns the stored value or `null` if the key doesn't
       exist. Can be synchronous or asynchronous.

  3. **`delete(key: string)`:**
     - **Purpose:** Removes the value associated with the specified key from the
       cache.
     - **Return Type:** Can be synchronous or asynchronous.

  4. **`clear()`:**
     - **Purpose:** Clears all entries from the cache.
     - **Return Type:** Can be synchronous or asynchronous.

- **Flexibility:**
  - By allowing methods to return either synchronous or asynchronous results,
    the interface accommodates a wide range of caching implementations without
    enforcing a strict execution model.

- **Consistency:**
  - Ensures that all cache adapters adhere to the same method signatures,
    enabling seamless integration and switching between different caching
    strategies within the ORM.

- **Extensibility:**
  - Additional methods can be added to the interface in the future if new
    caching functionalities are required, provided that all implementing classes
    are updated accordingly.

---

### 14. `src/caching/InMemoryCache.test.ts`

**Description:** Unit tests for the `InMemoryCache` class, ensuring correct
caching behavior such as setting, getting, deleting, and expiring cache entries.

```typescript
// src/tests/unit/caching/InMemoryCache.test.ts

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

**Explanation:**

- **Tests:**
  1. **Set and Get Values:**
     - **Objective:** Verify that values are correctly stored and retrieved from
       the in-memory cache.
     - **Process:** Sets a key-value pair and retrieves it to ensure the value
       matches.

  2. **TTL Expiration:**
     - **Objective:** Ensure that cached values expire after the specified TTL
       (Time-to-Live).
     - **Process:** Sets a key with a short TTL, waits for longer than the TTL,
       and then attempts to retrieve the key, expecting it to have expired.

  3. **Delete Values:**
     - **Objective:** Confirm that individual keys can be deleted from the
       cache.
     - **Process:** Sets a key, deletes it, and then verifies that it no longer
       exists in the cache.

  4. **Clear Cache:**
     - **Objective:** Check that all cache entries can be cleared
       simultaneously.
     - **Process:** Sets multiple keys, clears the cache, and ensures that all
       keys have been removed.

- **Helper Function:**
  - **`delay(ms: number)`:** A utility function to pause execution for a
    specified number of milliseconds, used to test TTL expiration.

- **Assertions:**
  - Utilizes `assertEquals` to verify that the retrieved values match the
    expected outcomes.

- **Coverage:**
  - These tests cover the fundamental functionalities of the `InMemoryCache`,
    ensuring reliability and correctness in caching behavior.

- **Simplicity:**
  - The tests are straightforward, focusing on key operations without the need
    for complex setups, making them efficient and easy to maintain.

---

### 15. `src/caching/RedisCache.test.ts`

**Description:** Unit tests for the `RedisCache` class, ensuring correct caching
behavior with Redis, including setting, getting, deleting, and expiring cache
entries.

```typescript
// src/tests/unit/caching/RedisCache.test.ts

import { assertEquals, assertThrowsAsync } from "../../../deps.ts";
import { RedisCache } from "../../../caching/RedisCache.ts";

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

**Explanation:**

- **Prerequisites:**
  - **Redis Server:** These tests require a running Redis instance accessible at
    `redis://localhost:6379`. Ensure that Redis is operational before executing
    the tests. Alternatively, adjust the Redis URL in the tests to match your
    environment.

- **Tests:**
  1. **Set and Get Values:**
     - **Objective:** Verify that values are correctly stored and retrieved from
       Redis.
     - **Process:** Sets a key-value pair in Redis, retrieves it, and checks for
       correctness. Cleans up by deleting the key and disconnecting.

  2. **TTL Expiration:**
     - **Objective:** Ensure that cached values expire after the specified TTL.
     - **Process:** Sets a key with a 1-second TTL, waits for 2 seconds, and
       then attempts to retrieve the key, expecting it to have expired.

  3. **Delete Values:**
     - **Objective:** Confirm that individual keys can be deleted from Redis.
     - **Process:** Sets a key, deletes it, and verifies that it no longer
       exists in Redis.

  4. **Clear Cache:**
     - **Objective:** Check that all cache entries can be cleared from Redis.
     - **Process:** Sets multiple keys, clears the Redis database, and ensures
       that all keys have been removed.

- **Helper Function:**
  - **`delay(ms: number)`:** A utility function to pause execution for a
    specified number of milliseconds, used to test TTL expiration.

- **Assertions:**
  - Uses `assertEquals` to verify that the retrieved values match the expected
    outcomes.

- **Cleanup:**
  - After each test, the Redis connection is disconnected to prevent lingering
    connections and ensure that each test runs in isolation.

- **Error Handling:**
  - Additional tests can be added to handle scenarios such as connection
    failures, invalid commands, or Redis server errors to enhance robustness.

- **Considerations:**
  - **Test Isolation:** Ensure that the keys used in tests are unique or cleaned
    up properly to prevent interference between tests.
  - **Performance:** Be mindful of the delays introduced for TTL testing, as
    they can increase the total time taken to run the test suite.

---

### 16. `src/transactions/TransactionManager.test.ts`

**Description:** Unit tests for the `TransactionManager` class, ensuring correct
transaction handling including committing successful transactions and rolling
back failed ones.

```typescript
// src/tests/unit/transactions/TransactionManager.test.ts

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

**Explanation:**

- **Dependencies:**
  - **`MockDatabaseAdapter`:** A mock implementation of `DatabaseAdapter` that
    records executed queries without performing actual database operations. This
    allows for testing transaction behavior in isolation.

- **Tests:**
  1. **Commit Transactions Correctly:**
     - **Objective:** Ensure that when a transaction executes successfully
       without errors, it commits all operations.
     - **Process:** Executes two `INSERT` statements within a transaction and
       verifies that the sequence of executed queries includes
       `BEGIN TRANSACTION;`, the two `INSERT` statements, and `COMMIT;`.

  2. **Rollback Transactions on Error:**
     - **Objective:** Verify that if an error occurs during a transaction, all
       operations are rolled back.
     - **Process:** Executes an `INSERT` statement within a transaction,
       deliberately throws an error, and checks that the sequence of executed
       queries includes `BEGIN TRANSACTION;`, the `INSERT` statement, and
       `ROLLBACK;`.
     - **Assertion:** Confirms that the error is propagated and that the
       transaction is correctly rolled back.

- **Assertions:**
  - Uses `assertEquals` to compare the expected sequence of executed queries
    with those recorded by the `MockDatabaseAdapter`.
  - Utilizes `assertThrowsAsync` to ensure that errors within transactions are
    correctly thrown and handled.

- **Coverage:**
  - These tests cover the fundamental behaviors of the `TransactionManager`,
    ensuring that transactions are either fully committed or entirely rolled
    back based on the success or failure of operations within them.

- **Extensibility:**
  - Additional tests can be added to handle more complex transaction scenarios,
    such as nested transactions, different isolation levels, or concurrent
    transactions, depending on the ORM's capabilities and requirements.

---

### 17. `src/bulk/BulkOperations.test.ts`

**Description:** Unit tests for the `BulkOperations` class, ensuring correct
handling of bulk insertions, updates, and deletions, and verifying that the
appropriate SQL queries are executed.

```typescript
// src/tests/unit/bulk/BulkOperations.test.ts

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

**Explanation:**

- **Dependencies:**
  - **`MockDatabaseAdapter`:** Simulates database operations by recording
    executed queries without interacting with an actual database.
  - **`User` Class:** A mock model extending `BaseModel` used for testing bulk
    operations.

- **Tests:**
  1. **Bulk Insert:**
     - **Objective:** Ensure that multiple records are inserted correctly using
       `bulkInsert`.
     - **Process:** Creates two `User` instances without `id`s, performs a bulk
       insert with `ignoreDuplicates` set to `true`, and verifies that the
       correct SQL `INSERT` statement is executed.
     - **Assertion:** Checks that two records are reported as inserted and that
       the executed query matches the expected SQL syntax.

  2. **Bulk Update:**
     - **Objective:** Verify that multiple records are updated correctly using
       `bulkUpdate`.
     - **Process:** Creates two `User` instances with existing `id`s, performs a
       bulk update, and checks that the correct SQL `UPDATE` statements are
       executed for each record.
     - **Assertion:** Confirms that two records are reported as updated and that
       the executed queries match the expected SQL syntax.

  3. **Bulk Delete:**
     - **Objective:** Ensure that multiple records are deleted correctly using
       `bulkDelete`.
     - **Process:** Creates two `User` instances with existing `id`s, performs a
       bulk deletion, and verifies that the correct SQL `DELETE` statement is
       executed.
     - **Assertion:** Checks that two records are reported as deleted and that
       the executed query matches the expected SQL syntax.

- **Assertions:**
  - Uses `assertEquals` to verify both the results of the bulk operations and
    the exact SQL queries that were executed by the `MockDatabaseAdapter`.

- **Coverage:**
  - These tests cover the core functionalities of the `BulkOperations` class,
    ensuring that it correctly constructs and executes SQL queries for different
    bulk operations.

- **Extensibility:**
  - Additional tests can be added to handle edge cases, such as bulk operations
    with empty model arrays, handling of different keys for identification, or
    integration with transactions to ensure atomicity across bulk operations.

---

### 18. `src/adapters/MockDatabaseAdapter.ts` (New)

**Description:** Implements a mock database adapter for testing purposes,
tracking executed queries without performing actual database operations. This
allows for isolated testing of transaction and bulk operation behaviors.

```typescript
// src/tests/mocks/MockDatabaseAdapter.ts

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

**Explanation:**

- **Purpose:** The `MockDatabaseAdapter` class serves as a stand-in for real
  database adapters during testing. It records the SQL queries that are
  executed, allowing tests to verify that the correct queries are being
  constructed and executed without needing a real database connection.

- **Properties:**
  - `executedQueries`: An array that logs all executed SQL query strings.
  - `data`: An optional in-memory data store for simulating database state.
    (Currently unused but can be extended for more advanced mocking scenarios.)

- **Methods:**
  - **`connect()` and `disconnect()`:** No-op methods since actual connection
    handling isn't required for mocking.
  - **`execute(query, params)`:** Records the executed query and simulates a
    response based on the query type.
    - **`INSERT` Queries:** Returns a `rowCount` of `1`, simulating a successful
      insertion.
    - **`UPDATE` Queries:** Returns a `rowCount` of `1`, simulating a successful
      update.
    - **`DELETE` Queries:** Returns a `rowCount` of `1`, simulating a successful
      deletion.
    - **Transaction Queries (`BEGIN`, `COMMIT`, `ROLLBACK`):** Returns a
      `rowCount` of `0`, as these don't affect rows directly.
    - **Other Queries:** Returns a `rowCount` of `0` by default.

  - **`getExecutedQueries()`:** Provides access to the list of executed queries
    for verification in tests.

  - **`clearExecutedQueries()`:** Resets the log of executed queries, ensuring
    that tests can run in isolation without interference from previous
    operations.

- **Usage in Tests:**
  - **Transaction Tests:** Allows verification that transactions (`BEGIN`,
    `COMMIT`, `ROLLBACK`) are correctly executed.
  - **Bulk Operation Tests:** Ensures that bulk insert, update, and delete
    operations construct and execute the correct SQL statements.
  - **Isolation:** Since no real database operations are performed, tests remain
    fast and deterministic.

- **Extensibility:**
  - The mock can be enhanced to simulate more complex behaviors, such as
    handling different `rowCount` values, simulating errors, or maintaining an
    in-memory representation of tables and data for more realistic testing
    scenarios.

---

### 19. `README.md` (Updated)

**Description:** Updates the project README to include comprehensive information
about advanced features, their usage, and best practices. This ensures that
developers have clear guidance on leveraging the newly implemented
functionalities in **Rex-ORM**.

```markdown
# Rex-ORM - Sprint 11: Advanced Features - Transactions, Caching, and Optimization

## Overview

Sprint 11 enhances **Rex-ORM** with advanced features, including transaction
management, caching mechanisms, performance optimizations, and bulk operations.
These enhancements ensure data integrity, improve query performance, and enable
efficient handling of large datasets. Comprehensive documentation and unit tests
accompany these features to guide developers and ensure reliability.

## Directory Structure
```

rex-orm/ ├── src/ │ ├── adapters/ │ │ ├── PostgreSQLAdapter.ts │ │ ├──
SQLiteAdapter.ts │ │ └── CacheAdapter.ts │ ├── caching/ │ │ ├── InMemoryCache.ts
│ │ ├── RedisCache.ts │ │ └── CacheService.ts │ ├── transactions/ │ │ ├──
TransactionManager.ts │ │ └── types.ts │ ├── bulk/ │ │ ├── BulkOperations.ts │ │
└── types.ts │ ├── graphql/ │ │ ├── GraphQLSchema.ts │ │ ├── Resolvers.ts │ │
├── GraphQLServer.ts │ │ └── types.ts │ ├── models/ │ │ ├── ModelRegistry.ts │ │
├── BaseModel.ts │ │ ├── User.ts │ │ ├── Post.ts │ │ └── ... (additional models)
│ ├── realtime/ │ │ ├── EventEmitter.ts │ │ ├── WebSocketServer.ts │ │ └──
SubscriptionManager.ts │ ├── migration/ │ │ ├── MigrationRunner.ts │ │ ├──
MigrationTracker.ts │ │ └── MigrationManager.ts │ ├── migrations/ │ │ ├──
001_create_users_table.ts │ │ ├── 002_create_posts_table.ts │ │ ├──
003_create_profiles_table.ts │ │ ├── 004_create_post_tags_table.ts │ │ └── ...
(additional migration scripts) │ ├── query/ │ │ └── QueryBuilder.ts │ ├──
serverless/ │ │ ├── handler.ts │ │ ├── deploy.sh │ │ └── serverless.yml │ ├──
cli/ │ │ ├── commands/ │ │ │ ├── init.ts │ │ │ ├── generateModel.ts │ │ │ └──
... (additional CLI commands) │ │ └── cli.ts │ ├── factory/ │ │ └──
DatabaseFactory.ts │ ├── interfaces/ │ │ ├── DatabaseAdapter.ts │ │ └──
CacheAdapter.ts │ ├── decorators/ │ │ ├── Entity.ts │ │ ├── Column.ts │ │ ├──
PrimaryKey.ts │ │ ├── OneToMany.ts │ │ ├── ManyToOne.ts │ │ ├── OneToOne.ts │ │
├── ManyToMany.ts │ │ ├── Validate.ts │ │ └── ValidateMultiple.ts │ ├── tests/ │
│ └── unit/ │ │ ├── adapters/ │ │ │ ├── PostgreSQLAdapter.test.ts │ │ │ ├──
SQLiteAdapter.test.ts │ │ │ └── CacheAdapter.test.ts │ │ ├── caching/ │ │ │ ├──
InMemoryCache.test.ts │ │ │ ├── RedisCache.test.ts │ │ │ └──
CacheService.test.ts │ │ ├── transactions/ │ │ │ ├── TransactionManager.test.ts
│ │ │ └── types.test.ts │ │ ├── bulk/ │ │ │ ├── BulkOperations.test.ts │ │ │ └──
types.test.ts │ │ ├── graphql/ │ │ │ ├── GraphQLSchema.test.ts │ │ │ ├──
Resolvers.test.ts │ │ │ └── GraphQLServer.test.ts │ │ ├── realtime/ │ │ │ ├──
EventEmitter.test.ts │ │ │ ├── WebSocketServer.test.ts │ │ │ └──
SubscriptionManager.test.ts │ │ ├── migration/ │ │ │ ├── MigrationRunner.test.ts
│ │ │ ├── MigrationTracker.test.ts │ │ │ └── MigrationManager.test.ts │ │ ├──
modelLayer/ │ │ │ ├── Decorators.test.ts │ │ │ ├── ModelRegistry.test.ts │ │ │
├── RelationshipDecorators.test.ts │ │ │ └── ValidationDecorators.test.ts │ │
└── query/ │ │ └── QueryBuilder.test.ts │ ├── config/ │ │ └── config.ts │ └──
... (other directories) ├── import_map.json ├── deno.json ├── package.json └──
README.md

````
---

## Advanced Features

### Transactions Support

**Objective:** Implement transaction management to allow atomic operations across multiple database actions, ensuring data integrity and consistency.

#### Key Files:
- `src/transactions/types.ts`
- `src/transactions/TransactionManager.ts`
- `src/adapters/DatabaseAdapter.ts` (Updated)
- `src/adapters/PostgreSQLAdapter.ts` (Updated)
- `src/adapters/SQLiteAdapter.ts` (Updated)
- `src/transactions/TransactionManager.test.ts`

### Caching Mechanisms

**Objective:** Introduce caching strategies to enhance query performance and reduce database load. Supports both in-memory caching and Redis integration.

#### Key Files:
- `src/interfaces/CacheAdapter.ts`
- `src/caching/InMemoryCache.ts`
- `src/caching/RedisCache.ts`
- `src/caching/CacheService.ts`
- `src/caching/InMemoryCache.test.ts`
- `src/caching/RedisCache.test.ts`
- `src/caching/CacheService.test.ts`

### Bulk Operations

**Objective:** Support bulk insertions, updates, and deletions for handling large datasets efficiently, minimizing database round-trips, and optimizing performance.

#### Key Files:
- `src/bulk/types.ts`
- `src/bulk/BulkOperations.ts`
- `src/bulk/BulkOperations.test.ts`

### Integration with Models

**Objective:** Ensure that ORM models can leverage transaction management, caching, and bulk operations seamlessly, providing a robust and efficient interface for data manipulation.

#### Key Files:
- `src/models/BaseModel.ts`

---

## Best Practices

1. **Use Transactions for Atomic Operations:**
   - Wrap related database operations within transactions to ensure that either all operations succeed or none do, maintaining data integrity.
   - Example:
     ```typescript
     const transactionManager = new TransactionManager(adapter);
     await transactionManager.executeInTransaction(async (tx) => {
       await adapter.execute("INSERT INTO users (name) VALUES ($1);", ["Alice"]);
       await adapter.execute("INSERT INTO posts (title) VALUES ($1);", ["First Post"]);
     });
     ```

2. **Leverage Caching to Improve Performance:**
   - Enable caching for frequently executed queries to reduce latency and database load.
   - Choose the appropriate caching strategy based on your application's requirements (e.g., in-memory for simplicity, Redis for scalability).
   - Example:
     ```typescript
     const cacheService = CacheService.getInstance();
     cacheService.initializeCache("redis", { url: "redis://localhost:6379", ttl: 120 });
     const cacheAdapter = cacheService.getCacheAdapter();
     adapter.setCache(cacheAdapter);
     ```

3. **Utilize Bulk Operations for Large Datasets:**
   - When dealing with large volumes of data, use bulk operations to minimize the number of database interactions.
   - Example:
     ```typescript
     const bulkOps = new BulkOperations(adapter);
     const users = [/* array of User models */];
     const result = await bulkOps.bulkInsert(users, { ignoreDuplicates: true });
     console.log(`${result.inserted} users inserted.`);
     ```

4. **Ensure Proper Error Handling:**
   - Implement try-catch blocks around transactional operations to handle errors gracefully and perform necessary rollbacks.
   - Example:
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
   - Document advanced features, usage patterns, and best practices to guide developers in effectively utilizing the ORM's capabilities.
   - Ensure that code comments and README files are kept up-to-date with the latest features and changes.

6. **Write Comprehensive Unit Tests:**
   - Develop unit tests for all new features to ensure reliability and catch regressions early.
   - Use mock adapters to simulate database interactions, enabling isolated and fast-running tests.
   - Example:
     ```typescript
     Deno.test("BulkOperations handles bulkInsert correctly", async () => {
       // Test implementation
     });
     ```

7. **Optimize Query Execution:**
   - Analyze and optimize frequently used queries to reduce latency and improve throughput.
   - Consider indexing critical columns and avoiding unnecessary data retrieval.

8. **Monitor and Profile Performance:**
   - Implement monitoring tools to track the performance of database operations and caching.
   - Use profiling to identify and address bottlenecks in the ORM's operation.

---

## Getting Started with Advanced Features

### Setting Up Caching

1. **Initialize the Cache Service:**
   ```typescript
   import { CacheService } from "./caching/CacheService.ts";

   const cacheService = CacheService.getInstance();
   cacheService.initializeCache("redis", { url: "redis://localhost:6379", ttl: 120 });
   const cacheAdapter = cacheService.getCacheAdapter();
````

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
