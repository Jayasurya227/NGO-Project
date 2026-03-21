import { FastifyInstance } from "fastify";
import { prisma } from "@ngo/database";
import { auditLog } from "@ngo/audit";
import { queues, DEFAULT_JOB_OPTIONS } from "@ngo/queue";
import { requirePermission } from "../middleware/rbac";
import { z } from "zod";

const CreateRequirementBody = z.object({
  donorId: z.string().uuid(),
  documentUrl: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

const ValidateRequirementBody = z.object({
  corrections: z.record(z.unknown()).optional(),
});

export async function requirementsRoutes(app: FastifyInstance) {

  // POST /api/requirements/upload — multipart file upload (must be before /:id routes)
  app.post("/api/requirements/upload", {
    preHandler: requirePermission("requirement:create"),
  }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    let donorId: string | null = null;
    let fileBuffer: Buffer | null = null;
    let fileName: string | null = null;
    let fileText = "";

    try {
      const parts = (req as any).parts();
      for await (const part of parts) {
        if (part.type === "field") {
          if (part.fieldname === "donorId") donorId = part.value as string;
        } else if (part.type === "file") {
          fileBuffer = await part.toBuffer();
          fileName = part.filename;
          // Try to extract text from buffer
          try {
            fileText = fileBuffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").slice(0, 12000);
          } catch {
            fileText = "";
          }
        }
      }
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: "UPLOAD_ERROR", message: err.message ?? "File upload failed" },
      });
    }

    if (!donorId) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "donorId is required" },
      });
    }

    if (!fileBuffer) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "File is required" },
      });
    }

    const donor = await prisma.donor.findFirst({ where: { id: donorId, tenantId } });
    if (!donor) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Donor not found" },
      });
    }

    const requirement = await prisma.sponsorRequirement.create({
      data: {
        tenantId,
        donorId,
        rawDocumentUrl: `uploaded:${fileName}`,
        status: "PENDING_EXTRACTION",
      },
      select: { id: true, status: true, createdAt: true },
    });

    const job = await queues.requirementExtraction.add(
      "extract",
      {
        requirementId: requirement.id,
        tenantId,
        documentUrl: "",
        documentText: fileText || "Document uploaded but text could not be extracted. Please review manually.",
      },
      DEFAULT_JOB_OPTIONS
    );

    await prisma.agentJobLog.create({
      data: {
        tenantId,
        agentName: "requirements-analyst",
        jobId: job.id!,
        modelVersion: "gemini-2.0-flash-001",
        promptHash: "pending",
        status: "QUEUED",
        triggeredBy: userId,
      },
    });

    await auditLog({
      tenantId,
      eventType: "REQUIREMENT_CREATED",
      entityType: "SponsorRequirement",
      entityId: requirement.id,
      actorId: userId,
      actorType: "USER",
      afterState: { donorId, status: "PENDING_EXTRACTION", fileName },
    });

    return reply.status(202).send({
      success: true,
      data: {
        requirementId: requirement.id,
        jobId: job.id!,
        status: "QUEUED",
        estimatedCompletionSeconds: 60,
      },
    });
  });

  // POST /api/requirements
  app.post("/api/requirements", { preHandler: requirePermission("requirement:create") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    const parsed = CreateRequirementBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parsed.error.issues },
      });
    }

    const { donorId, documentUrl } = parsed.data;
    const donor = await prisma.donor.findFirst({ where: { id: donorId, tenantId } });
    if (!donor) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Donor not found" } });

    const requirement = await prisma.sponsorRequirement.create({
      data: { tenantId, donorId, rawDocumentUrl: documentUrl, status: "PENDING_EXTRACTION" },
      select: { id: true, status: true, createdAt: true },
    });

    const job = await queues.requirementExtraction.add(
      "extract",
      { requirementId: requirement.id, tenantId, documentUrl: documentUrl ?? "" },
      DEFAULT_JOB_OPTIONS
    );

    await prisma.agentJobLog.create({
      data: {
        tenantId,
        agentName: "requirements-analyst",
        jobId: job.id!,
        modelVersion: "gemini-2.0-flash-001",
        promptHash: "pending",
        status: "QUEUED",
        triggeredBy: userId,
      },
    });

    await auditLog({
      tenantId,
      eventType: "REQUIREMENT_CREATED",
      entityType: "SponsorRequirement",
      entityId: requirement.id,
      actorId: userId,
      actorType: "USER",
      afterState: { donorId, status: "PENDING_EXTRACTION" },
    });

    return reply.status(202).send({
      success: true,
      data: {
        requirementId: requirement.id,
        jobId: job.id!,
        status: "QUEUED",
        estimatedCompletionSeconds: 60,
      },
    });
  });

  // GET /api/requirements
  app.get("/api/requirements", { preHandler: requirePermission("requirement:read") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const page = Number((req.query as any).page) || 1;
    const limit = Number((req.query as any).limit) || 20;

    const [requirements, total] = await Promise.all([
      prisma.sponsorRequirement.findMany({
        where: { tenantId },
        include: { donor: { select: { id: true, type: true, orgName: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sponsorRequirement.count({ where: { tenantId } }),
    ]);

    return reply.send({
      success: true,
      data: requirements,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  // GET /api/requirements/:id
  app.get("/api/requirements/:id", { preHandler: requirePermission("requirement:read") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const { id } = req.params as { id: string };

    const requirement = await prisma.sponsorRequirement.findFirst({
      where: { id, tenantId },
      include: {
        donor: { select: { id: true, type: true, orgName: true } },
        matchResults: { select: { id: true, rank: true, overallScore: true }, orderBy: { rank: "asc" }, take: 5 },
        _count: { select: { matchResults: true } },
      },
    });

    if (!requirement) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Requirement not found" } });

    const latestJob = await prisma.agentJobLog.findFirst({
      where: { tenantId, agentName: "requirements-analyst" },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      success: true,
      data: {
        id: requirement.id,
        status: requirement.status,
        donor: requirement.donor,
        extractedFields: requirement.extractedFields,
        confidenceScores: requirement.confidenceScores,
        gapReportJson: requirement.gapReportJson,
        createdAt: requirement.createdAt,
        updatedAt: requirement.updatedAt,
        matchCount: requirement._count.matchResults,
        topMatches: requirement.matchResults,
        latestJob: latestJob
          ? { status: latestJob.status, latencyMs: latestJob.latencyMs, error: latestJob.error }
          : null,
      },
    });
  });

  // POST /api/requirements/:id/validate
  app.post("/api/requirements/:id/validate", { preHandler: requirePermission("requirement:update") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { id } = req.params as { id: string };

    const parsed = ValidateRequirementBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid body" } });
    }

    const requirement = await prisma.sponsorRequirement.findFirst({ where: { id, tenantId } });
    if (!requirement) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Requirement not found" } });

    if (!["EXTRACTED", "NEEDS_REVIEW"].includes(requirement.status)) {
      return reply.status(400).send({ success: false, error: { code: "INVALID_STATE", message: `Cannot validate requirement in status: ${requirement.status}` } });
    }

    const { corrections } = parsed.data;
    const mergedFields = corrections
      ? { ...(requirement.extractedFields as object ?? {}), ...corrections }
      : requirement.extractedFields;

    await prisma.sponsorRequirement.update({
      where: { id },
      data: { status: "VALIDATED", extractedFields: mergedFields },
    });

    await queues.gapAnalysis.add("analyse", { requirementId: id, tenantId }, DEFAULT_JOB_OPTIONS);

    await auditLog({
      tenantId,
      eventType: "REQUIREMENT_VALIDATED",
      entityType: "SponsorRequirement",
      entityId: id,
      actorId: userId,
      actorType: "USER",
      beforeState: { status: requirement.status },
      afterState: { status: "VALIDATED" },
    });

    return reply.send({ success: true, data: { status: "VALIDATED", matchingQueued: true } });
  });

  // GET /api/requirements/:id/matches
  app.get("/api/requirements/:id/matches", { preHandler: requirePermission("requirement:read") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const { id } = req.params as { id: string };

    const req2 = await prisma.sponsorRequirement.findFirst({
      where: { id, tenantId },
      select: { id: true, status: true, extractedFields: true },
    });
    if (!req2) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Requirement not found" } });

    const matches = await prisma.matchResult.findMany({
      where: { requirementId: id },
      include: {
        initiative: {
          select: { id: true, title: true, sector: true, geography: true, description: true, budgetRequired: true, budgetFunded: true, targetBeneficiaries: true, sdgTags: true },
        },
      },
      orderBy: { rank: "asc" },
    });

    return reply.send({
      success: true,
      data: { requirementStatus: req2.status, matches, canApprove: ["VALIDATED", "MATCHED"].includes(req2.status) },
    });
  });
}