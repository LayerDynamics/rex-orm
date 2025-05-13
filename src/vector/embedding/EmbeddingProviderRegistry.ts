import { EmbeddingProvider } from "./EmbeddingProvider.ts";
import { LocalEmbeddingProvider } from "./providers/LocalEmbeddingProvider.ts";

/**
 * Registry for embedding providers
 * Manages available providers for generating vector embeddings
 */
export class EmbeddingProviderRegistry {
  /**
   * Map of registered providers
   */
  private static providers: Map<string, EmbeddingProvider> = new Map();

  /**
   * Name of the default provider
   */
  private static defaultProvider: string | null = null;

  /**
   * Initialize the registry with default providers
   */
  static initialize(): void {
    // Register built-in providers
    EmbeddingProviderRegistry.registerProvider(new LocalEmbeddingProvider());

    // Set default provider if none is set
    if (EmbeddingProviderRegistry.defaultProvider === null) {
      EmbeddingProviderRegistry.defaultProvider = "local";
    }
  }

  /**
   * Register an embedding provider
   * @param provider The provider to register
   */
  static registerProvider(provider: EmbeddingProvider): void {
    EmbeddingProviderRegistry.providers.set(provider.name, provider);

    // If this is the first provider, set it as default
    if (EmbeddingProviderRegistry.defaultProvider === null) {
      EmbeddingProviderRegistry.defaultProvider = provider.name;
    }
  }

  /**
   * Get a provider by name
   * @param name Name of the provider to get
   * @returns The provider, or undefined if not found
   */
  static getProvider(name: string): EmbeddingProvider | undefined {
    return EmbeddingProviderRegistry.providers.get(name);
  }

  /**
   * Set the default provider
   * @param name Name of the provider to set as default
   * @returns true if provider was found and set as default
   */
  static setDefaultProvider(name: string): boolean {
    if (EmbeddingProviderRegistry.providers.has(name)) {
      EmbeddingProviderRegistry.defaultProvider = name;
      return true;
    }
    return false;
  }

  /**
   * Get the default provider
   * @returns The default provider, or the first registered provider if none is set as default
   */
  static getDefaultProvider(): EmbeddingProvider | undefined {
    if (EmbeddingProviderRegistry.defaultProvider === null) {
      return undefined;
    }
    return EmbeddingProviderRegistry.providers.get(
      EmbeddingProviderRegistry.defaultProvider,
    );
  }

  /**
   * Get the name of the default provider
   * @returns The name of the default provider, or null if none is set
   */
  static getDefaultProviderName(): string | null {
    return EmbeddingProviderRegistry.defaultProvider;
  }

  /**
   * Get all registered providers
   * @returns Array of registered providers
   */
  static getAllProviders(): EmbeddingProvider[] {
    return Array.from(EmbeddingProviderRegistry.providers.values());
  }
}
