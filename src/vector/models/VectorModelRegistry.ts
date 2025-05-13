/**
 * Registry for tracking vector-related metadata about models
 * Manages information about vector fields and searchable models
 */

// Define more specific types rather than using 'any'
type Constructor<T = unknown> = { new (...args: unknown[]): T };
type ModelConstructor = Constructor<unknown>;

// Define options interfaces for better typings
interface VectorFieldOptions {
  dimension?: number;
  indexType?: string;
  distance?: string;
  fieldName: string;
  [key: string]: unknown;
}

interface VectorSearchOptions {
  defaultSearchField?: string;
  indexName?: string;
  strategy?: string;
  [key: string]: unknown;
}

interface EmbeddingSourceOptions {
  provider?: string;
  model?: string;
  [key: string]: unknown;
}

export class VectorModelRegistry {
  /**
   * Map of vector fields by model constructor
   */
  private static vectorFields = new Map<
    ModelConstructor,
    Map<string, VectorFieldOptions>
  >();

  /**
   * Map of vector searchable models with their options
   */
  private static vectorModels = new Map<
    ModelConstructor,
    VectorSearchOptions
  >();

  /**
   * Map of embedding sources by model constructor
   */
  private static embeddingSources = new Map<
    ModelConstructor,
    Array<{
      propertyKey: string;
      targetField: string;
      options: EmbeddingSourceOptions;
    }>
  >();

  /**
   * Register a vector field in a model
   * @param constructor Model constructor
   * @param fieldName Name of the vector field
   * @param options Options for the vector field
   */
  static registerVectorField(
    constructor: ModelConstructor,
    fieldName: string,
    options: Omit<VectorFieldOptions, "fieldName">,
  ): void {
    if (!VectorModelRegistry.vectorFields.has(constructor)) {
      VectorModelRegistry.vectorFields.set(constructor, new Map());
    }

    VectorModelRegistry.vectorFields.get(constructor)!.set(fieldName, {
      ...options,
      fieldName,
    });
  }

  /**
   * Get vector fields for a model
   * @param constructor Model constructor
   * @returns Map of vector field names to options
   */
  static getVectorFields(
    constructor: ModelConstructor,
  ): Map<string, VectorFieldOptions> {
    return VectorModelRegistry.vectorFields.get(constructor) || new Map();
  }

  /**
   * Register a model as vector searchable
   * @param constructor Model constructor
   * @param options Options for vector search
   */
  static registerVectorModel(
    constructor: ModelConstructor,
    options: VectorSearchOptions,
  ): void {
    VectorModelRegistry.vectorModels.set(constructor, options);
  }

  /**
   * Check if a model is vector searchable
   * @param constructor Model constructor
   * @returns true if the model is vector searchable
   */
  static isVectorSearchable(constructor: ModelConstructor): boolean {
    return VectorModelRegistry.vectorModels.has(constructor);
  }

  /**
   * Get vector search options for a model
   * @param constructor Model constructor
   * @returns Vector search options for the model
   */
  static getVectorSearchOptions(
    constructor: ModelConstructor,
  ): VectorSearchOptions {
    return VectorModelRegistry.vectorModels.get(constructor) || {};
  }

  /**
   * Get the default search field for a model
   * @param modelName The name of the model
   * @returns The default field name for vector search, or undefined if none is configured
   */
  static getDefaultSearchField(modelName: string): string | undefined {
    // Find the model constructor by name
    for (
      const [constructor, options] of VectorModelRegistry.vectorModels.entries()
    ) {
      if (constructor.name === modelName && options.defaultSearchField) {
        return options.defaultSearchField;
      }
    }

    // If no default field is configured, return the first vector field if any exists
    for (
      const [constructor, fields] of VectorModelRegistry.vectorFields.entries()
    ) {
      if (constructor.name === modelName && fields.size > 0) {
        // Return the first field name
        return fields.keys().next().value;
      }
    }

    return undefined;
  }

  /**
   * Register an embedding source field in a model
   * @param constructor Model constructor
   * @param propertyKey Name of the source field
   * @param targetField Name of the target vector field
   * @param options Embedding options
   */
  static registerEmbeddingSource(
    constructor: ModelConstructor,
    propertyKey: string,
    targetField: string,
    options: EmbeddingSourceOptions,
  ): void {
    if (!VectorModelRegistry.embeddingSources.has(constructor)) {
      VectorModelRegistry.embeddingSources.set(constructor, []);
    }

    VectorModelRegistry.embeddingSources.get(constructor)!.push({
      propertyKey,
      targetField,
      options,
    });
  }

  /**
   * Get embedding sources for a model
   * @param constructor Model constructor
   * @returns Array of embedding source configurations
   */
  static getEmbeddingSources(constructor: ModelConstructor): Array<{
    propertyKey: string;
    targetField: string;
    options: EmbeddingSourceOptions;
  }> {
    return VectorModelRegistry.embeddingSources.get(constructor) || [];
  }
}
