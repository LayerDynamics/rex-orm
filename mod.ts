// Rex-ORM: A flexible ORM for Deno
// Main module entry point

// Re-export core components from src
export * from "./src/models/BaseModel.ts";
export * from "./src/models/ModelRegistry.ts";
export * from "./src/models/types.ts";

// Export decorators
export * from "./src/decorators/index.ts";

// Export database adapters
export * from "./src/adapters/PostgreSQLAdapter.ts";
export * from "./src/adapters/SQLiteAdapter.ts";
export * from "./src/factory/DatabaseFactory.ts";

// Export query builder
export * from "./src/query/QueryBuilder.ts";

// Export transaction support
export * from "./src/transactions/TransactionManager.ts";
export * from "./src/transactions/types.ts";

// Export realtime features
export * from "./src/realtime/index.ts";

// Export interfaces
export * from "./src/interfaces/DatabaseAdapter.ts";
export * from "./src/interfaces/Config.ts";
// Selectively re-export from ModelMetadata.ts to avoid name conflicts
export type {
  ModelMetadata,
  RelationMetadata,
} from "./src/interfaces/ModelMetadata.ts";
export * from "./src/interfaces/CacheAdapter.ts";

// Export bulk operations
export * from "./src/bulk/BulkOperations.ts";
export * from "./src/bulk/types.ts";

// Re-export benchmarks to make them discoverable
// This helps deno bench find and run them
export * from "./bench/adapters/adapters_comparison.ts";
export * from "./bench/bulk/bulk_operations.ts";
export * from "./bench/crud/basic_operations.ts";
export * from "./bench/query/complex_queries.ts";
export * from "./bench/realtime/sync_performance.ts";

// Export version information
export * from "./src/version.ts";
