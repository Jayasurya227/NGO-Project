import { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function auditLog(req: FastifyRequest, reply: FastifyReply) {
  const method = req.method
  if (['POST', 'PATCH', 'DELETE'].includes(method)) {
    const user = (req as any).user
    if (user) {
      await prisma.auditEvent.create({
        data: {
          action: `${method} ${req.url}`,
          details: JSON.stringify(req.body || {}),
          tenantId: user.tenantId,
        }
      }).catch(console.error)
    }
  }
}