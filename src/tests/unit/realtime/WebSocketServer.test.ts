// src/tests/unit/realtime/WebSocketServer.test.ts

import { assertEquals } from "../../../deps.ts";
import { WebSocketServer } from "../../../realtime/WebSocketServer.ts";
import { EventEmitter } from "../../../realtime/EventEmitter.ts";
import { SubscriptionManager } from "../../../realtime/SubscriptionManager.ts";
import { Event } from "../../../realtime/types.ts";
import { delay } from "https://deno.land/std@0.203.0/async/delay.ts";
// Import the StandardWebSocketClient implementation from the websocket module
import { StandardWebSocketClient } from "https://deno.land/x/websocket@v0.1.4/mod.ts";

type RawData=string|Uint8Array;
Deno.test({
  name: "WebSocketServer broadcasts events to subscribed clients",
  ignore: !Deno.permissions || (await Deno.permissions.query({ name: "net" })).state !== "granted",
  async fn() {
    const port = 8081;
    const eventEmitter = new EventEmitter();
    const subscriptionManager = new SubscriptionManager();
    const websocketServer = new WebSocketServer(
      port,
      eventEmitter,
      subscriptionManager,
    );

    try {
      await websocketServer.start();

      // Add delay to ensure the server is fully initialized before clients connect
      await delay(500);

      // Setup clients with event tracking
      const setupClient = async (eventTypes: string[]) => {
        const ws = new StandardWebSocketClient(`ws://localhost:${port}`);
        const events: Event[] = [];

        // Wait for connection
        await new Promise<void>((resolve) => ws.once("open", () => resolve()));

        // Handle messages
        ws.on("message", (data: RawData) => {
          try {
            // For the websocket library we're using, sometimes the data is already a MessageEvent
            let jsonData: string;
            
            if (typeof data === 'object' && 'data' in data && typeof data.data === 'string') {
              // It's a MessageEvent, extract the data property
              jsonData = data.data;
            } else if (typeof data === 'string') {
              jsonData = data;
            } else if (data instanceof Uint8Array) {
              jsonData = new TextDecoder().decode(data);
            } else {
              // Convert to string as a last resort
              jsonData = String(data);
            }
            
            const event = JSON.parse(jsonData);
            
            // Only track non-connection related events
            if (
              !["connection", "subscription_success", "unsubscription_success"]
                .includes(event.type)
            ) {
              events.push(event);
            }
          } catch (e) {
            console.error("Error parsing WebSocket message:", e);
            console.debug("Received message data:", data);
          }
        });

        // Subscribe after connection
        ws.send(JSON.stringify({ action: "subscribe", eventTypes }));

        return { ws, events };
      };

      // Create and setup clients
      const client1 = await setupClient(["CREATE"]);
      const client2 = await setupClient(["UPDATE"]);

      // Wait for subscriptions to be processed
      await delay(200);

      // Create test events
      const createEvent: Event = {
        type: "CREATE",
        payload: { id: 1, name: "Test User" },
      };
      const updateEvent: Event = {
        type: "UPDATE",
        payload: { id: 1, name: "Updated User" },
      };

      // Emit events
      eventEmitter.emit(createEvent);
      eventEmitter.emit(updateEvent);

      // Wait for event processing
      await delay(200);

      // Assert results
      assertEquals(
        client1.events.length,
        1,
        "Client 1 should receive exactly one CREATE event",
      );
      assertEquals(
        client1.events[0],
        createEvent,
        "Client 1 event should match CREATE event",
      );
      assertEquals(
        client2.events.length,
        1,
        "Client 2 should receive exactly one UPDATE event",
      );
      assertEquals(
        client2.events[0],
        updateEvent,
        "Client 2 event should match UPDATE event",
      );

      // Cleanup clients
      client1.ws.close();
      client2.ws.close();
    } finally {
      await websocketServer.shutdown();
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
