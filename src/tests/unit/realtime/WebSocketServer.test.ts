// src/tests/unit/realtime/WebSocketServer.test.ts

import { assertEquals } from "../../../deps.ts";
import { WebSocketServer } from "../../../realtime/WebSocketServer.ts";
import { EventEmitter } from "../../../realtime/EventEmitter.ts";
import { SubscriptionManager } from "../../../realtime/SubscriptionManager.ts";
import { Event } from "../../../realtime/types.ts";
import { WebSocket, RawData } from "npm:ws@8.18.0";
import { delay } from "https://deno.land/std@0.203.0/async/delay.ts";

Deno.test({
  name: "WebSocketServer broadcasts events to subscribed clients",
  async fn() {
    const port = 8081;
    const eventEmitter = new EventEmitter();
    const subscriptionManager = new SubscriptionManager();
    const websocketServer = new WebSocketServer(port, eventEmitter, subscriptionManager);

    try {
      await websocketServer.start();

      // Setup clients with event tracking
      const setupClient = async (eventTypes: string[]) => {
        const ws = new WebSocket(`ws://localhost:${port}`);
        const events: Event[] = [];
        
        // Wait for connection
        await new Promise<void>(resolve => ws.once('open', () => resolve()));

        // Handle messages
        ws.on('message', (data: RawData) => {
          const event = JSON.parse(data.toString());
          // Only track non-connection related events
          if (!['connection', 'subscription_success', 'unsubscription_success'].includes(event.type)) {
            events.push(event);
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
      const createEvent: Event = { type: "CREATE", payload: { id: 1, name: "Test User" } };
      const updateEvent: Event = { type: "UPDATE", payload: { id: 1, name: "Updated User" } };

      // Emit events
      eventEmitter.emit(createEvent);
      eventEmitter.emit(updateEvent);

      // Wait for event processing
      await delay(200);

      // Assert results
      assertEquals(client1.events.length, 1, "Client 1 should receive exactly one CREATE event");
      assertEquals(client1.events[0], createEvent, "Client 1 event should match CREATE event");
      assertEquals(client2.events.length, 1, "Client 2 should receive exactly one UPDATE event");
      assertEquals(client2.events[0], updateEvent, "Client 2 event should match UPDATE event");

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
