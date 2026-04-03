import "../load-env";
import { Job } from "bullmq";
import { BaseAgentWorker } from "../base-worker";
import { emitWsEvent } from "../ws-emit";
import { runGapDiagnoser } from "../../../agents/src/gap-diagnoser/index";
import { queues, DEFAULT_JOB_OPTIONS } from "../queues";
import { prisma } from "@ngo/database";

type GapAnalysisPayload = {
  requirementId: string;
  tenantId: string;
};

class GapAnalysisWorker extends BaseAgentWorker<GapAnalysisPayload> {
  readonly queueName   = "gap-analysis";
  readonly agentName   = "gap-diagnoser";
  readonly concurrency = 5;

  protected async process(job: Job<GapAnalysisPayload>) {
    const { requirementId, tenantId } = job.data;

    const report = await runGapDiagnoser({ requirementId, tenantId });

    // Automatically queue matching after gap analysis completes
    const matchJob = await queues.initiativeMatching.add(
      "match",
      { requirementId, tenantId },
      DEFAULT_JOB_OPTIONS
    );

    await prisma.agentJobLog.upsert({
      where: { jobId: matchJob.id! },
      update: { status: "QUEUED" },
      create: { tenantId, jobId: matchJob.id!, agentName: "initiative-matching", status: "QUEUED" },
    });

    console.log(`[gap-diagnoser] Matching job queued for: ${requirementId}`);

    await emitWsEvent(tenantId, {
      type:      "GAP_ANALYSIS_COMPLETE",
      entityType: "SponsorRequirement",
      entityId:   requirementId,
    });

    return report;
  }
}

// ── STARTUP RECOVERY ──────────────────────────────────────────────────────────
async function recoverValidatedRequirements() {
  try {
    const needsGap = await prisma.sponsorRequirement.findMany({
      where: {
        status:          "VALIDATED",
        extractedFields: { not: null },
      },
      select: { id: true, tenantId: true, gapReportJson: true },
    });

    // Filter in JS — Prisma cannot filter JSON null directly
    const actualNeedsGap = needsGap.filter(r => r.gapReportJson === null);

    if (actualNeedsGap.length === 0) {
      console.log("[gap-diagnoser] All VALIDATED requirements have gap reports");
    } else {
      console.log(`[gap-diagnoser] Found ${actualNeedsGap.length} requirement(s) without gap reports — queuing now...`);
      for (const req of actualNeedsGap) {
        const waiting = await queues.gapAnalysis.getWaiting();
        const active  = await queues.gapAnalysis.getActive();
        const already = [...waiting, ...active].some(j => j.data?.requirementId === req.id);
        if (already) { console.log(`[gap-diagnoser] Already queued: ${req.id}`); continue; }
        await queues.gapAnalysis.add(
          "analyse",
          { requirementId: req.id, tenantId: req.tenantId },
          DEFAULT_JOB_OPTIONS
        );
        console.log(`[gap-diagnoser] Queued gap analysis for: ${req.id}`);
      }
    }
  } catch (err: any) {
    console.error("[gap-diagnoser] Startup recovery error:", err.message);
  }
}

const worker = new GapAnalysisWorker();
worker.start();
console.log("Gap Analysis Worker started");

setTimeout(recoverValidatedRequirements, 3000);
setInterval(recoverValidatedRequirements, 10 * 60 * 1000);