import { EmbeddingProviderConfig, VectorConfig } from "./types.ts";
import defaultConfig from "./default-config.ts";
import { VectorFeaturesLoader } from "../loaders/VectorFeaturesLoader.ts";
import { EmbeddingProviderRegistry } from "../embedding/EmbeddingProviderRegistry.ts";
import { EmbeddingProvider } from "../embedding/EmbeddingProvider.ts";

/**
 * Interface for distance metric configuration
 */
interface DistanceMetric {
  name: string;
  isDistanceBased: boolean;
  supportsApproximate: boolean;
}

/**
 * Configuration manager for vector operations
 * Manages global settings for vector operations
 */
export class VectorConfigManager {
  /**
   * Default embedding provider name
   */
  private static defaultEmbeddingProvider: string | null = null;

  /**
   * Default vector database plugin name
   */
  private static defaultVectorPlugin: string | null = null;

  /**
   * Default embedding dimensions
   */
  private static defaultDimensions: number = 1536;

  /**
   * Whether to enable automatic embedding generation
   */
  private static autoEmbeddingEnabled: boolean = true;

  /**
   * Whether to use caching for embeddings
   */
  private static embeddingCacheEnabled: boolean = true;

  /**
   * Configuration for distance metrics
   */
  private static distanceMetrics: Record<string, DistanceMetric> = {
    cosine: {
      name: "cosine",
      isDistanceBased: true,
      supportsApproximate: true,
    },
    euclidean: {
      name: "euclidean",
      isDistanceBased: true,
      supportsApproximate: true,
    },
    dot: {
      name: "dot",
      isDistanceBased: false,
      supportsApproximate: true,
    },
    manhattan: {
      name: "manhattan",
      isDistanceBased: true,
      supportsApproximate: false,
    },
  };

  /**
   * Current configuration
   */
  private static config: VectorConfig = defaultConfig;

  /**
   * Initialize vector features with custom configuration
   * @param config Custom configuration to merge with defaults
   */
  static initialize(config: Partial<VectorConfig>): void {
    VectorConfigManager.config = {
      ...VectorConfigManager.config,
      ...config,
    };

    // If vector features are enabled, load them
    if (VectorConfigManager.config.enabled) {
      VectorFeaturesLoader.loadVectorFeatures()
        .then(() => {
          // Initialize embedding providers from config
          if (VectorConfigManager.config.embeddingProviders) {
            Object.entries(VectorConfigManager.config.embeddingProviders)
              .forEach(([name, providerConfig]) => {
                const providerPromise = VectorConfigManager.createProvider(
                  name,
                  providerConfig,
                );
                providerPromise.then((provider) => {
                  if (provider) {
                    EmbeddingProviderRegistry.registerProvider(provider);
                  }
                });
              });

            // Set default provider
            EmbeddingProviderRegistry.setDefaultProvider(
              VectorConfigManager.config.defaultProvider,
            );
          }
        });
    }
  }

  /**
   * Create an embedding provider from configuration
   * @param name Provider name
   * @param config Provider configuration
   * @returns A promise that resolves to the provider if creation succeeded, null otherwise
   */
  private static async createProvider(
    name: string,
    config: EmbeddingProviderConfig,
  ): Promise<EmbeddingProvider | null> {
    try {
      switch (config.type.toLowerCase()) {
        case "openai": {
          const { OpenAIEmbeddingProvider } = await import(
            "../embedding/providers/OpenAIEmbeddingProvider.ts"
          );
          return new OpenAIEmbeddingProvider({
            apiKey: config.apiKey,
            model: config.model,
            dimensions: config.dimensions,
          });
        }
        case "ollama": {
          const { OllamaEmbeddingProvider } = await import(
            "../embedding/providers/OllamaEmbeddingProvider.ts"
          );
          return new OllamaEmbeddingProvider({
            endpoint: config.endpoint,
            model: config.model,
            dimensions: config.dimensions,
          });
        }
        case "local": {
          const { LocalEmbeddingProvider } = await import(
            "../embedding/providers/LocalEmbeddingProvider.ts"
          );
          return new LocalEmbeddingProvider({
            model: config.model,
            dimensions: config.dimensions,
          });
        }
        default:
          console.warn(`Unknown embedding provider type: ${config.type}`);
          return null;
      }
    } catch (error) {
      console.error(`Failed to create embedding provider ${name}:`, error);
      return null;
    }
  }

  /**
   * Get the current configuration
   * @returns A copy of the current configuration
   */
  static getConfig(): VectorConfig {
    return { ...VectorConfigManager.config };
  }

  /**
   * Check if vector features are enabled
   * @returns true if vector features are enabled
   */
  static isEnabled(): boolean {
    return VectorConfigManager.config.enabled;
  }

  /**
   * Update specific configuration options
   * @param updates Partial configuration updates
   */
  static updateConfig(updates: Partial<VectorConfig>): void {
    VectorConfigManager.config = {
      ...VectorConfigManager.config,
      ...updates,
    };
  }

  /**
   * Enable vector features
   */
  static enable(): void {
    if (!VectorConfigManager.config.enabled) {
      VectorConfigManager.config.enabled = true;
      VectorFeaturesLoader.loadVectorFeatures();
    }
  }

  /**
   * Disable vector features
   */
  static disable(): void {
    VectorConfigManager.config.enabled = false;
  }

  /**
   * Get the default embedding provider
   * @returns Default embedding provider name
   */
  static getDefaultEmbeddingProvider(): string | null {
    return VectorConfigManager.defaultEmbeddingProvider;
  }

  /**
   * Set the default embedding provider
   * @param provider Default embedding provider name
   */
  static setDefaultEmbeddingProvider(provider: string): void {
    VectorConfigManager.defaultEmbeddingProvider = provider;
  }

  /**
   * Get the default vector database plugin
   * @returns Default vector database plugin name
   */
  static getDefaultVectorPlugin(): string | null {
    return VectorConfigManager.defaultVectorPlugin;
  }

  /**
   * Set the default vector database plugin
   * @param plugin Default vector database plugin name
   */
  static setDefaultVectorPlugin(plugin: string): void {
    VectorConfigManager.defaultVectorPlugin = plugin;
  }

  /**
   * Get the default embedding dimensions
   * @returns Default embedding dimensions
   */
  static getDefaultDimensions(): number {
    return VectorConfigManager.defaultDimensions;
  }

  /**
   * Set the default embedding dimensions
   * @param dimensions Default embedding dimensions
   */
  static setDefaultDimensions(dimensions: number): void {
    VectorConfigManager.defaultDimensions = dimensions;
  }

  /**
   * Check if automatic embedding generation is enabled
   * @returns true if automatic embedding generation is enabled
   */
  static isAutoEmbeddingEnabled(): boolean {
    return VectorConfigManager.autoEmbeddingEnabled;
  }

  /**
   * Enable or disable automatic embedding generation
   * @param enabled Whether automatic embedding generation is enabled
   */
  static setAutoEmbeddingEnabled(enabled: boolean): void {
    VectorConfigManager.autoEmbeddingEnabled = enabled;
  }

  /**
   * Check if embedding cache is enabled
   * @returns true if embedding cache is enabled
   */
  static isEmbeddingCacheEnabled(): boolean {
    return VectorConfigManager.embeddingCacheEnabled;
  }

  /**
   * Enable or disable embedding cache
   * @param enabled Whether embedding cache is enabled
   */
  static setEmbeddingCacheEnabled(enabled: boolean): void {
    VectorConfigManager.embeddingCacheEnabled = enabled;
  }

  /**
   * Get information about a distance metric
   * @param metric Distance metric name
   * @returns Information about the distance metric
   */
  static getDistanceMetric(metric: string): DistanceMetric | undefined {
    return VectorConfigManager.distanceMetrics[metric.toLowerCase()];
  }

  /**
   * Register a custom distance metric
   * @param name Metric name
   * @param config Metric configuration
   */
  static registerDistanceMetric(
    name: string,
    config: Omit<DistanceMetric, "name">,
  ): void {
    VectorConfigManager.distanceMetrics[name.toLowerCase()] = {
      ...config,
      name: name.toLowerCase(),
    };
  }

  /**
   * Get all registered distance metrics
   * @returns Record of distance metrics
   */
  static getAllDistanceMetrics(): Record<string, DistanceMetric> {
    return { ...VectorConfigManager.distanceMetrics };
  }

  /**
   * Build global vector configuration object
   * @returns Global vector configuration
   */
  static getConfiguration(): Record<
    string,
    string | string[] | number | boolean | null
  > {
    return {
      defaultEmbeddingProvider: VectorConfigManager.defaultEmbeddingProvider,
      defaultVectorPlugin: VectorConfigManager.defaultVectorPlugin,
      defaultDimensions: VectorConfigManager.defaultDimensions,
      autoEmbeddingEnabled: VectorConfigManager.autoEmbeddingEnabled,
      embeddingCacheEnabled: VectorConfigManager.embeddingCacheEnabled,
      availableMetrics: Object.keys(VectorConfigManager.distanceMetrics),
    };
  }
}
