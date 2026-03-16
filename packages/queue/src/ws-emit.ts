import { Redis } from "ioredis";
import type { WsEvent } from "@ngo/types";

let publisher: Redis | null = null;

function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
  }
  return publisher;
}

export async function emitWsEvent(tenantId: string, event: WsEvent): Promise<void> {
  const pub = getPublisher();
  await pub.publish(`ws:${tenantId}`, JSON.stringify(event));
}