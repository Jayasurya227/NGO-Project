import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key) process.env[key] = value;
    }
  } catch {}
}
loadEnv();

import crypto from "crypto";
import { prisma } from "@ngo/database";

export type AuditParams = {
  tenantId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorId?: string;
  actorType?: "USER" | "AGENT";
  beforeState?: unknown;
  afterState: unknown;
  metadata?: unknown;
};

export async function auditLog(params: AuditParams): Promise<void> {
  const lastEvent = await prisma.auditEvent.findFirst({
    where: { tenantId: params.tenantId },
    orderBy: { timestamp: "desc" },
    select: { currentHash: true },
  });

  const prevHash = lastEvent?.currentHash ?? "GENESIS";

  const payload = JSON.stringify({
    tenantId: params.tenantId,
    eventType: params.eventType,
    entityType: params.entityType,
    entityId: params.entityId,
    afterState: params.afterState,
  });

  const currentHash = crypto
    .createHash("sha256")
    .update(prevHash + payload)
    .digest("hex");

  await prisma.auditEvent.create({
    data: {
      tenantId: params.tenantId,
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      actorId: params.actorId,
      actorType: params.actorType,
      beforeState: params.beforeState as any,
      afterState: params.afterState as any,
      metadata: params.metadata as any,
      prevHash,
      currentHash,
    },
  });
}

export async function verifyAuditChain(
  tenantId: string,
  eventsOverride?: any[]
): Promise<{ valid: boolean; eventsChecked?: number; brokenAt?: string }> {
  const events = eventsOverride ?? await prisma.auditEvent.findMany({
    where: { tenantId },
    orderBy: { timestamp: "asc" },
  });

  let prevHash = "GENESIS";

  for (const event of events) {
    const payload = JSON.stringify({
      tenantId: event.tenantId,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      afterState: event.afterState,
    });

    const expected = crypto
      .createHash("sha256")
      .update(prevHash + payload)
      .digest("hex");

    if (expected !== event.currentHash) {
      return { valid: false, brokenAt: event.id };
    }

    prevHash = event.currentHash;
  }

  return { valid: true, eventsChecked: events.length };
}