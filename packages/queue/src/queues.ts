import "./load-env";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

export const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 30_000 },
  removeOnComplete: { count: 1000, age: 7 * 24 * 3600 },
  removeOnFail: { age: 30 * 24 * 3600 },
};

export const queues = {
  requirementExtraction:  new Queue("requirement-extraction",  { connection: connection as any }),
  gapAnalysis:            new Queue("gap-analysis",            { connection: connection as any }),
  initiativeMatching:     new Queue("initiative-matching",     { connection: connection as any }),
  pitchDeckGeneration:    new Queue("pitch-deck-generation",   { connection: connection as any }),
  outreachDrafting:       new Queue("outreach-drafting",       { connection: connection as any }),
  evidenceVerification:   new Queue("evidence-verification",   { connection: connection as any }),
  outcomeExtraction:      new Queue("outcome-extraction",      { connection: connection as any }),
  storyGeneration:        new Queue("story-generation",        { connection: connection as any }),
  reengagement:           new Queue("reengagement",            { connection: connection as any }),
  initiativeEmbedding:    new Queue("initiative-embedding",    { connection: connection as any }),
  paymentProcessing:      new Queue("payment-processing",      { connection: connection as any }),
  notificationSend:       new Queue("notification-send",       { connection: connection as any }),
  receiptGeneration:      new Queue("receipt-generation",      { connection: connection as any }),
};

export type QueueName = keyof typeof queues;