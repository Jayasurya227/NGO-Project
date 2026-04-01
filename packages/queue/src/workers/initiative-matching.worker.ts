import { readFileSync } from "fs";
import { resolve } from "path";
function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key) process.env[key] = value;
    }
  } catch {}
}
loadEnv();

import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { runMatchingAgent } from "@ngo/agents/matching";
import { prisma } from "@ngo/database";
import { queues, DEFAULT_JOB_OPTIONS } from "../queues";

const connection = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

console.log("ENV loaded - DB:", process.env.DATABASE_URL ? "YES" : "NO");
console.log("ENV loaded - REDIS:", process.env.REDIS_URL ? "YES" : "NO");

// ── WORKER ────────────────────────────────────────────────────────────────────
const worker = new Worker(
  "initiative-matching",
  async (job: Job) => {
    const { requirementId, tenantId } = job.data;
    console.log(`[matching-agent] Processing requirement: ${requirementId}`);

    const result = await runMatchingAgent({ requirementId, tenantId });

    console.log(`[matching-agent] Complete — ${result.matchCount} matches, top score: ${result.topScore}`);

    // Publish WebSocket event to notify browser
    const pub = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
    await pub.publish(`ws:${tenantId}`, JSON.stringify({
      type:          "MATCH_RESULTS_READY",
      requirementId,
      matchCount:    result.matchCount,
    }));
    await pub.quit();

    return result;
  },
  {
    connection,
    concurrency: 2,
    // Auto-retry on failure — exponential backoff
    settings: {
      backoffStrategy: (attemptsMade: number) => attemptsMade * 30000,
    },
  }
);

worker.on("completed", job => {
  console.log(`[matching-agent] Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`[matching-agent] Job failed: ${job?.id}`, err.message);
  console.error(`[matching-agent] Stack:`, err.stack);
});

// ── STARTUP RECOVERY ──────────────────────────────────────────────────────────
// Finds ALL requirements that should have been matched but were not.
// This handles:
// 1. Requirements validated before matching worker existed
// 2. Requirements that failed due to errors
// 3. Server restarts mid-processing
// 4. Any future scenario where matching was skipped
async function recoverUnmatchedRequirements() {
  try {
    // Find requirements that are VALIDATED with a gap report but no match results
    // This is the definitive signal that matching was skipped
    const unmatched = await prisma.sponsorRequirement.findMany({
      where: {
        status:        "VALIDATED",
        gapReportJson: { not: null },   // Gap analysis completed
      },
      include: {
        _count: { select: { matchResults: true } },
      },
    });

    // Filter to only those with zero match results
    const needsMatching = unmatched.filter(r => r._count.matchResults === 0);

    if (needsMatching.length === 0) {
      console.log("[matching-agent] All VALIDATED requirements already matched ✓");
      return;
    }

    console.log(`[matching-agent] Found ${needsMatching.length} requirement(s) needing matching — queuing now...`);

    for (const req of needsMatching) {
      // Check if a matching job is already queued to avoid duplicates
      const waiting  = await queues.initiativeMatching.getWaiting();
      const active   = await queues.initiativeMatching.getActive();
      const allJobs  = [...waiting, ...active];
      const already  = allJobs.some(j => j.data?.requirementId === req.id);

      if (already) {
        console.log(`[matching-agent] Already queued: ${req.id} — skipping`);
        continue;
      }

      await queues.initiativeMatching.add(
        "match",
        { requirementId: req.id, tenantId: req.tenantId },
        DEFAULT_JOB_OPTIONS
      );
      console.log(`[matching-agent] Queued matching for requirement: ${req.id}`);
    }
  } catch (err: any) {
    console.error("[matching-agent] Startup recovery error:", err.message);
  }
}

console.log("Worker started: matching-agent (queue: initiative-matching)");
console.log("Initiative Matching Worker started");

// Run recovery 5 seconds after startup to allow DB connection to stabilise
setTimeout(recoverUnmatchedRequirements, 5000);

// Also run recovery every 10 minutes to catch any missed requirements
// This makes the system self-healing in production
setInterval(recoverUnmatchedRequirements, 10 * 60 * 1000);