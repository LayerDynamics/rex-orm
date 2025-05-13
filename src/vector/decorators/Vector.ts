import { ModelRegistry } from "../../models/ModelRegistry.ts";
import { VectorUtils } from "../utils/VectorUtils.ts";
import { VectorModelRegistry } from "../models/VectorModelRegistry.ts";

// Define the Constructor type to match ModelRegistry's expectations
type Constructor<T = unknown> = { new (...args: unknown[]): T };

/**
 * Options for Vector decorator
 */
export interface VectorOptions {
  /**
   * Number of dimensions for the vector
   */
  dimensions?: number;

  /**
   * Default distance metric to use for this vector
   */
  metric?: "cosine" | "euclidean" | "dot" | "manhattan";

  /**
   * Provider to use for generating embeddings
   */
  embeddingProvider?: string;

  /**
   * Whether to automatically generate embeddings
   */
  autoEmbed?: boolean;

  /**
   * Field(s) to use for generating embeddings
   */
  sourceFields?: string[];

  /**
   * Index type for vector operations
   */
  indexType?: "flat" | "hnsw" | "ivfflat";

  /**
   * Index parameters for the vector field
   */
  indexParams?: Record<string, unknown>;

  /**
   * Whether this is a primary vector field for the model
   */
  isPrimary?: boolean;

  /**
   * Additional properties for extensibility
   */
  [key: string]: unknown;
}

/**
 * Decorator to mark a field as containing vector data
 * @param options Options for the vector field
 */
export function Vector(options: VectorOptions = {}) {
  return function (target: Record<string, unknown>, propertyKey: string) {
    // Register vector field in model registry
    VectorModelRegistry.registerVectorField(
      target.constructor as Constructor,
      propertyKey,
      options,
    );

    // If auto-embed is enabled, set up property descriptor to auto-generate embeddings
    if (
      options.autoEmbed && options.sourceFields &&
      options.sourceFields.length > 0
    ) {
      const sourceFields = options.sourceFields;

      // Create property descriptor to handle auto-embedding
      const propertyDescriptor: PropertyDescriptor = {
        configurable: true,
        enumerable: true,
        get: function (this: Record<string, unknown>) {
          return (this as Record<string, unknown>)[`_${propertyKey}`];
        },
        set: function (this: Record<string, unknown>, value: unknown) {
          // If value is already set directly, use it
          if (value !== undefined && value !== null) {
            (this as Record<string, unknown>)[`_${propertyKey}`] = value;
            return;
          }

          // Otherwise, try to generate an embedding from source fields
          try {
            const sourceValues: string[] = [];
            for (const field of sourceFields) {
              if (this[field] !== undefined && this[field] !== null) {
                sourceValues.push(String(this[field]));
              }
            }

            if (sourceValues.length > 0) {
              const text = sourceValues.join(" ");
              // Generate embedding asynchronously
              VectorUtils.generateEmbedding(text, {
                provider: options.embeddingProvider,
                dimensions: options.dimensions,
              }).then((embedding) => {
                (this as Record<string, unknown>)[`_${propertyKey}`] =
                  embedding;
              });
            }
          } catch (error) {
            console.error(
              `Error auto-generating embedding for ${propertyKey}:`,
              error,
            );
          }
        },
      };

      // Define the property with the descriptor
      Object.defineProperty(target, propertyKey, propertyDescriptor);
    }

    // Register the column metadata using Reflect API
    const columns = Reflect.getMetadata("columns", target.constructor) || [];
    columns.push({
      propertyKey,
      options: {
        type: "vector",
        dimensions: options.dimensions || 1536,
        vector: true,
        ...options,
      },
      type: "vector",
    });
    Reflect.defineMetadata("columns", columns, target.constructor);

    // Register vector feature at field level
    ModelRegistry.registerFieldFeature(
      target.constructor as Constructor,
      propertyKey,
      "vector",
    );
  };
}
