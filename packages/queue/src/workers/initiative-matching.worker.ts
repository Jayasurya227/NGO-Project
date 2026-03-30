import "../load-env";
import { Job } from "bullmq";
import { BaseAgentWorker } from "../base-worker";
import { emitWsEvent } from "../ws-emit";
import { runInitiativeMatching } from "../../../agents/src/matching/index";

type MatchingPayload = {
  requirementId: string;
  tenantId: string;
};

class InitiativeMatchingWorker extends BaseAgentWorker<MatchingPayload> {
  readonly queueName = "initiative-matching";
  readonly agentName = "initiative-matcher";
  readonly concurrency = 2;

  protected async process(job: Job<MatchingPayload>) {
    const { requirementId, tenantId } = job.data;

    const results = await runInitiativeMatching({ requirementId, tenantId });

    await emitWsEvent(tenantId, {
      type: "MATCH_RESULTS_READY",
      requirementId,
      matchCount: results.length,
    });

    return results;
  }
}

const worker = new InitiativeMatchingWorker();
worker.start();
console.log("Initiative Matching Worker started");
