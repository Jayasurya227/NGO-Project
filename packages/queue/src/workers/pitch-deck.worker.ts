import "../load-env";
import { Job } from "bullmq";
import { BaseAgentWorker } from "../base-worker";
import { runPitchDeckAgent } from "@ngo/agents/pitch-deck/index";
import { queues } from "../queues";
import { prisma } from "@ngo/database";

type PitchDeckPayload = {
  requirementId:    string;
  tenantId:         string;
  approvedMatchIds: string[];
};

class PitchDeckWorker extends BaseAgentWorker<PitchDeckPayload> {
  readonly queueName   = "pitch-deck-generation";
  readonly agentName   = "pitch-deck-agent";
  readonly concurrency = 2;

  protected async process(job: Job<PitchDeckPayload>): Promise<void> {
    const { requirementId, tenantId, approvedMatchIds } = job.data;

    console.log(`[pitch-deck] Processing requirement: ${requirementId}`);

    const result = await runPitchDeckAgent({
      requirementId,
      tenantId,
      approvedMatchIds,
    });

    console.log(`[pitch-deck] Complete — artifact: ${result.contentArtifactId}`);
  }
}

// ── STARTUP RECOVERY ──────────────────────────────────────────────────────────
async function recoverPendingPitchDecks() {
  try {
    const pending = await prisma.contentArtifact.findMany({
      where: {
        type:           'PITCH_DECK',
        approvalStatus: 'PENDING_REVIEW',
        fileUrl:        { startsWith: 'local://' },
      },
      select: { id: true, relatedEntityId: true, tenantId: true, content: true },
    });

    if (pending.length === 0) {
      console.log('[pitch-deck] All pitch decks generated ✓');
      return;
    }

    console.log(`[pitch-deck] Found ${pending.length} pending pitch deck(s)`);
  } catch (err: any) {
    console.error('[pitch-deck] Startup recovery error:', err.message);
  }
}

const worker = new PitchDeckWorker();
worker.start();
console.log('Pitch Deck Worker started');

setTimeout(recoverPendingPitchDecks, 3000);