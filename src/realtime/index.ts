import { EventEmitter } from "./EventEmitter.ts";
import { WebSocketServer } from "./WebSocketServer.ts";
import { SubscriptionManager } from "./SubscriptionManager.ts";
import { EventCallback, ModelEvent, ModelEventType } from "../models/types.ts";
import { WebSocket as WSWebSocket } from "https://esm.sh/ws@8.18.0";

export interface WebSocketResponse {
  statusCode: number;
  body: string;
}

export interface RealTimeSyncOptions {
  port: number;
}

export interface RealTimeSync {
  getEventEmitter(): EventEmitter;
  getWebSocketServer(): WebSocketServer;
  getSubscriptionManager(): SubscriptionManager;
  connect(connectionId: string): Promise<WebSocketResponse>;
  disconnect(connectionId: string): Promise<WebSocketResponse>;
  message(connectionId: string, data: ModelEvent): Promise<WebSocketResponse>;
  start(): Promise<void>;
  stop(): Promise<void>;
  emit(data: ModelEvent): void;
}

export class RealTimeSyncImpl implements RealTimeSync {
  private eventEmitter: EventEmitter;
  private websocketServer: WebSocketServer;
  private subscriptionManager: SubscriptionManager;
  private listeners: Map<ModelEventType, EventCallback[]> = new Map();
  private connections: Map<string, WSWebSocket | null> = new Map();

  constructor(options: RealTimeSyncOptions) {
    this.eventEmitter = new EventEmitter();
    this.subscriptionManager = new SubscriptionManager();
    this.websocketServer = new WebSocketServer(
      options.port,
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
    console.log(`Client ${connectionId} connected to RealTimeSyncImpl`);

    // Add an await operation by notifying other clients about this connection
    await Promise.resolve().then(() => {
      this.eventEmitter.emit({
        type: "CONNECTION",
        payload: { connectionId, action: "connected" },
      });
    });

    return {
      statusCode: 200,
      body: "Connected successfully",
    };
  }

  async disconnect(connectionId: string): Promise<WebSocketResponse> {
    // Remove the connection from our tracking map
    const hadConnection = this.connections.delete(connectionId);
    console.log(`Client ${connectionId} disconnected from RealTimeSyncImpl`);

    // Add an await operation by notifying other clients about this disconnection
    await Promise.resolve().then(() => {
      if (hadConnection) {
        this.eventEmitter.emit({
          type: "CONNECTION",
          payload: { connectionId, action: "disconnected" },
        });
      }
    });

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
      // Add an await operation for processing the incoming message
      await Promise.resolve().then(() => {
        if (data && typeof data === "object" && "type" in data) {
          this.emit(data);
        }
      });

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

  emit(data: ModelEvent): void {
    const callbacks = this.listeners.get(data.type);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }
  }

  async start() {
    await this.websocketServer.start();
    this.websocketServer.addConnectionHandler(
      (ws: WSWebSocket, connectionId: string) => {
        // Store the actual WebSocket instance when it connects
        this.connections.set(connectionId, ws);
        console.log(`WebSocket connection established for ${connectionId}`);
      },
    );
    console.log("Real-Time Synchronization Module started.");
  }

  async stop() {
    await this.websocketServer.shutdown();
    // Clear all tracked connections
    this.connections.clear();
    console.log("Real-Time Synchronization Module stopped.");
  }
}
