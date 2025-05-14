export type ModelEventType = "CREATE" | "UPDATE" | "DELETE";

export interface ModelEvent {
  type: ModelEventType;
  model: string;
  payload: unknown;
}

export type EventCallback = (event: ModelEvent) => void;
