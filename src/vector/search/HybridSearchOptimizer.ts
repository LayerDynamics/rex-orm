// Hybrid search optimization for vector and text searches
// This file provides optimizers for combining vector and text search results

import { VectorFeaturesLoader } from "../loaders/VectorFeaturesLoader.ts";
import { VectorConfigManager } from "../config/VectorConfigManager.ts";
import type { QueryBuilder } from "../../query/QueryBuilder.ts";

/**
 * Options for hybrid vector and text search
 */
export interface HybridSearchOptions {
  /** Field containing the vector data */
  vectorField: string;
  /** The vector to search with (either as array or from text) */
  vector: number[] | string;
  /** Fields to search with text */
  textFields: string[];
  /** Text query to search for */
  textQuery: string;
  /** Strategy for hybrid search */
  strategy?: "vector-first" | "text-first" | "parallel";
  /** Maximum number of results to return */
  limit?: number;
  /** Number of candidates to consider in the first phase */
  candidateLimit?: number;
  /** Weight for vector scores (0-1) */
  vectorWeight?: number;
  /** Weight for text scores (0-1) */
  textWeight?: number;
  /** Minimum similarity threshold */
  threshold?: number;
}

/**
 * Class that optimizes hybrid search queries combining vector and text search
 */
export class HybridSearchOptimizer {
  /**
   * Optimize a query for hybrid vector and text search
   *
   * @param queryBuilder The query builder to optimize
   * @param options Hybrid search options
   * @returns Optimized query builder
   */
  public static async optimizeQuery(
    queryBuilder: QueryBuilder,
    options: HybridSearchOptions,
  ): Promise<QueryBuilder> {
    // Ensure vector features are loaded
    await VectorFeaturesLoader.loadVectorFeatures();

    // Ensure vector features are enabled
    if (!VectorConfigManager.isEnabled()) {
      VectorConfigManager.enable();
    }

    // Set default values
    const strategy = options.strategy || "vector-first";
    const limit = options.limit || 10;
    const candidateLimit = options.candidateLimit || Math.min(100, limit * 10);
    const vectorWeight = options.vectorWeight ?? 0.7;
    const textWeight = options.textWeight ?? 0.3;

    // Validate weights
    if (vectorWeight + textWeight !== 1) {
      throw new Error(
        `Vector weight (${vectorWeight}) + text weight (${textWeight}) must equal 1`,
      );
    }

    // Apply the default distance metric from the config
    const distanceMetrics = VectorConfigManager.getAllDistanceMetrics();
    const metric = Object.keys(distanceMetrics).includes("cosine")
      ? "cosine"
      : Object.keys(distanceMetrics)[0];

    // Apply metric to query builder if needed
    if (metric) {
      queryBuilder.useVectorDB(
        VectorConfigManager.isEnabled()
          ? (VectorConfigManager.getDefaultVectorPlugin() || "default")
          : "default",
      );
    }

    // Choose strategy based on provided options
    switch (strategy) {
      case "vector-first":
        return this.vectorFirstStrategy(queryBuilder, {
          ...options,
          limit,
          candidateLimit,
          vectorWeight,
          textWeight,
          threshold: options.threshold,
          metric, // Pass the metric to the strategy
        });

      case "text-first":
        return this.textFirstStrategy(queryBuilder, {
          ...options,
          limit,
          candidateLimit,
          vectorWeight,
          textWeight,
          metric, // Pass the metric to the strategy
        });

      case "parallel":
        return this.parallelStrategy(queryBuilder, {
          ...options,
          limit,
          candidateLimit,
          vectorWeight,
          textWeight,
          metric, // Pass the metric to the strategy
        });

      default:
        throw new Error(`Unknown hybrid search strategy: ${strategy}`);
    }
  }

  /**
   * Implementation of the vector-first search strategy
   * First searches by vector similarity, then refines with text search
   *
   * @param queryBuilder The query builder to optimize
   * @param options Hybrid search options
   * @returns Optimized query builder
   */
  private static vectorFirstStrategy(
    queryBuilder: QueryBuilder,
    options: HybridSearchOptions & {
      candidateLimit: number;
      vectorWeight: number;
      textWeight: number;
      metric: string;
    },
  ): QueryBuilder {
    const {
      vectorField,
      vector,
      textFields,
      textQuery,
      candidateLimit,
      limit,
      vectorWeight,
      textWeight,
      threshold,
      metric,
    } = options;

    // First find candidates by vector similarity
    let query = queryBuilder
      .select(["*"])
      .similaritySearch(vectorField, vector, metric) // Use the metric parameter
      .limit(candidateLimit);

    // Apply threshold if specified
    if (threshold !== undefined) {
      query = query.where(
        "similarity(" + vectorField + ", :vector) >= :threshold",
        "=",
        true,
      );
    }

    // Then filter and rank by text relevance
    if (textQuery && textQuery.trim() !== "") {
      // Create a text search condition
      const textConditions = textFields.map((field) =>
        `${field} LIKE :textQuery`
      ).join(" OR ");

      // Add text search to query
      query = query.where(textConditions, "=", `%${textQuery}%`);

      // Add a hybrid score using both vector similarity and text match
      query = query.select([
        `(similarity * ${vectorWeight} + 
          (CASE WHEN (${textConditions}) THEN ${textWeight} ELSE 0 END)) 
          AS hybrid_score`,
      ]);

      // Order by combined score
      query = query.orderBy("hybrid_score", "DESC");
    }

    // Limit to the requested number of results
    return query.limit(limit || 10);
  }

  /**
   * Implementation of the text-first search strategy
   * First searches by text, then refines with vector similarity
   *
   * @param queryBuilder The query builder to optimize
   * @param options Hybrid search options
   * @returns Optimized query builder
   */
  private static textFirstStrategy(
    queryBuilder: QueryBuilder,
    options: HybridSearchOptions & {
      candidateLimit: number;
      vectorWeight: number;
      textWeight: number;
      metric: string;
    },
  ): QueryBuilder {
    const {
      vectorField,
      vector,
      textFields,
      textQuery,
      candidateLimit,
      limit,
      vectorWeight,
      textWeight,
      metric,
    } = options;

    // Build text search condition
    const textConditions = textFields.map((field) => `${field} LIKE :textQuery`)
      .join(" OR ");

    // First find candidates by text match
    let query = queryBuilder.select(["*"]);

    // If we have a text query, filter by it
    if (textQuery && textQuery.trim() !== "") {
      query = query.where(textConditions, "=", `%${textQuery}%`);
    }

    // Limit candidate set
    query = query.limit(candidateLimit);

    // Then rerank by vector similarity
    query = query.similaritySearch(vectorField, vector, metric); // Use the metric parameter

    // Add hybrid score
    if (textQuery && textQuery.trim() !== "") {
      // Create a text search condition
      const textConditions = textFields.map((field) =>
        `${field} LIKE :textQuery`
      ).join(" OR ");

      // Add text search to query
      query = query.where(textConditions, "=", `%${textQuery}%`);

      // Add a hybrid score using both vector similarity and text match
      query = query.select([
        `(similarity * ${vectorWeight} + 
          (CASE WHEN (${textConditions}) THEN ${textWeight} ELSE 0 END)) 
          AS hybrid_score`,
      ]);

      // Order by combined score
      query = query.orderBy("hybrid_score", "DESC");
    }

    // Limit to the requested number of results
    return query.limit(limit || 10);
  }

  /**
   * Implementation of the parallel search strategy
   * Searches by both vector and text in parallel, then combines results
   * This is generally more expensive but can provide better results
   *
   * @param queryBuilder The query builder to optimize
   * @param options Hybrid search options
   * @returns Optimized query builder
   */
  private static parallelStrategy(
    queryBuilder: QueryBuilder,
    options: HybridSearchOptions & {
      candidateLimit: number;
      vectorWeight: number;
      textWeight: number;
      metric: string;
    },
  ): QueryBuilder {
    const {
      vectorField,
      vector,
      textFields,
      textQuery,
      candidateLimit,
      limit,
      vectorWeight,
      textWeight,
      metric,
    } = options;

    // For parallel strategy, we need a more complex query with CTEs or subqueries
    // This implementation may vary based on the database adapter

    // Create a clone of the query builder to work with
    const baseQuery = queryBuilder.clone();

    // Build the text search condition
    const textConditions = textFields.map((field) => `${field} LIKE :textQuery`)
      .join(" OR ");

    // Get the SQL and extract the table name from it
    const { query } = baseQuery.toSQL();

    // Extract table name using regex (simplified approach)
    const tableMatch = query.match(/FROM\s+([^\s]+)/i);
    const tableName = tableMatch ? tableMatch[1] : "unknown_table";

    // Create a WITH clause for the vector search results
    const vectorCTE = `vector_results AS (
      SELECT *, similarity(${vectorField}, :vector, '${metric}') AS vector_score
      FROM ${tableName}
      ORDER BY similarity(${vectorField}, :vector, '${metric}') DESC
      LIMIT ${candidateLimit}
    )`;

    // Create a WITH clause for the text search results
    const textCTE = `text_results AS (
      SELECT *, 
        CASE WHEN (${textConditions}) THEN 1.0 ELSE 0.0 END AS text_score
      FROM ${tableName}
      ${textQuery ? `WHERE (${textConditions})` : ""}
      LIMIT ${candidateLimit}
    )`;

    // Create the main query that combines both results
    const mainQuery = `
      WITH ${vectorCTE}, ${textCTE}
      SELECT v.*, 
        (v.vector_score * ${vectorWeight} + COALESCE(t.text_score, 0) * ${textWeight}) AS hybrid_score
      FROM vector_results v
      LEFT JOIN text_results t ON v.id = t.id
      
      UNION ALL
      
      SELECT t.*, 
        (COALESCE(v.vector_score, 0) * ${vectorWeight} + t.text_score * ${textWeight}) AS hybrid_score
      FROM text_results t
      LEFT JOIN vector_results v ON t.id = v.id
      WHERE v.id IS NULL
      
      ORDER BY hybrid_score DESC
      LIMIT ${limit || 10}
    `;

    // Use raw SQL for this complex query
    // Convert the vector to a string to ensure it's compatible with QueryParam
    const params: (string | number | boolean | null)[] = [];

    // Add vector parameter in the format expected by the database
    if (typeof vector === "string") {
      params.push(vector);
    } else {
      // Convert number array to JSON string
      params.push(JSON.stringify(vector));
    }

    // Add text search parameter
    params.push(textQuery ? `%${textQuery}%` : "%");

    // Note: This is a simplified example and might need adjustment for specific databases
    return baseQuery.rawSql(mainQuery);
  }

  /**
   * Rerank results using a linear combination of vector and text scores
   *
   * @param vectorResults Results from vector search with scores
   * @param textResults Results from text search with scores
   * @param options Ranking options
   * @returns Combined and reranked results
   */
  public static rerank<T extends { id: string | number }>(
    vectorResults: Array<T & { similarity?: number }>,
    textResults: Array<T & { textRelevance?: number }>,
    options: {
      vectorWeight?: number;
      textWeight?: number;
      limit?: number;
    } = {},
  ): Array<T & { hybridScore: number }> {
    // Use vector configuration manager to get default settings if needed
    const configDefaults = VectorConfigManager.getConfiguration();

    // Use either provided weights or defaults from config
    const vectorWeight = options.vectorWeight ??
      (configDefaults.defaultVectorWeight
        ? parseFloat(configDefaults.defaultVectorWeight as string)
        : 0.7);

    const textWeight = options.textWeight ??
      (configDefaults.defaultTextWeight
        ? parseFloat(configDefaults.defaultTextWeight as string)
        : 0.3);

    // Use either provided limit or default from config or fall back to max
    const limit = options.limit ??
      (configDefaults.defaultResultLimit
        ? parseInt(configDefaults.defaultResultLimit as string, 10)
        : Math.max(vectorResults.length, textResults.length));

    // Create maps for quick lookup
    const vectorScores = new Map<string | number, number>();
    const textScores = new Map<string | number, number>();
    const allItems = new Map<string | number, T>();

    // Process vector results
    for (const item of vectorResults) {
      const similarity = item.similarity ?? 0;
      vectorScores.set(item.id, similarity);
      allItems.set(item.id, item);
    }

    // Process text results
    for (const item of textResults) {
      const textRelevance = item.textRelevance ?? 0;
      textScores.set(item.id, textRelevance);

      if (!allItems.has(item.id)) {
        allItems.set(item.id, item);
      }
    }

    // Calculate hybrid scores
    const hybridResults = Array.from(allItems.entries()).map(([id, item]) => {
      const vectorScore = vectorScores.get(id) ?? 0;
      const textScore = textScores.get(id) ?? 0;
      const hybridScore = (vectorScore * vectorWeight) +
        (textScore * textWeight);

      return {
        ...item,
        hybridScore,
      };
    });

    // Sort by hybrid score and limit
    return hybridResults
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, limit);
  }
}

/**
 * Default export
 */
export default HybridSearchOptimizer;
