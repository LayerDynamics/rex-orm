import { EmbeddingOptions, EmbeddingProvider } from "../EmbeddingProvider.ts";
import { EmbeddingCache } from "../cache/EmbeddingCache.ts";

/**
 * Options for OpenAI embedding provider
 */
interface OpenAIEmbeddingProviderOptions {
  /**
   * OpenAI API key
   */
  apiKey?: string;

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
 * OpenAI embedding provider
 * Generates embeddings using OpenAI's embedding API
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = "openai";
  readonly dimensions: number;

  private apiKey: string;
  private model: string;

  /**
   * Create a new OpenAI embedding provider
   * @param options Provider options
   */
  constructor(options: OpenAIEmbeddingProviderOptions = {}) {
    this.apiKey = options.apiKey || Deno.env.get("OPENAI_API_KEY") || "";
    this.model = options.model || "text-embedding-ada-002";
    this.dimensions = options.dimensions || 1536; // Default for text-embedding-ada-002

    if (!this.apiKey) {
      console.warn(
        "OpenAI API key not provided. Set OPENAI_API_KEY environment variable or pass apiKey in options.",
      );
    }
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
    const cacheKey = `openai:${this.model}:${text}`;
    const cached = EmbeddingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const model = options?.model || this.model;
    const normalize = options?.normalize !== false;

    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: text,
          model,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `OpenAI API error: ${error.error?.message || response.statusText}`,
        );
      }

      const result = await response.json();
      const embedding = result.data[0].embedding as number[];

      // Normalize if requested
      const normalizedEmbedding = normalize
        ? this.normalizeVector(embedding)
        : embedding;

      // Cache the result
      EmbeddingCache.set(cacheKey, normalizedEmbedding);

      return normalizedEmbedding;
    } catch (error) {
      console.error("Error getting OpenAI embedding:", error);
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
    const model = options?.model || this.model;
    const normalize = options?.normalize !== false;
    const embeddings: number[][] = [];

    // Check cache first for each text
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    texts.forEach((text, index) => {
      const cacheKey = `openai:${this.model}:${text}`;
      const cached = EmbeddingCache.get(cacheKey);

      if (cached) {
        embeddings[index] = cached;
      } else {
        uncachedTexts.push(text);
        uncachedIndices.push(index);
      }
    });

    // If all were cached, return immediately
    if (uncachedTexts.length === 0) {
      return embeddings;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: uncachedTexts,
          model,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `OpenAI API error: ${error.error?.message || response.statusText}`,
        );
      }

      const result = await response.json();

      // Process each embedding
      interface OpenAIEmbeddingResponse {
        embedding: number[];
        index: number;
        object: string;
      }

      result.data.forEach(
        (item: OpenAIEmbeddingResponse, responseIndex: number) => {
          const embedding = item.embedding as number[];
          const normalizedEmbedding = normalize
            ? this.normalizeVector(embedding)
            : embedding;

          // Get the original index
          const originalIndex = uncachedIndices[responseIndex];

          // Store the embedding
          embeddings[originalIndex] = normalizedEmbedding;

          // Cache the result
          const text = texts[originalIndex];
          const cacheKey = `openai:${this.model}:${text}`;
          EmbeddingCache.set(cacheKey, normalizedEmbedding);
        },
      );

      return embeddings;
    } catch (error) {
      console.error("Error getting batch OpenAI embeddings:", error);
      throw error;
    }
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
