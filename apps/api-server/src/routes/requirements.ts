import { FastifyInstance } from "fastify";
import { prisma } from "@ngo/database";
import { auditLog } from "@ngo/audit";
import { queues, DEFAULT_JOB_OPTIONS } from "@ngo/queue";
import { requirePermission } from "../middleware/rbac";
import { encrypt } from "@ngo/auth/encryption";
import { z } from "zod";

// Resolve or auto-create a donor for the given tenant.
// Used when the donor portal issues a "guest" token (no real donor record yet).
async function resolveOrCreateDonor(tenantId: string, donorId: string | null): Promise<string> {
  // 1. Try exact match first
  if (donorId && donorId !== "guest") {
    const existing = await prisma.donor.findFirst({ where: { id: donorId, tenantId } });
    if (existing) return existing.id;
  }

  // 2. Fall back to first donor in tenant
  const first = await prisma.donor.findFirst({ where: { tenantId }, select: { id: true } });
  if (first) return first.id;

  // 3. Auto-create a placeholder donor so the upload can proceed
  const placeholder = await prisma.donor.create({
    data: {
      tenantId,
      type: "CSR" as any,
      orgName: "Portal Donor",
      contactNameEnc: await encrypt("Portal Donor"),
      emailEnc: await encrypt("donor@portal.local"),
      kycStatus: "NOT_REQUIRED" as any,
    },
    select: { id: true },
  });
  return placeholder.id;
}

function getMimeType(fileName: string): string {
  const n = fileName.toLowerCase();
  if (n.endsWith(".pdf"))               return "application/pdf";
  if (n.endsWith(".png"))               return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp"))              return "image/webp";
  if (n.endsWith(".gif"))               return "image/gif";
  if (n.endsWith(".bmp"))               return "image/bmp";
  if (n.endsWith(".tiff") || n.endsWith(".tif")) return "image/tiff";
  if (n.endsWith(".docx"))              return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (n.endsWith(".xlsx"))              return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (n.endsWith(".pptx"))              return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (n.endsWith(".txt") || n.endsWith(".csv")) return "text/plain";
  return "application/octet-stream";
}

function isGeminiNativeMime(mime: string): boolean {
  // Mime types Gemini can read directly as inline data
  return mime === "application/pdf" || mime.startsWith("image/");
}

const getDocxParser = async () => (await import("mammoth")).default;
const getPdfParser = async () => { const m = await import("pdf-parse"); return (m as any).default || m; };

const CreateRequirementBody = z.object({
  donorId: z.string().optional(),
  documentUrl: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

const ValidateRequirementBody = z.object({
  corrections: z.record(z.unknown()).optional(),
});

const ApproveMatchesBody = z.object({
  approvedMatchIds: z.array(z.string()).min(1).max(5),
  reorderedRanks: z.record(z.number()).optional(),
});

export async function requirementsRoutes(app: FastifyInstance) {

  // POST /api/requirements/upload
  app.post("/upload", { preHandler: requirePermission("requirement:create") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;

    let donorId: string | null = null;
    let fileBuffer: Buffer | null = null;
    let fileName: string = "document";
    let fileText = "";

    try {
      const parts = (req as any).parts();
      for await (const part of parts) {
        if (part.type === "field") {
          if (part.fieldname === "donorId") donorId = part.value as string;
        } else if (part.type === "file") {
          fileBuffer = await part.toBuffer();
          fileName = part.filename ?? "document"; // FIX 1: capture fileName

          // Extract text — support any file type
          try {
            const fn = fileName.toLowerCase();
            if (fn.endsWith(".docx") || fn.endsWith(".doc")) {
              const mammoth = await getDocxParser();
              fileText = (await mammoth.extractRawText({ buffer: fileBuffer })).value;
            } else if (fn.endsWith(".pdf")) {
              const pdfParse = await getPdfParser();
              fileText = (await pdfParse(fileBuffer)).text;
            } else if (fn.endsWith(".txt") || fn.endsWith(".csv") || fn.endsWith(".md")) {
              fileText = fileBuffer.toString("utf-8").slice(0, 15000);
            } else if (fn.endsWith(".xlsx") || fn.endsWith(".xls")) {
              // Basic xlsx: extract raw text from XML inside zip
              try {
                const str = fileBuffer.toString("utf-8");
                const matches = str.match(/<t[^>]*>([^<]+)<\/t>/g) ?? [];
                fileText = matches.map(m => m.replace(/<[^>]+>/g, "")).join(" ").slice(0, 15000);
              } catch { fileText = ""; }
            } else {
              // Try UTF-8 decode; if it looks like text, use it
              const attempt = fileBuffer.toString("utf-8").slice(0, 15000);
              fileText = /[\x00-\x08\x0E-\x1F]/.test(attempt.slice(0, 200)) ? "" : attempt;
            }
          } catch { fileText = ""; }
        }
      }
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: "UPLOAD_ERROR", message: err.message ?? "File upload failed" },
      });
    }

    if (!fileBuffer) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "File is required" },
      });
    }

    // Resolve donorId — falls back to first tenant donor or auto-creates one
    const jwtDonorId = (req as any).user?.donorId ?? donorId;
    const resolvedDonorId = await resolveOrCreateDonor(tenantId, jwtDonorId);

    const mimeType = getMimeType(fileName);
    const hasText = fileText.trim().length >= 80;
    // For images and PDFs Gemini can read natively via multimodal — always store base64
    const useMultimodal = isGeminiNativeMime(mimeType) && !hasText;

    const requirement = await prisma.sponsorRequirement.create({
      data: {
        tenantId,
        donorId: resolvedDonorId,
        rawDocumentUrl: `uploaded:${fileName}`,
        extractedFields: hasText
          ? { rawText: fileText.slice(0, 20000) }
          : useMultimodal
            ? { rawFileMimeType: mimeType, rawFileBase64: fileBuffer.toString("base64") }
            : { rawText: `Uploaded file: ${fileName} (no text extractable — DRM please fill manually)` },
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
        documentText: fileText || "", // FIX 4: pass extracted text to worker
      },
      DEFAULT_JOB_OPTIONS
    );

    await prisma.agentJobLog.upsert({
      where: { jobId: job.id! },
      update: { status: "QUEUED" },
      create: { tenantId: tenantId as string, jobId: job.id!, agentName: "extract", status: "QUEUED", modelVersion: "gemini-2.5-flash-lite", promptHash: "n/a" },
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
  app.post("/", { preHandler: requirePermission("requirement:create") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;

    const parsed = CreateRequirementBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parsed.error.issues },
      });
    }

    const { donorId: rawDonorId, documentUrl, notes } = parsed.data;

    const jwtDonorId2 = (req as any).user?.donorId ?? rawDonorId;
    const resolvedDonorId2 = await resolveOrCreateDonor(tenantId, jwtDonorId2);

    const requirement = await prisma.sponsorRequirement.create({
      data: {
        tenantId,
        donorId: resolvedDonorId2,
        rawDocumentUrl: documentUrl,
        status: "PENDING_EXTRACTION",
        // Save manual notes as rawText so the extraction worker can read them
        ...(notes ? { extractedFields: { rawText: notes } } : {}),
      },
      select: { id: true, status: true, createdAt: true },
    });

    const job = await queues.requirementExtraction.add(
      "extract",
      { requirementId: requirement.id, tenantId, documentUrl: documentUrl ?? "", documentText: notes ?? "" },
      DEFAULT_JOB_OPTIONS
    );

    await prisma.agentJobLog.upsert({
      where: { jobId: job.id! },
      update: { status: "QUEUED" },
      create: { tenantId: tenantId as string, jobId: job.id!, agentName: "extract", status: "QUEUED", modelVersion: "gemini-2.5-flash-lite", promptHash: "n/a" },
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
  app.get("/", { preHandler: requirePermission("requirement:read") }, async (req, reply) => {
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
      data: { requirements, total, page, limit },
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

    // Enrich with initiative name from top match
    const enriched = await Promise.all(artifacts.map(async (a) => {
      const topMatch = await prisma.matchResult.findFirst({
        where: { requirementId: a.relatedEntityId },
        include: { initiative: { select: { title: true, tenant: { select: { name: true } } } } },
        orderBy: { rank: 'asc' },
      });
      return {
        ...a,
        initiativeTitle: topMatch?.initiative?.title ?? null,
        ngoName: topMatch?.initiative?.tenant?.name ?? null,
      };
    }));

    return reply.send({ success: true, data: enriched });
  });

  // GET /api/requirements/:id
  app.get("/:id", { preHandler: requirePermission("requirement:read") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const { id } = req.params as { id: string };

    const requirement = await prisma.sponsorRequirement.findFirst({
      where: { id, tenantId },
      include: {
        donor: { select: { id: true, type: true, orgName: true } },
        matchResults: { select: { id: true, rank: true, overallScore: true, initiative: { select: { targetBeneficiaries: true } } }, orderBy: { rank: "asc" }, take: 5 },
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

  // POST /api/requirements/:id/validate
  app.post("/:id/validate", { preHandler: requirePermission("requirement:update") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
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
      data: { status: "VALIDATED", extractedFields: mergedFields as any },
    });

    // Directly queue gap analysis so it starts immediately (not via polling recovery)
    const gapJob = await queues.gapAnalysis.add(
      "analyse",
      { requirementId: id, tenantId },
      DEFAULT_JOB_OPTIONS
    );

    await prisma.agentJobLog.upsert({
      where: { jobId: gapJob.id! },
      update: { status: "QUEUED" },
      create: { tenantId: tenantId as string, jobId: gapJob.id!, agentName: "gap-diagnoser", status: "QUEUED", modelVersion: "gemini-2.5-flash-lite", promptHash: "n/a" },
    });

    return reply.send({ success: true });
  });

  // GET /api/requirements/:id/matches
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
            id: true, title: true, sector: true, geography: true,
            description: true, budgetRequired: true, budgetFunded: true,
            targetBeneficiaries: true, sdgTags: true,
            milestones: { select: { status: true } },
          },
        },
      },
      orderBy: { rank: "asc" },
    });

    const transformedMatches = matches.map(m => {
      const { milestones, ...initRest } = m.initiative as any;
      return {
        ...m,
        initiative: {
          ...initRest,
          fundingGapInr: Number(m.initiative.budgetRequired) - Number(m.initiative.budgetFunded),
          completedMilestones: milestones.filter((ms: any) => ms.status === "COMPLETED").length,
          totalMilestones: milestones.length,
        },
      };
    });

    return reply.send({
      success: true,
      data: {
        requirementStatus: req2.status,
        requirementFields: req2.extractedFields,
        matches: transformedMatches,
        canApprove: ["VALIDATED", "MATCHED"].includes(req2.status),
      },
    });
  });

  // POST /api/requirements/:id/matches/approve
  app.post("/:id/matches/approve", { preHandler: requirePermission("requirement:update") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const { id } = req.params as { id: string };

    const parsed = ApproveMatchesBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid body", details: parsed.error.issues },
      });
    }

    const { approvedMatchIds, reorderedRanks } = parsed.data;

    const requirement = await prisma.sponsorRequirement.findFirst({ where: { id, tenantId } });
    if (!requirement) {
      return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Requirement not found" } });
    }

    if (!["VALIDATED", "MATCHED"].includes(requirement.status)) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_STATE", message: `Cannot approve matches in status: ${requirement.status}` },
      });
    }

    // Apply any PM-reordered ranks
    if (reorderedRanks && Object.keys(reorderedRanks).length > 0) {
      for (const [matchId, rank] of Object.entries(reorderedRanks)) {
        await prisma.matchResult.updateMany({
          where: { id: matchId, requirementId: id },
          data: { rank },
        });
      }
    }

    // Queue pitch deck generation
    const job = await queues.pitchDeckGeneration.add(
      "generate",
      { requirementId: id, tenantId, approvedMatchIds },
      DEFAULT_JOB_OPTIONS
    );

    await prisma.agentJobLog.upsert({
      where: { jobId: job.id! },
      update: { status: "QUEUED" },
      create: { tenantId: tenantId as string, jobId: job.id!, agentName: "pitch-deck-agent", status: "QUEUED", modelVersion: "gemini-2.5-flash-lite", promptHash: "n/a" },
    });

    await auditLog({
      tenantId,
      actorId: (req as any).userId,
      eventType: "MATCHES_APPROVED",
      entityType: "SponsorRequirement",
      entityId: id,
      actorType: "USER",
      afterState: { approvedMatchIds, pitchDeckJobId: job.id },
    });

    return reply.send({
      success: true,
      data: { jobId: job.id!, status: "QUEUED", message: "Pitch deck generation started" },
    });
  });

  // DELETE /:id
  app.delete("/:id", { preHandler: requirePermission("requirement:create") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const { id } = req.params as { id: string };

    const req_ = await prisma.sponsorRequirement.findFirst({ where: { id, tenantId } });
    if (!req_) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Requirement not found" } });

    await prisma.sponsorRequirement.delete({ where: { id } });

    return reply.send({ success: true });
  });

}