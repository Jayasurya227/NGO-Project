import { FastifyInstance } from "fastify";
import { prisma } from "@ngo/database";
import { auditLog } from "@ngo/audit";
import { queues, DEFAULT_JOB_OPTIONS } from "@ngo/queue";
import { requirePermission } from "../middleware/rbac";
import { sanitize } from "../utils/sanitize";
import { z } from "zod";

const CreateInitiativeBody = z.object({
  title: z.string().min(3).max(200),
  sector: z.enum(["EDUCATION", "HEALTHCARE", "LIVELIHOOD", "ENVIRONMENT", "WATER_SANITATION", "INFRASTRUCTURE", "WOMEN_EMPOWERMENT", "CHILD_WELFARE", "OTHER"]),
  geography: z.object({ state: z.string(), district: z.string().optional(), lat: z.number(), lng: z.number() }),
  description: z.string().min(10).max(5000),
  targetBeneficiaries: z.number().int().positive(),
  budgetRequired: z.number().positive(),
  sdgTags: z.array(z.string()).min(1).max(5),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const CreateMilestoneBody = z.object({
  title:               z.string().min(3).max(200),
  description:         z.string().min(20).max(2000),
  dueDate:             z.string().datetime(),
  budgetAllocated:     z.number().positive(),
  sequenceOrder:       z.number().int().min(1),
  evidenceRequirements:z.object({
    requiredTypes:  z.array(z.string()),
    minPhotoCount:  z.number().int().min(0).default(0),
    gpsRequired:    z.boolean().default(false),
  }).optional(),
});

const StatusUpdateBody = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CLOSED']),
  reason: z.string().max(500).optional(),
});

export async function initiativesRoutes(app: FastifyInstance) {

  // GET / (becomes /api/initiatives)
  app.get("/", { preHandler: requirePermission("initiative:read") }, async (req, reply) => {

    const tenantId = (req as any).tenantId;
    const page = Number((req.query as any).page) || 1;
    const limit = Number((req.query as any).limit) || 20;
    const sector = (req.query as any).sector;
    const status = (req.query as any).status;

    const where = {
      tenantId,
      ...(sector && { sector: sector as any }),
      ...(status && { status: status as any }),
    };

    const [initiatives, total] = await Promise.all([
      prisma.initiative.findMany({
        where,
        select: {
          id: true, title: true, sector: true, status: true,
          geography: true, budgetRequired: true, budgetFunded: true,
          targetBeneficiaries: true, sdgTags: true, createdAt: true,
          tenant: { select: { name: true } }

        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.initiative.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: initiatives,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  // GET /:id (becomes /api/initiatives/:id)
  app.get("/:id", { preHandler: requirePermission("initiative:read") }, async (req, reply) => {

    const tenantId = (req as any).tenantId;
    const { id } = req.params as { id: string };

    const initiative = await prisma.initiative.findFirst({
      where: { id, tenantId },
      include: {
        tenant: { select: { name: true } },
        milestones: { select: { id: true, title: true, status: true, dueDate: true, budgetAllocated: true, sequenceOrder: true }, orderBy: { sequenceOrder: "asc" } },
      },

    });

    if (!initiative) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Initiative not found" } });
    return reply.send({ success: true, data: initiative });
  });

  // POST / (becomes /api/initiatives)
  app.post("/", { preHandler: requirePermission("initiative:create") }, async (req, reply) => {
    try {
      const tenantId = (req as any).tenantId;
      const userId = (req as any).userId;

      // Sanitize input to prevent UTF-8 0x00 errors
      const sanitizedBody = sanitize(req.body);

      const parsed = CreateInitiativeBody.safeParse(sanitizedBody);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parsed.error.issues },
        });
      }

      const body = parsed.data;
      const initiative = await prisma.initiative.create({
        data: {
          tenantId,
          title: body.title,
          sector: body.sector as any,
          geography: body.geography,
          description: body.description,
          targetBeneficiaries: body.targetBeneficiaries,
          budgetRequired: body.budgetRequired,
          sdgTags: body.sdgTags,
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
          status: "DRAFT",
        },
        select: { id: true, title: true, sector: true, status: true, createdAt: true },
      });

      try {
        const job = await queues.initiativeEmbedding.add("embed", { initiativeId: initiative.id, tenantId }, DEFAULT_JOB_OPTIONS);

        // Using upsert for AgentJobLog to be resilient
        await prisma.agentJobLog.upsert({
          where: { jobId: job.id! },
          update: {
            status: "QUEUED",
            triggeredBy: userId,
          },
          create: {
            tenantId,
            agentName: "initiative-embedder",
            jobId: job.id!,
            modelVersion: "text-embedding-004",
            promptHash: "initiative-data",
            status: "QUEUED",
            triggeredBy: userId,
          },
        });
      } catch (queueErr: any) {
        console.error("[Queue Error] Failed to enqueue embedding:", queueErr.message);
        // We don't fail the whole request if queueing fails, but we should log it
      }

      await auditLog({
        tenantId,
        eventType: "INITIATIVE_CREATED",
        entityType: "Initiative",
        entityId: initiative.id,
        actorId: userId,
        actorType: "USER",
        afterState: { title: body.title, sector: body.sector, status: "DRAFT" },
      });

      return reply.status(201).send({ success: true, data: initiative });
    } catch (err: any) {
      console.error("[Fatal Error] Initiative Creation:", err);
      return reply.status(500).send({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } });
    }
  });

  // ── POST /api/initiatives/:id/status (Day 11 requirement) ─────────────
  app.post<{ Params: { id: string } }>('/:id/status', {
    preHandler: requirePermission('initiative:update'),
  }, async (request, reply) => {
    const { tenantId, userId } = request as any;
    const { id } = request.params;
    const sanitizedBody = sanitize(request.body);
    const parsed = StatusUpdateBody.safeParse(sanitizedBody);

    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid body' } });
    }

    const { status, reason } = parsed.data;

    const existing = await prisma.initiative.findFirst({ where: { id, tenantId } });
    if (!existing) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Initiative not found' } });

    await prisma.initiative.update({
      where: { id },
      data:  { status: status as any },
    });

    await auditLog({
      tenantId,
      eventType:  'INITIATIVE_STATUS_CHANGED',
      entityType: 'Initiative',
      entityId:   id,
      actorId:    userId,
      actorType:  'USER',
      beforeState:{ status: existing.status },
      afterState: { status, reason: reason ?? null },
    });

    return reply.send({ success: true, data: { status, initiativeId: id } });
  });

  // DELETE /:id (becomes /api/initiatives/:id)
  app.delete("/:id", { preHandler: requirePermission("initiative:delete") }, async (req, reply) => {
    const { tenantId, userId } = req as any;
    const { id } = req.params as { id: string };

    const initiative = await prisma.initiative.findFirst({ where: { id, tenantId } });
    if (!initiative) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Initiative not found" } });

    // Cascade delete milestones and then the initiative
    await prisma.$transaction([
      prisma.milestone.deleteMany({ where: { initiativeId: id } }),
      prisma.initiative.delete({ where: { id } }),
    ]);

    await auditLog({
      tenantId,
      eventType: "INITIATIVE_DELETED",
      entityType: "Initiative",
      entityId: id,
      actorId: userId,
      actorType: "USER",
      beforeState: { title: initiative.title },
      afterState: null,
    });

    return reply.send({ success: true });
  });

  // POST /:id/inquiry (Donor inquiry)
  app.post<{ Params: { id: string } }>("/:id/inquiry", {
    preHandler: requirePermission("initiative:read"), 
  }, async (req, reply) => {
    const { tenantId } = req as any;
    const { id } = req.params;
    const actorId = (req as any).user?.userId ?? (req as any).user?.donorId ?? "system";
    const actorType = (req as any).role === "DONOR" ? "DONOR" : "USER";

    const { message } = req.body as { message: string };

    if (!message || message.trim().length < 5) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Message must be at least 5 characters long" },
      });
    }

    const initiative = await prisma.initiative.findFirst({
      where: { id, tenantId },
      select: { id: true, title: true },
    });

    if (!initiative) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Initiative not found" },
      });
    }

    await auditLog({
      tenantId,
      eventType: "DONOR_INQUIRY",
      entityType: "Initiative",
      entityId: id,
      actorId: actorId,
      actorType: actorType as any,
      afterState: { message, initiativeTitle: initiative.title },
    });

    console.log(`[INQUIRY] New inquiry from ${actorType} ${actorId} for initiative ${initiative.title}: ${message}`);

    return reply.send({ success: true, message: "Inquiry sent to DRM" });
  });

  // GET /:id/inquiries (Donor view of their own inquiries)
  app.get<{ Params: { id: string } }>("/:id/inquiries", {
    preHandler: requirePermission("initiative:read"), 
  }, async (req, reply) => {
    const { tenantId } = req as any;
    const { id } = req.params;
    const actorId = (req as any).user?.userId ?? (req as any).user?.donorId ?? "system";

    const inquiries = await prisma.auditEvent.findMany({
      where: { 
        tenantId, 
        entityId: id,
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