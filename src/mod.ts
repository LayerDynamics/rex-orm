// Main module exports for rex-orm
// Export core components

// Models
export * from "./models/mod.ts";

// Decorators
export * from "./decorators/index.ts";

// Database adapters and interfaces
export * from "./adapters/mod.ts";
export * from "./interfaces/mod.ts";
export * from "./db/mod.ts";

// Query building
export * from "./query/mod.ts";

// Migrations
export * from "./migration/mod.ts";

// Factory utilities
export * from "./factory/mod.ts";

// Transactions
export * from "./transactions/mod.ts";

// Utilities
export * from "./utils/mod.ts";

// Serverless support
export * from "./serverless/mod.ts";

// GraphQL integration
export * from "./graphql/mod.ts";

// Vector capabilities
export * from "./vector/mod.ts";

// Caching
export * from "./caching/mod.ts";

// Bulk operations
export * from "./bulk/mod.ts";

// Service abstractions
export * from "./services/mod.ts";

// Version info
export { VERSION } from "./version.ts";
