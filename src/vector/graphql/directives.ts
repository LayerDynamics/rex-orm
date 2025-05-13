// GraphQL directives for vector operations
// This file defines GraphQL directives for vector search capabilities

import { gql } from "../../deps.ts";
import { VectorFeaturesLoader } from "../loaders/VectorFeaturesLoader.ts";
import { EmbeddingProviderRegistry } from "../embedding/EmbeddingProviderRegistry.ts";
import { VectorConfigManager } from "../config/VectorConfigManager.ts";

/**
 * GraphQL type definitions for vector directives
 * These directives add vector capabilities to GraphQL schema fields
 */
export const vectorDirectiveTypeDefs = gql`
  # Apply vector search capability to a field
  directive @vectorSearch(
    field: String!             # Vector field to search against
    metric: String = "cosine"  # Distance metric to use (cosine, euclidean, dot)
    limit: Int = 10            # Default number of results to return
  ) on FIELD_DEFINITION
  
  # Mark a field as a vector index
  directive @vectorIndex(
    dimensions: Int!           # Number of dimensions in the vector
    metric: String = "cosine"  # Default metric for this vector field
    indexType: String = "hnsw" # Type of index to use (hnsw, ivfflat)
  ) on FIELD_DEFINITION
  
  # Automatically generate embedding for a field
  directive @autoEmbed(
    from: String!              # Field to generate embedding from
    provider: String           # Embedding provider to use
    dimensions: Int            # Vector dimensions (defaults to provider default)
    normalize: Boolean = true  # Whether to normalize the vector
  ) on FIELD_DEFINITION
`;

/**
 * Interface for the source object in a GraphQL resolver
 */
interface Source {
  [key: string]: unknown;
}

/**
 * Interface for GraphQL argument node
 */
interface ArgumentNode {
  name: {
    value: string;
  };
  value: {
    name?: {
      value: string;
    };
    value?: string | number | boolean;
  };
}

/**
 * Interface for GraphQL field node
 */
interface FieldNode {
  arguments?: ArgumentNode[];
  [key: string]: unknown;
}

/**
 * Interface for GraphQL resolver context
 */
interface ResolverContext {
  variableValues: Record<string, unknown>;
  models?: Record<string, Model>;
  [key: string]: unknown;
}

/**
 * Interface for GraphQL resolver info
 */
interface ResolverInfo {
  fieldName: string;
  fieldNodes: FieldNode[];
  returnType: unknown;
  parentType: {
    name: string;
  };
  path: {
    key: string;
    [key: string]: unknown;
  };
  schema: unknown;
  fragments: unknown;
  rootValue: unknown;
  operation: unknown;
  variableValues: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Interface for vector result item
 */
interface VectorResultItem {
  similarity?: number;
  distance?: number;
  score?: number;
  item?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Interface for model with query method
 */
interface Model {
  query(): QueryBuilder;
}

/**
 * Interface for query builder
 */
interface QueryBuilder {
  select(fields: string[]): QueryBuilder;
  similaritySearch(
    field: string,
    vector: number[],
    metric: string,
  ): QueryBuilder;
  limit(limit: number): QueryBuilder;
  execute(): Promise<VectorResultItem[]>;
}

/**
 * Interface for embedding options
 */
interface EmbeddingOptions {
  dimensions?: number;
  normalize?: boolean;
}

/**
 * Interface for directive arguments
 */
interface DirectiveArgs {
  field?: string;
  metric?: string;
  limit?: number;
  from?: string;
  provider?: string;
  dimensions?: number;
  normalize?: boolean;
  [key: string]: unknown;
}

/**
 * Interface for GraphQL directive resolver
 */
interface DirectiveResolverFunction {
  (
    next: (
      source: Source,
      args: Record<string, unknown>,
      context: ResolverContext,
      info: ResolverInfo,
    ) => unknown,
    source: Source,
    args: DirectiveArgs,
    context: ResolverContext,
    info: ResolverInfo,
  ): unknown;
}

/**
 * GraphQL directive resolvers for vector operations
 */
export const vectorDirectiveResolvers: Record<
  string,
  DirectiveResolverFunction
> = {
  /**
   * Directive resolver for @vectorSearch
   * Transforms a field to perform vector search
   */
  vectorSearch: async (next, source, directiveArgs, context, info) => {
    // Ensure vector features are loaded
    await VectorFeaturesLoader.loadVectorFeatures();

    // Extract directive arguments
    const { field, metric = "cosine", limit = 10 } = directiveArgs;

    if (!field) {
      throw new Error("Field parameter is required for vectorSearch directive");
    }

    // Get resolver arguments from the GraphQL query
    const args = info.fieldNodes[0].arguments || [];

    // Find the vector argument
    const vectorArg = args.find((arg) => arg.name.value === "vector");
    const textArg = args.find((arg) => arg.name.value === "text");

    // If neither vector nor text is provided, run the original resolver
    if (!vectorArg && !textArg) {
      return next(source, {}, context, info);
    }

    // Get the model name from the parent type
    const modelName = info.parentType.name;
    const model = context.models?.[modelName];

    if (!model) {
      throw new Error(`Model ${modelName} not found in context`);
    }

    // Process the vector or text input
    let vector: number[] = [];

    // If vector values are provided directly
    if (vectorArg && vectorArg.value.name) {
      const vectorVarName = vectorArg.value.name.value;
      const vectorValue = context.variableValues[vectorVarName] as {
        values?: number[];
        text?: string;
      } | undefined;

      if (vectorValue && Array.isArray(vectorValue.values)) {
        vector = vectorValue.values;
      } else if (vectorValue && vectorValue.text) {
        // If text is provided inside vector argument
        const provider = EmbeddingProviderRegistry.getProvider("default");
        if (!provider) {
          throw new Error("No embedding provider available");
        }
        vector = await provider.getEmbedding(vectorValue.text);
      } else {
        throw new Error("Invalid vector input format");
      }
    } // If text is provided for embedding
    else if (textArg && textArg.value.name) {
      const textVarName = textArg.value.name.value;
      const textValue = context.variableValues[textVarName] as string;
      const provider = EmbeddingProviderRegistry.getProvider("default");
      if (!provider) {
        throw new Error("No embedding provider available");
      }
      vector = await provider.getEmbedding(textValue);
    } else {
      // This should never happen due to the earlier check
      return next(source, {}, context, info);
    }

    // Get limit from arguments if provided, otherwise use directive default
    const limitArg = args.find((arg) => arg.name.value === "limit");
    let limitValue = limit;

    if (limitArg && limitArg.value.name) {
      const limitVarName = limitArg.value.name.value;
      const limitVar = context.variableValues[limitVarName];
      if (typeof limitVar === "number") {
        limitValue = limitVar;
      }
    }

    // Get query parameters with defaults
    const actualLimit = limitValue || limit;
    const actualMetric = metric;

    // Execute vector search
    try {
      const results = await model.query()
        .select(["*"])
        .similaritySearch(field, vector, actualMetric)
        .limit(actualLimit)
        .execute();

      // Format results with similarity information
      return results.map((item: VectorResultItem) => ({
        similarity: item.similarity || 0,
        distance: item.distance || 0,
        score: item.score || item.similarity || 0,
        item,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Unknown error";
      console.error("Vector search error:", error);
      throw new Error(`Vector search failed: ${errorMessage}`);
    }
  },

  /**
   * Directive resolver for @vectorIndex
   * Metadata directive for GraphQL schema generation
   */
  vectorIndex: (next, source, _args, context, info) => {
    // This directive is primarily for schema definition
    // It doesn't affect runtime behavior directly
    return next(source, {}, context, info);
  },

  /**
   * Directive resolver for @autoEmbed
   * Automatically generates embeddings for a field
   */
  autoEmbed: async (next, source, directiveArgs, context, info) => {
    // Get the value from the original resolver first
    const value = await next(source, {}, context, info);

    // If the value is already set or source doesn't have the `from` field, just return it
    if (value !== undefined && value !== null) {
      return value;
    }

    // Extract directive arguments
    const { from, provider = "default", dimensions, normalize = true } =
      directiveArgs;

    if (!from) {
      throw new Error("From parameter is required for autoEmbed directive");
    }

    // Get the text to embed from the source object
    const textToEmbed = source[from as string];
    if (!textToEmbed || typeof textToEmbed !== "string") {
      // No text to embed or not a string, return null
      return null;
    }

    try {
      // Ensure vector features are loaded
      await VectorFeaturesLoader.loadVectorFeatures();

      // Get embedding provider
      const embeddingProvider = EmbeddingProviderRegistry.getProvider(
        provider as string,
      );
      if (!embeddingProvider) {
        throw new Error(`Embedding provider '${provider}' not found`);
      }

      // Generate embedding with optional dimensions
      const options: EmbeddingOptions = {
        normalize: normalize as boolean,
      };

      if (typeof dimensions === "number") {
        options.dimensions = dimensions;
      }

      const embedding = await embeddingProvider.getEmbedding(
        textToEmbed,
        options,
      );

      // Update the source object with the embedding (useful for mutations)
      if (info.path && info.path.key) {
        source[info.path.key] = embedding;
      }

      return embedding;
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Unknown error";
      console.error("Auto-embedding error:", errorMessage);
      // Return null on error rather than failing the entire query
      return null;
    }
  },
};

/**
 * Function to create directive resolvers only when vector features are enabled
 *
 * @returns Directive resolvers object or empty object if vectors are disabled
 */
export function createVectorDirectiveResolvers(): Record<
  string,
  DirectiveResolverFunction
> {
  if (!VectorConfigManager.isEnabled()) {
    return {};
  }

  return vectorDirectiveResolvers;
}

// Export default empty object for conditional importing
export default vectorDirectiveResolvers;
