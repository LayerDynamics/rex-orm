import { VectorPlugin } from "../VectorPlugin.ts";
import { VectorOperationsProvider } from "../operations/VectorOperationsProvider.ts";
import { SQLiteVSSOperations } from "../operations/SQLiteVSSOperations.ts";
import { DatabaseAdapter } from "../../../interfaces/DatabaseAdapter.ts";
import { VectorCapabilities } from "../capabilities/VectorCapabilities.ts";

/**
 * SQLite VSS plugin
 * Implements vector search capabilities for SQLite using the sqlite-vss extension
 */
export class SQLiteVSSPlugin implements VectorPlugin {
  readonly name = "sqlite-vss";
  readonly displayName = "SQLite VSS";
  readonly description =
    "Vector search capabilities for SQLite using the sqlite-vss extension";
  readonly version = "0.1.0";

  /**
   * Vector capabilities of this plugin
   */
  readonly capabilities: VectorCapabilities = {
    supportsSimilaritySearch: true,
    supportsKnnSearch: true,
    supportsHybridSearch: true,
    supportsCustomMetrics: false,
    maxDimensions: 1024,
    supportedMetrics: ["cosine"],
    supportsIndexing: true,
    supportedIndexTypes: ["vss"],
  };

  /**
   * Vector operations provider
   */
  readonly operations: VectorOperationsProvider;

  private isInitialized = false;
  private static dbAdapter: DatabaseAdapter | null = null;

  constructor() {
    this.operations = new SQLiteVSSOperations();
  }

  /**
   * Initialize the plugin and check if sqlite-vss is available
   * @returns true if initialization succeeded
   */
  async initialize(): Promise<boolean> {
    // Skip if already initialized
    if (this.isInitialized) {
      return true;
    }

    try {
      // Check if we have a database adapter
      if (!SQLiteVSSPlugin.dbAdapter) {
        console.warn(
          "No database adapter set for SQLiteVSSPlugin. Vector operations may not work.",
        );
        return false;
      }

      // Try to check if VSS functions are available by calling vss_version()
      try {
        const result = await SQLiteVSSPlugin.dbAdapter.execute(
          "SELECT vss_version() AS version",
        );

        if (result.rows.length > 0 && result.rows[0].version) {
          this.isInitialized = true;

          console.log(
            `sqlite-vss extension found (version ${
              result.rows[0].version
            }). Vector operations enabled.`,
          );
          return true;
        }
      } catch (error) {
        // Function doesn't exist, extension not loaded
        const errorMessage = String(error);
        console.warn(
          `sqlite-vss extension not found in database. Vector operations will not work. Error: ${errorMessage}`,
        );
        return false;
      }

      return false;
    } catch (error) {
      console.error("Failed to initialize sqlite-vss plugin:", error);
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
    SQLiteVSSPlugin.dbAdapter = adapter;
  }
}
