import "../load-env";

import { Job } from "bullmq";
import { BaseAgentWorker } from "../base-worker";
import { embedAndSaveInitiative } from "@ngo/agents/utils/embeddings";
import type { InitiativeEmbeddingPayload } from "@ngo/types";

class InitiativeEmbeddingWorker extends BaseAgentWorker<InitiativeEmbeddingPayload> {
  readonly queueName = "initiative-embedding";
  readonly agentName = "initiative-embedder";
  readonly concurrency = 5;

  protected async process(job: Job<InitiativeEmbeddingPayload>): Promise<void> {
    const { initiativeId } = job.data;
    console.log(`[embedding] Generating vector for initiative: ${initiativeId}`);
    await embedAndSaveInitiative(initiativeId);
    console.log(`[embedding] Vector saved for: ${initiativeId}`);
  }
}

const worker = new InitiativeEmbeddingWorker();
worker.start();