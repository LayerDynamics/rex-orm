// GraphQL resolvers for vector operations
// This file implements the resolvers for vector-based GraphQL operations

import { VectorFeaturesLoader } from "../loaders/VectorFeaturesLoader.ts";
import { HybridSearchOptimizer } from "../search/HybridSearchOptimizer.ts";
import { EmbeddingProviderRegistry } from "../embedding/EmbeddingProviderRegistry.ts";
import { VectorModelRegistry } from "../models/VectorModelRegistry.ts";
import { VectorConfigManager } from "../config/VectorConfigManager.ts";
import type { QueryBuilder } from "../../query/QueryBuilder.ts";
import type { HybridSearchOptions } from "../search/HybridSearchOptimizer.ts";
import type {
  DatabaseAdapter,
  DatabaseRecord,
} from "../../interfaces/DatabaseAdapter.ts";

/**
 * Interface for model instances that can be queried
 */
interface Model {
  query(): QueryBuilder;
  [key: string]: unknown;
}

/**
 * Interface for GraphQL context with models
 */
interface GraphQLContext {
  models: Record<string, Model>;
  user?: Record<string, unknown>;
  adapter: DatabaseAdapter;
  [key: string]: unknown;
}

/**
 * Parameters for vector similarity search
 */
interface VectorSearchParams {
  vector?: {
    values: number[];
    text?: string;
  };
  text?: string;
  field?: string;
  limit?: number;
  offset?: number;
  metric?: string;
  threshold?: number;
}

/**
 * Parameters for hybrid search
 */
interface HybridSearchParams {
  vector?: {
    values: number[];
    text?: string;
  };
  text?: string;
  vectorField?: string;
  textFields?: string[];
  limit?: number;
  vectorWeight?: number;
  textWeight?: number;
  strategy?: string;
}

/**
 * Item model structure
 */
interface ItemModel {
  id: number | string;
  [key: string]: unknown;
  similarity?: number;
  distance?: number;
  score?: number;
  hybrid_score?: number;
}

/**
 * Search result with similarity information
 */
interface SearchResult {
  similarity: number;
  distance: number;
  score: number;
  item: ItemModel;
}

/**
 * Converts a database record to an ItemModel
 * Ensures required properties exist
 *
 * @param record Database record from query results
 * @returns ItemModel with guaranteed id property
 */
function toItemModel(record: DatabaseRecord): ItemModel {
  if (!record.id && (record.id !== 0)) {
    // Add fallback id if missing from database record
    record.id = "unknown";
  }

  return record as ItemModel;
}

/**
 * Processes vector input and ensures a vector is available
 * Either uses the provided vector values or generates embeddings from text
 *
 * @param params Search parameters containing vector and/or text
 * @returns Promise resolving to a vector (number array)
 */
async function processVectorInput(
  params: VectorSearchParams,
): Promise<number[]> {
  // If direct vector values are provided, use those
  if (params.vector?.values && params.vector.values.length > 0) {
    return params.vector.values;
  }

  // If text is provided in vector object or at top level, generate embedding
  const textToEmbed = params.vector?.text || params.text;
  if (textToEmbed) {
    const defaultProvider = EmbeddingProviderRegistry.getProvider("default");
    if (!defaultProvider) {
      throw new Error(
        "No embedding provider available to convert text to vector",
      );
    }
    return await defaultProvider.getEmbedding(textToEmbed);
  }

  throw new Error(
    "Either vector values or text must be provided for vector search",
  );
}

/**
 * GraphQL resolvers for vector operations
 */
export const vectorResolvers = {
  Query: {
    /**
     * Search for similar items using vector similarity
     */
    searchSimilarItems: async (
      _: unknown,
      { search }: { search: VectorSearchParams },
      context: GraphQLContext,
    ): Promise<SearchResult[]> => {
      // Ensure vector features are loaded
      await VectorFeaturesLoader.loadVectorFeatures();

      // Process vector input (direct values or generated from text)
      const vector = await processVectorInput(search);

      // Get default model if none specified
      const modelName = "Item"; // This would be configurable in a real implementation
      const model = context.models[modelName];

      if (!model) {
        throw new Error(`Model ${modelName} not found in context`);
      }

      // Get appropriate vector field if not specified
      const field = search.field ||
        VectorModelRegistry.getDefaultSearchField(modelName) || "embedding";
      const metric = search.metric || "cosine";
      const limit = search.limit || 10;
      const threshold = search.threshold;

      // Create query with vector search
      const query = model.query()
        .select(["*"])
        .similaritySearch(field, vector, metric);

      // Apply threshold if provided
      if (threshold !== undefined) {
        query.vectorMatch(field, vector, threshold, metric);
      }

      // Execute query with limit
      const results = await query.limit(limit).execute(context.adapter);

      // Format results with similarity information
      return results.rows.map((record: DatabaseRecord) => {
        const item = toItemModel(record);
        return {
          similarity: item.similarity || 0,
          distance: item.distance || 0,
          score: item.score || item.similarity || 0,
          item,
        };
      });
    },

    /**
     * Recommend items based on vector similarity
     * This extends searchSimilarItems with recommendation-specific logic
     */
    recommendItems: async (
      _: unknown,
      { search }: { search: VectorSearchParams },
      context: GraphQLContext,
    ): Promise<SearchResult[]> => {
      // Ensure vector features are loaded
      await VectorFeaturesLoader.loadVectorFeatures();

      // Get the vector to search with
      const vector = await processVectorInput(search);

      // Get the model to recommend (could be configurable)
      const modelName = "Item"; // Typically a product, article, etc.
      const model = context.models[modelName];

      if (!model) {
        throw new Error(`Model ${modelName} not found in context`);
      }

      // Get field and parameters with defaults
      const field = search.field ||
        VectorModelRegistry.getDefaultSearchField(modelName) || "embedding";
      const metric = search.metric || "cosine";
      const limit = search.limit || 10;

      // For recommendations, we might want to exclude items the user has already interacted with
      // This is a simplified example - real implementations would be more sophisticated
      const query = model.query()
        .select(["*"])
        .similaritySearch(field, vector, metric);

      // If user context is available, exclude already viewed/purchased items
      if (context.user?.id) {
        // This assumes a relation between User and Item through UserInteractions
        const userIdValue = String(context.user.id);
        query.rawSql(
          `NOT EXISTS (SELECT 1 FROM user_interactions WHERE user_interactions.item_id = items.id AND user_interactions.user_id = $1)`,
          [userIdValue],
        );
      }

      // Execute query with limit
      const results = await query.limit(limit).execute(context.adapter);

      // Format results with similarity information
      return results.rows.map((record: DatabaseRecord) => {
        const item = toItemModel(record);
        return {
          similarity: item.similarity || 0,
          distance: item.distance || 0,
          score: item.score || item.similarity || 0,
          item,
        };
      });
    },

    /**
     * Hybrid search combining vector similarity and text search
     */
    hybridSearch: async (
      _: unknown,
      { search }: { search: HybridSearchParams },
      context: GraphQLContext,
    ): Promise<SearchResult[]> => {
      // Ensure vector features are loaded
      await VectorFeaturesLoader.loadVectorFeatures();

      // If no text fields are provided, we can't do hybrid search
      if (!search.textFields || search.textFields.length === 0) {
        throw new Error("Text fields must be provided for hybrid search");
      }

      // Process vector input
      const vector = await processVectorInput(search as VectorSearchParams);

      // Get model and create base query
      const modelName = "Item"; // This would be configurable
      const model = context.models[modelName];

      if (!model) {
        throw new Error(`Model ${modelName} not found in context`);
      }

      // Set up hybrid search options
      const hybridOptions: HybridSearchOptions = {
        vectorField: search.vectorField ||
          VectorModelRegistry.getDefaultSearchField(modelName) || "embedding",
        vector,
        textFields: search.textFields,
        textQuery: search.text || "",
        strategy: (search.strategy || "vector-first") as
          | "vector-first"
          | "text-first",
        limit: search.limit || 10,
        vectorWeight: search.vectorWeight || 0.7,
        textWeight: search.textWeight || 0.3,
      };

      // Use the hybrid search optimizer to get a QueryBuilder instance
      const optimizedQuery = await HybridSearchOptimizer.optimizeQuery(
        model.query(),
        hybridOptions,
      );

      // Execute the optimized query
      const results = await optimizedQuery.execute(context.adapter);

      // Format results with similarity information
      return results.rows.map((record: DatabaseRecord) => {
        const item = toItemModel(record);
        return {
          similarity: item.similarity || 0,
          distance: item.distance || 0,
          score: item.hybrid_score || item.similarity || 0,
          item,
        };
      });
    },
  },
};

/**
 * Creates model-specific resolvers for vector operations
 *
 * @param modelName The name of the model to create resolvers for
 * @returns Object containing resolvers for the model
 */
export function createModelVectorResolvers(
  modelName: string,
): Record<string, unknown> {
  if (!VectorConfigManager.isEnabled()) {
    return {};
  }

  // Return an object with Query field containing the model-specific search
  return {
    [modelName]: {
      // Add findSimilar method to the model type
      findSimilar: async (
        parent: ItemModel,
        args: VectorSearchParams,
        context: GraphQLContext,
      ): Promise<SearchResult[]> => {
        await VectorFeaturesLoader.loadVectorFeatures();

        // Get vector either from args or parent object
        let vector: number[];
        if (args.vector?.values) {
          vector = args.vector.values;
        } else if (args.text) {
          const provider = EmbeddingProviderRegistry.getProvider("default");
          if (!provider) {
            throw new Error("No embedding provider available");
          }
          vector = await provider.getEmbedding(args.text);
        } else {
          // If no input is provided, use the parent's vector field
          const field = args.field ||
            VectorModelRegistry.getDefaultSearchField(modelName) || "embedding";
          if (!parent[field] || !Array.isArray(parent[field])) {
            throw new Error(
              `No vector found in parent object at field ${field}`,
            );
          }
          vector = parent[field] as number[];
        }

        const model = context.models[modelName];
        if (!model) {
          throw new Error(`Model ${modelName} not found in context`);
        }

        const field = args.field ||
          VectorModelRegistry.getDefaultSearchField(modelName) || "embedding";
        const metric = args.metric || "cosine";
        const limit = args.limit || 10;

        // Find similar items excluding the parent if it has an ID
        const query = model.query()
          .select(["*"])
          .similaritySearch(field, vector, metric);

        if (parent.id) {
          // Use whereNotIn since $ne operator isn't supported
          query.whereNotIn("id", [String(parent.id)]);
        }

        const results = await query.limit(limit).execute(context.adapter);

        return results.rows.map((record: DatabaseRecord) => {
          const item = toItemModel(record);
          return {
            similarity: item.similarity || 0,
            distance: item.distance || 0,
            score: item.score || item.similarity || 0,
            item,
          };
        });
      },
    },
    Query: {
      // Add searchSimilarXs method for this model type
      [`searchSimilar${modelName}s`]: async (
        _: unknown,
        args: VectorSearchParams,
        context: GraphQLContext,
      ): Promise<SearchResult[]> => {
        await VectorFeaturesLoader.loadVectorFeatures();

        const vector = await processVectorInput(args);
        const model = context.models[modelName];

        if (!model) {
          throw new Error(`Model ${modelName} not found in context`);
        }

        const field = args.field ||
          VectorModelRegistry.getDefaultSearchField(modelName) || "embedding";
        const metric = args.metric || "cosine";
        const limit = args.limit || 10;

        const results = await model.query()
          .select(["*"])
          .similaritySearch(field, vector, metric)
          .limit(limit)
          .execute(context.adapter);

        return results.rows.map((record: DatabaseRecord) => {
          const item = toItemModel(record);
          return {
            similarity: item.similarity || 0,
            distance: item.distance || 0,
            score: item.score || item.similarity || 0,
            item,
          };
        });
      },
    },
  };
}

// Default export
export default vectorResolvers;
