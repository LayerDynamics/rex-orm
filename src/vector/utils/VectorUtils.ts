import { EmbeddingOptions } from "../embedding/EmbeddingProvider.ts";
import { EmbeddingProviderRegistry } from "../embedding/EmbeddingProviderRegistry.ts";
import { EmbeddingCache } from "../embedding/cache/EmbeddingCache.ts";
import { VectorConfigManager } from "../config/VectorConfigManager.ts";

/**
 * Utility functions for vector operations
 */
export class VectorUtils {
  /**
   * Embedding cache instance
   */
  private static cache: EmbeddingCache | null = null;

  /**
   * Set the embedding cache
   * @param cache Embedding cache instance
   */
  static setCache(cache: EmbeddingCache): void {
    VectorUtils.cache = cache;
  }

  /**
   * Generate an embedding vector from text
   * @param text Text to generate embedding for
   * @param options Embedding options
   * @returns Vector embedding
   */
  static async generateEmbedding(
    text: string,
    options?: EmbeddingOptions & { provider?: string; cacheKey?: string },
  ): Promise<number[]> {
    const provider = options?.provider ||
      VectorConfigManager.getDefaultEmbeddingProvider() ||
      EmbeddingProviderRegistry.getDefaultProviderName() ||
      "local";

    // Check cache first
    const cacheKey = options?.cacheKey || `${provider}:${text}`;
    if (VectorUtils.cache) {
      const cached = await EmbeddingCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Get provider
    const embeddingProvider = EmbeddingProviderRegistry.getProvider(provider);
    if (!embeddingProvider) {
      throw new Error(`Embedding provider "${provider}" not found`);
    }

    // Generate embedding
    const embedding = await embeddingProvider.getEmbedding(text, options);

    // Normalize if requested
    const normalized = options?.normalize
      ? VectorUtils.normalize(embedding)
      : embedding;

    // Cache result
    if (VectorUtils.cache) {
      await EmbeddingCache.set(cacheKey, normalized);
    }

    return normalized;
  }

  /**
   * Generate embeddings for multiple texts
   * @param texts Texts to generate embeddings for
   * @param options Embedding options
   * @returns Array of vector embeddings
   */
  static async generateEmbeddings(
    texts: string[],
    options?: EmbeddingOptions & { provider?: string },
  ): Promise<number[][]> {
    const provider = options?.provider ||
      VectorConfigManager.getDefaultEmbeddingProvider() ||
      EmbeddingProviderRegistry.getDefaultProviderName() ||
      "local";

    // Get provider
    const embeddingProvider = EmbeddingProviderRegistry.getProvider(provider);
    if (!embeddingProvider) {
      throw new Error(`Embedding provider "${provider}" not found`);
    }

    // Generate embeddings in batch
    const embeddings = await embeddingProvider.batchGetEmbeddings(
      texts,
      options,
    );

    // Normalize if requested
    if (options?.normalize) {
      return embeddings.map((embedding) => VectorUtils.normalize(embedding));
    }

    return embeddings;
  }

  /**
   * Normalize a vector to unit length
   * @param vector Vector to normalize
   * @returns Normalized vector
   */
  static normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0),
    );
    if (magnitude === 0) {
      return vector; // Return original vector if magnitude is 0
    }
    return vector.map((val) => val / magnitude);
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param a First vector
   * @param b Second vector
   * @returns Cosine similarity (-1 to 1)
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same dimensions");
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Calculate Euclidean distance between two vectors
   * @param a First vector
   * @param b Second vector
   * @returns Euclidean distance
   */
  static euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same dimensions");
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Calculate dot product between two vectors
   * @param a First vector
   * @param b Second vector
   * @returns Dot product
   */
  static dotProduct(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same dimensions");
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }

    return sum;
  }

  /**
   * Format a vector for database storage
   * @param vector Vector to format
   * @param format Format to use ("array", "string", "json")
   * @returns Formatted vector
   */
  static formatVector(
    vector: number[],
    format: "array" | "string" | "json" = "json",
  ): string | number[] {
    switch (format) {
      case "array":
        return vector;
      case "string":
        return vector.join(",");
      case "json":
      default:
        return JSON.stringify(vector);
    }
  }

  /**
   * Parse a vector from storage format
   * @param vector Vector in storage format
   * @returns Parsed vector
   */
  static parseVector(vector: string | number[]): number[] {
    if (Array.isArray(vector)) {
      return vector;
    }

    try {
      // Try JSON parse first
      return JSON.parse(vector);
    } catch {
      // If not JSON, try comma-separated string
      return vector.split(",").map(Number);
    }
  }
}
