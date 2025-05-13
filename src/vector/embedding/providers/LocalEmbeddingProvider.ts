import { EmbeddingOptions, EmbeddingProvider } from "../EmbeddingProvider.ts";
import { EmbeddingCache } from "../cache/EmbeddingCache.ts";

/**
 * Options for Local embedding provider
 */
interface LocalEmbeddingProviderOptions {
  /**
   * Model to use for embeddings
   */
  model?: string;

  /**
   * Dimensions of the embedding vectors
   */
  dimensions?: number;
}

/**
 * Local embedding provider
 * Generates simple embeddings using local computation (basic approach for development)
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly name = "local";
  readonly dimensions: number;

  private model: string;
  private seed: number;

  /**
   * Create a new Local embedding provider
   * @param options Provider options
   */
  constructor(options: LocalEmbeddingProviderOptions = {}) {
    this.model = options.model || "mini";
    this.dimensions = options.dimensions || 384;
    this.seed = 42; // For deterministic results
  }

  /**
   * Get embedding for a single text
   * @param text Text to embed
   * @param options Embedding options
   * @returns Vector embedding for the text
   */
  async getEmbedding(
    text: string,
    options?: EmbeddingOptions,
  ): Promise<number[]> {
    // Check cache first
    const cacheKey = `local:${this.model}:${text}`;
    const cached = EmbeddingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const dimensions = options?.dimensions || this.dimensions;
    const normalize = options?.normalize !== false;

    // Generate a simple deterministic embedding based on the text
    // This is a very basic approach and not suitable for production
    const embedding = await Promise.resolve(
      this.generateSimpleEmbedding(text, dimensions),
    );

    // Normalize if requested
    const normalizedEmbedding = normalize
      ? this.normalizeVector(embedding)
      : embedding;

    // Cache the result
    EmbeddingCache.set(cacheKey, normalizedEmbedding);

    return normalizedEmbedding;
  }

  /**
   * Get embeddings for multiple texts
   * @param texts Array of texts to embed
   * @param options Embedding options
   * @returns Array of vector embeddings
   */
  async batchGetEmbeddings(
    texts: string[],
    options?: EmbeddingOptions,
  ): Promise<number[][]> {
    const dimensions = options?.dimensions || this.dimensions;
    const normalize = options?.normalize !== false;
    const embeddings: number[][] = [];

    // Process each text
    for (const text of texts) {
      // Check cache first
      const cacheKey = `local:${this.model}:${text}`;
      const cached = EmbeddingCache.get(cacheKey);

      if (cached) {
        embeddings.push(cached);
      } else {
        // Generate a simple embedding
        const embedding = await Promise.resolve(
          this.generateSimpleEmbedding(text, dimensions),
        );
        const normalizedEmbedding = normalize
          ? this.normalizeVector(embedding)
          : embedding;

        // Cache the result
        EmbeddingCache.set(cacheKey, normalizedEmbedding);

        embeddings.push(normalizedEmbedding);
      }
    }

    return embeddings;
  }

  /**
   * Generate a simple embedding from text
   * This is a very basic approach using character codes and hashing
   * @param text Text to embed
   * @param dimensions Number of dimensions for the embedding
   * @returns Simple embedding vector
   */
  private generateSimpleEmbedding(text: string, dimensions: number): number[] {
    const embedding: number[] = new Array(dimensions).fill(0);

    // Use character codes to generate a simple embedding
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const position = i % dimensions;

      // Mix the character value into the embedding
      embedding[position] += Math.sin(charCode * (i + 1) * 0.1 + this.seed);
    }

    // Apply some additional mixing across dimensions
    for (let i = 0; i < dimensions; i++) {
      const nextPos = (i + 1) % dimensions;
      embedding[i] = Math.tanh(embedding[i] + 0.1 * embedding[nextPos]);
    }

    return embedding;
  }

  /**
   * Normalize a vector to unit length
   * @param vector Vector to normalize
   * @returns Normalized vector
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0),
    );

    if (magnitude === 0) {
      return vector; // Can't normalize zero vector
    }

    return vector.map((val) => val / magnitude);
  }
}
