import { FastifyInstance } from "fastify";
import { prisma } from "@ngo/database";
import { encrypt, decrypt } from "@ngo/auth/encryption";
import { auditLog } from "@ngo/audit";
import { requirePermission } from "../middleware/rbac";
import { z } from "zod";

const CreateDonorBody = z.object({
  type: z.enum(["CSR", "INDIVIDUAL"]),
  orgName: z.string().min(1).max(200).optional(),
  contactName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  notificationPrefs: z.object({
    email: z.boolean().default(true),
    whatsapp: z.boolean().default(true),
    inApp: z.boolean().default(true),
  }).default({ email: true, whatsapp: true, inApp: true }),
});

export async function donorsRoutes(app: FastifyInstance) {

  // GET /
  app.get("/", { preHandler: requirePermission("donor:read") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const page = Number((req.query as any).page) || 1;
    const limit = Number((req.query as any).limit) || 20;

    const [data, total] = await Promise.all([
      prisma.donor.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, type: true, orgName: true, kycStatus: true, createdAt: true },
      }),
      prisma.donor.count({ where: { tenantId } }),
    ]);

    return reply.send({
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  // GET /:id
  app.get("/:id", { preHandler: requirePermission("donor:read") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const { id } = req.params as { id: string };

    const donor = await prisma.donor.findFirst({ where: { id, tenantId } });
    if (!donor) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Donor not found" } });

    return reply.send({
      success: true,
      data: {
        id: donor.id,
        type: donor.type,
        orgName: donor.orgName,
        contactName: await decrypt(donor.contactNameEnc),
        email: await decrypt(donor.emailEnc),
        phone: donor.phoneEnc ? await decrypt(donor.phoneEnc) : null,
        kycStatus: donor.kycStatus,
        createdAt: donor.createdAt,
      },
    });
  });

  // DELETE /:id
  app.delete("/:id", { preHandler: requirePermission("donor:read") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const { id } = req.params as { id: string };

    const donor = await prisma.donor.findFirst({ where: { id, tenantId } });
    if (!donor) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Donor not found" } });

    await prisma.donor.delete({ where: { id } });

    return reply.send({ success: true });
  });

  // POST /
  app.post("/", { preHandler: requirePermission("donor:create") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    const parsed = CreateDonorBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parsed.error.issues },
      });
    }

    const body = parsed.data;
    const contactNameEnc = await encrypt(body.contactName);
    const emailEnc = await encrypt(body.email);
    const phoneEnc = body.phone ? await encrypt(body.phone) : null;

    const donor = await prisma.donor.create({
      data: {
        tenantId,
        type: body.type as any,
        orgName: body.orgName,
        contactNameEnc,
        emailEnc,
        phoneEnc: phoneEnc ?? undefined,
        notificationPrefs: body.notificationPrefs,
      },
      select: { id: true, type: true, orgName: true, createdAt: true },
    });

    await auditLog({
      tenantId,
      eventType: "DONOR_CREATED",
      entityType: "Donor",
      entityId: donor.id,
      actorId: userId,
      actorType: "USER",
      afterState: { type: body.type, orgName: body.orgName },
    });

    return reply.status(201).send({ success: true, data: donor });
  });

  // GET /inquiries (Admin only)
  app.get("/inquiries", { preHandler: requirePermission("donor:read") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const inquiries = await prisma.auditEvent.findMany({
      where: { tenantId, eventType: "DONOR_INQUIRY" },
      orderBy: { timestamp: "desc" },
    });
    
    // Fetch all responses and deletions to merge/filter
    const subEvents = await prisma.auditEvent.findMany({
      where: { 
        tenantId, 
        eventType: { in: ["DONOR_INQUIRY_RESPONSE", "DONOR_INQUIRY_DELETED"] } 
      },
    });

    // Enrich and filter out deleted ones
    const enriched = (await Promise.all(inquiries.map(async (iq) => {
      const isDeleted = subEvents.some(s => s.entityId === iq.id && s.eventType === "DONOR_INQUIRY_DELETED");
      if (isDeleted) return null;

      const donor = iq.actorId ? await prisma.donor.findUnique({ where: { id: iq.actorId }, select: { orgName: true } }) : null;
      const responseEvent = subEvents.find(r => r.entityId === iq.id && r.eventType === "DONOR_INQUIRY_RESPONSE");
      
      return { 
        ...iq, 
        donorOrg: donor?.orgName || 'Unknown Donor',
        metadata: responseEvent ? {
          response: (responseEvent.afterState as any).message,
          respondedBy: responseEvent.actorId,
          respondedAt: responseEvent.timestamp,
        } : iq.metadata
      };
    }))).filter(Boolean);

    return reply.send({ success: true, data: enriched });
  });

  // PATCH /inquiries/:id (DRM response)
  app.patch<{ Params: { id: string } }>("/inquiries/:id", {
    preHandler: requirePermission("donor:update"), 
  }, async (req, reply) => {
    const { tenantId, userId } = req as any;
    const { id } = req.params;
    const { response } = req.body as { response: string };

    if (!response || response.trim().length < 5) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Response must be at least 5 characters long" },
      });
    }

    const inquiry = await prisma.auditEvent.findUnique({
      where: { id },
    });

    if (!inquiry || inquiry.tenantId !== tenantId || inquiry.eventType !== "DONOR_INQUIRY") {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Inquiry not found" },
      });
    }

    // Since audit events are hash-chained and immutable, 
    // we create a NEW event for the response instead of updating the inquiry.
    await prisma.auditEvent.create({
      data: {
        tenantId,
        eventType: "DONOR_INQUIRY_RESPONSE",
        entityType: "AuditEvent",
        entityId: id, // Original inquiry ID
        actorId: userId,
        actorType: "USER",
        afterState: { message: response },
        currentHash: `resp-hash-${Date.now()}`,
      },
    });

    return reply.send({ success: true, message: "Response saved successfully" });
  });

    app.delete<{ Params: { id: string } }>("/inquiries/:id", {
      preHandler: requirePermission("donor:update"), 
    }, async (req, reply) => {
      const { tenantId, userId } = req as any;
      const { id } = req.params;

      const inquiry = await prisma.auditEvent.findUnique({ where: { id } });
      if (!inquiry || inquiry.tenantId !== tenantId) {
        return reply.status(404).send({ success: false, error: { message: "Inquiry not found" } });
      }

      await prisma.auditEvent.create({
        data: {
          tenantId,
          eventType: "DONOR_INQUIRY_DELETED",
          entityType: "AuditEvent",
          entityId: id,
          actorId: userId,
          actorType: "USER",
          afterState: { deleted: true },
          currentHash: `del-hash-${Date.now()}`,
        },
      });

      return reply.send({ success: true, message: "Inquiry deleted successfully" });
    });

  // GET /my-inquiries (Donor consolidated view)
  app.get("/my-inquiries", { preHandler: requirePermission("initiative:read") }, async (req, reply) => {
    const { tenantId } = req as any;
    const actorId = (req as any).user?.userId ?? (req as any).user?.donorId ?? "system";

    const inquiries = await prisma.auditEvent.findMany({
      where: { 
        tenantId, 
        actorId,
        eventType: "DONOR_INQUIRY"
      },
      orderBy: { timestamp: "desc" },
    });

    // Fetch all sub-events (responses, deletions) to merge/filter
    const subEvents = await prisma.auditEvent.findMany({
      where: { 
        tenantId, 
        entityType: "AuditEvent"
      },
    });

    const enriched = inquiries.map(iq => {
      const isDeleted = subEvents.some(s => s.entityId === iq.id && s.eventType === "DONOR_INQUIRY_DELETED");
      if (isDeleted) return null;

      const responseEvent = subEvents.find(r => r.entityId === iq.id && r.eventType === "DONOR_INQUIRY_RESPONSE");
      return {
        ...iq,
        metadata: responseEvent ? {
          response: (responseEvent.afterState as any).message,
          respondedBy: responseEvent.actorId,
          respondedAt: responseEvent.timestamp,
        } : iq.metadata
      };
    }).filter(Boolean);

    return reply.send({ success: true, data: enriched });
  });
}