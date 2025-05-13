// benchmarks/realtime/sync_performance.ts

import { DatabaseFactory } from "../../src/factory/DatabaseFactory.ts";
import { BaseModel } from "../../src/models/BaseModel.ts";
import { Column, Entity, PrimaryKey } from "../../src/decorators/index.ts";
import { RealTimeSyncImpl } from "../../src/realtime/index.ts";
import { EventEmitter } from "../../src/realtime/EventEmitter.ts";
import { ModelEvent, ModelEventType } from "../../src/models/types.ts";

// Import the Event type from the types.ts file where it's actually defined
import { Event } from "../../src/realtime/types.ts";

// Define interfaces for event handling
interface EventPayload {
  id: number;
  [key: string]: unknown;
}

// Create a type that works with both ModelEvent and EventEmitter's Event
interface SyncEvent {
  type: ModelEventType;
  payload: EventPayload;
  model?: string; // Make model optional to work with both types
}

// Create a type for the emit method parameter to replace 'any'
type EmitEventParam = ModelEvent | {
  type: ModelEventType;
  payload: Record<string, unknown>;
  [key: string]: unknown;
};

// Setup test model
@Entity({ tableName: "bench_notifications" })
class BenchNotification extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "boolean", nullable: true })
  read?: boolean;

  @Column({ type: "timestamp" })
  createdAt!: Date;

  // Map camelCase property names to snake_case database column names
  static columnMappings: Record<string, string> = {
    createdAt: "created_at",
  };
}

// Setup database
async function setupTestDatabase() {
  const config = {
    database: "sqlite",
    databasePath: ":memory:",
  };

  const adapter = DatabaseFactory.createAdapter(config);
  await adapter.connect();

  // Set pragmas for better performance in benchmarks
  await adapter.execute("PRAGMA journal_mode = OFF;");
  await adapter.execute("PRAGMA synchronous = OFF;");
  await adapter.execute("PRAGMA cache_size = 1000000;");
  await adapter.execute("PRAGMA temp_store = MEMORY;");
  await adapter.execute("PRAGMA locking_mode = EXCLUSIVE;");

  // Create test table
  await adapter.execute(`
    CREATE TABLE IF NOT EXISTS bench_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read BOOLEAN,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return adapter;
}

// Create mock WebSocket server that counts events
class MockWebSocketServer {
  eventCount = 0;

  broadcast(_message: string) {
    this.eventCount++;
  }

  async start() {
    // Mock implementation
  }

  async shutdown() {
    // Mock implementation
  }
}

// Create a mock event handler to count events
class EventCounter {
  count = 0;

  handleEvent() {
    this.count++;
  }
}

// Register real-time sync benchmarks
Deno.bench("RealTime: Event Emission Speed (100 events)", (b) => {
  // Create an event emitter
  const emitter = new EventEmitter();
  const counter = new EventCounter();

  // Subscribe to events
  emitter.on("CREATE", counter.handleEvent.bind(counter));
  emitter.on("UPDATE", counter.handleEvent.bind(counter));
  emitter.on("DELETE", counter.handleEvent.bind(counter));

  b.start();

  // Emit 100 events
  for (let i = 0; i < 100; i++) {
    const eventType = i % 3 === 0
      ? "CREATE"
      : i % 3 === 1
      ? "UPDATE"
      : "DELETE";
    emitter.emit({
      type: eventType,
      payload: { id: i, name: `Test ${i}` },
    });
  }

  b.end();

  // Verify events were processed
  if (counter.count !== 100) {
    throw new Error(
      `Expected 100 events to be processed, but got ${counter.count}`,
    );
  }
});

Deno.bench("RealTime: WebSocket Broadcasting (100 messages)", (b) => {
  // Create mock server
  const mockServer = new MockWebSocketServer();

  b.start();

  // Broadcast 100 messages
  for (let i = 0; i < 100; i++) {
    mockServer.broadcast(JSON.stringify({
      type: "notification",
      payload: { id: i, message: `Test message ${i}` },
    }));
  }

  b.end();

  // Verify messages were broadcast
  if (mockServer.eventCount !== 100) {
    throw new Error(
      `Expected 100 messages to be broadcast, but got ${mockServer.eventCount}`,
    );
  }
});

Deno.bench("RealTime: Model Save with Sync", async (b) => {
  const adapter = await setupTestDatabase();

  try {
    // Create real-time sync implementation with proper options
    const eventEmitter = new EventEmitter();
    const realTimeSync = new RealTimeSyncImpl({
      port: 0, // Use port 0 for testing (won't actually start server)
    });

    // Connect the event emitter to the real-time sync (mock implementation)
    // This allows us to use the eventEmitter as intended
    (realTimeSync as unknown as { eventEmitter: EventEmitter }).eventEmitter =
      eventEmitter;

    // Set up a method to manually emit events through our EventEmitter
    const originalEmit = realTimeSync.emit;
    realTimeSync.emit = function (event: EmitEventParam) {
      // Create a compatible event
      const emitterEvent: Event = {
        type: event.type,
        payload: event.payload || {},
      };

      // Emit through the EventEmitter
      eventEmitter.emit(emitterEvent);

      // Create a proper ModelEvent with the required 'model' property
      const modelEvent: ModelEvent = {
        type: event.type,
        model: "model" in event ? String(event.model) : BenchNotification.name, // Convert to string explicitly
        payload: event.payload,
      };

      // Pass to original emit method with the properly structured ModelEvent
      return originalEmit.call(this, modelEvent);
    };

    // Initialize real-time sync on BaseModel
    BaseModel.initializeRealTimeSync(realTimeSync);

    b.start();

    // Create and save 20 notifications
    for (let i = 0; i < 20; i++) {
      const notification = new BenchNotification();
      notification.title = `Notification ${i}`;
      notification.message = `This is test notification ${i}`;
      notification.read = false;
      notification.createdAt = new Date();
      await notification.save(adapter);
    }

    b.end();
  } finally {
    // Clean up
    await adapter.execute("DROP TABLE IF EXISTS bench_notifications");
    await adapter.disconnect();
  }
});

Deno.bench(
  "RealTime: Full Stack Performance (Create + Emit + Broadcast)",
  async (b) => {
    const adapter = await setupTestDatabase();

    try {
      // Create mock WebSocket server
      const mockServer = new MockWebSocketServer();

      // Setup event emitter to be used with the real-time sync system
      const eventEmitter = new EventEmitter();

      // Create RealTimeSync instance
      const realTimeSync = new RealTimeSyncImpl({
        port: 0, // Use port 0 for testing (won't actually start server)
      });

      // Connect the event emitter to the real-time sync (mock implementation)
      // This allows us to use the eventEmitter as intended
      (realTimeSync as unknown as { eventEmitter: EventEmitter }).eventEmitter =
        eventEmitter;

      // Override the emit method to also emit through our EventEmitter
      const originalEmit = realTimeSync.emit;
      realTimeSync.emit = function (event: EmitEventParam) {
        // Create a compatible event
        const emitterEvent: Event = {
          type: event.type,
          payload: event.payload || {},
        };

        // Emit through the EventEmitter
        eventEmitter.emit(emitterEvent);

        // Convert to proper ModelEvent before passing to original emit method
        const modelEvent: ModelEvent = {
          type: event.type,
          model: "model" in event
            ? String(event.model)
            : BenchNotification.name, // Convert to string explicitly
          payload: event.payload,
        };

        // Pass to original emit method
        return originalEmit.call(this, modelEvent);
      };

      // Set up direct event listeners for the mock server
      eventEmitter.on("CREATE", (event: Event) => {
        mockServer.broadcast(JSON.stringify(event));
      });
      eventEmitter.on("UPDATE", (event: Event) => {
        mockServer.broadcast(JSON.stringify(event));
      });
      eventEmitter.on("DELETE", (event: Event) => {
        mockServer.broadcast(JSON.stringify(event));
      });

      // Initialize real-time sync on BaseModel
      BaseModel.initializeRealTimeSync(realTimeSync);

      // Setup event counter
      const counter = new EventCounter();
      eventEmitter.on("CREATE", counter.handleEvent.bind(counter));

      b.start();

      // Create and save 20 notifications with full sync process
      for (let i = 0; i < 20; i++) {
        const notification = new BenchNotification();
        notification.title = `Notification ${i}`;
        notification.message = `This is test notification ${i}`;
        notification.read = false;
        notification.createdAt = new Date();
        await notification.save(adapter);
      }

      b.end();

      // Verify events were processed and broadcast
      if (counter.count !== 20 || mockServer.eventCount !== 20) {
        throw new Error(
          `Event processing incomplete: ${counter.count} events, ${mockServer.eventCount} broadcasts`,
        );
      }
    } finally {
      // Clean up
      await adapter.execute("DROP TABLE IF EXISTS bench_notifications");
      await adapter.disconnect();
    }
  },
);

Deno.bench("RealTime: Subscription Processing (Filter Match)", (b) => {
  // Create mock subscription manager
  const subscriptions = [
    {
      clientId: "client1",
      eventTypes: ["CREATE", "UPDATE"],
      filters: (event: SyncEvent) =>
        event.payload && "category" in event.payload &&
        event.payload.category === "news",
    },
    {
      clientId: "client2",
      eventTypes: ["CREATE", "DELETE"],
      filters: (event: SyncEvent) =>
        event.payload && "priority" in event.payload &&
        typeof event.payload.priority === "number" &&
        event.payload.priority > 3,
    },
    {
      clientId: "client3",
      eventTypes: ["UPDATE"],
      filters: (event: SyncEvent) =>
        event.payload && "assignedTo" in event.payload &&
        event.payload.assignedTo === "user123",
    },
  ];

  // Create test events
  const events: SyncEvent[] = [];
  for (let i = 0; i < 50; i++) {
    events.push({
      type: i % 3 === 0 ? "CREATE" : i % 3 === 1 ? "UPDATE" : "DELETE",
      payload: {
        id: i,
        category: i % 5 === 0 ? "news" : "general",
        priority: (i % 10) + 1,
        assignedTo: i % 4 === 0 ? "user123" : "user456",
      },
    });
  }

  b.start();

  // Process all events against all subscriptions
  let matchCount = 0;
  for (const event of events) {
    for (const subscription of subscriptions) {
      if (
        subscription.eventTypes.includes(event.type) &&
        (!subscription.filters || subscription.filters(event))
      ) {
        matchCount++;
      }
    }
  }

  b.end();

  // Verify the expected number of matches occurred
  // This helps ensure the benchmark is testing what we expect
  if (matchCount === 0) {
    throw new Error("No subscription matches found, benchmark may be invalid");
  }
});
