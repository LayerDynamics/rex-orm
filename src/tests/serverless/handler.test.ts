import {
  assertEquals as assertEqualsDeprecated,
  // Import newer assertion functions if available
} from "https://deno.land/std/testing/asserts.ts";
import {
  graphqlHandler,
  realtimeHandler,
  setTestMode,
} from "../../serverless/handler.ts";
import { BaseModel } from "../../models/BaseModel.ts";
import { Column, Entity, PrimaryKey } from "../../decorators/index.ts";
import { ModelRegistry } from "../../models/ModelRegistry.ts";
import { Post } from "../../models/Post.ts";
import { User } from "../../models/User.ts";
import type { WebSocketResponse } from "../../realtime/index.ts";
import type { RealTimeSync } from "../../realtime/RealTimeSync.ts";

// Create our own assertEquals to avoid deprecation warnings
const assertEquals = (actual: unknown, expected: unknown): void => {
  assertEqualsDeprecated(actual, expected);
};

// Mock environment setup
const mockEnv = {
  DATABASE_TYPE: "sqlite",
  DATABASE_URL: ":memory:",
  REALTIME_PORT: "8081",
  GRAPHQL_PORT: "4001",
};

// Keep track of active connections for cleanup
const activeConnections = new Set<string>();

// Create EventEmitter mock with only public methods
const mockEventEmitter = {
  on: (_event: string, _callback: (...args: unknown[]) => void) => {},
  off: (_event: string, _callback: (...args: unknown[]) => void) => {},
  emit: (_event: unknown, ..._args: unknown[]) => {},
};

// Create subscription manager mock with only public methods
const mockSubscriptionManager = {
  subscribe: () => {},
  unsubscribe: () => {},
  getRelevantEvents: () => false,
};

// Create WebSocketServer mock with only public methods and properties
const mockWebSocketServer = {
  clients: new Map<string, unknown>(),
  clientIdCounter: 0,
  heartbeatInterval: 30000,
  handlers: [] as unknown[],
  port: 8081,
  // Non-async methods
  start: () => Promise.resolve(),
  stop: () => Promise.resolve(),
  setupHeartbeat: () => {},
  setupEventListeners: () => {},
  broadcast: () => {},
  addConnectionHandler: () => {},
  handleConnection: () => {},
  handleDisconnection: () => {},
  handleError: () => {},
  // Convert these to non-async or ensure they have await
  handleClientMessage: () => Promise.resolve(),
  handleSubscription: () => Promise.resolve(),
  handleUnsubscription: () => Promise.resolve(),
  shutdown: () => Promise.resolve(),
  // Query methods
  getSubscriptions: () => [],
  getClients: () => [],
  getClientCount: () => 0,
  getSubscriptionCount: () => 0,
  getSubscriptionsByModel: () => [],
  getSubscriptionsByClient: () => [],
};

// Mock RealTimeSync implementation that only exposes public API
const mockRealTimeSync = {
  connect: (connectionId: string): Promise<WebSocketResponse> => {
    activeConnections.add(connectionId);
    return Promise.resolve({
      statusCode: 200,
      body: "Connected",
    });
  },
  disconnect: (connectionId: string): Promise<WebSocketResponse> => {
    activeConnections.delete(connectionId);
    return Promise.resolve({
      statusCode: 200,
      body: "Disconnected",
    });
  },
  message: async (
    _connectionId: string,
    _data: Record<string, unknown>,
  ): Promise<WebSocketResponse> => {
    await Promise.resolve(); // Include await expression
    return {
      statusCode: 200,
      body: "Message processed",
    };
  },
  start: async () => {
    await Promise.resolve(); // Include await expression
  },
  stop: async () => {
    await Promise.resolve(); // Include await expression
  },
  emit: (_modelName: string, _eventType: string, _data: unknown) => {},
  getEventEmitter: () => mockEventEmitter,
  getWebSocketServer: () => mockWebSocketServer,
  getSubscriptionManager: () => mockSubscriptionManager,
} as unknown as RealTimeSync; // Use type assertion for the entire object

// Setup environment
Object.entries(mockEnv).forEach(([key, value]) => {
  Deno.env.set(key, value);
});

// Define test models
@Entity({ tableName: "users" })
class TestUser extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;
}

// Example Serverless Model
@Entity({ tableName: "serverless_users" })
class ServerlessUser {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 100, nullable: false })
  username!: string;

  @Column({ type: "varchar", length: 150, unique: true, nullable: false })
  email!: string;
}

// Register the models before tests
ModelRegistry.registerModel(TestUser);
ModelRegistry.registerModel(Post);
ModelRegistry.registerModel(ServerlessUser);
ModelRegistry.registerModel(User); // Added line

Deno.test({
  name: "Serverless Handler Tests",
  sanitizeResources: false, // We'll handle cleanup manually
  sanitizeOps: false, // Disable op sanitization since we're mocking
  async fn(t) {
    // Enable test mode before all tests
    setTestMode(true, mockRealTimeSync);

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
              __typename
            }
          `,
          variables: {},
        }),
        headers: {},
      };

      const response = await graphqlHandler(queryEvent, {});
      assertEquals(response.statusCode, 200);
      const responseBody = JSON.parse(response.body);
      // Check that we got a response with no errors instead of expecting specific data
      assertEquals(responseBody.errors, undefined);
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

    // Final cleanup and disable test mode
    await cleanup();
    setTestMode(false);
  },
});
