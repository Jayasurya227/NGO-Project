import "../load-env";
import { Job } from "bullmq";
import { BaseAgentWorker } from "../base-worker";
import { emitWsEvent } from "../ws-emit";
import { runRequirementsAnalyst } from "../../../agents/src/requirements-analyst/index";
import { prisma } from "@ngo/database";

// FIX 5: added documentText to payload type
type RequirementExtractionPayload = {
  requirementId: string;
  tenantId: string;
  documentUrl?: string;
  documentText?: string;
};

class RequirementExtractionWorker extends BaseAgentWorker<RequirementExtractionPayload> {
  readonly queueName = "requirement-extraction";
  readonly agentName = "requirements-analyst";
  readonly concurrency = 3;

  protected async process(
    job: Job<RequirementExtractionPayload>
  ): Promise<{ status: string; requiresReview: boolean }> {
    const { requirementId, tenantId, documentText: payloadText } = job.data;

    // FIX 4: read documentText from payload, fallback to DB extractedFields
    let documentText = payloadText || "";

    if (!documentText) {
      const req = await prisma.sponsorRequirement.findFirst({
        where: { id: requirementId },
        select: { extractedFields: true },
      });
      const fields = req?.extractedFields as any;
      documentText = fields?.rawText || "";
    }

    if (!documentText) {
      documentText = "No document text available — all fields require manual entry.";
    }

    const result = await runRequirementsAnalyst({
      requirementId,
      tenantId,
      documentText,
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