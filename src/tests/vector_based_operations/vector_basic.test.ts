import { assertEquals } from "../../../src/deps.ts";
import { assertStringIncludes } from "https://deno.land/std@0.203.0/testing/asserts.ts";
import { QueryBuilder } from "../../query/QueryBuilder.ts";
import { MockDatabaseAdapter } from "../mocks/MockDatabaseAdapter.ts";

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

// Basic vector operations tests
Deno.test("Vector Basic - KNN search operation", async () => {
  const adapter = new MockDatabaseAdapter();

  // Set the vector DB configuration
  QueryBuilder.setVectorDBConfig("pgvector");

  const qb = new QueryBuilder();
  const vector = [0.1, 0.2, 0.3, 0.4, 0.5];

  const result = await qb
    .select(["id", "content", "embedding"])
    .from("documents")
    .knnSearch("embedding", vector, 5)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  safeAssertStringIncludes(result.debug?.query, "embedding");
  // Verify that the generated query contains the vector search components
  safeAssertStringIncludes(result.debug?.query, "ORDER BY");
});

Deno.test("Vector Basic - Similarity search operation", async () => {
  const adapter = new MockDatabaseAdapter();

  // Set the vector DB configuration
  QueryBuilder.setVectorDBConfig("pgvector");

  const qb = new QueryBuilder();
  const vector = [0.1, 0.2, 0.3, 0.4, 0.5];

  const result = await qb
    .select(["id", "content"])
    .from("documents")
    .similaritySearch("embedding", vector, "cosine")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  safeAssertStringIncludes(result.debug?.query, "embedding");
  safeAssertStringIncludes(result.debug?.query, "similarity");
});

Deno.test("Vector Basic - Distance search operation", async () => {
  const adapter = new MockDatabaseAdapter();

  // Set the vector DB configuration
  QueryBuilder.setVectorDBConfig("pgvector");

  const qb = new QueryBuilder();
  const vector = [0.1, 0.2, 0.3, 0.4, 0.5];

  const result = await qb
    .select(["id", "content"])
    .from("documents")
    .distanceSearch("embedding", vector, "euclidean")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  safeAssertStringIncludes(result.debug?.query, "embedding");
  safeAssertStringIncludes(result.debug?.query, "distance");
});

Deno.test("Vector Basic - Vector match operation", async () => {
  const adapter = new MockDatabaseAdapter();

  // Set the vector DB configuration
  QueryBuilder.setVectorDBConfig("pgvector");

  const qb = new QueryBuilder();
  const vector = [0.1, 0.2, 0.3, 0.4, 0.5];

  const result = await qb
    .select(["id", "content"])
    .from("documents")
    .vectorMatch("embedding", vector, 0.7, "cosine")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  safeAssertStringIncludes(result.debug?.query, "embedding");
});

Deno.test("Vector Basic - Cosine similarity operation", async () => {
  const adapter = new MockDatabaseAdapter();

  // Set the vector DB configuration
  QueryBuilder.setVectorDBConfig("pgvector");

  const qb = new QueryBuilder();
  const vector = [0.1, 0.2, 0.3, 0.4, 0.5];

  const result = await qb
    .select(["id", "content"])
    .from("documents")
    .cosineSimilarity("embedding", vector, 0.8)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  safeAssertStringIncludes(result.debug?.query, "embedding");
});

Deno.test("Vector Basic - Vector DB configuration switching", () => {
  // First use pgvector config
  QueryBuilder.setVectorDBConfig("pgvector");

  // Get the current config
  const config = QueryBuilder.getActiveVectorDBConfig();
  assertEquals(config, "pgvector");

  // Switch to default config
  QueryBuilder.setVectorDBConfig("default");

  // Get the updated config
  const newConfig = QueryBuilder.getActiveVectorDBConfig();
  assertEquals(newConfig, "default");
});

Deno.test("Vector Basic - Query-specific vector DB configuration", async () => {
  const adapter = new MockDatabaseAdapter();

  // Set global config to pgvector
  QueryBuilder.setVectorDBConfig("pgvector");

  // Create query with specific vector DB config
  const qb = new QueryBuilder();
  const vector = [0.1, 0.2, 0.3, 0.4, 0.5];

  const result = await qb
    .select(["id", "content"])
    .from("documents")
    .useVectorDB("default") // Override for this specific query
    .knnSearch("embedding", vector, 5)
    .execute(adapter);

  assertEquals(result.rowCount, 1);

  // Verify global config didn't change
  const globalConfig = QueryBuilder.getActiveVectorDBConfig();
  assertEquals(globalConfig, "pgvector");
});
