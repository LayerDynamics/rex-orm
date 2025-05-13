/**
 * Main entry point for vector operations support in Rex ORM
 * Exports all public interfaces and implementations
 */

// Core interfaces
export { type VectorCapabilities } from "./interfaces/VectorCapabilities.ts";
export { type QueryModifier } from "./interfaces/QueryModifier.ts";

// Configuration
export { VectorConfigManager } from "./config/VectorConfigManager.ts";
export type {
  EmbeddingProviderConfig,
  VectorAdapterConfig,
  VectorCacheConfig,
  VectorConfig,
} from "./config/types.ts";

// Plugins
export { VectorPluginRegistry } from "./plugins/VectorPluginRegistry.ts";
export { type VectorPlugin } from "./plugins/VectorPlugin.ts";
export { type VectorOperationsProvider } from "./plugins/operations/VectorOperationsProvider.ts";

// Embedding
export { EmbeddingProviderRegistry } from "./embedding/EmbeddingProviderRegistry.ts";
export {
  type EmbeddingOptions,
  type EmbeddingProvider,
} from "./embedding/EmbeddingProvider.ts";
export { EmbeddingCache } from "./embedding/cache/EmbeddingCache.ts";

// Lazy Loading
export { VectorFeaturesLoader } from "./loaders/VectorFeaturesLoader.ts";

// Schema
export { VectorSchemaBuilder } from "./schema/VectorSchemaBuilder.ts";

// Decorators
export { Vector } from "./decorators/Vector.ts";
export { VectorSearchable } from "./decorators/VectorSearchable.ts";
export { AutoEmbed } from "./decorators/AutoEmbed.ts";

// Search
export { HybridSearchOptimizer } from "./search/HybridSearchOptimizer.ts";

// Utils
export { VectorUtils } from "./utils/VectorUtils.ts";

// Models
export { VectorModelRegistry } from "./models/VectorModelRegistry.ts";

// Initialize function for easier setup
export { initializeVectorSupport } from "./main.ts";
