/**
 * Configuration for embedding providers
 */
export interface EmbeddingProviderConfig {
  /**
   * Type of embedding provider
   */
  type: string;

  /**
   * API key for external embedding service
   */
  apiKey?: string;

  /**
   * Model name or ID to use with this provider
   */
  model?: string;

  /**
   * Number of dimensions for embeddings
   */
  dimensions?: number;

  /**
   * Custom endpoint URL
   */
  endpoint?: string;
}

/**
 * Configuration for vector database adapters
 */
export interface VectorAdapterConfig {
  /**
   * Type of vector database adapter
   */
  type: string;

  /**
   * Index type for vector search
   */
  indexType?: string;

  /**
   * HNSW index parameter for build-time accuracy/performance tradeoff
   */
  efConstruction?: number;

  /**
   * HNSW index parameter for number of connections per node
   */
  m?: number;

  /**
   * Custom options for the adapter
   */
  options?: Record<string, unknown>;
}

/**
 * Cache configuration for vector operations
 */
export interface VectorCacheConfig {
  /**
   * Whether caching is enabled
   */
  enabled: boolean;

  /**
   * Maximum number of items to cache
   */
  maxSize: number;

  /**
   * Time to live for cached items in seconds
   */
  ttl: number;
}

/**
 * Global configuration for vector features
 */
export interface VectorConfig {
  /**
   * Whether vector features are enabled
   */
  enabled: boolean;

  /**
   * Default embedding provider
   */
  defaultProvider: string;

  /**
   * Default number of dimensions for vectors
   */
  defaultDimensions: number;

  /**
   * Default distance metric
   */
  defaultMetric: string;

  /**
   * Configuration for embedding providers
   */
  embeddingProviders: Record<string, EmbeddingProviderConfig>;

  /**
   * Configuration for vector database adapters
   */
  adapters: Record<string, VectorAdapterConfig>;

  /**
   * Caching configuration
   */
  cache: VectorCacheConfig;
}
