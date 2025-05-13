/**
 * Interface defining vector capabilities for a database adapter
 * This defines what vector operations are supported by a specific database
 */
export interface VectorCapabilities {
  /**
   * Whether the database supports vector operations
   */
  hasVectorSupport: boolean;

  /**
   * Whether the database supports approximate nearest neighbor search (ANN)
   */
  supportsANN: boolean;

  /**
   * Whether the database supports exact nearest neighbor search
   */
  supportsExactNN: boolean;

  /**
   * Maximum vector dimensions supported
   */
  maxDimensions: number;

  /**
   * Supported distance/similarity metrics
   */
  supportedMetrics: string[];

  /**
   * Supported vector index types
   */
  supportedIndexTypes: string[];

  /**
   * Whether the database supports vector filtering with additional WHERE clauses
   */
  supportsFiltering: boolean;

  /**
   * Whether the database supports hybrid search (combining vector and keyword search)
   */
  supportsHybridSearch: boolean;

  /**
   * Specific features of the vector implementation
   */
  features: {
    /**
     * Whether HNSW index is supported
     */
    hnsw?: boolean;

    /**
     * Whether IVF index is supported
     */
    ivf?: boolean;

    /**
     * Whether index supports batch search
     */
    batchSearch?: boolean;

    /**
     * Whether the database supports user-defined functions for vector operations
     */
    udf?: boolean;

    /**
     * Whether the database supports vector normalization
     */
    normalization?: boolean;

    /**
     * Maximum vector batch size for operations
     */
    maxBatchSize?: number;
  };

  /**
   * Version of the vector extension/implementation
   */
  version: string;

  /**
   * Type of vector extension/implementation
   * For example: "pgvector", "sqlite-vss", etc.
   */
  type: string;
}
