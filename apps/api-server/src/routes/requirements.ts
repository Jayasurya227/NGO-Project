import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '../middleware/rbac'
import { z } from 'zod'
import path from 'path'
import fs from 'fs'

const prisma = new PrismaClient()

const createSchema = z.object({
  title:   z.string().min(1),
  content: z.string().min(1),
})

export async function requirementsRoutes(app: FastifyInstance) {

  app.get('/api/requirements', { preHandler: authenticate }, async (req, reply) => {
    const page  = Number((req.query as any).page)  || 1
    const limit = Number((req.query as any).limit) || 20
    const user  = (req as any).user
    const [data, total] = await Promise.all([
      prisma.sponsorRequirement.findMany({
        where:   { tenantId: user.tenantId },
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sponsorRequirement.count({ where: { tenantId: user.tenantId } }),
    ])
    return reply.send({ success: true, data, meta: { total, page, limit } })
  })

  app.get('/api/requirements/:id', { preHandler: authenticate }, async (req, reply) => {
    const user = (req as any).user
    const { id } = req.params as any
    const requirement = await prisma.sponsorRequirement.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!requirement) {
      return reply.status(404).send({ success: false, error: 'Requirement not found' })
    }
    const latestJob = await prisma.agentJobLog.findFirst({
      where:   { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({
      success: true,
      data: {
        ...requirement,
        latestJob: latestJob ? { status: latestJob.status, jobId: latestJob.jobId } : null,
      }
    })
  })

  app.post('/api/requirements', { preHandler: authenticate }, async (req, reply) => {
    const user = (req as any).user
    const contentType = req.headers['content-type'] || ''
    if (contentType.includes('multipart/form-data')) {
      let donorId: string | null = null
      let notes: string | null = null
      let savedFilePath: string | null = null
      let originalFilename: string | null = null
      const uploadDir = path.join(process.cwd(), 'uploads')
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }
      try {
        const parts = (req as any).parts({
          limits: { fileSize: 50 * 1024 * 1024, files: 1, fields: 5 }
        })
        for await (const part of parts) {
          if (part.type === 'field') {
            if (part.fieldname === 'donorId') donorId = part.value as string
            if (part.fieldname === 'notes')   notes   = part.value as string
          } else if (part.type === 'file') {
            const fileBuffer = await part.toBuffer()
            if (fileBuffer.slice(0, 5).toString('ascii') !== '%PDF-') {
              return reply.status(400).send({
                success: false,
                error: { code: 'INVALID_PDF', message: 'File does not appear to be a valid PDF' }
              })
            }
            originalFilename = part.filename
            const filename = `${Date.now()}-${part.filename}`
            savedFilePath = path.join(uploadDir, filename)
            await fs.promises.writeFile(savedFilePath, fileBuffer)
          }
        }
      } catch (err: any) {
        if (err.code === 'FST_REQ_FILE_TOO_LARGE') {
          return reply.status(413).send({
            success: false,
            error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 50 MB limit' }
          })
        }
        throw err
      }
      if (!donorId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'donorId is required' }
        })
      }
      const donor = await prisma.donor.findFirst({
        where: { id: donorId, tenantId: user.tenantId }
      })
      if (!donor) {
        return reply.status(404).send({ success: false, error: 'Donor not found' })
      }
      const requirement = await prisma.sponsorRequirement.create({
        data: {
          tenantId:       user.tenantId,
          title:          originalFilename ?? 'Uploaded RFP',
          content:        notes ?? 'Pending extraction',
          rawDocumentUrl: savedFilePath ?? undefined,
          status:         'PENDING_EXTRACTION',
        },
        select: { id: true, status: true, createdAt: true }
      })
      await prisma.agentJobLog.create({
        data: {
          tenantId: user.tenantId,
          jobId:    `job-${requirement.id}`,
          status:   'QUEUED',
        }
      })
      return reply.status(202).send({
        success: true,
        data: {
          requirementId: requirement.id,
          jobId:         `job-${requirement.id}`,
          status:        'QUEUED',
          estimatedCompletionSeconds: 60,
        }
      })
    }
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }
    const item = await prisma.sponsorRequirement.create({
      data: { ...parsed.data, tenantId: user.tenantId },
    })
    return reply.status(201).send({ success: true, data: item })
  })

  app.post('/api/requirements/:id/validate', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as any
    const user = (req as any).user
    const requirement = await prisma.sponsorRequirement.findFirst({
      where: { id, tenantId: user.tenantId }
    })
    if (!requirement) {
      return reply.status(404).send({ success: false, error: 'Requirement not found' })
    }
    await prisma.sponsorRequirement.update({
      where: { id },
      data:  { status: 'VALIDATED' }
    })
    return reply.send({ success: true, data: { status: 'VALIDATED' } })
  })

  app.get('/api/requirements/:id/matches', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as any
    const user = (req as any).user
    const requirement = await prisma.sponsorRequirement.findFirst({
      where: { id, tenantId: user.tenantId }
    })
    if (!requirement) {
      return reply.status(404).send({ success: false, error: 'Requirement not found' })
    }
    const matches = await prisma.matchResult.findMany({
      where:   { tenantId: user.tenantId },
      orderBy: { rank: 'asc' },
    })
    return reply.send({ success: true, data: matches })
  })

  app.post('/api/requirements/:id/matches/approve', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as any
    const user = (req as any).user
    const { approvedMatchIds } = req.body as any
    await prisma.sponsorRequirement.update({
      where: { id },
      data:  { status: 'VALIDATED' }
    })
    await prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        action:   'MATCHES_APPROVED',
        details:  JSON.stringify({ requirementId: id, approvedMatchIds }),
      }
    })
    return reply.send({ success: true, data: { approved: true } })
  })

  app.delete('/api/requirements/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as any
    await prisma.sponsorRequirement.delete({ where: { id } })
    return reply.send({ success: true, message: 'Deleted' })
  })
}
