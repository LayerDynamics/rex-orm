/**
 * Defines the vector capabilities of a database
 * Used to determine which vector operations are supported
 */
export interface VectorCapabilities {
  /**
   * Supported distance metrics
   */
  supportedMetrics: string[];

  /**
   * Whether the database supports exact KNN search
   */
  supportsExactKnn: boolean;

  /**
   * Whether the database supports approximate KNN search
   */
  supportsApproximateKnn: boolean;

  /**
   * Whether the database supports filtering during KNN search
   */
  supportsFilteredKnn: boolean;

  /**
   * Whether the database supports hybrid search (combining vector and text search)
   */
  supportsHybridSearch: boolean;

  /**
   * Maximum vector dimensions supported
   */
  maxDimensions: number;

  /**
   * Default vector dimensions when not specified
   */
  defaultDimensions: number;

  /**
   * Whether the database has native vector type (vs. stored as JSON/array/string)
   */
  hasNativeVectorType: boolean;

  /**
   * Whether the database supports vector indexing
   */
  supportsVectorIndexing: boolean;

  /**
   * Vector index types supported by the database
   */
  supportedIndexTypes: string[];

  /**
   * Whether the database supports distance calculation in SQL
   */
  supportsDistanceInSql: boolean;

  /**
   * Whether the database supports batch vector operations
   */
  supportsBatchOperations: boolean;

  /**
   * Maximum batch size for vector operations
   */
  maxBatchSize: number;

  /**
   * Whether the database supports automatic creation of vector columns
   */
  supportsAutoSchemaCreation: boolean;

  /**
   * Whether the database supports returning similarity scores in results
   */
  supportsSimilarityScore: boolean;

  /**
   * Type used for similarity score results
   */
  similarityScoreType: "float" | "double" | "numeric" | "real";

  /**
   * Whether the database supports general similarity search operations
   */
  supportsSimilaritySearch: boolean;

  /**
   * Whether the database supports K-nearest neighbor search
   */
  supportsKnnSearch: boolean;

  /**
   * Whether the database supports custom distance metrics
   */
  supportsCustomMetrics: boolean;

  /**
   * Whether the database supports indexing vector data
   */
  supportsIndexing: boolean;

  /**
   * Check if a specific distance metric is supported
   * @param metric Metric name to check
   * @returns true if metric is supported
   */
  supportsMetric(metric: string): boolean;

  /**
   * Get available index options for a specific index type
   * @param indexType Index type
   * @returns Index options
   */
  getIndexOptions(indexType: string): Record<string, unknown>;

  /**
   * Get the best index type for a specific use case
   * @param metric Distance metric to use
   * @param approximate Whether to use approximate search
   * @param dimensions Vector dimensions
   * @returns Recommended index type
   */
  getBestIndexType(
    metric: string,
    approximate: boolean,
    dimensions: number,
  ): string;
}
