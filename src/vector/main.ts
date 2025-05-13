import { VectorConfig } from "./config/types.ts";
import { VectorConfigManager } from "./config/VectorConfigManager.ts";
import { VectorFeaturesLoader } from "./loaders/VectorFeaturesLoader.ts";
import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { PgVectorPlugin } from "./plugins/implementations/PgVectorPlugin.ts";
import { SQLiteVSSPlugin } from "./plugins/implementations/SQLiteVSSPlugin.ts";

/**
 * Initialize vector support for Rex ORM
 * This function sets up vector operations with the provided configuration
 *
 * @param config Custom configuration for vector features
 * @param adapter Optional database adapter for automatic plugin setup
 * @returns A Promise that resolves when initialization is complete
 */
export async function initializeVectorSupport(
  config?: Partial<VectorConfig>,
  adapter?: DatabaseAdapter,
): Promise<boolean> {
  // Apply configuration
  if (config) {
    VectorConfigManager.initialize(config);
  }

  // Enable vector features
  VectorConfigManager.enable();

  // Set up database adapter if provided
  if (adapter) {
    // Configure plugins with the adapter
    PgVectorPlugin.setDatabaseAdapter(adapter);
    SQLiteVSSPlugin.setDatabaseAdapter(adapter);
  }

  // Load vector features
  const success = await VectorFeaturesLoader.loadVectorFeatures();

  return success;
}

/**
 * Check if vector operations are supported in the current environment
 * @returns true if vector operations are supported
 */
export function isVectorSupportEnabled(): boolean {
  return VectorConfigManager.isEnabled() &&
    VectorFeaturesLoader.isVectorFeaturesLoaded();
}
