import { FastifyInstance } from "fastify";
import { prisma } from "@ngo/database";
import { requirePermission } from "../middleware/rbac";

export async function agentRoutes(app: FastifyInstance) {
  // GET / - root route
  app.get("/", { preHandler: requirePermission("agent:read") }, async (req, reply) => {
    return reply.send({
      success: true,
      data: { message: "Agents API is working", endpoints: ["/api/agents/jobs", "/api/agents/jobs/:jobId"] }
    });
  });

  // GET /jobs
  app.get("/jobs", { preHandler: requirePermission("agent:read") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const page = Number((req.query as any).page) || 1;
    const limit = Number((req.query as any).limit) || 20;

    const [jobs, total] = await Promise.all([
      prisma.agentJobLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.agentJobLog.count({ where: { tenantId } }),
    ]);

    return reply.send({
      success: true,
      data: jobs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  // GET /jobs/:jobId
  app.get("/jobs/:jobId", { preHandler: requirePermission("agent:read") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const { jobId } = req.params as { jobId: string };

    const job = await prisma.agentJobLog.findFirst({ where: { jobId, tenantId } });

    if (!job) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Job not found" } });

    return reply.send({ success: true, data: job });
  });
}