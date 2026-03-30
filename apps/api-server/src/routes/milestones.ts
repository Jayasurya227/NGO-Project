import { FastifyInstance } from 'fastify';
import { prisma } from '@ngo/database';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const MilestoneCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  dueDate: z.string().datetime(),
  budgetAllocated: z.number().min(0),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']).default('PLANNED'),
  evidenceRequirements: z.record(z.string(), z.any()).default({}),
  sequenceOrder: z.number().int().min(0).default(0),
});

const MilestoneUpdateSchema = MilestoneCreateSchema.partial();

export async function milestonesRoutes(app: FastifyInstance) {
  // GET /api/initiatives/:initiativeId/milestones
  app.get<{ Params: { initiativeId: string } }>(
    '/:initiativeId/milestones',
    { preHandler: requirePermission('initiative:read') },
    async (request, reply) => {
      const { initiativeId } = request.params;

      // Verify initiative exists
      const initiative = await prisma.initiative.findUnique({
        where: { id: initiativeId },
      });

      if (!initiative) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Initiative not found' },
        });
      }

      const milestones = await prisma.milestone.findMany({
        where: { initiativeId },
        orderBy: { sequenceOrder: 'asc' },
      });

      return reply.send({
        success: true,
        data: milestones,
        total: milestones.length,
      });
    }
  );

  // POST /api/initiatives/:initiativeId/milestones
  app.post<{ Params: { initiativeId: string } }>(
    '/:initiativeId/milestones',
    { preHandler: requirePermission('initiative:update') },
    async (request, reply) => {
      const { initiativeId } = request.params;

      // Verify initiative exists
      const initiative = await prisma.initiative.findUnique({
        where: { id: initiativeId },
      });

      if (!initiative) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Initiative not found' },
        });
      }

      // Validate body
      const validation = MilestoneCreateSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: validation.error.message },
        });
      }

      const data = validation.data;

      const milestone = await prisma.milestone.create({
        data: {
          id: randomUUID(),
          initiativeId,
          title: data.title,
          description: data.description,
          dueDate: new Date(data.dueDate),
          budgetAllocated: data.budgetAllocated,
          status: data.status,
          evidenceRequirements: data.evidenceRequirements,
          sequenceOrder: data.sequenceOrder,
        },
      });

      return reply.status(201).send({
        success: true,
        data: milestone,
      });
    }
  );

  // GET /api/initiatives/:initiativeId/milestones/:id
  app.get<{ Params: { initiativeId: string; id: string } }>(
    '/:initiativeId/milestones/:id',
    { preHandler: requirePermission('initiative:read') },
    async (request, reply) => {
      const { initiativeId, id } = request.params;

      const milestone = await prisma.milestone.findFirst({
        where: { id, initiativeId },
      });

      if (!milestone) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Milestone not found' },
        });
      }

      return reply.send({
        success: true,
        data: milestone,
      });
    }
  );

  // PATCH /api/initiatives/:initiativeId/milestones/:id
  app.patch<{ Params: { initiativeId: string; id: string } }>(
    '/:initiativeId/milestones/:id',
    { preHandler: requirePermission('initiative:update') },
    async (request, reply) => {
      const { initiativeId, id } = request.params;

      // Verify milestone exists
      const existing = await prisma.milestone.findFirst({
        where: { id, initiativeId },
      });

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Milestone not found' },
        });
      }

      // Validate body
      const validation = MilestoneUpdateSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: validation.error.message },
        });
      }

      const data = validation.data;
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
      if (data.budgetAllocated !== undefined) updateData.budgetAllocated = data.budgetAllocated;
      if (data.evidenceRequirements !== undefined) updateData.evidenceRequirements = data.evidenceRequirements;
      if (data.sequenceOrder !== undefined) updateData.sequenceOrder = data.sequenceOrder;
      if (data.status !== undefined) updateData.status = data.status;

      const milestone = await prisma.milestone.update({
        where: { id },
        data: updateData,
      });

      return reply.send({
        success: true,
        data: milestone,
      });
    }
  );

  // DELETE /api/initiatives/:initiativeId/milestones/:id
  app.delete<{ Params: { initiativeId: string; id: string } }>(
    '/:initiativeId/milestones/:id',
    { preHandler: requirePermission('initiative:update') },
    async (request, reply) => {
      const { initiativeId, id } = request.params;

      // Verify milestone exists
      const existing = await prisma.milestone.findFirst({
        where: { id, initiativeId },
      });

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Milestone not found' },
        });
      }

      await prisma.milestone.delete({ where: { id } });

      return reply.status(204).send();
    }
  );
}