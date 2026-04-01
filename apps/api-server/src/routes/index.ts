import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { donorsRoutes } from './donors';
import { requirementsRoutes } from './requirements';
import { initiativesRoutes } from './initiatives';
import { contentRoutes } from './content';
import { storyRoutes } from './stories';
import { agentRoutes } from './agents';
import { beneficiariesRoutes } from './beneficiaries';
import { donationsRoutes } from './donations';
import { evidenceRoutes } from './evidence';
import { milestonesRoutes } from './milestones';
import { reportRoutes } from './reports';
import { uploadRoutes } from './upload';
import { webhookRoutes } from './webhooks';

export async function registerRoutes(app: FastifyInstance) {
  // Routes that use the old pattern (call as function)
  await authRoutes(app);
  await donorsRoutes(app);
  await requirementsRoutes(app);
  await initiativesRoutes(app);
  await agentRoutes(app);
  await beneficiariesRoutes(app);
  await donationsRoutes(app);
  await evidenceRoutes(app);
  await milestonesRoutes(app);
  await reportRoutes(app);
  await uploadRoutes(app);
  await webhookRoutes(app);
  
  // New routes that use plugin pattern
  app.register(contentRoutes, { prefix: '/api/content' });
  app.register(storyRoutes, { prefix: '/api/stories' });
}