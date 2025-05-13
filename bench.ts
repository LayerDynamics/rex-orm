// Rex-ORM Benchmarks
// This file helps Deno discover and run benchmarks with the `deno bench` command

// Export all benchmarks
export * from "./bench/adapters/adapters_comparison.ts";
export * from "./bench/bulk/bulk_operations.ts";
export * from "./bench/crud/basic_operations.ts";
export * from "./bench/query/complex_queries.ts";
export * from "./bench/realtime/sync_performance.ts";
