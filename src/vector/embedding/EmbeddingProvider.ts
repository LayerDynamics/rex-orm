/**
 * Options for embedding generation
 */
export interface EmbeddingOptions {
  /**
   * Model to use for generating embeddings
   */
  model?: string;

  /**
   * Dimensions of the embedding vectors
   */
  dimensions?: number;

  /**
   * Whether to normalize the embedding vectors
   */
  normalize?: boolean;
}

/**
 * Interface for embedding providers
 * This defines methods for generating vector embeddings from text
 */
export interface EmbeddingProvider {
  /**
   * Name of the provider
   */
  readonly name: string;

  /**
   * Default dimensions of the embeddings
   */
  readonly dimensions: number;

  /**
   * Get embedding for a single text
   * @param text Text to embed
   * @param options Embedding options
   * @returns Vector embedding for the text
   */
  getEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]>;

  /**
   * Get embeddings for multiple texts
   * @param texts Array of texts to embed
   * @param options Embedding options
   * @returns Array of vector embeddings
   */
  batchGetEmbeddings(
    texts: string[],
    options?: EmbeddingOptions,
  ): Promise<number[][]>;
}
