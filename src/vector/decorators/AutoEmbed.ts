import { VectorUtils } from "../utils/VectorUtils.ts";
import { VectorModelRegistry } from "../models/VectorModelRegistry.ts";
import { ModelRegistry } from "../../models/ModelRegistry.ts";

// Define a proper Constructor type
type Constructor<T = unknown> = { new (...args: unknown[]): T };

/**
 * Options for AutoEmbed decorator
 */
export interface AutoEmbedOptions {
  /**
   * Target field to store the generated embeddings
   */
  targetField: string;

  /**
   * Provider to use for generating embeddings
   */
  provider?: string;

  /**
   * Vector dimensions
   */
  dimensions?: number;

  /**
   * Whether to normalize the embeddings
   */
  normalize?: boolean;

  /**
   * Whether to concatenate text from multiple fields
   */
  concatenate?: boolean;

  /**
   * Delimiter to use when concatenating fields
   */
  delimiter?: string;
}

/**
 * Decorator to automatically create embeddings from a field's text content
 * This will generate a vector embedding whenever the decorated field changes
 *
 * @param options Options for embedding generation
 */
export function AutoEmbed(options: AutoEmbedOptions) {
  return function (target: object, propertyKey: string) {
    // Get the constructor of the class
    const constructor = target.constructor as Constructor;

    // Register with vector model registry
    VectorModelRegistry.registerEmbeddingSource(
      constructor,
      propertyKey,
      options.targetField,
      {
        provider: options.provider,
        dimensions: options.dimensions,
        normalize: options.normalize,
      },
    );

    // Store the original property descriptor
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      target,
      propertyKey,
    );

    // Create a new property descriptor to handle auto-embedding
    const propertyDescriptor: PropertyDescriptor = {
      configurable: true,
      enumerable: true,
      get: function () {
        return originalDescriptor?.get
          ? originalDescriptor.get.call(this)
          : (this as Record<string, unknown>)[`_${propertyKey}`];
      },
      set: function (value) {
        // Store the value using the original setter or directly
        if (originalDescriptor?.set) {
          originalDescriptor.set.call(this, value);
        } else {
          (this as Record<string, unknown>)[`_${propertyKey}`] = value;
        }

        // If the value is empty, skip embedding generation
        if (value === undefined || value === null || value === "") {
          return;
        }

        // Generate embedding asynchronously
        (async () => {
          try {
            let textToEmbed = String(value);

            // If concatenation is enabled, gather text from other fields
            if (options.concatenate) {
              const delimiter = options.delimiter || " ";
              const otherSources = VectorModelRegistry.getEmbeddingSources(
                constructor,
              )
                .filter((source) => source.propertyKey !== propertyKey);

              const textParts = [textToEmbed];

              for (const source of otherSources) {
                if ((this as Record<string, unknown>)[source.propertyKey]) {
                  textParts.push(
                    String(
                      (this as Record<string, unknown>)[source.propertyKey],
                    ),
                  );
                }
              }

              textToEmbed = textParts.join(delimiter);
            }

            // Generate the embedding
            const embedding = await VectorUtils.generateEmbedding(textToEmbed, {
              provider: options.provider,
              dimensions: options.dimensions,
              normalize: options.normalize,
            });

            // Set the embedding in the target field
            (this as Record<string, unknown>)[options.targetField] = embedding;
          } catch (error) {
            console.error(
              `Error generating embedding for ${propertyKey}:`,
              error,
            );
          }
        })();
      },
    };

    // Apply the property descriptor
    Object.defineProperty(target, propertyKey, propertyDescriptor);

    // Add metadata about this auto-embedding relationship
    ModelRegistry.registerFieldFeature(
      constructor,
      propertyKey,
      "autoEmbed",
    );
  };
}
