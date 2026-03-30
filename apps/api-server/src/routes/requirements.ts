import { FastifyInstance } from "fastify";
import { prisma } from "@ngo/database";
import { auditLog } from "@ngo/audit";
import { queues, DEFAULT_JOB_OPTIONS } from "@ngo/queue";
import { requirePermission } from "../middleware/rbac";
import { z } from "zod";

// Lazy-loaded imports to prevent startup crashes
const getDocxParser = async () => (await import("mammoth")).default;
const getPdfParser = async () => {
  const mod = await import("pdf-parse");
  return (mod as any).default || mod;
};






const CreateRequirementBody = z.object({
  donorId: z.string().uuid(),
  documentUrl: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

const ValidateRequirementBody = z.object({
  corrections: z.record(z.string(), z.unknown()).optional(),
});

export async function requirementsRoutes(app: FastifyInstance) {

  // POST /upload — multipart file upload (must be before /:id routes)
  app.post("/upload", {
    preHandler: requirePermission("requirement:create"),
  }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const role = (req as any).role;
    const decodedDonorId = (req as any).user?.donorId;

    let donorId: string | null = (role === "DONOR") ? decodedDonorId : null;
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
          // Try to extract text from buffer properly based on extension
          try {
            if (fileName?.toLowerCase().endsWith(".docx")) {
              const mammoth = await getDocxParser();
              const result = await mammoth.extractRawText({ buffer: fileBuffer });
              fileText = result.value;
            } else if (fileName?.toLowerCase().endsWith(".pdf")) {
              const pdfParse = await getPdfParser();
              const data = await pdfParse(fileBuffer);
              fileText = data.text;
            } else {

              fileText = fileBuffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").slice(0, 12000);
            }
          } catch (err) {
            console.error("[upload] Text extraction failed:", err);
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

    const actorId = (req as any).user?.userId ?? (req as any).user?.donorId ?? "system";
    const actorType = role === "DONOR" ? "DONOR" : "USER";

    await prisma.agentJobLog.upsert({
      where: { jobId: job.id! },
      update: {
        status: "QUEUED",
        triggeredBy: actorId,
      },
      create: {
        tenantId,
        agentName: "requirements-analyst",
        jobId: job.id!,
        modelVersion: "gemini-2.0-flash-001",
        promptHash: "pending",
        status: "QUEUED",
        triggeredBy: actorId,
      },
    });

    await auditLog({
      tenantId,
      eventType: "REQUIREMENT_CREATED",
      entityType: "SponsorRequirement",
      entityId: requirement.id,
      actorId: actorId,
      actorType: actorType as any,
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

  // POST /
  app.post("/", { preHandler: requirePermission("requirement:create") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const role = (req as any).role;
    const decodedDonorId = (req as any).user?.donorId;
    const actorId = (req as any).user?.userId ?? decodedDonorId ?? "system";
    const actorType = role === "DONOR" ? "DONOR" : "USER";

    const parsed = CreateRequirementBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parsed.error.issues },
      });
    }

    let { donorId, documentUrl, notes } = parsed.data;
    if (role === "DONOR" && decodedDonorId) {
      donorId = decodedDonorId;
    }
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

    await prisma.agentJobLog.upsert({
      where: { jobId: job.id! },
      update: {
        status: "QUEUED",
        triggeredBy: actorId,
      },
      create: {
        tenantId,
        agentName: "requirements-analyst",
        jobId: job.id!,
        modelVersion: "gemini-2.0-flash-001",
        promptHash: "pending",
        status: "QUEUED",
        triggeredBy: actorId,
      },
    });

    await auditLog({
      tenantId,
      eventType: "REQUIREMENT_CREATED",
      entityType: "SponsorRequirement",
      entityId: requirement.id,
      actorId: actorId,
      actorType: actorType as any,
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

  // GET /
  app.get("/", { preHandler: requirePermission("requirement:read") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const role = (req as any).role;
    const donorId = (req as any).user?.donorId;
    const page = Number((req.query as any).page) || 1;
    const limit = Number((req.query as any).limit) || 20;

    const where: any = { tenantId };
    if (role === "DONOR" && donorId) {
      where.donorId = donorId;
    }

    console.log(`[DEBUG] GET /api/requirements for tenantId: ${tenantId}, role: ${role}`);
    const [requirements, total] = await Promise.all([
      prisma.sponsorRequirement.findMany({
        where,
        include: { donor: { select: { id: true, type: true, orgName: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sponsorRequirement.count({ where }),
    ]);

    console.log(`[DEBUG] Returning ${requirements.length} requirements. Total in DB: ${total}`);
    return reply.send({
      success: true,
      data: requirements,
      meta: { total },
    });
  });

  // GET /:id
  app.get("/:id", { preHandler: requirePermission("requirement:read") }, async (req, reply) => {
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

  // POST /:id/validate
  app.post("/:id/validate", { preHandler: requirePermission("requirement:update") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { id } = req.params as { id: string };

    const parsed = ValidateRequirementBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid body" } });
    }

    const requirement = await prisma.sponsorRequirement.findFirst({ where: { id, tenantId } });
    if (!requirement) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Requirement not found" } });

    if (["CONTRACTED", "CLOSED"].includes(requirement.status)) {
      return reply.status(400).send({ success: false, error: { code: "INVALID_STATE", message: `Cannot validate requirement in status: ${requirement.status}` } });
    }

    const { corrections } = parsed.data;
    const mergedFields = corrections
      ? { ...(requirement.extractedFields as object ?? {}), ...corrections }
      : requirement.extractedFields;

    await prisma.sponsorRequirement.update({
      where: { id },
      data: { status: "VALIDATED", extractedFields: mergedFields as any },
    });

    const job = await queues.gapAnalysis.add("analyse", { requirementId: id, tenantId }, DEFAULT_JOB_OPTIONS);

    const actorId = (req as any).user?.userId ?? (req as any).user?.donorId ?? "system";
    const actorType = (req as any).role === "DONOR" ? "DONOR" : "USER";

    await prisma.agentJobLog.upsert({
      where: { jobId: job.id! },
      update: {
        status: "QUEUED",
        triggeredBy: actorId,
      },
      create: {
        tenantId,
        agentName: "gap-diagnoser",
        jobId: job.id!,
        modelVersion: "gemini-2.0-flash-001",
        promptHash: "pending",
        status: "QUEUED",
        triggeredBy: actorId,
      },
    });

    await auditLog({
      tenantId,
      eventType: "REQUIREMENT_VALIDATED",
      entityType: "SponsorRequirement",
      entityId: id,
      actorId: actorId,
      actorType: actorType as any,
      beforeState: { status: requirement.status },
      afterState: { status: "VALIDATED" },
    });

    return reply.send({ success: true, data: { status: "VALIDATED", matchingQueued: true } });
  });

  // GET /:id/matches
  app.get("/:id/matches", { preHandler: requirePermission("requirement:read") }, async (req, reply) => {
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
          select: {
            id: true,
            title: true,
            sector: true,
            geography: true,
            description: true,
            budgetRequired: true,
            budgetFunded: true,
            targetBeneficiaries: true,
            sdgTags: true,
            status: true,
            milestones: {
              select: {
                status: true,
                _count: { select: { evidence: true } },
              },
            },
          },
        },
      },
      orderBy: { rank: "asc" },
    });

    // Add computed fields before returning
    const enrichedMatches = matches.map((m) => ({
      ...m,
      initiative: {
        ...m.initiative,
        fundingGapInr: Number(m.initiative.budgetRequired) - Number(m.initiative.budgetFunded),
        completedMilestones: m.initiative.milestones.filter((ms) => ms.status === "COMPLETED").length,
        totalMilestones: m.initiative.milestones.length,
        totalEvidenceCount: m.initiative.milestones.reduce((sum, ms) => sum + ms._count.evidence, 0),
      },
    }));

    return reply.send({
      success: true,
      data: {
        requirementStatus: req2.status,
        requirementFields: req2.extractedFields,
        matches: enrichedMatches,
        canApprove: ["VALIDATED", "MATCHED"].includes(req2.status),
      },
    });
  });

  // POST /:id/matches/approve
  app.post("/:id/matches/approve", {
    preHandler: [
      requirePermission("requirement:update"),
      validateBody(z.object({
        approvedMatchIds: z.array(z.string()),
        reorderedRanks:   z.record(z.string(), z.number()).optional(),
      })),
    ],
  }, async (req, reply) => {
    const { tenantId, user, role } = req as any;
    const { id } = req.params as { id: string };
    const { reorderedRanks } = req.body as { reorderedRanks?: Record<string, number> };

    const actorId = user?.userId ?? user?.donorId ?? "system";
    const actorType = role === "DONOR" ? "DONOR" : "USER";

    const requirement = await prisma.sponsorRequirement.findFirst({ where: { id, tenantId } });
    if (!requirement) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Requirement not found" } });

    // ... (manual rank updates)
    if (reorderedRanks) {
      for (const [matchId, rank] of Object.entries(reorderedRanks)) {
        await prisma.matchResult.update({
          where: { id: matchId },
          data:  { rank },
        });
      }
    }

    await prisma.sponsorRequirement.update({
      where: { id },
      data:  { status: "MATCHED" },
    });

    const { auditLog: log } = await import("@ngo/audit");
    await log({
      tenantId,
      eventType: "MATCHES_APPROVED",
      entityType: "SponsorRequirement",
      entityId: id,
      actorId: actorId,
      actorType: actorType as any,
      afterState: { reorderedRanks: reorderedRanks ?? null },
    });

    return reply.send({ success: true, data: { status: "MATCHED" } });
  });
}

function validateBody(schema: z.ZodSchema) {
  return async (req: any, reply: any) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parsed.error.issues }
      });
    }
  };
}