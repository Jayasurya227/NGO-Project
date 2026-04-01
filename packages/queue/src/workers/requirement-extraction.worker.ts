import "../load-env";

import { Job } from "bullmq";
import { BaseAgentWorker } from "../base-worker";
import { emitWsEvent } from "../ws-emit";
import { runRequirementsAnalyst } from "../../../agents/src/requirements-analyst/index";

type RequirementExtractionPayload = {
  requirementId: string;
  tenantId: string;
  documentUrl?: string;
};

class RequirementExtractionWorker extends BaseAgentWorker<RequirementExtractionPayload> {
  readonly queueName = "requirement-extraction";
  readonly agentName = "requirements-analyst";
  readonly concurrency = 3;

  protected async process(
    job: Job<RequirementExtractionPayload>
  ): Promise<{ status: string; requiresReview: boolean }> {
    const { requirementId, tenantId } = job.data;

    const result = await runRequirementsAnalyst({
      requirementId,
      tenantId,
      documentText: "No document provided — all fields require manual entry.",
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

const worker = new RequirementExtractionWorker();
worker.start();
console.log("Requirement Extraction Worker started");