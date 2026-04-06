import { FastifyInstance } from "fastify";
import { prisma } from "@ngo/database";
import { auditLog } from "@ngo/audit";
import { queues, DEFAULT_JOB_OPTIONS } from "@ngo/queue";
import { requirePermission } from "../middleware/rbac";
import { sanitize } from "../utils/sanitize";
import { z } from "zod";
import { existsSync, readFileSync } from "fs";
import { basename } from "path";

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

const getDocxParser = async () => (await import("mammoth")).default;
const getPdfParser  = async () => { const m = await import("pdf-parse"); return (m as any).default || m; };

async function extractInitiativeFieldsWithAI(
  documentText: string,
  fileName: string,
  fileBuffer?: Buffer,
  fileMimeType?: string,
) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
  const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const promptText = `You are an expert at extracting structured data from NGO project proposal documents.
Extract the following fields from this NGO initiative document and return ONLY valid JSON:

Return this exact JSON structure:
{
  "title": "Short descriptive title of the initiative (max 100 chars)",
  "ngoId": "NGO registration or project ID found in the document, e.g. NGO-2024-001 or null if not found",
  "sector": "EDUCATION",
  "state": "Maharashtra",
  "district": "Pune",
  "description": "2-3 sentence description of what this initiative does",
  "targetBeneficiaries": 500,
  "budgetRequired": 2500000,
  "sdgTags": ["QUALITY_EDUCATION", "REDUCED_INEQUALITY"],
  "durationMonths": 12
}

Rules:
- sector must be one of: EDUCATION, HEALTHCARE, LIVELIHOOD, ENVIRONMENT, WATER_SANITATION, OTHER
- budgetRequired in rupees (1 lakh = 100000, 1 crore = 10000000). Use 0 if not mentioned.
- targetBeneficiaries is a number. Use 100 if not mentioned.
- sdgTags: 1-3 tags from: NO_POVERTY, ZERO_HUNGER, GOOD_HEALTH, QUALITY_EDUCATION, GENDER_EQUALITY, CLEAN_WATER, REDUCED_INEQUALITY. Infer from context.
- ngoId: look for registration numbers, project IDs, NGO IDs, FCRA numbers, or ANY identifier labeled as ID / Reg. No / Project No / Certificate No. Use null if not found.
- If field not found, use reasonable defaults.
- title: use "${fileName.replace(/\.[^.]+$/, "")}" if no clear title in the document.`;

  // Decide whether to send text or the raw file to Gemini
  const cleanText = documentText?.replace(/^\s*%PDF[^\n]*\n?/, "").trim() ?? "";
  const isUsableText = cleanText.length > 100;

  let parts: any[];
  if (isUsableText) {
    // Text-based document — send extracted text + also send file inline so Gemini can see IDs on header/footer
    const textPart = { text: `${promptText}\n\n=== DOCUMENT TEXT ===\n${cleanText.slice(0, 15000)}\n=== END ===` };
    if (fileBuffer && (fileMimeType === "application/pdf" || fileMimeType.startsWith("image/"))) {
      parts = [
        { inlineData: { mimeType: fileMimeType, data: fileBuffer.toString("base64") } },
        textPart,
      ];
    } else {
      parts = [textPart];
    }
  } else if (fileBuffer && fileMimeType) {
    // Scanned / image-based PDF — use Gemini multimodal only
    console.log("[initiative-upload] Using multimodal mode for:", fileMimeType);
    parts = [
      { inlineData: { mimeType: fileMimeType, data: fileBuffer.toString("base64") } },
      { text: promptText },
    ];
  } else {
    console.warn("[initiative-upload] No usable text or file buffer — skipping AI extraction");
    return null;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[initiative-upload] Gemini API error:", res.status, errText.slice(0, 300));
      return null;
    }
    const data = await res.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    console.log("[initiative-upload] Gemini raw response:", text.slice(0, 500));
    const parsed = JSON.parse(text.replace(/```json\n?|```/g, "").trim());
    console.log("[initiative-upload] Extracted ngoId:", parsed?.ngoId, "| title:", parsed?.title);
    return parsed;
  } catch (err) {
    console.error("[initiative-upload] Extraction error:", err);
    return null;
  }
}

export async function initiativesRoutes(app: FastifyInstance) {

  // POST /upload — multipart NGO document upload with AI extraction
  app.post("/upload", { preHandler: requirePermission("initiative:create") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    let fileBuffer: Buffer | null = null;
    let fileName = "document";
    let fileMimeType = "application/octet-stream";
    let fileText = "";

    try {
      const parts = (req as any).parts();
      for await (const part of parts) {
        if (part.type === "file") {
          fileBuffer   = await part.toBuffer();
          fileName     = part.filename ?? "document";
          fileMimeType = part.mimetype ?? "application/octet-stream";
          try {
            const fn = fileName.toLowerCase();
            if (fn.endsWith(".docx") || fn.endsWith(".doc")) {
              const mammoth = await getDocxParser();
              fileText = (await mammoth.extractRawText({ buffer: fileBuffer })).value;
            } else if (fn.endsWith(".pdf")) {
              const pdfParse = await getPdfParser();
              fileText = (await pdfParse(fileBuffer)).text;
              fileMimeType = "application/pdf";
            } else if (fn.endsWith(".txt") || fn.endsWith(".csv") || fn.endsWith(".md")) {
              fileText = fileBuffer.toString("utf-8").slice(0, 15000);
            } else if (fn.endsWith(".xlsx") || fn.endsWith(".xls")) {
              try {
                const str = fileBuffer.toString("utf-8");
                const matches = str.match(/<t[^>]*>([^<]+)<\/t>/g) ?? [];
                fileText = matches.map((m: string) => m.replace(/<[^>]+>/g, "")).join(" ").slice(0, 15000);
              } catch { fileText = ""; }
            } else {
              const attempt = fileBuffer.toString("utf-8").slice(0, 15000);
              fileText = /[\x00-\x08\x0E-\x1F]/.test(attempt.slice(0, 200)) ? "" : attempt;
            }
          } catch { fileText = ""; }
        }
      }
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: { code: "UPLOAD_ERROR", message: err.message } });
    }

    if (!fileBuffer) {
      return reply.status(400).send({ success: false, error: { code: "VALIDATION_ERROR", message: "File is required" } });
    }

    // AI extraction — falls back to multimodal (base64) for scanned PDFs
    const extracted = await extractInitiativeFieldsWithAI(fileText, fileName, fileBuffer, fileMimeType);
    console.log("[initiative-upload] AI extracted:", extracted);

    const VALID_SECTORS = ["EDUCATION","HEALTHCARE","LIVELIHOOD","ENVIRONMENT","WATER_SANITATION","INFRASTRUCTURE","WOMEN_EMPOWERMENT","CHILD_WELFARE","OTHER"];
    const sector = VALID_SECTORS.includes(extracted?.sector) ? extracted.sector : "OTHER";

    const VALID_SDGS = ["NO_POVERTY","ZERO_HUNGER","GOOD_HEALTH","QUALITY_EDUCATION","GENDER_EQUALITY","CLEAN_WATER","REDUCED_INEQUALITY"];
    const SDG_MAP: Record<string, string> = { SDG1:"NO_POVERTY",SDG2:"ZERO_HUNGER",SDG3:"GOOD_HEALTH",SDG4:"QUALITY_EDUCATION",SDG5:"GENDER_EQUALITY",SDG6:"CLEAN_WATER",SDG10:"REDUCED_INEQUALITY" };
    const sanitizedSdgTags = Array.isArray(extracted?.sdgTags)
      ? extracted.sdgTags.map((t: string) => SDG_MAP[t] ?? (VALID_SDGS.includes(t) ? t : null)).filter(Boolean)
      : [];
    const sdgTags = sanitizedSdgTags.length > 0 ? sanitizedSdgTags : ["QUALITY_EDUCATION"];

    // Validate ngoId — reject garbage (long sentences, binary junk)
    const rawNgoId = extracted?.ngoId;
    const ngoId = (
      rawNgoId &&
      typeof rawNgoId === "string" &&
      rawNgoId.trim().length >= 3 &&
      rawNgoId.trim().length <= 80 &&           // IDs can be up to 80 chars
      !/[<>{}\[\]]/.test(rawNgoId) &&           // no HTML/code chars
      rawNgoId.trim().split(/\s+/).length <= 8  // max 8 words
    ) ? rawNgoId.trim() : null;
    console.log("[initiative-upload] Final ngoId saved:", ngoId, "(raw:", rawNgoId, ")");

    const initiative = await prisma.initiative.create({
      data: {
        tenantId,
        title:               extracted?.title       || fileName.replace(/\.[^.]+$/, ""),
        ngoId,
        sector:              sector as any,
        geography:           { state: extracted?.state || "India", district: extracted?.district || "" },
        description:         extracted?.description || (fileText && !fileText.startsWith('%PDF') ? fileText.slice(0, 1000) : '') || `Uploaded from: ${fileName}`,
        targetBeneficiaries: Math.max(1, parseInt(extracted?.targetBeneficiaries) || 100),
        budgetRequired:      Math.max(1, parseFloat(extracted?.budgetRequired)    || 1000000),
        sdgTags,
        status:              "ACTIVE",
      },
    });

    // Trigger embedding worker
    const embedJob = await queues.initiativeEmbedding.add("embed", { initiativeId: initiative.id, tenantId }, DEFAULT_JOB_OPTIONS);
    await prisma.agentJobLog.upsert({
      where: { jobId: embedJob.id! },
      update: { status: "QUEUED" },
      create: { tenantId, jobId: embedJob.id!, agentName: "initiative-embedder", status: "QUEUED", modelVersion: "gemini-embedding-001", promptHash: "n/a" },
    });

    await auditLog({
      tenantId,
      eventType:  "INITIATIVE_CREATED",
      entityType: "Initiative",
      entityId:   initiative.id,
      actorId:    (req as any).user?.userId ?? "system",
      actorType:  "USER",
      afterState: { title: initiative.title, sector: initiative.sector, source: "document-upload" },
    });

    return reply.status(201).send({ success: true, data: { id: initiative.id, title: initiative.title, sector: initiative.sector } });
  });

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
          startDate: true, endDate: true, description: true,
          ngoId: true,
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

  // PATCH /:id — partial update (e.g. ngoId inline edit)
  app.patch("/:id", { preHandler: requirePermission("initiative:update") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const { id } = req.params as { id: string };
    const body = req.body as { ngoId?: string | null };

    const initiative = await prisma.initiative.findFirst({ where: { id, tenantId } });
    if (!initiative) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Initiative not found" } });

    const updated = await prisma.initiative.update({
      where: { id },
      data: { ...(body.ngoId !== undefined && { ngoId: body.ngoId }) },
      select: { id: true, ngoId: true },
    });

    return reply.send({ success: true, data: updated });
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

  // GET /:id/pitch-deck — download the latest PPTX pitch deck for this initiative
  app.get<{ Params: { id: string } }>("/:id/pitch-deck", {
    preHandler: requirePermission("initiative:read"),
  }, async (req, reply) => {
    const { tenantId } = req as any;
    const { id } = req.params;

    const matches = await prisma.matchResult.findMany({
      where: { initiativeId: id, requirement: { tenantId } },
      select: { requirementId: true },
    });

    if (matches.length === 0) {
      return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "No pitch deck available for this initiative yet." } });
    }

    const requirementIds = matches.map((m) => m.requirementId);

    const artifact = await prisma.contentArtifact.findFirst({
      where: { tenantId, type: "PITCH_DECK", approvalStatus: "APPROVED", relatedEntityId: { in: requirementIds } },
      orderBy: { createdAt: "desc" },
    });

    if (!artifact?.fileUrl) {
      return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "No approved pitch deck available yet. Please check back after DRM review." } });
    }

    if (!existsSync(artifact.fileUrl)) {
      return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Pitch deck file not found on server." } });
    }

    const fileBuffer = readFileSync(artifact.fileUrl);
    const fileName = basename(artifact.fileUrl);

    reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    reply.header("Content-Disposition", `attachment; filename="${fileName}"`);
    return reply.send(fileBuffer);
  });

  // GET /:id/matches — which CSR requirements were matched to this initiative
  app.get<{ Params: { id: string } }>("/:id/matches", {
    preHandler: requirePermission("initiative:read"),
  }, async (req, reply) => {
    const { tenantId } = req as any;
    const { id } = req.params;

    const matches = await prisma.matchResult.findMany({
      where: { initiativeId: id, requirement: { tenantId } },
      include: {
        requirement: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            extractedFields: true,
            donor: { select: { orgName: true, type: true } },
          },
        },
      },
      orderBy: { overallScore: "desc" },
    });

    return reply.send({ success: true, data: matches });
  });

}