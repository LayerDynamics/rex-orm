import { VectorPlugin } from "../VectorPlugin.ts";
import { VectorOperationsProvider } from "../operations/VectorOperationsProvider.ts";
import { PgVectorOperations } from "../operations/PgVectorOperations.ts";
import { DatabaseAdapter } from "../../../interfaces/DatabaseAdapter.ts";
import { VectorCapabilities } from "../capabilities/VectorCapabilities.ts";

/**
 * PostgreSQL pgvector plugin
 * Implements vector search capabilities for PostgreSQL using the pgvector extension
 */
export class PgVectorPlugin implements VectorPlugin {
  readonly name = "pgvector";
  readonly displayName = "PostgreSQL pgvector";
  readonly description =
    "Vector search capabilities for PostgreSQL using the pgvector extension";
  readonly version = "0.1.0";

  /**
   * Vector capabilities of this plugin
   */
  readonly capabilities: VectorCapabilities = {
    supportsSimilaritySearch: true,
    supportsKnnSearch: true,
    supportsHybridSearch: true,
    supportsCustomMetrics: true,
    maxDimensions: 1536,
    supportedMetrics: ["euclidean", "cosine", "inner_product"],
    supportsIndexing: true,
    supportedIndexTypes: ["ivfflat", "hnsw"],
  };

  /**
   * Vector operations provider
   */
  readonly operations: VectorOperationsProvider;

  private isInitialized = false;
  private static dbAdapter: DatabaseAdapter | null = null;

  constructor() {
    this.operations = new PgVectorOperations();
  }

  /**
   * Initialize the plugin and check if pgvector is available
   * @returns true if initialization succeeded
   */
  async initialize(): Promise<boolean> {
    // Skip if already initialized
    if (this.isInitialized) {
      return true;
    }

    try {
      // Check if we have a database adapter
      if (!PgVectorPlugin.dbAdapter) {
        console.warn(
          "No database adapter set for PgVectorPlugin. Vector operations may not work.",
        );
        return false;
      }

      // Try to query pgvector extension version to check if it's installed
      const result = await PgVectorPlugin.dbAdapter.execute(
        "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
      );

      if (result.rows.length === 0) {
        console.warn(
          "pgvector extension not found in database. Vector operations will not work.",
        );
        return false;
      }

      this.isInitialized = true;

      console.log(
        `pgvector extension found (version ${
          result.rows[0].extversion
        }). Vector operations enabled.`,
      );
      return true;
    } catch (error) {
      console.error("Failed to initialize pgvector plugin:", error);
      return false;
    }
  }

  /**
   * Check if this plugin is supported in the current environment
   * @returns true if plugin is supported
   */
  isSupported(): boolean {
    return this.isInitialized;
  }

  /**
   * Get the operations provider for this plugin
   * @returns Vector operations provider
   */
  getOperations(): VectorOperationsProvider {
    return this.operations;
  }

  /**
   * Set the database adapter for this plugin
   * @param adapter Database adapter
   */
  static setDatabaseAdapter(adapter: DatabaseAdapter): void {
    PgVectorPlugin.dbAdapter = adapter;
  }
}
