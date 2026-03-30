import Fastify from 'fastify'
import { describe, it, expect } from 'vitest'
import { authRoutes } from '../routes/auth'

async function buildApp() {
  const app = Fastify()
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString()
  }))
  await authRoutes(app)
  return app
}

describe('Health check', () => {
  it('returns 200 with status ok', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.status).toBe('ok')
  })
})

describe('Auth routes', () => {
  it('returns 400 when email is missing', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { password: 'password123' }
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 401 with wrong credentials', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'wrong@test.com', password: 'wrongpass' }
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 200 with valid credentials', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@demo.com', password: 'password123' }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.success).toBe(true)
    expect(body.data.token).toBeDefined()
  })
})