import { EmbeddingOptions, EmbeddingProvider } from "../EmbeddingProvider.ts";
import { EmbeddingCache } from "../cache/EmbeddingCache.ts";

/**
 * Options for Ollama embedding provider
 */
interface OllamaEmbeddingProviderOptions {
  /**
   * Endpoint URL for Ollama API
   */
  endpoint?: string;

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
 * Ollama embedding provider
 * Generates embeddings using locally hosted Ollama API
 */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly name = "ollama";
  readonly dimensions: number;

  private endpoint: string;
  private model: string;

  /**
   * Create a new Ollama embedding provider
   * @param options Provider options
   */
  constructor(options: OllamaEmbeddingProviderOptions = {}) {
    this.endpoint = options.endpoint || "http://localhost:11434/api/embeddings";
    this.model = options.model || "nomic-embed-text";
    this.dimensions = options.dimensions || 768; // Default for nomic-embed-text
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
    const cacheKey = `ollama:${this.model}:${text}`;
    const cached = EmbeddingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const model = options?.model || this.model;
    const normalize = options?.normalize !== false;

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const result = await response.json();
      const embedding = result.embedding as number[];

      // Normalize if requested
      const normalizedEmbedding = normalize
        ? this.normalizeVector(embedding)
        : embedding;

      // Cache the result
      EmbeddingCache.set(cacheKey, normalizedEmbedding);

      return normalizedEmbedding;
    } catch (error) {
      console.error("Error getting Ollama embedding:", error);
      throw error;
    }
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
    // Ollama doesn't support batch embedding in a single request
    // Fetch embeddings individually and collect results
    const embeddings: number[][] = [];

    // Use Promise.all to fetch all embeddings in parallel
    const promises = texts.map((text) => this.getEmbedding(text, options));
    const results = await Promise.all(promises);

    // Store results in the embeddings array
    embeddings.push(...results);

    return embeddings;
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
