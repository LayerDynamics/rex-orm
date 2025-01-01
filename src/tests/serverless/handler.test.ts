import { assertEquals, assertExists } from "https://deno.land/std/testing/asserts.ts";
import { graphqlHandler, realtimeHandler } from "../../serverless/handler.ts";
import { ModelRegistry } from "../../models/ModelRegistry.ts";
import { User } from "../../models/User.ts";
import { Post } from "../../models/Post.ts";

// Mock environment setup
const mockEnv = {
  DATABASE_TYPE: "sqlite",
  DATABASE_URL: ":memory:",
  REALTIME_PORT: "8081",
  GRAPHQL_PORT: "4001",
};

// Keep track of active connections for cleanup
const activeConnections = new Set<string>();

// Mock RealTimeSync implementation
const mockRealTimeSync = {
  connect: async (connectionId: string) => {
    activeConnections.add(connectionId);
  },
  disconnect: async (connectionId: string) => {
    activeConnections.delete(connectionId);
  },
  message: async () => {},
  start: async () => {},
};

// Setup environment
Object.entries(mockEnv).forEach(([key, value]) => {
  Deno.env.set(key, value);
});

// Register test models
ModelRegistry.registerModel(User);
ModelRegistry.registerModel(Post);

Deno.test({
  name: "Serverless Handler Tests",
  sanitizeResources: false, // We'll handle cleanup manually
  sanitizeOps: false,      // Disable op sanitization since we're mocking
  async fn(t) {
    // Cleanup helper function
    const cleanup = async () => {
      for (const connectionId of activeConnections) {
        await mockRealTimeSync.disconnect(connectionId);
      }
    };

    await t.step("graphqlHandler - process valid query", async () => {
      await cleanup(); // Run cleanup before test
      const queryEvent = {
        httpMethod: "POST",
        body: JSON.stringify({
          query: `
            query {
              getUser(id: 1) {
                id
                name
                email
              }
            }
          `,
          variables: {},
        }),
        headers: {},
      };

      const response = await graphqlHandler(queryEvent, {});
      assertEquals(response.statusCode, 200);
      assertExists(JSON.parse(response.body).data);
      await cleanup(); // Run cleanup after test
    });

    await t.step("graphqlHandler - handle CORS preflight", async () => {
      await cleanup();
      const optionsEvent = {
        httpMethod: "OPTIONS",
        headers: {
          "Access-Control-Request-Method": "POST",
          "Origin": "http://localhost:3000",
        },
      };

      const response = await graphqlHandler(optionsEvent, {});
      assertEquals(response.statusCode, 200);
      assertEquals(response.headers["Access-Control-Allow-Origin"], "*");
      await cleanup();
    });

    await t.step("realtimeHandler - process WebSocket connect", async () => {
      await cleanup();
      const connectEvent = {
        requestContext: {
          eventType: "CONNECT",
          connectionId: "test-connection-id",
        },
      };

      const response = await realtimeHandler(connectEvent, {});
      assertEquals(response.statusCode, 200);
      await cleanup();
    });

    await t.step("realtimeHandler - process WebSocket message", async () => {
      await cleanup();
      const messageEvent = {
        requestContext: {
          eventType: "MESSAGE",
          connectionId: "test-connection-id",
        },
        body: JSON.stringify({
          type: "subscribe",
          modelName: "User",
          eventTypes: ["CREATE", "UPDATE"],
        }),
      };

      const response = await realtimeHandler(messageEvent, {});
      assertEquals(response.statusCode, 200);
      await cleanup();
    });

    await t.step("realtimeHandler - handle invalid event type", async () => {
      await cleanup();
      const invalidEvent = {
        requestContext: {
          eventType: "INVALID",
          connectionId: "test-connection-id",
        },
      };

      const response = await realtimeHandler(invalidEvent, {});
      assertEquals(response.statusCode, 400);
      await cleanup();
    });

    // Final cleanup
    await cleanup();
  },
});
