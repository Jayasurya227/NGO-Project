import { Worker } from "bullmq";
import { connection } from "../queues";
import { emitWsEvent } from "../ws-emit";
import { prisma } from "@ngo/database";

new Worker("requirement-extraction", async (job) => {
  const { requirementId, tenantId } = job.data;

  console.log(`[test-worker] Processing job: requirementId=${requirementId}`);

  await new Promise((r) => setTimeout(r, 2000));

  await prisma.agentJobLog.updateMany({
    where: { jobId: job.id!, tenantId },
    data: { status: "COMPLETED", latencyMs: 2000, completedAt: new Date() },
  });

  await emitWsEvent(tenantId, {
    type: "REQUIREMENT_EXTRACTED",
    requirementId,
    requiresReview: false,
    lowConfidenceFields: [],
  });

  console.log(`[test-worker] WS event emitted for tenant: ${tenantId}`);
}, { connection });

console.log("Integration test worker running — waiting for jobs...");