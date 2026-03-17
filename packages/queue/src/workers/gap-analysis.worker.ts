import "../load-env";

import { Job } from "bullmq";
import { BaseAgentWorker } from "../base-worker";
import { emitWsEvent } from "../ws-emit";
import { runGapDiagnoser } from "../../../agents/src/gap-diagnoser/index";
import { queues, DEFAULT_JOB_OPTIONS } from "../queues";

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

    await queues.initiativeMatching.add(
      "match",
      { requirementId, tenantId },
      DEFAULT_JOB_OPTIONS
    );

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