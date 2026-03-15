import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '../middleware/rbac'
import { z } from 'zod'

const prisma = new PrismaClient()

const createSchema = z.object({
  title:       z.string().min(1),
  description: z.string().min(1),
})

export async function initiativesRoutes(app: FastifyInstance) {
  app.get('/api/initiatives', { preHandler: authenticate }, async (req, reply) => {
    const page  = Number((req.query as any).page)  || 1
    const limit = Number((req.query as any).limit) || 20
    const user  = (req as any).user

    const [data, total] = await Promise.all([
      prisma.initiative.findMany({
        where:   { tenantId: user.tenantId },
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.initiative.count({ where: { tenantId: user.tenantId } }),
    ])

    return reply.send({ success: true, data, meta: { total, page, limit } })
  })

  app.post('/api/initiatives', { preHandler: authenticate }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    const user = (req as any).user
    const item = await prisma.initiative.create({
      data: { ...parsed.data, tenantId: user.tenantId },
    })

    return reply.status(201).send({ success: true, data: item })
  })
}