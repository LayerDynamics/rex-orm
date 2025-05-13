import { VectorPluginRegistry } from "../plugins/VectorPluginRegistry.ts";
import { VectorPlugin } from "../plugins/VectorPlugin.ts";
import { VectorCapabilities } from "../capabilities/VectorCapabilities.ts";
import { VectorOperationsProvider } from "../plugins/operations/VectorOperationsProvider.ts";

/**
 * Handles lazy-loading of vector features
 * This ensures vector functionality is only loaded when needed
 */
export class VectorFeaturesLoader {
  /**
   * Whether vector features have been loaded
   */
  private static isLoaded = false;

  /**
   * Whether vector features are currently loading
   */
  private static isLoading = false;

  /**
   * Load vector features
   * @returns Promise that resolves to true if features were loaded successfully
   */
  static async loadVectorFeatures(): Promise<boolean> {
    if (VectorFeaturesLoader.isLoaded) return true;

    if (VectorFeaturesLoader.isLoading) {
      // Wait for loading to complete
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (VectorFeaturesLoader.isLoaded) {
            resolve(true);
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    }

    VectorFeaturesLoader.isLoading = true;

    try {
      // Dynamic import for vector plugins
      const { PgVectorPlugin } = await import(
        "../plugins/implementations/PgVectorPlugin.ts"
      );
      const { SQLiteVSSPlugin } = await import(
        "../plugins/implementations/SQLiteVSSPlugin.ts"
      );

      // Create fully compatible plugins by extending the imported plugins with required properties
      const pgPlugin = VectorFeaturesLoader.createFullPlugin(
        new PgVectorPlugin(),
        "PostgreSQL pgvector",
        "Vector search for PostgreSQL using pgvector extension",
        "1.0.0",
      );

      const sqlitePlugin = VectorFeaturesLoader.createFullPlugin(
        new SQLiteVSSPlugin(),
        "SQLite VSS",
        "Vector search for SQLite using the sqlite-vss extension",
        "1.0.0",
      );

      // Initialize the plugin registry
      await VectorPluginRegistry.initialize();

      // Only register plugins that can be initialized successfully
      const pgInitialized = await pgPlugin.initialize();
      if (pgInitialized) {
        VectorPluginRegistry.registerPlugin(pgPlugin);
      }

      const sqliteInitialized = await sqlitePlugin.initialize();
      if (sqliteInitialized) {
        VectorPluginRegistry.registerPlugin(sqlitePlugin);
      }

      // Set the first successfully initialized plugin as active
      if (pgInitialized) {
        VectorPluginRegistry.setActivePlugin(pgPlugin.name);
      } else if (sqliteInitialized) {
        VectorPluginRegistry.setActivePlugin(sqlitePlugin.name);
      }

      VectorFeaturesLoader.isLoaded = true;
      return pgInitialized || sqliteInitialized;
    } catch (error) {
      console.error("Failed to load vector features:", error);
      return false;
    } finally {
      VectorFeaturesLoader.isLoading = false;
    }
  }

  /**
   * Creates a fully compatible VectorPlugin by adding the required properties
   * @param plugin Base plugin with partial VectorPlugin implementation
   * @param displayName Human-readable name of the plugin
   * @param description Plugin description
   * @param version Plugin version
   * @returns A complete VectorPlugin implementation
   */
  private static createFullPlugin(
    plugin: {
      name: string;
      initialize(): Promise<boolean>;
      isSupported(): boolean;
      getOperations(): VectorOperationsProvider;
    },
    displayName: string,
    description: string,
    version: string,
  ): VectorPlugin {
    const operations = plugin.getOperations();

    // Create capabilities based on plugin type
    const isPgVector = plugin.name === "pgvector";
    const capabilities: VectorCapabilities = {
      supportsSimilaritySearch: true,
      supportsKnnSearch: true,
      supportsHybridSearch: true,
      supportsCustomMetrics: false,
      supportsIndexing: true,
      supportedMetrics: isPgVector
        ? ["cosine", "euclidean", "dot_product"]
        : ["cosine", "euclidean"],
      supportsExactKnn: true,
      supportsApproximateKnn: isPgVector,
      supportsFilteredKnn: true,
      maxDimensions: isPgVector ? 1024 : 512,
      defaultDimensions: 384,
      hasNativeVectorType: true,
      supportsVectorIndexing: true,
      supportedIndexTypes: isPgVector ? ["ivfflat", "hnsw"] : ["lsh"],
      supportsDistanceInSql: true,
      supportsBatchOperations: true,
      maxBatchSize: 1000,
      supportsAutoSchemaCreation: true,
      supportsSimilarityScore: true,
      similarityScoreType: "float",

      // Method implementations
      supportsMetric(metric: string): boolean {
        return this.supportedMetrics.includes(metric);
      },

      getIndexOptions(indexType: string): Record<string, unknown> {
        if (isPgVector) {
          if (indexType === "ivfflat") {
            return { lists: 100 };
          } else if (indexType === "hnsw") {
            return { m: 16, ef_construction: 64 };
          }
        }
        return {};
      },

      getBestIndexType(
        _metric: string,
        approximate: boolean,
        dimensions: number,
      ): string {
        if (isPgVector) {
          if (approximate && dimensions > 100) {
            return "hnsw";
          } else if (approximate) {
            return "ivfflat";
          }
        }
        return isPgVector ? "ivfflat" : "lsh";
      },
    };

    return {
      name: plugin.name,
      displayName,
      description,
      version,
      operations,
      capabilities,
      initialize: () => plugin.initialize(),
      isSupported: () => plugin.isSupported(),
      getOperations: () => operations,
    };
  }

  /**
   * Check if vector features are loaded
   * @returns true if vector features are loaded
   */
  static isVectorFeaturesLoaded(): boolean {
    return VectorFeaturesLoader.isLoaded;
  }
}
