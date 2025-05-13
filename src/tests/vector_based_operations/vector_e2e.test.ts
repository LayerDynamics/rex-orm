import { assert, assertEquals } from "../../../src/deps.ts";
import { assertStringIncludes } from "https://deno.land/std@0.203.0/testing/asserts.ts";
import { QueryBuilder } from "../../query/QueryBuilder.ts";
import { MockDatabaseAdapter } from "../mocks/MockDatabaseAdapter.ts";

// End-to-end vector search tests
// These tests simulate real-world vector search scenarios

// Helper function to safely check string includes with undefined handling
function safeAssertStringIncludes(
  actual: string | undefined,
  expected: string,
): void {
  assert(
    actual !== undefined,
    `Expected string to contain "${expected}" but got undefined`,
  );
  if (actual !== undefined) {
    assertStringIncludes(actual, expected);
  }
}

// Set up vector DB configuration before tests
// This mimics a real application setup with pgvector
Deno.test({
  name: "Vector E2E - Semantic document search workflow",
  fn: async () => {
    const adapter = new MockDatabaseAdapter();

    // Set the vector DB configuration to pgvector
    QueryBuilder.setVectorDBConfig("pgvector");

    // Create a query for semantic document search
    const qb = new QueryBuilder();

    // Simulate an embedding vector from a text embedding model
    const queryEmbedding = [0.12, 0.23, 0.34, 0.45, 0.56, 0.67, 0.78, 0.89];

    // Perform semantic search with hybrid ranking
    const result = await qb
      .select([
        "id",
        "title",
        "content",
        "embedding",
        "created_at",
        "view_count",
      ])
      .from("documents")
      // KNN vector search for semantic similarity
      .knnSearch("embedding", queryEmbedding, 50)
      // Filter documents by metadata
      .where("is_public", "=", true)
      .where("language", "=", "en")
      // Apply hybrid ranking for better results
      .hybridRanking({
        vector: 0.65, // Semantic similarity is primary factor
        recency: 0.2, // Prefer more recent documents
        popularity: 0.15, // Consider view count
      })
      // Get top 10 results
      .limit(10)
      .execute(adapter);

    assertEquals(result.rowCount, 1);
    safeAssertStringIncludes(result.debug?.query, "embedding");
    safeAssertStringIncludes(result.debug?.query, "is_public");
    safeAssertStringIncludes(result.debug?.query, "language");
    safeAssertStringIncludes(result.debug?.query, "ORDER BY");
    safeAssertStringIncludes(result.debug?.query, "LIMIT 10");
  },
});

Deno.test({
  name: "Vector E2E - Product recommendation engine",
  fn: async () => {
    const adapter = new MockDatabaseAdapter();

    // Set the vector DB configuration
    QueryBuilder.setVectorDBConfig("pgvector");

    // Create a query for product recommendations
    const qb = new QueryBuilder();

    // Simulate a user's preference vector (could be derived from past behavior)
    const userPreferenceVector = [0.1, -0.3, 0.5, 0.7, -0.2, 0.4, 0.1, 0.8];

    // Perform recommendation search
    const result = await qb
      .select([
        "products.id",
        "products.name",
        "products.description",
        "products.price",
        "products.embedding",
        "products.category",
        "products.rating",
      ])
      .from("products")
      // Find products similar to user preferences
      .similaritySearch("embedding", userPreferenceVector)
      // Only include available products
      .where("in_stock", "=", true)
      // Filter by price range
      .whereBetween("price", 10, 100)
      // Order by similarity but also consider rating
      .orderBy("similarity", "DESC")
      .orderBy("rating", "DESC")
      // Pagination
      .limit(8)
      .execute(adapter);

    assertEquals(result.rowCount, 1);
    safeAssertStringIncludes(result.debug?.query, "embedding");
    safeAssertStringIncludes(result.debug?.query, "in_stock");
    safeAssertStringIncludes(result.debug?.query, "price BETWEEN");
    safeAssertStringIncludes(result.debug?.query, "ORDER BY");
    safeAssertStringIncludes(result.debug?.query, "LIMIT 8");
  },
});

Deno.test({
  name: "Vector E2E - Nearest neighbors with fallback search",
  fn: async () => {
    const adapter = new MockDatabaseAdapter();

    // Set the vector DB configuration
    QueryBuilder.setVectorDBConfig("pgvector");

    // Create a query for KNN search with keyword fallback
    const qb = new QueryBuilder();

    // Simulate a query embedding vector
    const queryVector = [0.2, 0.3, 0.1, 0.7, 0.2, 0.1, 0.5, 0.3];
    const searchTerms = "machine learning clustering algorithm";

    // Perform vector search with text search fallback
    const result = await qb
      .select([
        "articles.id",
        "articles.title",
        "articles.abstract",
        "articles.embedding",
        "articles.published_date",
        "articles.author_id",
      ])
      .from("articles")
      // Primary: KNN vector search
      .knnSearch("embedding", queryVector, 20)
      // Add text search component for hybrid search
      .textSearch(["title", "abstract", "keywords"], searchTerms)
      // Join with authors table
      .leftJoin("authors", "articles.author_id", "=", "authors.id")
      // Add author name to results
      .select(["authors.name AS author_name"])
      // Filter by date range
      .where("published_date", ">", new Date("2020-01-01"))
      // Limit results
      .limit(10)
      .execute(adapter);

    assertEquals(result.rowCount, 1);
    safeAssertStringIncludes(result.debug?.query, "embedding");
    safeAssertStringIncludes(result.debug?.query, "LEFT JOIN authors");
    safeAssertStringIncludes(result.debug?.query, "published_date");
    safeAssertStringIncludes(result.debug?.query, "LIMIT 10");
  },
});

Deno.test({
  name: "Vector E2E - Multi-stage vector search",
  fn: async () => {
    const adapter = new MockDatabaseAdapter();

    // Set the vector DB configuration
    QueryBuilder.setVectorDBConfig("pgvector");

    // Stage 1: Get candidate documents using KNN search
    const stage1Query = new QueryBuilder();
    const queryVector = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

    const candidateIds = await stage1Query
      .select(["id"])
      .from("documents")
      .knnSearch("embedding", queryVector, 100)
      .execute(adapter);

    // Stage 2: Re-rank candidates with more complex criteria
    const stage2Query = new QueryBuilder();

    // Extract IDs from the first stage results
    // In a real scenario, we would extract the IDs from the candidateIds result
    // Ensure idList contains proper query parameters (numbers in this case)
    const idList: number[] = candidateIds.rows?.[0]?.id
      ? [Number(candidateIds.rows[0].id)]
      : [1, 2, 3, 4, 5]; // Fallback for mock data

    const finalResults = await stage2Query
      .select([
        "id",
        "title",
        "content",
        "created_at",
        "author",
        "category",
      ])
      .from("documents")
      .whereIn("id", idList)
      // Apply business rules to re-rank
      .where("is_verified", "=", true)
      // Use raw SQL for complex scoring
      .rawSql(`
        (
          CASE 
            WHEN category = 'premium' THEN 2 
            ELSE 1 
          END * 
          EXTRACT(EPOCH FROM (NOW() - created_at))/86400
        ) AS recency_score
      `)
      // Order by custom scoring
      .orderBy("recency_score", "ASC")
      .limit(5)
      .execute(adapter);

    assertEquals(finalResults.rowCount, 1);
    safeAssertStringIncludes(finalResults.debug?.query, "id IN");
    safeAssertStringIncludes(finalResults.debug?.query, "is_verified");
    safeAssertStringIncludes(finalResults.debug?.query, "recency_score");
    safeAssertStringIncludes(finalResults.debug?.query, "LIMIT 5");
  },
});

Deno.test({
  name: "Vector E2E - Different vector DB configurations for different tables",
  fn: async () => {
    const adapter = new MockDatabaseAdapter();

    // Register SQLite VSS configuration for products
    QueryBuilder.registerVectorDBConfig("sqlite-vss", {
      knnSyntax: "vss_search({column}, {vector}, {k})",
      distanceSyntax: "vss_distance({column}, {vector}) AS distance",
      similaritySyntax: "vss_similarity({column}, {vector}) AS similarity",
      vectorMatchSyntax: "vss_similarity({column}, {vector}) > {threshold}",
      embeddingSearchSyntax: "vss_search({column}, {vector}) AS score",
      formatVector: (vector) =>
        `'${typeof vector === "string" ? vector : JSON.stringify(vector)}'`,
      defaultMetric: "cosine",
      defaultK: 5,
      defaultThreshold: 0.7,
      placement: "WHERE",
    });

    // Query 1: Using pgvector for documents
    const documentsQuery = new QueryBuilder();
    const textVector = [0.1, 0.2, 0.3, 0.4, 0.5];

    QueryBuilder.setVectorDBConfig("pgvector");

    const documentsResult = await documentsQuery
      .select(["id", "title", "content"])
      .from("documents")
      .knnSearch("embedding", textVector, 5)
      .execute(adapter);

    // Query 2: Using SQLite VSS for products
    const productsQuery = new QueryBuilder();
    const productVector = [0.5, 0.6, 0.7, 0.8, 0.9];

    // Switch to SQLite VSS for this specific query
    const productsResult = await productsQuery
      .select(["id", "name", "description"])
      .from("products")
      .useVectorDB("sqlite-vss") // Override for this specific query
      .knnSearch("embedding", productVector, 5)
      .execute(adapter);

    assertEquals(documentsResult.rowCount, 1);
    assertEquals(productsResult.rowCount, 1);

    // Documents query should use pgvector syntax
    safeAssertStringIncludes(documentsResult.debug?.query, "<->");

    // Products query should use SQLite VSS syntax
    safeAssertStringIncludes(productsResult.debug?.query, "vss_search");

    // Global config should still be pgvector
    assertEquals(QueryBuilder.getActiveVectorDBConfig(), "pgvector");
  },
});
