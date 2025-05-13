// GraphQL type definitions for vector operations
// This file defines the GraphQL schema elements for vector-based operations

import { gql } from "../../deps.ts";
import { VectorConfigManager } from "../config/VectorConfigManager.ts";
import type { DocumentNode } from "https://deno.land/x/graphql_deno@v15.0.0/mod.ts";

/**
 * GraphQL type definitions for vector operations.
 * These types provide support for vector search, similarity matching,
 * and recommendation capabilities in GraphQL schemas.
 */
export const vectorTypeDefs = gql`
  # Vector input type for passing vector data
  input VectorInput {
    values: [Float!]!
    text: String  # Optional text to generate vector from
  }
  
  # Vector search parameters
  input VectorSearchInput {
    vector: VectorInput
    text: String           # Text to search (will be converted to vector)
    field: String          # Vector field to search against
    limit: Int = 10        # Number of results to return
    offset: Int = 0        # Offset for pagination
    metric: String = "cosine"  # Distance metric (cosine, euclidean, dot)
    threshold: Float       # Similarity threshold
  }
  
  # Hybrid search parameters (vector + text)
  input HybridSearchInput {
    vector: VectorInput    # Vector data
    text: String           # Text query for keyword search
    vectorField: String    # Vector field name
    textFields: [String!]  # Text fields to search
    limit: Int = 10        # Number of results
    vectorWeight: Float = 0.7  # Weight for vector results (0-1)
    textWeight: Float = 0.3    # Weight for text results (0-1)
    strategy: String = "vector-first"  # Search strategy
  }
  
  # Vector similarity result type
  type VectorSimilarityResult {
    # Similarity score (0-1, higher is more similar)
    similarity: Float
    
    # Distance value (lower is closer)
    distance: Float
    
    # The raw score value (interpretation depends on metric)
    score: Float
    
    # The matched item (generic type, will be replaced in implementation)
    item: Item
  }
  
  # Placeholder for generic item type
  # This will be extended by concrete types in the actual implementation
  interface Item {
    id: ID!
  }
  
  # Add to existing Query type
  extend type Query {
    # Find items similar to a vector
    searchSimilarItems(search: VectorSearchInput!): [VectorSimilarityResult!]!
    
    # Recommend items based on vector similarity
    recommendItems(search: VectorSearchInput!): [VectorSimilarityResult!]!
    
    # Search using both vector and text (hybrid search)
    hybridSearch(search: HybridSearchInput!): [VectorSimilarityResult!]!
  }
`;

/**
 * Get the vector types for a specific model.
 * This function adds model-specific vector operations.
 *
 * @param modelName The name of the model to add vector types for
 * @returns GraphQL type definitions for the model
 */
export function getModelVectorTypes(modelName: string): DocumentNode | string {
  if (!VectorConfigManager.isEnabled()) {
    return "";
  }

  return gql`
    extend type ${modelName} {
      # Find similar ${modelName} items
      findSimilar(
        vector: VectorInput, 
        text: String, 
        limit: Int = 10,
        metric: String = "cosine"
      ): [VectorSimilarityResult!]!
    }
    
    extend type Query {
      # Find ${modelName} items similar to input
      searchSimilar${modelName}s(search: VectorSearchInput!): [VectorSimilarityResult!]!
    }
  `;
}

/**
 * Creates a customized set of vector type definitions with the given model name.
 *
 * @param modelName The name of the model to create vector types for
 * @returns GraphQL type definitions with the model name substituted
 */
export function createModelSpecificVectorTypes(
  modelName: string,
): DocumentNode | string {
  if (!VectorConfigManager.isEnabled()) {
    return "";
  }

  return gql`
    type ${modelName}SimilarityResult {
      similarity: Float
      distance: Float
      score: Float
      item: ${modelName}
    }
    
    extend type Query {
      searchSimilar${modelName}s(
        vector: VectorInput, 
        text: String,
        field: String,
        limit: Int = 10,
        metric: String = "cosine"
      ): [${modelName}SimilarityResult!]!
    }
  `;
}

// Export default empty string for conditional importing
export default vectorTypeDefs;
