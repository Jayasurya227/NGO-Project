import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { createHash, randomBytes } from 'crypto'

const prisma = new PrismaClient()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

// Simple in-memory refresh token store (replace with Redis in production)
const refreshTokenStore = new Map<string, { userId: string; tenantId: string; role: string; expiresAt: number }>()

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }
    const { email, password } = parsed.data
    const user = await prisma.user.findFirst({ where: { email } })
    if (!user) {
      return reply.status(401).send({ success: false, error: 'Invalid credentials' })
    }
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ success: false, error: 'Invalid credentials' })
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role, tenantId: user.tenantId },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '8h' }
    )
    // Issue refresh token
    const refreshToken = randomBytes(40).toString('hex')
    const refreshHash = createHash('sha256').update(refreshToken).digest('hex')
    refreshTokenStore.set(refreshHash, {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    return reply.send({ success: true, data: { token, refreshToken, role: user.role, email: user.email } })
  })

  app.post('/api/auth/refresh', async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'refreshToken is required' })
    }
    const { refreshToken } = parsed.data
    const refreshHash = createHash('sha256').update(refreshToken).digest('hex')
    const stored = refreshTokenStore.get(refreshHash)
    if (!stored || stored.expiresAt < Date.now()) {
      refreshTokenStore.delete(refreshHash)
      return reply.status(401).send({ success: false, error: 'Invalid or expired refresh token' })
    }
    // Rotate — delete old token, issue new one
    refreshTokenStore.delete(refreshHash)
    const newRefreshToken = randomBytes(40).toString('hex')
    const newRefreshHash = createHash('sha256').update(newRefreshToken).digest('hex')
    refreshTokenStore.set(newRefreshHash, {
      ...stored,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
    const newToken = jwt.sign(
      { userId: stored.userId, role: stored.role, tenantId: stored.tenantId },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '8h' }
    )
    return reply.send({ success: true, data: { token: newToken, refreshToken: newRefreshToken } })
  })

  app.post('/api/auth/logout', async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body)
    if (parsed.success) {
      const refreshHash = createHash('sha256').update(parsed.data.refreshToken).digest('hex')
      refreshTokenStore.delete(refreshHash)
    }
    return reply.send({ success: true })
  })
}
