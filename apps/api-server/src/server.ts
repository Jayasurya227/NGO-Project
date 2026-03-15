import Fastify from 'fastify'
import cors from '@fastify/cors'
import { authRoutes } from './routes/auth'
import { requirementsRoutes } from './routes/requirements'
import { donorsRoutes } from './routes/donors'
import { donationsRoutes } from './routes/donations'
import { uploadRoutes } from './routes/upload'
import { websocketPlugin } from './ws/plugin'
import { initiativesRoutes } from './routes/initiatives'

async function start() {
  const app = Fastify({ logger: true })

  await app.register(cors, {
    origin: 'http://localhost:3000',
    credentials: true,
  })

  app.setErrorHandler((error, req, reply) => {
    console.error(error)
    reply.status(500).send({ success: false, error: (error as any).message || 'Internal server error' })
  })

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))

  await websocketPlugin(app)
  await authRoutes(app)
  await requirementsRoutes(app)
  await donorsRoutes(app)
  await donationsRoutes(app)
  await uploadRoutes(app)
  await initiativesRoutes(app)

  const port = parseInt(process.env.API_PORT ?? '4000')
  await app.listen({ port, host: '0.0.0.0' })
  console.log('API server running on http://localhost:' + port)
}

start().catch((err) => {
  console.error('Server failed to start:', err)
  process.exit(1)
})