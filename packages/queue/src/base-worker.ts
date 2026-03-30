import "./load-env";

import { Worker, Job } from "bullmq";
import { connection } from "./queues";
import { prisma } from "@ngo/database";

export type WorkerContext = {
  tenantId: string;
  jobId: string;
  agentName: string;
};

export abstract class BaseAgentWorker<T extends { tenantId: string }> {
  abstract readonly queueName: string;
  abstract readonly agentName: string;
  abstract readonly concurrency: number;

  protected abstract process(job: Job<T>, ctx: WorkerContext): Promise<unknown>;

  start(): Worker<T> {
    const worker = new Worker<T>(
      this.queueName,
      async (job: Job<T>) => {
        const ctx: WorkerContext = {
          tenantId: job.data.tenantId,
          jobId: job.id ?? "unknown",
          agentName: this.agentName,
        };

        const start = Date.now();
        await this.updateJobStatus(ctx, "RUNNING");

        try {
          const result = await this.process(job, ctx);
          const latencyMs = Date.now() - start;
          await this.updateJobStatus(ctx, "COMPLETED", undefined, latencyMs);
          return result;
        } catch (error: unknown) {
          const latencyMs = Date.now() - start;
          const errMsg = error instanceof Error ? error.message : String(error);
          const attemptsLeft = (job.opts.attempts ?? 1) - job.attemptsMade;
          const status = attemptsLeft > 0 ? "RETRYING" : "FAILED";
          await this.updateJobStatus(ctx, status, errMsg, latencyMs);
          throw error;
        }
      },
      {
        connection: connection as any,
        concurrency: this.concurrency,
        limiter: {
          max: 20,
          duration: 60_000,
        },
      }
    );

    worker.on("error", (err) => console.error(`[${this.agentName}] Worker error:`, err));
    worker.on("failed", (job, err) => console.error(`[${this.agentName}] Job failed:`, job?.id, err.message));
    worker.on("completed", (job) => console.log(`[${this.agentName}] Job completed:`, job.id));

    console.log(`Worker started: ${this.agentName} (queue: ${this.queueName})`);
    return worker;
  }

  private async updateJobStatus(
    ctx: WorkerContext,
    status: string,
    error?: string,
    latencyMs?: number
  ): Promise<void> {
    try {
      await prisma.agentJobLog.updateMany({
        where: { jobId: ctx.jobId, tenantId: ctx.tenantId },
        data: {
          status: status as any,
          error: error ?? null,
          latencyMs: latencyMs ?? null,
          completedAt:
            status === "COMPLETED" || status === "FAILED" ? new Date() : null,
        },
      });
    } catch (err: any) {
      console.error(`[${ctx.agentName}] Failed to update job status in DB: ${err.message}`);
    }
  }
}