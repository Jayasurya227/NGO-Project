// Load env from root
if (!process.env.REDIS_URL) {
  const { config } = require("dotenv");
  const { join } = require("path");
  config({ path: join(process.cwd(), ".env") });
  config({ path: join(process.cwd(), "../../.env") });
}
import "dotenv/config";
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
  requirementExtraction:  new Queue("requirement-extraction",  { connection }),
  gapAnalysis:            new Queue("gap-analysis",            { connection }),
  initiativeMatching:     new Queue("initiative-matching",     { connection }),
  pitchDeckGeneration:    new Queue("pitch-deck-generation",   { connection }),
  outreachDrafting:       new Queue("outreach-drafting",       { connection }),
  evidenceVerification:   new Queue("evidence-verification",   { connection }),
  outcomeExtraction:      new Queue("outcome-extraction",      { connection }),
  storyGeneration:        new Queue("story-generation",        { connection }),
  reengagement:           new Queue("reengagement",            { connection }),
  initiativeEmbedding:    new Queue("initiative-embedding",    { connection }),
  paymentProcessing:      new Queue("payment-processing",      { connection }),
  notificationSend:       new Queue("notification-send",       { connection }),
  receiptGeneration:      new Queue("receipt-generation",      { connection }),
};

export type QueueName = keyof typeof queues;
