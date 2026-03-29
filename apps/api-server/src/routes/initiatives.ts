import { FastifyInstance } from "fastify";
import { prisma } from "@ngo/database";
import { auditLog } from "@ngo/audit";
import { queues, DEFAULT_JOB_OPTIONS } from "@ngo/queue";
import { requirePermission } from "../middleware/rbac";
import { z } from "zod";

const CreateInitiativeBody = z.object({
  title: z.string().min(3).max(200),
  sector: z.enum(["EDUCATION", "HEALTHCARE", "LIVELIHOOD", "ENVIRONMENT", "WATER_SANITATION", "OTHER"]),
  geography: z.object({ state: z.string(), district: z.string().optional(), lat: z.number(), lng: z.number() }),
  description: z.string().min(10).max(5000),
  targetBeneficiaries: z.number().int().positive(),
  budgetRequired: z.number().positive(),
  sdgTags: z.array(z.string()).min(1).max(5),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function initiativesRoutes(app: FastifyInstance) {

  // GET /api/initiatives
  app.get("/api/initiatives", { preHandler: requirePermission("initiative:read") }, async (req, reply) => {
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

  // GET /api/initiatives/:id
  app.get("/api/initiatives/:id", { preHandler: requirePermission("initiative:read") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const { id } = req.params as { id: string };

    const initiative = await prisma.initiative.findFirst({
      where: { id, tenantId },
      include: {
        milestones: { select: { id: true, title: true, status: true, dueDate: true, budgetAllocated: true, sequenceOrder: true }, orderBy: { sequenceOrder: "asc" } },
      },
    });

    if (!initiative) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Initiative not found" } });
    return reply.send({ success: true, data: initiative });
  });

  // POST /api/initiatives
  app.post("/api/initiatives", { preHandler: requirePermission("initiative:create") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    const parsed = CreateInitiativeBody.safeParse(req.body);
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
        status: "ACTIVE",
      },
      select: { id: true, title: true, sector: true, status: true, createdAt: true },
    });

    await queues.initiativeEmbedding.add("embed", { initiativeId: initiative.id, tenantId }, DEFAULT_JOB_OPTIONS);

    await auditLog({
      tenantId,
      eventType: "INITIATIVE_CREATED",
      entityType: "Initiative",
      entityId: initiative.id,
      actorId: userId,
      actorType: "USER",
      afterState: { title: body.title, sector: body.sector, status: "ACTIVE" },
    });

    return reply.status(201).send({ success: true, data: initiative });
  });
}