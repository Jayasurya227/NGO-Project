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
  readonly queueName = "gap-analysis";
  readonly agentName = "gap-diagnoser";
  readonly concurrency = 5;

  protected async process(job: Job<GapAnalysisPayload>) {
    const { requirementId, tenantId } = job.data;

    const report = await runGapDiagnoser({ requirementId, tenantId });

    const matchJob = await queues.initiativeMatching.add(
      "match",
      { requirementId, tenantId },
      DEFAULT_JOB_OPTIONS
    );

    // Create log for the next job
    await prisma.agentJobLog.upsert({
      where: { jobId: matchJob.id! },
      update: { status: "QUEUED" },
      create: {
        tenantId,
        agentName: "initiative-matcher",
        jobId: matchJob.id!,
        modelVersion: "gemini-2.0-flash-001",
        promptHash: "pending",
        status: "QUEUED",
        triggeredBy: "SYSTEM", // Triggered by previous worker
      },
    });

    await emitWsEvent(tenantId, {
      type: "APPROVAL_REQUIRED",
      entityType: "SponsorRequirement",
      entityId: requirementId,
      gateType: "GAP_REVIEW",
      assignedRole: "DRM",
    });

    return report;
  }
}

const worker = new GapAnalysisWorker();
worker.start();
console.log("Gap Analysis Worker started");