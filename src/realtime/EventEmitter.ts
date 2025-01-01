import { Event } from "./types.ts";
import { BaseModel } from "../models/BaseModel.ts";

export class EventEmitter {
  private listeners: Map<string, Set<(event: Event) => void>> = new Map();

  on(eventType: string, listener: (event: Event) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  off(eventType: string, listener: (event: Event) => void) {
    if (!this.listeners.has(eventType)) return;
    this.listeners.get(eventType)!.delete(listener);
  }

  emit(event: Event) {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }
}
