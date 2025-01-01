import { WebSocket, WebSocketServer as WS } from "npm:ws@8.18.0";
import { EventEmitter } from "./EventEmitter.ts";
import { Event } from "./types.ts";
import { SubscriptionManager } from "./SubscriptionManager.ts";

type ConnectionHandler = (ws: WebSocket, connectionId: string) => void;

export class WebSocketServer {
  private wss: WS;
  private clients: Map<WebSocket, string> = new Map();
  private clientIdCounter: number = 0;
  private subscriptionManager: SubscriptionManager;
  private heartbeatInterval = 30000; // 30 seconds
  private handlers: ConnectionHandler[] = [];

  constructor(private port: number, private eventEmitter: EventEmitter, subscriptionManager: SubscriptionManager) {
    this.subscriptionManager = subscriptionManager;
    this.wss = new WS({ port });
    this.setupHeartbeat();
  }

  addConnectionHandler(handler: ConnectionHandler): void {
    this.handlers.push(handler);
  }

  private setupHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach((ws: WebSocket) => {
        if ((ws as any).isAlive === false) {
          const clientId = this.clients.get(ws);
          if (clientId) {
            this.handleDisconnection(ws, clientId);
          }
          return;
        }
        (ws as any).isAlive = false;
        ws.ping();
      });
    }, this.heartbeatInterval);
  }

  async start() {
    console.log(`WebSocket Server is running on ws://localhost:${this.port}/`);
    
    this.wss.on('connection', (ws: WebSocket) => {
      (ws as any).isAlive = true;
      ws.on('pong', () => {
        (ws as any).isAlive = true;
      });
      
      this.handleConnection(ws);
    });

    this.setupEventListeners();
    console.log("WebSocket server started successfully");
  }

  private handleConnection(ws: WebSocket) {
    const clientId = `client_${this.clientIdCounter++}`;
    this.clients.set(ws, clientId);
    console.log(`Client connected: ${clientId}`);

    ws.on('message', async (data: Uint8Array | string) => {
      try {
        const message = JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data));
        await this.handleClientMessage(ws, clientId, message);
      } catch (err) {
        console.error(`Error handling message from ${clientId}:`, err);
        ws.send(JSON.stringify({
          type: "error",
          payload: { message: "Invalid message format" }
        }));
      }
    });

    ws.on('close', () => this.handleDisconnection(ws, clientId));
    ws.on('error', (error: Error) => this.handleError(ws, clientId, error));

    // Send welcome message
    ws.send(JSON.stringify({
      type: "connection",
      payload: { clientId, message: "Connected to Rex-ORM WebSocket Server" }
    }));

    // Call connection handlers
    this.handlers.forEach(handler => handler(ws, clientId));
  }

  private async handleClientMessage(ws: WebSocket, clientId: string, message: any) {
    console.log(`Received message from ${clientId}:`, message);

    switch (message.action) {
      case "subscribe":
        await this.handleSubscription(ws, clientId, message);
        break;
      case "unsubscribe":
        await this.handleUnsubscription(ws, clientId, message);
        break;
      default:
        ws.send(JSON.stringify({
          type: "error",
          payload: { message: "Unknown action" }
        }));
    }
  }

  private async handleSubscription(ws: WebSocket, clientId: string, message: any) {
    const { eventTypes, filters } = message;
    
    if (!Array.isArray(eventTypes)) {
      ws.send(JSON.stringify({
        type: "error",
        payload: { message: "eventTypes must be an array" }
      }));
      return;
    }

    try {
      this.subscriptionManager.subscribe(clientId, eventTypes, filters);
      ws.send(JSON.stringify({
        type: "subscription_success",
        payload: { eventTypes, filters }
      }));
      console.log(`Client ${clientId} subscribed to events:`, eventTypes);
    } catch (error: unknown) {
      ws.send(JSON.stringify({
        type: "error",
        payload: { 
          message: "Subscription failed", 
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
  }

  private async handleUnsubscription(ws: WebSocket, clientId: string, message: any) {
    try {
      this.subscriptionManager.unsubscribe(clientId);
      ws.send(JSON.stringify({
        type: "unsubscription_success",
        payload: { message: "Successfully unsubscribed from all events" }
      }));
      console.log(`Client ${clientId} unsubscribed from all events.`);
    } catch (error: unknown) {
      ws.send(JSON.stringify({
        type: "error",
        payload: { 
          message: "Unsubscription failed", 
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
  }

  private handleDisconnection(ws: WebSocket, clientId: string) {
    console.log(`Client disconnected: ${clientId}`);
    this.subscriptionManager.unsubscribe(clientId);
    this.clients.delete(ws);
    ws.terminate();
  }

  private handleError(ws: WebSocket, clientId: string, error: Error) {
    console.error(`WebSocket error with ${clientId}:`, error);
    this.handleDisconnection(ws, clientId);
  }

  broadcast(event: Event) {
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

  setupEventListeners() {
    ["CREATE", "UPDATE", "DELETE"].forEach(eventType => {
      this.eventEmitter.on(eventType, (event: Event) => {
        this.broadcast(event);
      });
    });
  }

  // Method for graceful shutdown
  async shutdown() {
    console.log("Shutting down WebSocket server...");
    
    // Close all client connections
    for (const [ws, clientId] of this.clients.entries()) {
      ws.close(1000, "Server shutting down");
      this.subscriptionManager.unsubscribe(clientId);
    }
    
    this.clients.clear();
    
    // Close the server
    return new Promise<void>((resolve) => {
      this.wss.close(() => {
        console.log("WebSocket server shut down successfully");
        resolve();
      });
    });
  }
}
