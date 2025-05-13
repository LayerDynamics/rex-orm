import {
  VectorOperationsProvider,
  VectorSchemaOperations,
} from "./VectorOperationsProvider.ts";
import { QueryBuilder } from "../../../query/QueryBuilder.ts";
import { DatabaseAdapter } from "../../../interfaces/DatabaseAdapter.ts";

/**
 * Implementation of vector operations for SQLite with sqlite-vss extension
 */
export class SQLiteVSSOperations implements VectorOperationsProvider {
  /**
   * Schema operations for SQLite VSS
   */
  readonly schemaOperations: VectorSchemaOperations = {
    /**
     * Generate SQL to create a vector column
     */
    createVectorColumnSql(
      tableName: string,
      columnName: string,
      _dimensions: number,
      _options?: Record<string, unknown>,
    ): string {
      return `ALTER TABLE ${tableName} ADD COLUMN ${columnName} BLOB;`;
    },

    /**
     * Generate SQL to create a vector index
     */
    createVectorIndexSql(
      _tableName: string,
      _columnName: string,
      indexName: string,
      options?: Record<string, unknown>,
    ): string {
      const dimensions = options?.dimensions || 1536;
      return `CREATE VIRTUAL TABLE ${indexName} USING vss0(
        vector(${dimensions}), 
        id INTEGER PRIMARY KEY AUTOINCREMENT
      );`;
    },

    /**
     * Generate SQL to enable vector extension
     */
    enableExtensionSql(): string {
      // SQLite loads extensions dynamically at runtime
      return "SELECT load_extension('sqlite-vss');";
    },

    /**
     * Generate SQL to create a similarity function
     */
    createSimilarityFunctionSql(
      _functionName: string,
      metric: string,
    ): string {
      // SQLite-VSS already provides similarity functions
      return `-- SQLite-VSS already provides vss_similarity function with '${metric}' metric`;
    },
  };

  /**
   * Format a vector for storage in the database
   * @param vector Vector to format
   * @returns Database-specific vector representation
   */
  formatVector(vector: number[] | string): string {
    if (typeof vector === "string") {
      return `'${vector}'`;
    }
    return `'${JSON.stringify(vector)}'`;
  }

  /**
   * Parse a vector from database format
   * @param dbVector Database-specific vector representation
   * @returns Vector as number array
   */
  parseVector(dbVector: unknown): number[] {
    if (typeof dbVector === "string") {
      // Try to parse as JSON
      try {
        return JSON.parse(dbVector);
      } catch (_e) {
        // If it's not valid JSON, split by commas
        return dbVector.split(",").map(Number);
      }
    } else if (
      dbVector instanceof Uint8Array || dbVector instanceof ArrayBuffer
    ) {
      // Convert blob to array
      const view = new Float32Array(
        dbVector instanceof Uint8Array ? dbVector.buffer : dbVector,
      );
      return Array.from(view);
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
      // Try to call a VSS function to check if the extension is loaded
      const result = await adapter.execute("SELECT vss_version() AS version");
      return result.rows.length > 0 && !!result.rows[0].version;
    } catch (error) {
      console.error(
        "Error checking if sqlite-vss extension is enabled:",
        error,
      );
      return false;
    }
  }

  /**
   * Generate SQL for KNN search
   * @param column Vector column name
   * @param vector Query vector
   * @param k Number of nearest neighbors
   * @param metric Distance metric to use
   * @param _options Additional options
   * @returns Query builder modifier
   */
  knnSearch(
    column: string,
    vector: number[] | string,
    k = 10,
    metric = "cosine",
    _options?: Record<string, unknown>,
  ): (qb: QueryBuilder) => QueryBuilder {
    const formattedVector = this.formatVector(vector);

    return (qb: QueryBuilder): QueryBuilder => {
      // Add the VSS search function
      qb.rawSql(
        `vss_search(${column}, ${formattedVector}, ${k}, '${metric}') AS distance`,
      );

      // Add ORDER BY clause
      qb.orderBy("distance", "ASC");

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
   * @param _options Additional options
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
      // Add distance calculation to SELECT
      qb.rawSql(
        `vss_distance(${column}, ${formattedVector}, '${metric}') AS distance`,
      );

      return qb;
    };
  }

  /**
   * Generate SQL for vector similarity calculation
   * @param column Vector column name
   * @param vector Query vector
   * @param metric Distance metric to use
   * @param _options Additional options
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
      // Add similarity calculation to SELECT
      qb.rawSql(
        `vss_similarity(${column}, ${formattedVector}, '${metric}') AS similarity`,
      );

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
    options?: Record<string, unknown>,
  ): (qb: QueryBuilder) => QueryBuilder {
    const formattedVector = this.formatVector(vector);

    return (qb: QueryBuilder): QueryBuilder => {
      // Escape the text for FTS
      const escapedText = text.replace(/'/g, "''");

      // Add text search condition - using FTS if available
      const ftsTable = options?.ftsTable as string;
      if (ftsTable) {
        // Use FTS table if provided
        qb.where(`${ftsTable} MATCH '${escapedText}'`, "=", 1);
        qb.rawSql(`rank(matchinfo(${ftsTable}, 'pcx')) AS text_score`);
      } else {
        // Basic text search using LIKE
        qb.where(`${textColumn} LIKE '%${escapedText}%'`, "=", 1);
        qb.rawSql(
          `CASE WHEN ${textColumn} LIKE '%${escapedText}%' THEN 1.0 ELSE 0.0 END AS text_score`,
        );
      }

      // Add vector similarity
      qb.rawSql(
        `vss_similarity(${vectorColumn}, ${formattedVector}, 'cosine') AS vector_score`,
      );

      // Combine scores with weights
      qb.rawSql(
        `(${weights.vector} * vss_similarity(${vectorColumn}, ${formattedVector}, 'cosine')) + 
                (${weights.text} * text_score) AS hybrid_score`,
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
   * @param _indexType Index type
   * @param options Index options
   * @returns Promise resolving when index is created
   */
  async createVectorIndex(
    adapter: DatabaseAdapter,
    table: string,
    column: string,
    _indexType = "vss",
    options?: Record<string, unknown>,
  ): Promise<void> {
    const indexName = `vss_idx_${table}_${column}`;
    const dimensions = options?.dimensions || 1536;

    // Create virtual table for vector index
    await adapter.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS ${indexName} USING vss0(
        vector(${dimensions}), 
        rowid INTEGER
      );
    `);

    // Check if we need to populate the index
    const count = await adapter.execute(
      `SELECT COUNT(*) as count FROM ${indexName}`,
    );
    if (count.rows[0].count === 0) {
      // Populate index with existing data
      await adapter.execute(`
        INSERT INTO ${indexName} (rowid, vector)
        SELECT rowid, ${column} FROM ${table} WHERE ${column} IS NOT NULL;
      `);
    }

    // Create trigger to keep index updated
    await adapter.execute(`
      CREATE TRIGGER IF NOT EXISTS ${indexName}_insert_trigger
      AFTER INSERT ON ${table}
      WHEN NEW.${column} IS NOT NULL
      BEGIN
        INSERT INTO ${indexName} (rowid, vector) VALUES (NEW.rowid, NEW.${column});
      END;
    `);

    await adapter.execute(`
      CREATE TRIGGER IF NOT EXISTS ${indexName}_update_trigger
      AFTER UPDATE ON ${table}
      WHEN NEW.${column} IS NOT NULL
      BEGIN
        DELETE FROM ${indexName} WHERE rowid = OLD.rowid;
        INSERT INTO ${indexName} (rowid, vector) VALUES (NEW.rowid, NEW.${column});
      END;
    `);

    await adapter.execute(`
      CREATE TRIGGER IF NOT EXISTS ${indexName}_delete_trigger
      AFTER DELETE ON ${table}
      BEGIN
        DELETE FROM ${indexName} WHERE rowid = OLD.rowid;
      END;
    `);
  }

  /**
   * Generate SQL for vector match (filtering by similarity threshold)
   * @param column Vector column name
   * @param vector Query vector
   * @param threshold Similarity threshold
   * @param metric Distance metric to use
   * @param _options Additional options
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
      // Add similarity calculation and filter
      qb.rawSql(
        `vss_similarity(${column}, ${formattedVector}, '${metric}') AS similarity`,
      );
      qb.where("similarity", ">=", threshold);

      return qb;
    };
  }
}
