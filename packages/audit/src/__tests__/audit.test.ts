import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { auditLog, verifyAuditChain } from "../index";
import { prisma } from "@ngo/database";

const TEST_TENANT = "test-tenant-" + Date.now();

beforeAll(async () => {
  await prisma.tenant.create({
    data: {
      id: TEST_TENANT,
      name: "Test NGO",
      subdomain: "test-" + Date.now(),
      brandingConfig: {},
      status: "ACTIVE",
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Audit chain", () => {
  it("creates events and verifies chain", async () => {
    await auditLog({
      tenantId: TEST_TENANT,
      eventType: "TEST_EVENT_1",
      entityType: "Test",
      entityId: "id-1",
      afterState: { status: "created" },
      actorType: "AGENT",
    });
    await auditLog({
      tenantId: TEST_TENANT,
      eventType: "TEST_EVENT_2",
      entityType: "Test",
      entityId: "id-1",
      afterState: { status: "updated" },
      actorType: "AGENT",
    });
    const result = await verifyAuditChain(TEST_TENANT);
    expect(result.valid).toBe(true);
    expect(result.eventsChecked).toBe(2);
  });

  it("detects tampering", async () => {
    const events = await prisma.auditEvent.findMany({
      where: { tenantId: TEST_TENANT },
      orderBy: { timestamp: "asc" },
    });

    expect(events.length).toBeGreaterThan(0);

    const firstEvent = events[0];

    const brokenEvents = [
      { ...firstEvent, currentHash: "tampered_hash_value" },
      ...events.slice(1),
    ];

    const result = await verifyAuditChain(TEST_TENANT, brokenEvents);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBeDefined();
  });
});