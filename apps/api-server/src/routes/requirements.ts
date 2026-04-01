import { FastifyInstance } from "fastify";
import { prisma } from "@ngo/database";
import { auditLog } from "@ngo/audit";
import { queues, DEFAULT_JOB_OPTIONS } from "@ngo/queue";
import { requirePermission } from "../middleware/rbac";
import { z } from "zod";
import { existsSync, readFileSync } from "fs";
import { basename } from "path";
import { runPitchDeckAgent } from "@ngo/agents/pitch-deck";

// Lazy-loaded imports to prevent startup crashes
const getDocxParser = async () => (await import("mammoth")).default;
// pdf-parse removed — pdfjs-dist v5 requires DOMMatrix (browser-only API)
// PDFs are now always handled by Gemini inline in the extraction agent

function getMimeType(fileName: string): string {
  const n = fileName.toLowerCase();
  if (n.endsWith(".pdf"))  return "application/pdf";
  if (n.endsWith(".png"))  return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif"))  return "image/gif";
  return "image/jpeg"; // jpg, jpeg, bmp, tiff, etc.
}






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
          const nameLower = fileName?.toLowerCase() ?? "";
          try {
            if (nameLower.endsWith(".docx") || nameLower.endsWith(".doc")) {
              // Word docs: mammoth gives perfect text — no AI needed
              const mammoth = await getDocxParser();
              const result = await mammoth.extractRawText({ buffer: fileBuffer });
              fileText = result.value;
            } else if (nameLower.endsWith(".txt") || nameLower.endsWith(".csv")) {
              fileText = fileBuffer.toString("utf-8").slice(0, 20000);
            } else if (nameLower.endsWith(".pdf")) {
              // PDFs always go to Gemini inline — fileText stays ""
              // Gemini handles both text-based and scanned PDFs natively
            }
            // For .pdf with little text, .jpg, .png etc: fileText stays ""
            // The agent will use rawFileBase64 + mimeType to read via Gemini multimodal
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

    const mimeType = getMimeType(fileName ?? "")
    const hasText = fileText.trim().length >= 80

    // Store base64 in DB (not Redis) — reliable for any file size
    const requirement = await prisma.sponsorRequirement.create({
      data: {
        tenantId,
        donorId,
        rawDocumentUrl: `uploaded:${fileName}`,
        extractedFields: hasText
          ? { rawText: fileText.slice(0, 20000) }
          : {
              rawFileMimeType: mimeType,
              rawFileBase64: fileBuffer.toString("base64"), // stored in DB so worker can read it
            },
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
        documentText: fileText || "",
        // base64 NOT passed via Redis — worker reads it from DB
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

    let { donorId, documentUrl } = parsed.data;
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

  // GET /pitch-decks — approved pitch decks for this donor's requirements (must be before /:id)
  app.get("/pitch-decks", { preHandler: requirePermission("requirement:read") }, async (req, reply) => {
    const { tenantId } = req as any;
    const donorId = (req as any).user?.donorId;
    const role = (req as any).role;

    const where: any = { tenantId };
    if (role === "DONOR" && donorId) {
      where.donorId = donorId;
    }

    const requirements = await prisma.sponsorRequirement.findMany({
      where,
      select: { id: true },
    });

    const requirementIds = requirements.map((r: any) => r.id);
    if (requirementIds.length === 0) {
      return reply.send({ success: true, data: [] });
    }

    const artifacts = await prisma.contentArtifact.findMany({
      where: {
        tenantId,
        type: "PITCH_DECK",
        approvalStatus: { in: ["PENDING_REVIEW", "APPROVED"] },
        relatedEntityId: { in: requirementIds },
      },
      select: { id: true, relatedEntityId: true, approvalStatus: true, approvedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ success: true, data: artifacts });
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

    return reply.send({
      success: true,
      data: {
        id: requirement.id,
        status: requirement.status,
        rawDocumentUrl: requirement.rawDocumentUrl,
        donor: requirement.donor,
        extractedFields: requirement.extractedFields,
        confidenceScores: requirement.confidenceScores,
        gapReportJson: requirement.gapReportJson,
        createdAt: requirement.createdAt,
        updatedAt: requirement.updatedAt,
        matchCount: requirement._count.matchResults,
        topMatches: requirement.matchResults,
      },
    });
  });

  // POST /:id/validate
  app.post("/:id/validate", { preHandler: requirePermission("requirement:update") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
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

  // POST /:id/request-resubmission
  app.post("/:id/request-resubmission", { preHandler: requirePermission("requirement:update") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const { id } = req.params as { id: string };
    const { note } = (req.body ?? {}) as { note?: string };

    const requirement = await prisma.sponsorRequirement.findFirst({ where: { id, tenantId } });
    if (!requirement) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Requirement not found" } });

    if (!["EXTRACTED", "NEEDS_REVIEW", "PENDING_EXTRACTION"].includes(requirement.status)) {
      return reply.status(400).send({ success: false, error: { code: "INVALID_STATE", message: `Cannot request resubmission for status: ${requirement.status}` } });
    }

    const actorId = (req as any).user?.userId ?? "system";

    // Reset to PENDING_EXTRACTION so donor can upload a new document
    // Keep the note in extractedFields so donor portal can show it
    await prisma.sponsorRequirement.update({
      where: { id },
      data: {
        status: "PENDING_EXTRACTION",
        extractedFields: {
          resubmissionRequested: true,
          resubmissionNote: note || "The submitted document could not be extracted accurately. Please upload a clearer or more complete document.",
          resubmissionRequestedAt: new Date().toISOString(),
          resubmissionRequestedBy: actorId,
        } as any,
        confidenceScores: null,
      },
    });

    await auditLog({
      tenantId,
      eventType: "REQUIREMENT_RESUBMISSION_REQUESTED",
      entityType: "SponsorRequirement",
      entityId: id,
      actorId,
      actorType: "USER",
      beforeState: { status: requirement.status },
      afterState: { status: "PENDING_EXTRACTION", note },
    });

    return reply.send({ success: true, data: { status: "PENDING_EXTRACTION", message: "Resubmission requested. Donor has been notified." } });
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
    const { approvedMatchIds, reorderedRanks } = req.body as { approvedMatchIds: string[]; reorderedRanks?: Record<string, number> };

    const actorId = user?.userId ?? user?.donorId ?? "system";
    const actorType = role === "DONOR" ? "DONOR" : "USER";

    const requirement = await prisma.sponsorRequirement.findFirst({ where: { id, tenantId } });
    if (!requirement) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Requirement not found" } });

    if (reorderedRanks) {
      for (const [matchId, rank] of Object.entries(reorderedRanks)) {
        await prisma.matchResult.update({ where: { id: matchId }, data: { rank } });
      }
    }

    await prisma.sponsorRequirement.update({ where: { id }, data: { status: "MATCHED" } });

    const { auditLog: log } = await import("@ngo/audit");
    await log({
      tenantId,
      eventType: "MATCHES_APPROVED",
      entityType: "SponsorRequirement",
      entityId: id,
      actorId,
      actorType: actorType as any,
      afterState: { reorderedRanks: reorderedRanks ?? null },
    });

    // Generate pitch deck and send to DRM review queue (Content & Approvals)
    runPitchDeckAgent({ requirementId: id, tenantId, approvedMatchIds })
      .then(r => console.log(`[pitch-deck] Artifact ${r.contentArtifactId} queued for DRM review`))
      .catch(err => console.error("[pitch-deck] Generation failed:", err.message));

    return reply.send({ success: true, data: { status: "MATCHED", pitchDeckQueued: true } });
  });

  // GET /matches - global view of all match results across all requirements
  app.get("/matches", { preHandler: requirePermission("requirement:read") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;

    const allMatches = await prisma.matchResult.findMany({
      where: {
        requirement: { tenantId },
      },
      include: {
        initiative: {
          select: { id: true, title: true, sector: true, geography: true, budgetRequired: true, budgetFunded: true },
        },
        requirement: {
          select: {
            id: true,
            status: true,
            extractedFields: true,
            donor: { select: { orgName: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      success: true,
      data: allMatches,
      meta: { total: allMatches.length },
    });
  });

  // GET /:id/pitch-deck-file — download the approved PPTX for a specific requirement
  app.get<{ Params: { id: string } }>("/:id/pitch-deck-file", { preHandler: requirePermission("requirement:read") }, async (req, reply) => {
    const { tenantId } = req as any;
    const { id } = req.params;

    const artifact = await prisma.contentArtifact.findFirst({
      where: { tenantId, type: "PITCH_DECK", approvalStatus: "APPROVED", relatedEntityId: id },
      orderBy: { approvedAt: "desc" },
    });

    if (!artifact?.fileUrl) {
      return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "No approved pitch deck found." } });
    }

    if (!existsSync(artifact.fileUrl)) {
      return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Pitch deck file not found on server." } });
    }

    const fileBuffer = readFileSync(artifact.fileUrl);
    reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    reply.header("Content-Disposition", `attachment; filename="${basename(artifact.fileUrl)}"`);
    return reply.send(fileBuffer);
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