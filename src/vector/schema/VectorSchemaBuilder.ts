// Vector database schema building capabilities
// This file provides schema building extensions for vector operations

import { VectorPluginRegistry } from "../plugins/VectorPluginRegistry.ts";
import { VectorFeaturesLoader } from "../loaders/VectorFeaturesLoader.ts";
import { VectorConfigManager } from "../config/VectorConfigManager.ts";
import type { DatabaseAdapter } from "../../interfaces/DatabaseAdapter.ts";

/**
 * Options for vector column creation
 */
export interface VectorColumnOptions {
  /** Whether to create an index on this vector column */
  indexed?: boolean;
  /** Type of index to create (hnsw, ivfflat, etc.) */
  indexType?: string;
  /** Distance metric to use for this vector column */
  metric?: "cosine" | "euclidean" | "dot" | "manhattan";
  /** Additional parameters for the vector column */
  params?: Record<string, unknown>;
  [key: string]: unknown; // Add index signature to fix type error
}

/**
 * Options for vector index creation
 */
export interface VectorIndexOptions extends VectorColumnOptions {
  /** Name of the index to create */
  name?: string;
  /** Number of lists for IVF-based indexes */
  lists?: number;
  /** Number of probes for IVF-based indexes */
  probes?: number;
  /** EF construction parameter for HNSW indexes */
  efConstruction?: number;
  /** M parameter for HNSW indexes (max number of connections) */
  m?: number;
  /** Number of dimensions for the vector */
  dimensions?: number;
}

/**
 * Extends the schema builder with vector-specific capabilities
 */
export class VectorSchemaBuilder {
  private tableName: string;
  private dbAdapter: DatabaseAdapter;
  private statements: string[] = [];

  /**
   * Create a new VectorSchemaBuilder instance
   *
   * @param tableName The table to operate on
   * @param dbAdapter The database adapter to use
   */
  constructor(tableName: string, dbAdapter: DatabaseAdapter) {
    this.tableName = tableName;
    this.dbAdapter = dbAdapter;

    // Ensure vector features are enabled
    if (!VectorConfigManager.isEnabled()) {
      VectorConfigManager.enable();
    }
  }

  /**
   * Add a vector column to the table
   *
   * @param name The name of the column
   * @param dimensions The number of dimensions for the vector (defaults to configured value)
   * @param options Additional options for the vector column
   * @returns This builder instance for chaining
   */
  public async vectorColumn(
    name: string,
    dimensions?: number,
    options: VectorColumnOptions = {},
  ): Promise<VectorSchemaBuilder> {
    // Ensure vector features are loaded
    await VectorFeaturesLoader.loadVectorFeatures();

    // Use dimensions from config if not provided
    const actualDimensions = dimensions ||
      VectorConfigManager.getDefaultDimensions();

    // Use default metric from config if not specified
    if (!options.metric) {
      const config = VectorConfigManager.getConfig();
      if (config.defaultMetric) {
        options.metric = config.defaultMetric as
          | "cosine"
          | "euclidean"
          | "dot"
          | "manhattan";
      }
    }

    // Get appropriate vector plugin for the database
    const dbType = this.dbAdapter.getType();
    // Try to use the default plugin from config if available
    const defaultPlugin = VectorConfigManager.getDefaultVectorPlugin();
    const plugin = defaultPlugin
      ? VectorPluginRegistry.getPlugin(defaultPlugin)
      : VectorPluginRegistry.getPluginForDbType(dbType);

    if (!plugin) {
      throw new Error(
        `No vector plugin available for database type: ${dbType}`,
      );
    }

    // Generate the SQL to create the vector column
    const operations = plugin.getOperations();
    const sql = operations.schemaOperations.createVectorColumnSql(
      this.tableName,
      name,
      actualDimensions,
      options as Record<string, unknown>,
    );

    this.statements.push(sql);

    // Add vector index if specified
    if (options.indexed) {
      await this.addVectorIndex(name, {
        ...options,
        dimensions: actualDimensions,
      });
    }

    return this;
  }

  /**
   * Add a vector index to an existing column
   *
   * @param columnName The column to index
   * @param options Options for the vector index
   * @returns This builder instance for chaining
   */
  public async addVectorIndex(
    columnName: string,
    options: VectorIndexOptions = {},
  ): Promise<VectorSchemaBuilder> {
    // Ensure vector features are loaded
    await VectorFeaturesLoader.loadVectorFeatures();

    // Create default index name if not provided
    const indexName = options.name ||
      `idx_${this.tableName}_${columnName}_vector`;

    // Use default index type if not specified
    if (!options.indexType) {
      // Default to 'hnsw' if not specified in configuration
      options.indexType = "hnsw";

      // Check if there's a default adapter that might specify an index type
      const config = VectorConfigManager.getConfig();
      if (config.adapters && Object.keys(config.adapters).length > 0) {
        const defaultAdapter = config.adapters[config.defaultProvider] ||
          Object.values(config.adapters)[0];
        if (defaultAdapter && defaultAdapter.indexType) {
          options.indexType = defaultAdapter.indexType;
        }
      }
    }

    // Get appropriate vector plugin for the database
    const dbType = this.dbAdapter.getType();
    const defaultPlugin = VectorConfigManager.getDefaultVectorPlugin();
    const plugin = defaultPlugin
      ? VectorPluginRegistry.getPlugin(defaultPlugin)
      : VectorPluginRegistry.getPluginForDbType(dbType);

    if (!plugin) {
      throw new Error(
        `No vector plugin available for database type: ${dbType}`,
      );
    }

    // Check if the database supports the requested index type
    const capabilities = await this.dbAdapter.getVectorCapabilities();
    const indexType = options.indexType || "hnsw";

    if (!capabilities.supportedIndexTypes.includes(indexType)) {
      throw new Error(
        `Index type '${indexType}' not supported by ${dbType}. ` +
          `Supported types: ${capabilities.supportedIndexTypes.join(", ")}`,
      );
    }

    // Generate the SQL to create the vector index
    const operations = plugin.getOperations();
    const sql = operations.schemaOperations.createVectorIndexSql(
      this.tableName,
      columnName,
      indexName,
      {
        ...options,
        indexType,
      } as Record<string, unknown>,
    );

    this.statements.push(sql);

    return this;
  }

  /**
   * Enable vector extension for the database if needed
   *
   * @returns This builder instance for chaining
   */
  public async enableVectorExtension(): Promise<VectorSchemaBuilder> {
    // Ensure vector features are loaded
    await VectorFeaturesLoader.loadVectorFeatures();

    // Check if vector features are enabled in config
    if (!VectorConfigManager.isEnabled()) {
      console.warn(
        "Vector features are disabled in configuration. Enabling temporarily.",
      );
      VectorConfigManager.enable();
    }

    // Get appropriate vector plugin for the database
    const dbType = this.dbAdapter.getType();
    const defaultPlugin = VectorConfigManager.getDefaultVectorPlugin();
    const plugin = defaultPlugin
      ? VectorPluginRegistry.getPlugin(defaultPlugin)
      : VectorPluginRegistry.getPluginForDbType(dbType);

    if (!plugin) {
      throw new Error(
        `No vector plugin available for database type: ${dbType}`,
      );
    }

    // Check if extension is already enabled
    const operations = plugin.getOperations();
    const isEnabled = await operations.isExtensionEnabled(this.dbAdapter);

    if (!isEnabled) {
      // Generate the SQL to enable the vector extension
      const sql = operations.schemaOperations.enableExtensionSql();

      if (sql) {
        this.statements.push(sql);
      }
    }

    return this;
  }

  /**
   * Drop a vector index
   *
   * @param indexName The name of the index to drop
   * @returns This builder instance for chaining
   */
  public dropVectorIndex(indexName: string): VectorSchemaBuilder {
    // Generate SQL to drop the index based on database type
    const dbType = this.dbAdapter.getType();

    if (dbType === "postgres") {
      this.statements.push(`DROP INDEX IF EXISTS ${indexName}`);
    } else if (dbType === "sqlite") {
      this.statements.push(`DROP INDEX IF EXISTS ${indexName}`);
    } else {
      throw new Error(
        `Unsupported database type for vector operations: ${dbType}`,
      );
    }

    return this;
  }

  /**
   * Add a similarity search function to the database
   *
   * @param name The name of the function
   * @param metric The similarity metric to use (defaults to config value)
   * @returns This builder instance for chaining
   */
  public async addSimilarityFunction(
    name = "similarity",
    metric?: string,
  ): Promise<VectorSchemaBuilder> {
    // Ensure vector features are loaded
    await VectorFeaturesLoader.loadVectorFeatures();

    // Use default metric from config if not specified
    if (!metric) {
      const config = VectorConfigManager.getConfig();
      metric = config.defaultMetric || "cosine";
    }

    // Validate that this is a known metric
    const metricInfo = VectorConfigManager.getDistanceMetric(metric);
    if (!metricInfo) {
      throw new Error(
        `Unknown distance metric: ${metric}. Available metrics: ${
          Object.keys(VectorConfigManager.getAllDistanceMetrics()).join(", ")
        }`,
      );
    }

    // Get appropriate vector plugin
    const dbType = this.dbAdapter.getType();
    const defaultPlugin = VectorConfigManager.getDefaultVectorPlugin();
    const plugin = defaultPlugin
      ? VectorPluginRegistry.getPlugin(defaultPlugin)
      : VectorPluginRegistry.getPluginForDbType(dbType);

    if (!plugin) {
      throw new Error(
        `No vector plugin available for database type: ${dbType}`,
      );
    }

    // Check if the metric is supported
    const capabilities = await this.dbAdapter.getVectorCapabilities();

    if (!capabilities.supportedMetrics.includes(metric)) {
      throw new Error(
        `Metric '${metric}' not supported by ${dbType}. ` +
          `Supported metrics: ${capabilities.supportedMetrics.join(", ")}`,
      );
    }

    // Generate the SQL to create the similarity function
    const operations = plugin.getOperations();
    const sql = operations.schemaOperations.createSimilarityFunctionSql(
      name,
      metric,
    );

    if (sql) {
      this.statements.push(sql);
    }

    return this;
  }

  /**
   * Generate the SQL statements for this schema builder
   *
   * @returns Array of SQL statements
   */
  public getStatements(): string[] {
    return [...this.statements];
  }

  /**
   * Execute all the statements in this schema builder
   *
   * @returns Result of the execution
   */
  public async execute(): Promise<unknown> {
    // Check if vector features are enabled
    if (!VectorConfigManager.isEnabled()) {
      console.warn(
        "Vector features are disabled in configuration. Execution may fail.",
      );
    }

    const statements = this.getStatements();

    // Return early if no statements
    if (statements.length === 0) {
      return null;
    }

    // Execute each statement
    for (const statement of statements) {
      await this.dbAdapter.query(statement);
    }

    return { success: true, statementCount: statements.length };
  }

  /**
   * Create a builder for the given table and adapter
   *
   * @param tableName The table to operate on
   * @param dbAdapter The database adapter to use
   * @returns A new VectorSchemaBuilder
   */
  public static for(
    tableName: string,
    dbAdapter: DatabaseAdapter,
  ): VectorSchemaBuilder {
    return new VectorSchemaBuilder(tableName, dbAdapter);
  }
}

/**
 * Default export
 */
export default VectorSchemaBuilder;
