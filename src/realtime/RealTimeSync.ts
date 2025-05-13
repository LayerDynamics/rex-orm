import { EventEmitter } from "./EventEmitter.ts";
import { SubscriptionManager } from "./SubscriptionManager.ts";
import { WebSocketServer } from "./WebSocketServer.ts";
import type {
  RealTimeSync as IRealTimeSync,
  RealTimeSyncOptions,
  WebSocketResponse,
} from "./index.ts";
import { EventCallback, ModelEvent, ModelEventType } from "../models/types.ts";
import { WebSocket as WSWebSocket } from "https://esm.sh/ws@8.18.0";

export class RealTimeSync implements IRealTimeSync {
  private connections: Map<string, WSWebSocket | null>;
  private port: number;
  private listeners: Map<ModelEventType, EventCallback[]> = new Map();
  public readonly eventEmitter: EventEmitter;
  public readonly websocketServer: WebSocketServer;
  public readonly subscriptionManager: SubscriptionManager;

  constructor(options: RealTimeSyncOptions) {
    this.port = options.port;
    this.connections = new Map();
    this.eventEmitter = new EventEmitter();

    this.subscriptionManager = new SubscriptionManager();
    this.websocketServer = new WebSocketServer(
      this.port,
      this.eventEmitter,
      this.subscriptionManager,
    );
  }

  getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }

  getWebSocketServer(): WebSocketServer {
    return this.websocketServer;
  }

  getSubscriptionManager(): SubscriptionManager {
    return this.subscriptionManager;
  }

  async connect(connectionId: string): Promise<WebSocketResponse> {
    // Store the connection ID in our map with null initially
    // The actual WebSocket will be attached when a connection is established
    this.connections.set(connectionId, null);
    console.log(`Client ${connectionId} connected`);

    // Add an await operation to ensure we have an async operation
    await Promise.resolve();

    return {
      statusCode: 200,
      body: "Connected successfully",
    };
  }

  async disconnect(connectionId: string): Promise<WebSocketResponse> {
    // Remove the connection from our tracking map
    const hadConnection = this.connections.delete(connectionId);
    console.log(`Client ${connectionId} disconnected`);

    // Add an await operation to ensure we have an async operation
    await Promise.resolve();

    return {
      statusCode: hadConnection ? 200 : 404,
      body: hadConnection
        ? "Disconnected successfully"
        : "Connection not found",
    };
  }

  async message(
    connectionId: string,
    data: ModelEvent,
  ): Promise<WebSocketResponse> {
    // Validate that the connection exists
    if (!this.connections.has(connectionId)) {
      return {
        statusCode: 404,
        body: "Connection not found",
      };
    }

    // Process the incoming message
    try {
      // If data is a ModelEvent, emit it to relevant subscribers
      if (data && typeof data === "object" && "type" in data) {
        // Add an await operation for message handling
        await Promise.resolve().then(() => {
          this.emit(data);
        });
      }

      console.log(`Received message from ${connectionId}:`, data);
      return {
        statusCode: 200,
        body: "Message processed successfully",
      };
    } catch (error) {
      console.error(`Error processing message from ${connectionId}:`, error);
      return {
        statusCode: 500,
        body: `Error processing message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  async handleMessage(
    connectionId: string,
    message: ModelEvent,
  ): Promise<WebSocketResponse> {
    return await this.message(connectionId, message);
  }

  async start(): Promise<void> {
    await this.websocketServer.start();
    this.websocketServer.addConnectionHandler(
      (ws: WSWebSocket, connectionId: string) => {
        this.connections.set(connectionId, ws);
      },
    );
  }

  async stop(): Promise<void> {
    await this.websocketServer.shutdown();
    this.connections.clear();
  }

  emit(data: ModelEvent): void {
    const callbacks = this.listeners.get(data.type);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }
    // Also emit to the event emitter for subscribers
    this.eventEmitter.emit({
      type: data.type,
      payload: data,
    });
  }
}
