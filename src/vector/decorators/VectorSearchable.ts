import { VectorModelRegistry } from "../models/VectorModelRegistry.ts";
import { VectorUtils } from "../utils/VectorUtils.ts";
import { QueryBuilder } from "../../query/QueryBuilder.ts";
import { EmbeddingOptions } from "../embedding/EmbeddingProvider.ts";

/**
 * Options for the VectorSearchable decorator
 */
export interface VectorSearchableOptions {
  /**
   * Default vector field to use for searching
   */
  defaultVectorField?: string;

  /**
   * Default embedding provider to use
   */
  defaultProvider?: string;

  /**
   * Default number of results to return in KNN searches
   */
  defaultK?: number;

  /**
   * Default distance metric to use
   */
  defaultMetric?: string;

  /**
   * Default similarity threshold for vector matching
   */
  defaultThreshold?: number;

  /**
   * Default embedding dimensions
   */
  defaultDimensions?: number;

  /**
   * Allow additional properties to be added
   */
  [key: string]: unknown;
}

/**
 * Decorator to make a model searchable with vector operations
 * This adds methods for similarity search, KNN search, etc. to the model class
 *
 * @param options Options for vector search behavior
 */
export function VectorSearchable(options: VectorSearchableOptions = {}) {
  // deno-lint-ignore no-explicit-any
  return function <T extends { new (...args: any[]): any }>(constructor: T) {
    // Map our options to the expected VectorSearchOptions format
    const vectorSearchOptions = {
      defaultSearchField: options.defaultVectorField,
      indexName: constructor.name.toLowerCase() + "_vector_idx",
      strategy: "hnsw", // default strategy
      ...options, // include any other options
    };

    // Register the model as vector searchable
    VectorModelRegistry.registerVectorModel(constructor, vectorSearchOptions);

    // Create a new class that extends the original and adds vector search methods
    const ExtendedClass = class extends constructor {
      // Constructor matching the mixin requirements
      // deno-lint-ignore no-explicit-any
      constructor(...args: any[]) {
        super(...args);
      }

      // Static properties for vector search
      static defaultVectorField = options.defaultVectorField;
      static defaultProvider = options.defaultProvider;
      static defaultK = options.defaultK || 10;
      static defaultMetric = options.defaultMetric || "cosine";
      static defaultThreshold = options.defaultThreshold || 0.8;
      static defaultDimensions = options.defaultDimensions || 1536;

      /**
       * Find similar records using vector search
       * @param text Text to search for
       * @param options Search options
       */
      static async findSimilar(
        text: string,
        options?: {
          vectorField?: string;
          limit?: number;
          metric?: string;
          threshold?: number;
          provider?: string;
          embeddingOptions?: EmbeddingOptions;
        },
      ) {
        const query = new QueryBuilder();
        const vectorField = options?.vectorField || this.defaultVectorField;

        if (!vectorField) {
          throw new Error("No vector field specified for similarity search");
        }

        // Generate embedding from text
        const embedding = await VectorUtils.generateEmbedding(text, {
          provider: options?.provider || this.defaultProvider,
          dimensions: this.defaultDimensions,
          ...options?.embeddingOptions,
        });

        query.select("*");
        query.from(this.name.toLowerCase() + "s");

        // Apply similarity search
        query.similaritySearch(
          vectorField,
          embedding,
          options?.metric || this.defaultMetric,
        );

        // Apply limit if provided
        if (options?.limit) {
          query.limit(options.limit);
        }

        return query;
      }

      /**
       * Find nearest neighbors using KNN search
       * @param text Text to find neighbors for
       * @param options Search options
       */
      static async findNearest(
        text: string,
        options?: {
          vectorField?: string;
          k?: number;
          metric?: string;
          provider?: string;
          embeddingOptions?: EmbeddingOptions;
        },
      ) {
        const query = new QueryBuilder();
        const vectorField = options?.vectorField || this.defaultVectorField;

        if (!vectorField) {
          throw new Error("No vector field specified for KNN search");
        }

        // Generate embedding from text
        const embedding = await VectorUtils.generateEmbedding(text, {
          provider: options?.provider || this.defaultProvider,
          dimensions: this.defaultDimensions,
          ...options?.embeddingOptions,
        });

        query.select("*");
        query.from(this.name.toLowerCase() + "s");

        // Apply KNN search
        query.knnSearch(
          vectorField,
          embedding,
          options?.k || this.defaultK,
          options?.metric || this.defaultMetric,
        );

        return query;
      }

      /**
       * Find records exceeding a similarity threshold
       * @param text Text to match against
       * @param options Search options
       */
      static async findMatching(
        text: string,
        options?: {
          vectorField?: string;
          threshold?: number;
          metric?: string;
          provider?: string;
          embeddingOptions?: EmbeddingOptions;
        },
      ) {
        const query = new QueryBuilder();
        const vectorField = options?.vectorField || this.defaultVectorField;

        if (!vectorField) {
          throw new Error("No vector field specified for vector matching");
        }

        // Generate embedding from text
        const embedding = await VectorUtils.generateEmbedding(text, {
          provider: options?.provider || this.defaultProvider,
          dimensions: this.defaultDimensions,
          ...options?.embeddingOptions,
        });

        query.select("*");
        query.from(this.name.toLowerCase() + "s");

        // Apply vector matching
        query.vectorMatch(
          vectorField,
          embedding,
          options?.threshold || this.defaultThreshold,
          options?.metric || this.defaultMetric,
        );

        return query;
      }

      /**
       * Search directly with a vector embedding
       * @param vector Vector embedding to search with
       * @param options Search options
       */
      static searchWithVector(
        vector: number[],
        options?: {
          vectorField?: string;
          k?: number;
          metric?: string;
          type?: "knn" | "similarity" | "distance" | "match";
          threshold?: number;
        },
      ) {
        const query = new QueryBuilder();
        const vectorField = options?.vectorField || this.defaultVectorField;
        const searchType = options?.type || "knn";

        if (!vectorField) {
          throw new Error("No vector field specified for vector search");
        }

        query.select("*");
        query.from(this.name.toLowerCase() + "s");

        // Apply the appropriate vector operation based on search type
        switch (searchType) {
          case "knn":
            query.knnSearch(
              vectorField,
              vector,
              options?.k || this.defaultK,
              options?.metric || this.defaultMetric,
            );
            break;

          case "similarity":
            query.similaritySearch(
              vectorField,
              vector,
              options?.metric || this.defaultMetric,
            );
            break;

          case "distance":
            query.distanceSearch(
              vectorField,
              vector,
              options?.metric || this.defaultMetric,
            );
            break;

          case "match":
            query.vectorMatch(
              vectorField,
              vector,
              options?.threshold || this.defaultThreshold,
              options?.metric || this.defaultMetric,
            );
            break;
        }

        return query;
      }
    };

    // Copy static properties and methods from original constructor
    Object.getOwnPropertyNames(constructor).forEach((prop) => {
      if (prop !== "prototype" && prop !== "name" && prop !== "length") {
        const descriptor = Object.getOwnPropertyDescriptor(constructor, prop);

        if (descriptor) {
          Object.defineProperty(ExtendedClass, prop, descriptor);
        }
      }
    });

    return ExtendedClass;
  };
}
