export type ModelEventType = "CREATE" | "UPDATE" | "DELETE";

export interface ModelEvent {
  type: ModelEventType;
  model: string;
  payload: any;
}

export type EventCallback = (event: ModelEvent) => void;
