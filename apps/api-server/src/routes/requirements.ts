import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '../middleware/rbac'
import { z } from 'zod'

const prisma = new PrismaClient()

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
})

export async function requirementsRoutes(app: FastifyInstance) {
  app.get('/api/requirements', { preHandler: authenticate }, async (req, reply) => {
    const page = Number((req.query as any).page) || 1
    const limit = Number((req.query as any).limit) || 20
    const user = (req as any).user

    const [data, total] = await Promise.all([
      prisma.sponsorRequirement.findMany({
        where: { tenantId: user.tenantId },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sponsorRequirement.count({ where: { tenantId: user.tenantId } }),
    ])

    return reply.send({ success: true, data, meta: { total, page, limit } })
  })

  app.post('/api/requirements', { preHandler: authenticate }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    const user = (req as any).user
    const item = await prisma.sponsorRequirement.create({
      data: { ...parsed.data, tenantId: user.tenantId },
    })

    return reply.status(201).send({ success: true, data: item })
  })

  app.delete('/api/requirements/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as any
    await prisma.sponsorRequirement.delete({ where: { id } })
    return reply.send({ success: true, message: 'Deleted' })
  })
}
