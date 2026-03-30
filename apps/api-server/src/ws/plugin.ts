import { FastifyInstance, FastifyRequest } from "fastify";
import websocket from "@fastify/websocket";
import { Redis } from "ioredis";
import type { WebSocket } from "ws";

declare module "fastify" {
  interface RouteShorthandOptions {
    websocket?: boolean;
  }
}


// Map of tenantId → set of connected WebSocket clients
const clients = new Map<string, Set<any>>();

// Redis subscriber — one global connection
let subscriber: Redis | null = null;

function getSubscriber(): Redis {
  if (!subscriber) {
    subscriber = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

    subscriber.psubscribe("ws:*", (err) => {
      if (err) console.error("[WS] Redis psubscribe error:", err);
      else console.log("[WS] Subscribed to ws:* channels");
    });

    subscriber.on("pmessage", (_pattern, channel, message) => {
      const tenantId = channel.replace("ws:", "");
      const tenantClients = clients.get(tenantId);
      if (!tenantClients || tenantClients.size === 0) return;

      for (const socket of tenantClients) {
        try {
          socket.send(message);
        } catch {
          tenantClients.delete(socket);
        }
      }
    });
  }
  return subscriber;
}

export async function websocketPlugin(app: FastifyInstance) {
  await app.register(websocket as any);

  // Initialize subscriber immediately
  getSubscriber();

  app.get(
    "/ws/notifications",
    { websocket: true } as any,
    (connection: any, req: FastifyRequest) => {
      const socket = connection.socket as any as WebSocket;
      // Extract tenant from JWT
      let tenantId: string | null = null;

      try {
        const authHeader = (req.headers.authorization as string) ?? "";
        const token = authHeader.replace("Bearer ", "");
        if (token) {
          const jwt = require("jsonwebtoken");
          const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET ?? "dev_jwt_secret_change_in_production_must_be_64_chars_minimum_ok"
          ) as any;
          tenantId = decoded.tenantId;
        }
      } catch {
        // No token — still allow connection but no tenant filtering
      }

      if (tenantId) {
        if (!clients.has(tenantId)) clients.set(tenantId, new Set());
        clients.get(tenantId)!.add(socket);
        console.log(`[WS] Client connected for tenant: ${tenantId}`);
      }

      // Send connected event
      socket.send(JSON.stringify({
        type: "CONNECTED",
        tenantId,
        timestamp: new Date().toISOString(),
      }));

      socket.on("close", () => {
        if (tenantId) {
          clients.get(tenantId)?.delete(socket);
          console.log(`[WS] Client disconnected for tenant: ${tenantId}`);
        }
      });
    }
  );
}