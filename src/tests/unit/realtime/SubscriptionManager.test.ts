// src/tests/unit/realtime/SubscriptionManager.test.ts

import { assertEquals } from "../../../deps.ts";
import { SubscriptionManager } from "../../../realtime/SubscriptionManager.ts";
import { Event } from "../../../realtime/types.ts";

Deno.test("SubscriptionManager handles subscriptions correctly", () => {
  const manager = new SubscriptionManager();

  const clientId1 = "client_1";
  const clientId2 = "client_2";

  // Client 1 subscribes to CREATE and UPDATE events
  manager.subscribe(clientId1, ["CREATE", "UPDATE"]);

  // Client 2 subscribes to DELETE events with a filter
  manager.subscribe(clientId2, ["DELETE"], (event: Event) => event.payload.id === 2);

  const event1: Event = { type: "CREATE", payload: { id: 1, name: "Test" } };
  const event2: Event = { type: "DELETE", payload: { id: 2, name: "Deleted Item" } };
  const event3: Event = { type: "DELETE", payload: { id: 3, name: "Another Item" } };
  const event4: Event = { type: "UPDATE", payload: { id: 1, name: "Updated Test" } };

  // Client 1 should receive event1 and event4
  assertEquals(manager.getRelevantEvents(clientId1, event1), true);
  assertEquals(manager.getRelevantEvents(clientId1, event2), false);
  assertEquals(manager.getRelevantEvents(clientId1, event3), false);
  assertEquals(manager.getRelevantEvents(clientId1, event4), true);

  // Client 2 should receive event2 only
  assertEquals(manager.getRelevantEvents(clientId2, event1), false);
  assertEquals(manager.getRelevantEvents(clientId2, event2), true);
  assertEquals(manager.getRelevantEvents(clientId2, event3), false);
  assertEquals(manager.getRelevantEvents(clientId2, event4), false);
});

Deno.test("SubscriptionManager unsubscribes clients correctly", () => {
  const manager = new SubscriptionManager();

  const clientId = "client_3";

  // Client subscribes to CREATE events
  manager.subscribe(clientId, ["CREATE"]);

  const event: Event = { type: "CREATE", payload: { id: 1, name: "Test" } };

  // Should receive event
  assertEquals(manager.getRelevantEvents(clientId, event), true);

  // Unsubscribe client
  manager.unsubscribe(clientId);

  // Should not receive event
  assertEquals(manager.getRelevantEvents(clientId, event), false);
});
