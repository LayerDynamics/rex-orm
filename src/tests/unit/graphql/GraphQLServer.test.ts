import "reflect-metadata";
import { assertEquals } from "../../../deps.ts";
import * as graphql from "https://deno.land/x/graphql_deno@v15.0.0/mod.ts";
import { ModelRegistry } from "../../../models/ModelRegistry.ts";
import { User } from "../../../models/User.ts";
import { Post } from "../../../models/Post.ts";
import { GraphQLServerWrapper } from "../../../graphql/GraphQLServer.ts";
import { GraphQLSchemaConfig } from "../../../graphql/types.ts";
import { DatabaseAdapter } from "../../../interfaces/DatabaseAdapter.ts";

// Initialize required metadata
Reflect.defineMetadata("validations", {}, Object.prototype);
Reflect.defineMetadata("relations", [], Object.prototype);

/**
 * Create a mock database adapter for testing GraphQL functionality
 */
function createMockAdapter(): DatabaseAdapter {
  // Create a simple in-memory mock adapter
  return {
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    execute: () => Promise.resolve({ rows: [], rowCount: 0 }),
    executeMany: (_query: string, paramSets: unknown[][]) =>
      Promise.resolve({ rows: [], rowCount: paramSets.length }),
    beginTransaction: () => Promise.resolve(),
    commit: () => Promise.resolve(),
    rollback: () => Promise.resolve(),
    transaction: async <T>(
      callback: (adapter: DatabaseAdapter) => Promise<T>,
    ) => {
      await Promise.resolve();
      try {
        return await callback({
          connect: () => Promise.resolve(),
          disconnect: () => Promise.resolve(),
          execute: () => Promise.resolve({ rows: [], rowCount: 0 }),
          executeMany: () => Promise.resolve({ rows: [], rowCount: 0 }),
          beginTransaction: () => Promise.resolve(),
          commit: () => Promise.resolve(),
          rollback: () => Promise.resolve(),
          transaction: () =>
            Promise.reject(
              new Error("Nested transactions not supported in mock"),
            ),
          findById: () => Promise.resolve(null),
          findAll: () => Promise.resolve([]),
          queryCount: 0,
          connected: false,
          getType: () => "mock",
          query: () => Promise.resolve({ rows: [], rowCount: 0 }),
          getVectorCapabilities: () =>
            Promise.resolve({
              supportedIndexTypes: ["mock"],
              supportedMetrics: ["cosine"],
              maxDimensions: 1536,
            }),
        });
      } catch (error) {
        await Promise.resolve();
        throw error;
      }
    },
    findById: () => Promise.resolve(null),
    findAll: () => Promise.resolve([]),
    queryCount: 0,
    connected: false,
    getType: () => "mock",
    query: () => Promise.resolve({ rows: [], rowCount: 0 }),
    getVectorCapabilities: () =>
      Promise.resolve({
        supportedIndexTypes: ["mock"],
        supportedMetrics: ["cosine"],
        maxDimensions: 1536,
      }),
  };
}

// Use a higher port range to avoid conflicts
const TEST_PORT = 4567;

// This is a special version that doesn't wait for the server to stop
class TestGraphQLServerWrapper extends GraphQLServerWrapper {
  override async start(): Promise<void> {
    // Create a non-blocking start method by running the parent method in the background
    setTimeout(() => {
      super.start().catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Error starting GraphQL server:", error);
        }
      });
    }, 0);

    // Wait a small amount to ensure server has started
    await new Promise((resolve) => setTimeout(resolve, 200));
    return Promise.resolve();
  }
}

Deno.test({
  name: "GraphQL Server Integration Tests",
  fn: async () => {
    // Create mock adapter
    const adapter = createMockAdapter();
    let server: TestGraphQLServerWrapper | null = null;

    // Clear and register models
    ModelRegistry.clear();
    ModelRegistry.registerModel(User);
    ModelRegistry.registerModel(Post);

    const schemaConfig: GraphQLSchemaConfig = {
      types: {
        User: new graphql.GraphQLObjectType({
          name: "User",
          fields: {
            id: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
          },
        }),
      },
      queries: {
        getUser: {
          type: new graphql.GraphQLObjectType({
            name: "User",
            fields: {
              id: { type: graphql.GraphQLString },
            },
          }),
          args: {
            id: { type: graphql.GraphQLString },
          },
          resolve: () => null, // Simple resolver that returns null
        },
      },
      mutations: {},
      subscriptions: {},
    };

    try {
      // Create server with fixed port and our test wrapper
      server = new TestGraphQLServerWrapper(
        schemaConfig,
        { adapter },
        { port: TEST_PORT },
      );

      // Test server starts
      await server.start();
      assertEquals(server.isServerRunning(), true, "Server should be running");

      // Test query execution
      const query = `query { getUser(id: "1") { id } }`;
      const response = await fetch(`http://localhost:${TEST_PORT}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();
      assertEquals(result.data.getUser, null, "Query should return null");
    } finally {
      // Ensure server is always stopped
      if (server && server.isServerRunning()) {
        try {
          await server.stop();
          // Wait a moment to ensure resources are released
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          console.error("Error stopping server:", error);
        }
      }
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
