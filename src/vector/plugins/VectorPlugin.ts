import { VectorOperationsProvider } from "./operations/VectorOperationsProvider.ts";
import { VectorCapabilities } from "./capabilities/VectorCapabilities.ts";

/**
 * Interface for vector database plugins
 * Defines the structure for plugins that add vector capabilities to databases
 */
export interface VectorPlugin {
  /**
   * Unique name of the plugin
   */
  readonly name: string;

  /**
   * Display name of the plugin
   */
  readonly displayName: string;

  /**
   * Description of the plugin
   */
  readonly description: string;

  /**
   * Version of the plugin
   */
  readonly version: string;

  /**
   * Vector operations provider for the plugin
   */
  readonly operations: VectorOperationsProvider;

  /**
   * Vector capabilities of the plugin
   */
  readonly capabilities: VectorCapabilities;

  /**
   * Initialize the plugin
   * @returns true if initialization succeeded, false otherwise
   */
  initialize(): Promise<boolean>;

  /**
   * Check if the plugin is supported in the current environment
   * @returns true if the plugin is supported
   */
  isSupported(): boolean;

  /**
   * Get the operations provider for the plugin
   * @returns Vector operations provider
   */
  getOperations(): VectorOperationsProvider;

  /**
   * Install the plugin's dependencies if needed
   * @returns true if installation succeeded, false otherwise
   */
  installDependencies?(): Promise<boolean>;

  /**
   * Set configuration options for the plugin
   * @param options Configuration options
   */
  configure?(options: Record<string, unknown>): void;
}
