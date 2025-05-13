import { Event } from "./types.ts";

export class EventEmitter {
  private listeners: Map<string, Set<(event: Event) => void>> = new Map();

  on(eventType: string, listener: (event: Event) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)?.add(listener);
  }

  emit(event: Event): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
  }

  off(eventType: string, listener: (event: Event) => void): void {
    this.listeners.get(eventType)?.delete(listener);
  }
}
