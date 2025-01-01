import { EventEmitter } from "./EventEmitter.ts";
import { SubscriptionManager } from "./SubscriptionManager.ts";
import { WebSocketServer } from "./WebSocketServer.ts";
import type { RealTimeSync as IRealTimeSync, WebSocketResponse, RealTimeSyncOptions } from "./index.ts";

export class RealTimeSync implements IRealTimeSync {
  private connections: Map<string, WebSocket | null>;
  private port: number;
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
      this.subscriptionManager
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
    this.connections.set(connectionId, null);
    return {
      statusCode: 200,
      body: "Connected successfully"
    };
  }

  async disconnect(connectionId: string): Promise<WebSocketResponse> {
    this.connections.delete(connectionId);
    return {
      statusCode: 200,
      body: "Disconnected successfully"
    };
  }

  async message(connectionId: string, data: any): Promise<WebSocketResponse> {
    // Handle incoming message
    return {
      statusCode: 200,
      body: "Message received"
    };
  }

  async handleMessage(connectionId: string, message: any): Promise<WebSocketResponse> {
    return await this.message(connectionId, message);
  }

  async start(): Promise<void> {
    await this.websocketServer.start();
    this.websocketServer.addConnectionHandler((ws: WebSocket, connectionId: string) => {
      this.connections.set(connectionId, ws);
    });
  }

  async stop(): Promise<void> {
    await this.websocketServer.shutdown();
    this.connections.clear();
  }
}
