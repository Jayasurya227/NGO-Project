import "../load-env";

import { Job } from "bullmq";
import { BaseAgentWorker } from "../base-worker";
import { emitWsEvent } from "../ws-emit";
import { runRequirementsAnalyst } from "../../../agents/src/requirements-analyst/index";
import { prisma } from "@ngo/database";
import { queues, DEFAULT_JOB_OPTIONS } from "../queues";

type RequirementExtractionPayload = {
  requirementId: string;
  tenantId: string;
  documentUrl?: string;
  documentText?: string;
  rawFileBase64?: string;
  rawFileMimeType?: string;
};

class RequirementExtractionWorker extends BaseAgentWorker<RequirementExtractionPayload> {
  readonly queueName = "requirement-extraction";
  readonly agentName = "requirements-analyst";
  readonly concurrency = 3;

  protected async process(
    job: Job<RequirementExtractionPayload>
  ): Promise<{ status: string; requiresReview: boolean }> {
    const { requirementId, tenantId } = job.data;

    // Always read from DB — base64 is stored there (not in Redis job data)
    const req = await prisma.sponsorRequirement.findUnique({ where: { id: requirementId } });
    const saved = req?.extractedFields as any;

    let documentText: string = job.data.documentText || saved?.rawText || "";
    const rawFileBase64: string | undefined = saved?.rawFileBase64;
    const rawFileMimeType: string | undefined = saved?.rawFileMimeType;

    const result = await runRequirementsAnalyst({
      requirementId,
      tenantId,
      documentText,
      rawFileBase64,
      rawFileMimeType,
    });

    await emitWsEvent(tenantId, {
      type: "REQUIREMENT_EXTRACTED",
      requirementId,
      requiresReview: result.requiresReview,
      lowConfidenceFields: result.lowConfidenceFields,
    });

    return { status: result.status, requiresReview: result.requiresReview };
  }
}

// ── STARTUP RECOVERY ──────────────────────────────────────────────────────────
async function recoverPendingExtractions() {
  try {
    const stuck = await prisma.sponsorRequirement.findMany({
      where: { status: "PENDING_EXTRACTION" },
      select: { id: true, tenantId: true, extractedFields: true },
    });

    if (stuck.length === 0) {
      console.log("[requirements-analyst] No stuck PENDING_EXTRACTION requirements");
      return;
    }

    console.log(`[requirements-analyst] Found ${stuck.length} stuck requirement(s) — re-queuing...`);

    const waiting = await queues.requirementExtraction.getWaiting();
    const active  = await queues.requirementExtraction.getActive();

    for (const req of stuck) {
      const already = [...waiting, ...active].some(j => j.data?.requirementId === req.id);
      if (already) { console.log(`[requirements-analyst] Already queued: ${req.id}`); continue; }

      const saved = req.extractedFields as any;
      const documentText = saved?.rawText ?? "";

      await queues.requirementExtraction.add(
        "extract",
        { requirementId: req.id, tenantId: req.tenantId, documentText },
        DEFAULT_JOB_OPTIONS
      );
      console.log(`[requirements-analyst] Re-queued extraction for: ${req.id}`);
    }
  } catch (err: any) {
    console.error("[requirements-analyst] Startup recovery error:", err.message);
  }
}

const worker = new RequirementExtractionWorker();
worker.start();
console.log("Requirement Extraction Worker started");

setTimeout(recoverPendingExtractions, 3000);