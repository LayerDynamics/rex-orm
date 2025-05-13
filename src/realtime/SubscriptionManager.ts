import { Event } from "./types.ts";
import { EventEmitter } from "./EventEmitter.ts";

interface Subscription {
  clientId: string;
  eventTypes: string[];
  filters?: (event: Event) => boolean;
}

export class SubscriptionManager {
  private subscriptions: Subscription[] = [];
  private eventEmitter?: EventEmitter;

  constructor() {}

  setEventEmitter(emitter: EventEmitter): void {
    this.eventEmitter = emitter;
  }

  subscribe(
    clientId: string,
    eventTypes: string[],
    filters?: (event: Event) => boolean,
  ) {
    this.subscriptions.push({ clientId, eventTypes, filters });
  }

  unsubscribe(clientId: string) {
    this.subscriptions = this.subscriptions.filter((sub) =>
      sub.clientId !== clientId
    );
  }

  getRelevantEvents(clientId: string, event: Event): boolean {
    const clientSubs = this.subscriptions.filter((sub) =>
      sub.clientId === clientId
    );
    return clientSubs.some((sub) =>
      sub.eventTypes.includes(event.type) &&
      (sub.filters ? sub.filters(event) : true)
    );
  }
}
