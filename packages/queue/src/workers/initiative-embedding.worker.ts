import "../load-env";
import { Job } from "bullmq";
import { BaseAgentWorker } from "../base-worker";
import { embedAndSaveInitiative } from "../../../agents/src/utils/embeddings";
import { queues, DEFAULT_JOB_OPTIONS } from "../queues";
import { prisma } from "@ngo/database";

type InitiativeEmbeddingPayload = {
  initiativeId: string;
  tenantId: string;
};

class InitiativeEmbeddingWorker extends BaseAgentWorker<InitiativeEmbeddingPayload> {
  readonly queueName   = "initiative-embedding";
  readonly agentName   = "initiative-embedder";
  readonly concurrency = 1;

 protected async process(job: Job<InitiativeEmbeddingPayload>): Promise<void> {
  const { initiativeId } = job.data;
  console.log(`[embedding] Generating vector for initiative: ${initiativeId}`);
  
  // Add this line to avoid Vertex AI 429 quota error
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  await embedAndSaveInitiative(initiativeId);
  console.log(`[embedding] Vector saved for: ${initiativeId}`);
}
}

// ── STARTUP RECOVERY ──────────────────────────────────────────────────────────
async function recoverMissingEmbeddings() {
  try {
    // Use raw SQL because embeddingVector is Unsupported type in Prisma
    const missing = await prisma.$queryRaw<Array<{ id: string; tenantId: string; title: string }>>`
      SELECT id, "tenantId", title
      FROM "Initiative"
      WHERE status IN ('ACTIVE', 'DRAFT')
      AND "embeddingVector" IS NULL
    `;

    if (missing.length === 0) {
      console.log("[embedding] All initiatives have embeddings ✓");
      return;
    }

    console.log(`[embedding] Found ${missing.length} initiative(s) missing embeddings — queuing now...`);

    // Check what is already queued to avoid duplicates
    const waiting = await queues.initiativeEmbedding.getWaiting();
    const active  = await queues.initiativeEmbedding.getActive();
    const queued  = new Set([...waiting, ...active].map(j => j.data?.initiativeId));

    for (const init of missing) {
      if (queued.has(init.id)) {
        console.log(`[embedding] Already queued: ${init.title} — skipping`);
        continue;
      }
      await queues.initiativeEmbedding.add(
        "embed",
        { initiativeId: init.id, tenantId: init.tenantId },
        DEFAULT_JOB_OPTIONS
      );
      console.log(`[embedding] Queued: ${init.title}`);
    }
  } catch (err: any) {
    console.error("[embedding] Startup recovery error:", err.message);
  }
}

const worker = new InitiativeEmbeddingWorker();
worker.start();
console.log("Initiative Embedding Worker started");

// Run recovery 3 seconds after startup
setTimeout(recoverMissingEmbeddings, 3000);

// Re-run every 10 minutes — self-healing in production
setInterval(recoverMissingEmbeddings, 10 * 60 * 1000);