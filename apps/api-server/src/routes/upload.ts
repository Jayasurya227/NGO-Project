import { FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import { authenticate } from '../middleware/rbac'
import path from 'path'
import fs from 'fs'

export async function uploadRoutes(app: FastifyInstance) {

  const uploadDir = path.join(process.cwd(), 'uploads')
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  app.post('/api/upload', { preHandler: authenticate }, async (req, reply) => {
    const data = await (req as any).file()

    if (!data) {
      return reply.status(400).send({ success: false, error: 'No file uploaded' })
    }

    const filename = `${Date.now()}-${data.filename}`
    const filepath = path.join(uploadDir, filename)
    await fs.promises.writeFile(filepath, await data.toBuffer())

    return reply.send({
      success: true,
      data: {
        filename,
        originalName: data.filename,
        mimetype: data.mimetype,
        url: `/uploads/${filename}`
      }
    })
  })
}