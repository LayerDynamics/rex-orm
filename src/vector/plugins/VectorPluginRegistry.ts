import { VectorPlugin } from "./VectorPlugin.ts";
import { VectorOperationsProvider } from "./operations/VectorOperationsProvider.ts";
import { PgVectorPlugin } from "./implementations/PgVectorPlugin.ts";
import { SQLiteVSSPlugin } from "./implementations/SQLiteVSSPlugin.ts";

/**
 * Registry for vector database plugins
 * Manages available plugins and allows getting operations for specific databases
 */
export class VectorPluginRegistry {
  /**
   * Map of registered plugins
   */
  private static plugins: Map<string, VectorPlugin> = new Map();

  /**
   * Map of database type to plugin name mappings
   */
  private static dbTypeToPlugin: Map<string, string> = new Map();

  /**
   * Name of the active plugin
   */
  private static activePlugin: string | null = null;

  /**
   * Whether the registry has been initialized
   */
  private static isInitialized = false;

  /**
   * Initialize the registry with default plugins
   */
  static async initialize(): Promise<boolean> {
    if (VectorPluginRegistry.isInitialized) {
      return true;
    }

    // Register built-in plugins
    VectorPluginRegistry.registerPlugin(new PgVectorPlugin());
    VectorPluginRegistry.registerPlugin(new SQLiteVSSPlugin());

    // Set up database type mappings
    VectorPluginRegistry.mapDatabaseTypeToPlugin("postgres", "pgvector");
    VectorPluginRegistry.mapDatabaseTypeToPlugin("sqlite", "sqlite-vss");

    // Try to initialize all plugins
    const initPromises = Array.from(VectorPluginRegistry.plugins.values())
      .map((plugin) => plugin.initialize());

    const results = await Promise.all(initPromises);

    // At least one plugin initialized successfully
    const success = results.some((result) => result === true);

    // Set initialization state
    VectorPluginRegistry.isInitialized = success;

    // If no active plugin is set but at least one plugin is supported,
    // set the first supported plugin as active
    if (!VectorPluginRegistry.activePlugin && success) {
      for (const [name, plugin] of VectorPluginRegistry.plugins.entries()) {
        if (plugin.isSupported()) {
          VectorPluginRegistry.activePlugin = name;
          break;
        }
      }
    }

    return success;
  }

  /**
   * Register a vector plugin
   * @param plugin The plugin to register
   */
  static registerPlugin(plugin: VectorPlugin): void {
    VectorPluginRegistry.plugins.set(plugin.name, plugin);

    // If this is the first plugin, set it as active
    if (VectorPluginRegistry.activePlugin === null) {
      VectorPluginRegistry.activePlugin = plugin.name;
    }
  }

  /**
   * Map a database type to a plugin name
   * @param dbType The database type (e.g., postgres, sqlite)
   * @param pluginName The name of the plugin to use for this database
   */
  static mapDatabaseTypeToPlugin(dbType: string, pluginName: string): void {
    VectorPluginRegistry.dbTypeToPlugin.set(dbType, pluginName);
  }

  /**
   * Get a plugin for a specific database type
   * @param dbType The database type (e.g., postgres, sqlite)
   * @returns The plugin for this database type, or undefined if not found
   */
  static getPluginForDbType(dbType: string): VectorPlugin | undefined {
    const pluginName = VectorPluginRegistry.dbTypeToPlugin.get(dbType);
    if (!pluginName) {
      return undefined;
    }
    return VectorPluginRegistry.getPlugin(pluginName);
  }

  /**
   * Get a plugin by name
   * @param name Name of the plugin to get
   * @returns The plugin, or undefined if not found
   */
  static getPlugin(name: string): VectorPlugin | undefined {
    return VectorPluginRegistry.plugins.get(name);
  }

  /**
   * Set the active plugin
   * @param name Name of the plugin to set as active
   * @returns true if plugin was found and set as active
   */
  static setActivePlugin(name: string): boolean {
    if (VectorPluginRegistry.plugins.has(name)) {
      VectorPluginRegistry.activePlugin = name;
      return true;
    }
    return false;
  }

  /**
   * Get the active plugin
   * @returns The active plugin, or undefined if none is active
   */
  static getActivePlugin(): VectorPlugin | undefined {
    if (VectorPluginRegistry.activePlugin === null) {
      return undefined;
    }
    return VectorPluginRegistry.plugins.get(VectorPluginRegistry.activePlugin);
  }

  /**
   * Get the name of the active plugin
   * @returns The name of the active plugin, or null if none is active
   */
  static getActivePluginName(): string | null {
    return VectorPluginRegistry.activePlugin;
  }

  /**
   * Get all registered plugins
   * @returns Array of registered plugins
   */
  static getAllPlugins(): VectorPlugin[] {
    return Array.from(VectorPluginRegistry.plugins.values());
  }

  /**
   * Get operations provider for the active plugin
   * @returns Vector operations provider for the active plugin
   */
  static getOperations(): VectorOperationsProvider | null {
    const activePlugin = VectorPluginRegistry.getActivePlugin();
    if (!activePlugin) {
      return null;
    }
    return activePlugin.getOperations();
  }

  /**
   * Get operations provider for a specific plugin
   * @param name Name of the plugin
   * @returns Vector operations provider for the specified plugin
   */
  static getOperationsForPlugin(name: string): VectorOperationsProvider | null {
    const plugin = VectorPluginRegistry.getPlugin(name);
    if (!plugin) {
      return null;
    }
    return plugin.getOperations();
  }

  /**
   * Check if at least one plugin is supported
   * @returns true if at least one plugin is supported
   */
  static hasSupport(): boolean {
    for (const plugin of VectorPluginRegistry.plugins.values()) {
      if (plugin.isSupported()) {
        return true;
      }
    }
    return false;
  }
}
