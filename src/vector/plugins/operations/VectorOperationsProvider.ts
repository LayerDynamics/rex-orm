import { QueryBuilder } from "../../../query/QueryBuilder.ts";
import { DatabaseAdapter } from "../../../interfaces/DatabaseAdapter.ts";

/**
 * Interface for schema operations used by vector plugins
 */
export interface VectorSchemaOperations {
  /**
   * Generate SQL to create a vector column
   */
  createVectorColumnSql(
    tableName: string,
    columnName: string,
    dimensions: number,
    options?: Record<string, unknown>,
  ): string;

  /**
   * Generate SQL to create a vector index
   */
  createVectorIndexSql(
    tableName: string,
    columnName: string,
    indexName: string,
    options?: Record<string, unknown>,
  ): string;

  /**
   * Generate SQL to enable vector extension
   */
  enableExtensionSql(): string;

  /**
   * Generate SQL to create a similarity function
   */
  createSimilarityFunctionSql(
    functionName: string,
    metric: string,
  ): string;
}

/**
 * Interface for vector operations provider
 * Provides vector-specific SQL operations for a database
 */
export interface VectorOperationsProvider {
  /**
   * Schema operations for vector database
   */
  schemaOperations: VectorSchemaOperations;

  /**
   * Check if vector extension is enabled
   */
  isExtensionEnabled(adapter: DatabaseAdapter): Promise<boolean>;

  /**
   * Generate SQL for KNN search
   * @param column Vector column name
   * @param vector Query vector
   * @param k Number of nearest neighbors
   * @param metric Distance metric to use
   * @param options Additional options
   * @returns Query builder modifier
   */
  knnSearch(
    column: string,
    vector: number[] | string,
    k?: number,
    metric?: string,
    options?: Record<string, unknown>,
  ): (qb: QueryBuilder) => QueryBuilder;

  /**
   * Generate SQL for vector distance calculation
   * @param column Vector column name
   * @param vector Query vector
   * @param metric Distance metric to use
   * @param options Additional options
   * @returns Query builder modifier
   */
  distance(
    column: string,
    vector: number[] | string,
    metric?: string,
    options?: Record<string, unknown>,
  ): (qb: QueryBuilder) => QueryBuilder;

  /**
   * Generate SQL for vector similarity calculation
   * @param column Vector column name
   * @param vector Query vector
   * @param metric Distance metric to use
   * @param options Additional options
   * @returns Query builder modifier
   */
  similarity(
    column: string,
    vector: number[] | string,
    metric?: string,
    options?: Record<string, unknown>,
  ): (qb: QueryBuilder) => QueryBuilder;

  /**
   * Generate SQL for hybrid search (combining vector and text search)
   * @param vectorColumn Vector column name
   * @param textColumn Text column name
   * @param vector Query vector
   * @param text Query text
   * @param weights Weights for vector and text scores
   * @param options Additional options
   * @returns Query builder modifier
   */
  hybridSearch(
    vectorColumn: string,
    textColumn: string,
    vector: number[] | string,
    text: string,
    weights?: { vector: number; text: number },
    options?: Record<string, unknown>,
  ): (qb: QueryBuilder) => QueryBuilder;

  /**
   * Create a vector index for a table column
   * @param adapter Database adapter
   * @param table Table name
   * @param column Column name
   * @param indexType Index type
   * @param options Index options
   * @returns Promise resolving when index is created
   */
  createVectorIndex(
    adapter: DatabaseAdapter,
    table: string,
    column: string,
    indexType?: string,
    options?: Record<string, unknown>,
  ): Promise<void>;

  /**
   * Format a vector for storage in the database
   * @param vector Vector to format
   * @returns Database-specific vector representation
   */
  formatVector(vector: number[] | string): string;

  /**
   * Parse a vector from database format
   * @param dbVector Database-specific vector representation
   * @returns Vector as number array
   */
  parseVector(dbVector: unknown): number[];

  /**
   * Generate SQL for vector match (filtering by similarity threshold)
   * @param column Vector column name
   * @param vector Query vector
   * @param threshold Similarity threshold
   * @param metric Distance metric to use
   * @param options Additional options
   * @returns Query builder modifier
   */
  vectorMatch(
    column: string,
    vector: number[] | string,
    threshold?: number,
    metric?: string,
    options?: Record<string, unknown>,
  ): (qb: QueryBuilder) => QueryBuilder;
}
