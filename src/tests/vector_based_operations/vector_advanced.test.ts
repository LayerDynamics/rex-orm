import { assertEquals } from "../../../src/deps.ts";
import { assertStringIncludes } from "https://deno.land/std@0.203.0/testing/asserts.ts";
import { QueryBuilder } from "../../query/QueryBuilder.ts";
import { MockDatabaseAdapter } from "../mocks/MockDatabaseAdapter.ts";
import type { QueryParam } from "../../interfaces/DatabaseAdapter.ts";

// Helper function to safely assert string includes with possibly undefined values
function safeAssertStringIncludes(
  actual: string | undefined,
  expected: string,
): void {
  if (actual === undefined) {
    throw new Error(
      `Expected string containing "${expected}", but got undefined`,
    );
  }
  assertStringIncludes(actual, expected);
}

// Advanced vector operations tests
Deno.test("Vector Advanced - Custom vector operation", async () => {
  const adapter = new MockDatabaseAdapter();

  // Set the vector DB configuration
  QueryBuilder.setVectorDBConfig("pgvector");

  const qb = new QueryBuilder();
  const vector = [0.1, 0.2, 0.3, 0.4, 0.5];
  const customSyntax = "{column} <#> {vector}::vector < {threshold}";

  const result = await qb
    .select(["id", "content"])
    .from("documents")
    .customVectorOperation("embedding", vector, customSyntax, {
      threshold: 0.5,
    })
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  safeAssertStringIncludes(result.debug?.query, "embedding");
});

Deno.test("Vector Advanced - Register and use custom vector DB config", async () => {
  const adapter = new MockDatabaseAdapter();

  // Register a custom vector DB configuration
  QueryBuilder.registerVectorDBConfig("custom-vector", {
    knnSyntax: "custom_knn({column}, {vector}, {k})",
    distanceSyntax: "custom_distance({column}, {vector}) AS distance",
    similaritySyntax: "custom_similarity({column}, {vector}) AS similarity",
    vectorMatchSyntax: "custom_match({column}, {vector}, {threshold})",
    embeddingSearchSyntax: "custom_search({column}, {vector}) AS score",
    formatVector: (vector) =>
      `'[${typeof vector === "string" ? vector : vector.join(",")}]'`,
    defaultMetric: "cosine",
    defaultK: 5,
    defaultThreshold: 0.7,
    placement: "WHERE",
  });

  // Set active config to our custom one
  QueryBuilder.setVectorDBConfig("custom-vector");

  // Create a query using the custom config
  const qb = new QueryBuilder();
  const vector = [0.1, 0.2, 0.3, 0.4, 0.5];

  const result = await qb
    .select(["id", "content"])
    .from("documents")
    .knnSearch("embedding", vector)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  safeAssertStringIncludes(result.debug?.query, "custom_knn");

  // Reset to default for other tests
  QueryBuilder.setVectorDBConfig("pgvector");
});

Deno.test("Vector Advanced - Combined vector and text search", async () => {
  const adapter = new MockDatabaseAdapter();

  // Set the vector DB configuration
  QueryBuilder.setVectorDBConfig("pgvector");

  const qb = new QueryBuilder();
  const vector = [0.1, 0.2, 0.3, 0.4, 0.5];

  const result = await qb
    .select(["id", "content", "embedding"])
    .from("documents")
    .knnSearch("embedding", vector, 10)
    .where("category", "=", "news")
    .textSearch(["content", "title"], "machine learning")
    .limit(5)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  safeAssertStringIncludes(result.debug?.query, "embedding");
  safeAssertStringIncludes(result.debug?.query, "category");
  safeAssertStringIncludes(result.debug?.query, "LIMIT 5");
});

Deno.test("Vector Advanced - Hybrid ranking with multiple factors", async () => {
  const adapter = new MockDatabaseAdapter();

  // Set the vector DB configuration
  QueryBuilder.setVectorDBConfig("pgvector");

  const qb = new QueryBuilder();
  const vector = [0.1, 0.2, 0.3, 0.4, 0.5];

  const result = await qb
    .select(["id", "content", "embedding", "created_at", "view_count"])
    .from("documents")
    .knnSearch("embedding", vector, 20)
    .hybridRanking({
      vector: 0.6, // Similarity from vector search
      recency: 0.2, // How recent the document is
      popularity: 0.1, // Based on view_count
      length: 0.05, // Document length
      diversity: 0.05, // Ensure diverse results
    })
    .limit(10)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  safeAssertStringIncludes(result.debug?.query, "embedding");
  safeAssertStringIncludes(result.debug?.query, "ORDER BY");
});

Deno.test("Vector Advanced - Vector operation with custom formatting", async () => {
  const adapter = new MockDatabaseAdapter();

  // Register a config with custom formatter
  QueryBuilder.registerVectorDBConfig("custom-formatter", {
    knnSyntax: "IRRELEVANT - REPLACED BY FORMATTER",
    distanceSyntax: "IRRELEVANT - REPLACED BY FORMATTER",
    similaritySyntax: "IRRELEVANT - REPLACED BY FORMATTER",
    vectorMatchSyntax: "IRRELEVANT - REPLACED BY FORMATTER",
    embeddingSearchSyntax: "IRRELEVANT - REPLACED BY FORMATTER",
    formatVector: (vector) =>
      `'[${typeof vector === "string" ? vector : vector.join(",")}]'`,
    defaultMetric: "cosine",
    defaultK: 5,
    defaultThreshold: 0.7,
    placement: "WHERE",
    customFormatter: (op, paramIndex) => {
      // Generate custom SQL for specific operation
      let clause = "";
      const params: QueryParam[] = [];

      if (op.operation === "KNN") {
        clause = `vector_search(${op.column}, ${op.options?.k || 5})`;
      } else if (op.operation === "SIMILARITY") {
        clause = `similarity_measure(${op.column}) > 0.8`;
      }

      return {
        clause,
        params,
        nextParamIndex: paramIndex,
      };
    },
  });

  // Set active config to our custom formatter
  QueryBuilder.setVectorDBConfig("custom-formatter");

  // Create a query using the custom formatter
  const qb = new QueryBuilder();
  const vector = [0.1, 0.2, 0.3, 0.4, 0.5];

  const result = await qb
    .select(["id", "content"])
    .from("documents")
    .knnSearch("embedding", vector)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  safeAssertStringIncludes(result.debug?.query, "vector_search");

  // Reset to default for other tests
  QueryBuilder.setVectorDBConfig("pgvector");
});

Deno.test("Vector Advanced - Error handling for non-existent vector DB config", async () => {
  // Attempt to use a non-existent vector DB config
  QueryBuilder.setVectorDBConfig("non-existent-config");

  // Verify it fell back to default
  const config = QueryBuilder.getActiveVectorDBConfig();
  assertEquals(config, "default");

  // Actually use the adapter to verify it works with the default config
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();
  const result = await qb
    .select(["id"])
    .from("test_table")
    .execute(adapter);

  assertEquals(result.rowCount, 1);

  // Reset to pgvector for other tests
  QueryBuilder.setVectorDBConfig("pgvector");
});

Deno.test("Vector Advanced - Different vector placements in query", async () => {
  // Create a config that places vector operations in ORDER BY
  QueryBuilder.registerVectorDBConfig("order-by-placement", {
    knnSyntax: "{column} <-> {vector}::vector",
    distanceSyntax: "{column} <-> {vector}::vector AS distance",
    similaritySyntax: "1 - ({column} <=> {vector}::vector) AS similarity",
    vectorMatchSyntax: "{column} <-> {vector}::vector < {threshold}",
    embeddingSearchSyntax: "{column} <=> {vector}::vector AS score",
    formatVector: (vector) =>
      `'[${typeof vector === "string" ? vector : vector.join(",")}]'`,
    defaultMetric: "cosine",
    defaultK: 5,
    defaultThreshold: 0.7,
    placement: "ORDER_BY", // Place in ORDER BY instead of WHERE
  });

  // Set active config to our ORDER BY placement
  QueryBuilder.setVectorDBConfig("order-by-placement");

  // Create a query using the ORDER BY placement
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();
  const vector = [0.1, 0.2, 0.3, 0.4, 0.5];

  const result = await qb
    .select(["id", "content"])
    .from("documents")
    .knnSearch("embedding", vector)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  safeAssertStringIncludes(result.debug?.query, "ORDER BY");

  // Reset to default for other tests
  QueryBuilder.setVectorDBConfig("pgvector");
});
