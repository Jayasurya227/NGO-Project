import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '../middleware/rbac'

const prisma = new PrismaClient()

export async function agentRoutes(app: FastifyInstance) {

  app.get('/api/agents/jobs', { preHandler: authenticate }, async (req, reply) => {
    const page  = Number((req.query as any).page)  || 1
    const limit = Number((req.query as any).limit) || 20
    const user  = (req as any).user

    const [jobs, total] = await Promise.all([
      prisma.agentJobLog.findMany({
        where:   { tenantId: user.tenantId },
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.agentJobLog.count({ where: { tenantId: user.tenantId } }),
    ])

    return reply.send({ success: true, data: jobs, meta: { total, page, limit } })
  })

  app.get('/api/agents/jobs/:jobId', { preHandler: authenticate }, async (req, reply) => {
    const { jobId } = req.params as any
    const user = (req as any).user

    const job = await prisma.agentJobLog.findFirst({
      where: { jobId, tenantId: user.tenantId }
    })

    if (!job) {
      return reply.status(404).send({ success: false, error: 'Job not found' })
    }

    return reply.send({ success: true, data: job })
  })
}