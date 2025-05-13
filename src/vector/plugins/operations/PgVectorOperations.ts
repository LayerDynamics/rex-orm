import {
  VectorOperationsProvider,
  VectorSchemaOperations,
} from "./VectorOperationsProvider.ts";
import { QueryBuilder } from "../../../query/QueryBuilder.ts";
import { DatabaseAdapter } from "../../../interfaces/DatabaseAdapter.ts";

/**
 * Implementation of vector operations for PostgreSQL with pgvector
 */
export class PgVectorOperations implements VectorOperationsProvider {
  /**
   * Schema operations for PostgreSQL pgvector
   */
  readonly schemaOperations: VectorSchemaOperations = {
    /**
     * Generate SQL to create a vector column
     */
    createVectorColumnSql(
      tableName: string,
      columnName: string,
      dimensions: number,
      _options?: Record<string, unknown>,
    ): string {
      return `ALTER TABLE ${tableName} ADD COLUMN ${columnName} vector(${dimensions});`;
    },

    /**
     * Generate SQL to create a vector index
     */
    createVectorIndexSql(
      tableName: string,
      columnName: string,
      indexName: string,
      options?: Record<string, unknown>,
    ): string {
      // Default to ivfflat index if not specified
      const indexType = options?.indexType || "ivfflat";

      if (indexType === "hnsw") {
        return `CREATE INDEX ${indexName} ON ${tableName} USING hnsw (${columnName} vector_l2_ops);`;
      }

      // For ivfflat, allow customizing the number of lists
      const lists = options?.lists || 100;
      return `CREATE INDEX ${indexName} ON ${tableName} USING ivfflat (${columnName} vector_l2_ops) WITH (lists = ${lists});`;
    },

    /**
     * Generate SQL to enable vector extension
     */
    enableExtensionSql(): string {
      return "CREATE EXTENSION IF NOT EXISTS vector;";
    },

    /**
     * Generate SQL to create a similarity function
     */
    createSimilarityFunctionSql(
      functionName: string,
      metric: string,
    ): string {
      let distanceOp = "<->";

      // Choose operator based on metric
      if (metric === "cosine") {
        distanceOp = "<=>";
      } else if (metric === "inner_product") {
        distanceOp = "<#>";
      }

      return `
        CREATE OR REPLACE FUNCTION ${functionName}(vector1 vector, vector2 vector)
        RETURNS float8 AS $$
        BEGIN
          RETURN 1 - (vector1 ${distanceOp} vector2);
        END;
        $$ LANGUAGE plpgsql IMMUTABLE STRICT;
      `;
    },
  };

  /**
   * Format a vector for storage in the database
   * @param vector Vector to format
   * @returns Database-specific vector representation
   */
  formatVector(vector: number[] | string): string {
    if (typeof vector === "string") {
      return `'${vector}'::vector`;
    }
    return `'[${vector.join(",")}]'::vector`;
  }

  /**
   * Parse a vector from database format
   * @param dbVector Database-specific vector representation
   * @returns Vector as number array
   */
  parseVector(dbVector: unknown): number[] {
    if (typeof dbVector === "string") {
      // Format is typically '[0.1,0.2,0.3]' - parse it to array
      const content = dbVector.replace(/^\[|\]$/g, "");
      return content.split(",").map(Number);
    } else if (Array.isArray(dbVector)) {
      return dbVector.map(Number);
    }

    throw new Error(`Cannot parse vector from format: ${typeof dbVector}`);
  }

  /**
   * Check if vector extension is enabled
   */
  async isExtensionEnabled(adapter: DatabaseAdapter): Promise<boolean> {
    try {
      const result = await adapter.execute(
        "SELECT extname FROM pg_extension WHERE extname = 'vector'",
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error("Error checking if pgvector extension is enabled:", error);
      return false;
    }
  }

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
    k = 10,
    metric = "euclidean",
    _options?: Record<string, unknown>,
  ): (qb: QueryBuilder) => QueryBuilder {
    const formattedVector = this.formatVector(vector);

    return (qb: QueryBuilder): QueryBuilder => {
      // Choose operator based on metric
      let operator = "<->"; // Default euclidean
      if (metric === "cosine") {
        operator = "<=>";
      } else if (metric === "inner_product") {
        operator = "<#>";
      }

      // Add ORDER BY for KNN
      qb.orderBy(`${column} ${operator} ${formattedVector}`);

      // Add distance to SELECT
      qb.rawSql(`${column} ${operator} ${formattedVector} AS distance`);

      // Set limit if not already set
      if (!qb["queryParts"]?.limit) {
        qb.limit(k);
      }

      return qb;
    };
  }

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
    metric = "euclidean",
    _options?: Record<string, unknown>,
  ): (qb: QueryBuilder) => QueryBuilder {
    const formattedVector = this.formatVector(vector);

    return (qb: QueryBuilder): QueryBuilder => {
      // Choose operator based on metric
      let operator = "<->"; // Default euclidean
      if (metric === "cosine") {
        operator = "<=>";
      } else if (metric === "inner_product") {
        operator = "<#>";
      }

      // Add distance to SELECT
      qb.rawSql(`${column} ${operator} ${formattedVector} AS distance`);

      return qb;
    };
  }

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
    metric = "cosine",
    _options?: Record<string, unknown>,
  ): (qb: QueryBuilder) => QueryBuilder {
    const formattedVector = this.formatVector(vector);

    return (qb: QueryBuilder): QueryBuilder => {
      // Different calculations based on metric
      if (metric === "cosine") {
        // For cosine, similarity = 1 - distance
        qb.rawSql(`1 - (${column} <=> ${formattedVector}) AS similarity`);
      } else if (metric === "inner_product") {
        // For inner product, similarity is inner product
        qb.rawSql(`1 - (${column} <#> ${formattedVector}) AS similarity`);
      } else {
        // For euclidean, convert to similarity (higher is better)
        qb.rawSql(`1 / (1 + (${column} <-> ${formattedVector})) AS similarity`);
      }

      return qb;
    };
  }

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
    weights = { vector: 0.7, text: 0.3 },
    _options?: Record<string, unknown>,
  ): (qb: QueryBuilder) => QueryBuilder {
    const formattedVector = this.formatVector(vector);

    return (qb: QueryBuilder): QueryBuilder => {
      // Add text search condition
      const escapedText = text.replace(/'/g, "''");
      qb.where(
        `to_tsvector('english', ${textColumn}) @@ to_tsquery('english', '${
          escapedText.replace(/\s+/g, " & ")
        }')`,
        "=",
        true,
      );

      // Add vector similarity
      qb.rawSql(`1 - (${vectorColumn} <=> ${formattedVector}) AS vector_score`);

      // Add text search rank
      qb.rawSql(
        `ts_rank(to_tsvector('english', ${textColumn}), to_tsquery('english', '${
          escapedText.replace(/\s+/g, " & ")
        }')) AS text_score`,
      );

      // Combine scores with weights
      qb.rawSql(
        `(${weights.vector} * (1 - (${vectorColumn} <=> ${formattedVector}))) + (${weights.text} * ts_rank(to_tsvector('english', ${textColumn}), to_tsquery('english', '${
          escapedText.replace(/\s+/g, " & ")
        }'))) AS hybrid_score`,
      );

      // Order by combined score
      qb.orderBy("hybrid_score", "DESC");

      return qb;
    };
  }

  /**
   * Create a vector index for a table column
   * @param adapter Database adapter
   * @param table Table name
   * @param column Column name
   * @param indexType Index type
   * @param options Index options
   * @returns Promise resolving when index is created
   */
  async createVectorIndex(
    adapter: DatabaseAdapter,
    table: string,
    column: string,
    indexType = "ivfflat",
    options?: Record<string, unknown>,
  ): Promise<void> {
    const indexName = `idx_vector_${table}_${column}`;

    // Generate index SQL
    let indexSql = "";
    if (indexType === "hnsw") {
      indexSql =
        `CREATE INDEX ${indexName} ON ${table} USING hnsw (${column} vector_l2_ops)`;
    } else {
      // Default to ivfflat
      const lists = options?.lists || 100;
      indexSql =
        `CREATE INDEX ${indexName} ON ${table} USING ivfflat (${column} vector_l2_ops) WITH (lists = ${lists})`;
    }

    // Execute the SQL
    await adapter.execute(indexSql);
  }

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
    threshold = 0.8,
    metric = "cosine",
    _options?: Record<string, unknown>,
  ): (qb: QueryBuilder) => QueryBuilder {
    const formattedVector = this.formatVector(vector);

    return (qb: QueryBuilder): QueryBuilder => {
      if (metric === "cosine") {
        // For cosine, convert similarity threshold to distance threshold
        const distanceThreshold = 1 - threshold;
        qb.where(
          `${column} <=> ${formattedVector}`,
          "<",
          distanceThreshold.toString(),
        );
        qb.rawSql(`1 - (${column} <=> ${formattedVector}) AS similarity`);
      } else if (metric === "inner_product") {
        // For inner product
        qb.where(
          `1 - (${column} <#> ${formattedVector})`,
          ">",
          threshold.toString(),
        );
        qb.rawSql(`1 - (${column} <#> ${formattedVector}) AS similarity`);
      } else {
        // For euclidean, convert to distance threshold
        // This is approximate since there's no direct mapping from similarity to euclidean distance
        const distanceThreshold = (1 / threshold) - 1;
        qb.where(
          `${column} <-> ${formattedVector}`,
          "<",
          distanceThreshold.toString(),
        );
        qb.rawSql(`1 / (1 + (${column} <-> ${formattedVector})) AS similarity`);
      }

      return qb;
    };
  }
}
