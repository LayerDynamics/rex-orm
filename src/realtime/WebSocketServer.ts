import {
  WebSocket as WSWebSocket,
  WebSocketServer as WS,
} from "https://esm.sh/ws@8.18.0";
import { EventEmitter } from "./EventEmitter.ts";
import { Event } from "./types.ts";
import { SubscriptionManager } from "./SubscriptionManager.ts";

// Extended WebSocket type that includes the isAlive property
interface ExtendedWebSocket extends WSWebSocket {
  isAlive: boolean;
}

// Message type for client messages
interface ClientMessage {
  action: string;
  eventTypes?: string[];
  filters?: Record<string, unknown>;
  [key: string]: unknown;
}

type ConnectionHandler = (ws: WSWebSocket, connectionId: string) => void;

export class WebSocketServer {
  private wss: WS;
  private clients: Map<WSWebSocket, string> = new Map();
  private clientIdCounter = 0;
  private subscriptionManager: SubscriptionManager;
  private heartbeatInterval = 30000; // 30 seconds
  private handlers: ConnectionHandler[] = [];

  constructor(
    private port: number,
    private eventEmitter: EventEmitter,
    subscriptionManager: SubscriptionManager,
  ) {
    this.subscriptionManager = subscriptionManager;
    this.wss = new WS({ port });
    this.setupHeartbeat();
  }

  addConnectionHandler(handler: ConnectionHandler): void {
    this.handlers.push(handler);
  }

  private setupHeartbeat(): void {
    setInterval(() => {
      this.wss.clients.forEach((ws: WSWebSocket) => {
        const extWs = ws as ExtendedWebSocket;
        if (extWs.isAlive === false) {
          const clientId = this.clients.get(ws);
          if (clientId) {
            this.handleDisconnection(ws, clientId);
          }
          return;
        }
        extWs.isAlive = false;
        ws.ping();
      });
    }, this.heartbeatInterval);
  }

  start(): Promise<void> {
    console.log(`WebSocket Server is running on ws://localhost:${this.port}/`);

    this.wss.on("connection", (ws: WSWebSocket) => {
      (ws as ExtendedWebSocket).isAlive = true;
      ws.on("pong", () => {
        (ws as ExtendedWebSocket).isAlive = true;
      });

      this.handleConnection(ws);
    });

    this.setupEventListeners();
    console.log("WebSocket server started successfully");

    // Return a resolved promise to make this function truly async
    return Promise.resolve();
  }

  private handleConnection(ws: WSWebSocket): void {
    const clientId = `client_${this.clientIdCounter++}`;
    this.clients.set(ws, clientId);
    console.log(`Client connected: ${clientId}`);

    ws.on("message", async (data: Uint8Array | string) => {
      try {
        const message = JSON.parse(
          typeof data === "string" ? data : new TextDecoder().decode(data),
        ) as ClientMessage;
        await this.handleClientMessage(ws, clientId, message);
      } catch (err) {
        console.error(`Error handling message from ${clientId}:`, err);
        ws.send(JSON.stringify({
          type: "error",
          payload: { message: "Invalid message format" },
        }));
      }
    });

    ws.on("close", () => this.handleDisconnection(ws, clientId));
    ws.on("error", (error: Error) => this.handleError(ws, clientId, error));

    // Send welcome message
    ws.send(JSON.stringify({
      type: "connection",
      payload: { clientId, message: "Connected to Rex-ORM WebSocket Server" },
    }));

    // Call connection handlers
    this.handlers.forEach((handler) => handler(ws, clientId));
  }

  private async handleClientMessage(
    ws: WSWebSocket,
    clientId: string,
    message: ClientMessage,
  ): Promise<void> {
    console.log(`Received message from ${clientId}:`, message);

    switch (message.action) {
      case "subscribe":
        await this.handleSubscription(ws, clientId, message);
        break;
      case "unsubscribe":
        await this.handleUnsubscription(ws, clientId);
        break;
      default:
        ws.send(JSON.stringify({
          type: "error",
          payload: { message: "Unknown action" },
        }));
    }
  }

  private async handleSubscription(
    ws: WSWebSocket,
    clientId: string,
    message: ClientMessage,
  ): Promise<void> {
    const { eventTypes, filters } = message;

    if (!Array.isArray(eventTypes)) {
      ws.send(JSON.stringify({
        type: "error",
        payload: { message: "eventTypes must be an array" },
      }));
      return;
    }

    try {
      // Convert filters object to a filter function
      const filterFunction = filters
        ? (event: Event) => {
          // Check if all filter conditions match the event
          return Object.entries(filters).every(([key, value]) => {
            return event[key as keyof Event] === value;
          });
        }
        : undefined;

      // Add an await to make this function truly async
      await Promise.resolve();
      this.subscriptionManager.subscribe(clientId, eventTypes, filterFunction);
      ws.send(JSON.stringify({
        type: "subscription_success",
        payload: { eventTypes, filters },
      }));
      console.log(`Client ${clientId} subscribed to events:`, eventTypes);
    } catch (error: unknown) {
      ws.send(JSON.stringify({
        type: "error",
        payload: {
          message: "Subscription failed",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    }
  }

  private async handleUnsubscription(
    ws: WSWebSocket,
    clientId: string,
    // Prefix with underscore to indicate intentionally unused parameter
    _message?: ClientMessage,
  ): Promise<void> {
    try {
      // Add an await to make this function truly async
      await Promise.resolve();
      this.subscriptionManager.unsubscribe(clientId);
      ws.send(JSON.stringify({
        type: "unsubscription_success",
        payload: { message: "Successfully unsubscribed from all events" },
      }));
      console.log(`Client ${clientId} unsubscribed from all events.`);
    } catch (error: unknown) {
      ws.send(JSON.stringify({
        type: "error",
        payload: {
          message: "Unsubscription failed",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    }
  }

  private handleDisconnection(ws: WSWebSocket, clientId: string): void {
    console.log(`Client disconnected: ${clientId}`);
    this.subscriptionManager.unsubscribe(clientId);
    this.clients.delete(ws);
    ws.terminate();
  }

  private handleError(ws: WSWebSocket, clientId: string, error: Error): void {
    console.error(`WebSocket error with ${clientId}:`, error);
    this.handleDisconnection(ws, clientId);
  }

  broadcast(event: Event): void {
    const message = JSON.stringify(event);

    for (const [ws, clientId] of this.clients.entries()) {
      if (this.subscriptionManager.getRelevantEvents(clientId, event)) {
        ws.send(message, (err: Error | undefined) => {
          if (err) {
            console.error(`Failed to send message to ${clientId}:`, err);
            // If send fails, assume client is disconnected
            this.handleDisconnection(ws, clientId);
          }
        });
      }
    }
  }

  setupEventListeners(): void {
    ["CREATE", "UPDATE", "DELETE"].forEach((eventType) => {
      this.eventEmitter.on(eventType, (event: Event) => {
        this.broadcast(event);
      });
    });
  }

  // Method for graceful shutdown
  async shutdown(): Promise<void> {
    console.log("Shutting down WebSocket server...");

    // Close all client connections
    await Promise.all(
      Array.from(this.clients.entries()).map(([ws, clientId]) => {
        ws.close(1000, "Server shutting down");
        this.subscriptionManager.unsubscribe(clientId);
      }),
    );

    this.clients.clear();

    // This await makes the function truly async
    return new Promise<void>((resolve) => {
      this.wss.close(() => {
        console.log("WebSocket server shut down successfully");
        resolve();
      });
    });
  }
}
