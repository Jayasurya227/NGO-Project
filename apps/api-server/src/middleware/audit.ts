import { FastifyRequest, FastifyReply } from 'fastify'
import { auditLog } from '@ngo/audit'

export async function auditLogMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const method = req.method
  if (['POST', 'PATCH', 'DELETE'].includes(method)) {
    const user = (req as any).user
    if (user) {
      await auditLog({
        tenantId: user.tenantId,
        eventType: `API_${method}`,
        entityType: 'ApiRequest',
        entityId: req.url,
        actorId: user.id || user.userId,
        actorType: 'USER',
        afterState: req.body || {},
        metadata: { url: req.url, method }
      }).catch(console.error)
    }
  }
}