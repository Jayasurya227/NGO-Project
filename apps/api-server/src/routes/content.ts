import { FastifyInstance } from 'fastify';
import { prisma } from '@ngo/database';
import { auditLog } from '@ngo/audit';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';
import { readFileSync, readdirSync } from 'fs';
import { basename, join } from 'path';

function resolveFilePath(storedPath: string): string | null {
  // 1. Try the stored absolute path
  try { readFileSync(storedPath); return storedPath; } catch {}

  const localDir = join(process.cwd(), 'tmp', 'pitch-decks');

  // 2. Try exact filename in local tmp dir
  const exactLocal = join(localDir, basename(storedPath));
  try { readFileSync(exactLocal); return exactLocal; } catch {}

  // 3. Match by requirement-ID prefix (same req, different timestamp — generated on another machine)
  const match = basename(storedPath).match(/^pitch-deck-([a-f0-9-]+)-\d+\.pptx$/i);
  if (match) {
    const reqId = match[1];
    try {
      const files = readdirSync(localDir);
      const found = files.find(f => f.startsWith(`pitch-deck-${reqId}-`) && f.endsWith('.pptx'));
      if (found) return join(localDir, found);
    } catch {}
  }

  return null;
}

const ApprovalBody = z.object({
  notes: z.string().max(1000).optional(),
});

export async function contentRoutes(app: FastifyInstance) {

  // GET /api/content - list all artifacts
 app.get('/', {  // ✅ Changed from '/api/content'
    preHandler: requirePermission('content:read'),
  }, async (request, reply) => {
    const { tenantId } = request as any;

    const artifacts = await prisma.contentArtifact.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, 
        type: true, 
        approvalStatus: true, 
        templateVersion: true,
        relatedEntityType: true, 
        relatedEntityId: true,
        approvedBy: true, 
        approvedAt: true,
        createdAt: true, 
        updatedAt: true,
      },
    });

    return reply.send({
      success: true,
      data: artifacts,
      total: artifacts.length,
    });
  });

  // GET /api/content/:id - single artifact with downloadUrl if file exists
  app.get<{ Params: { id: string } }>('/:id', {
    preHandler: requirePermission('content:read'),
  }, async (request, reply) => {
    const { tenantId } = request as any;
    const { id } = request.params;

    const artifact = await prisma.contentArtifact.findFirst({
      where: { id, tenantId },
    });

    if (!artifact) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Content artifact not found' },
      });
    }

    const resolvedPath = artifact.fileUrl ? resolveFilePath(artifact.fileUrl) : null;

    return reply.send({
      success: true,
      data: {
        ...artifact,
        downloadUrl: resolvedPath ? `http://localhost:4000/api/content/${id}/download` : null,
      },
    });
  });

  // GET /api/content/:id/download — stream the PPTX file to the browser
  app.get<{ Params: { id: string } }>('/:id/download', {
    preHandler: requirePermission('content:read'),
  }, async (request, reply) => {
    const { tenantId } = request as any;
    const { id } = request.params;

    const artifact = await prisma.contentArtifact.findFirst({
      where: { id, tenantId },
      select: { fileUrl: true, approvalStatus: true },
    });

    if (!artifact?.fileUrl) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'File path not recorded.' } });
    }

    const resolvedPath = resolveFilePath(artifact.fileUrl);
    if (!resolvedPath) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'File not found on server.' } });
    }

    const fileBuffer = readFileSync(resolvedPath);
    const fileName = basename(resolvedPath);
    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
    return reply.send(fileBuffer);
  });

  // POST /api/content/:id/approve
  app.post<{ Params: { id: string } }>('/:id/approve', {  // ✅ Changed('/api/content/:id/approve', {
    preHandler: requirePermission('content:approve'),
  }, async (request, reply) => {
    const { tenantId, userId } = request as any;
    const { id } = request.params;
    
    // Validate body
    const validation = ApprovalBody.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: validation.error.message },
      });
    }
    const { notes } = validation.data;

    const artifact = await prisma.contentArtifact.findFirst({
      where: { id, tenantId },
    });

    if (!artifact) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Content artifact not found' },
      });
    }

    if (artifact.approvalStatus !== 'PENDING_REVIEW') {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Only PENDING_REVIEW artifacts can be approved' },
      });
    }

    const updated = await prisma.contentArtifact.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    await auditLog({
      tenantId,
      actorId: userId,
      actorType: 'USER',
      eventType: 'CONTENT_APPROVED',
      entityType: 'ContentArtifact',
      entityId: id,
      afterState: { notes, type: artifact.type },
    });

    return reply.send({
      success: true,
      data: updated,
    });
  });

  // POST /api/content/:id/reject
  app.post<{ Params: { id: string } }>('/:id/reject', {  // ✅ Changed('/api/content/:id/reject', {
    preHandler: requirePermission('content:approve'),
  }, async (request, reply) => {
    const { tenantId, userId } = request as any;
    const { id } = request.params;
    
    // Validate body
    const validation = ApprovalBody.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: validation.error.message },
      });
    }
    const { notes } = validation.data;

    const artifact = await prisma.contentArtifact.findFirst({
      where: { id, tenantId },
    });

    if (!artifact) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Content artifact not found' },
      });
    }

    const updated = await prisma.contentArtifact.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    await auditLog({
      tenantId,
      actorId: userId,
      actorType: 'USER',
      eventType: 'CONTENT_REJECTED',
      entityType: 'ContentArtifact',
      entityId: id,
      afterState: { notes, type: artifact.type },
    });

    return reply.send({
      success: true,
      data: updated,
    });
  });
}