import { FastifyInstance } from 'fastify';
import { paged } from '../utils/response';

export async function agentRoutes(app: FastifyInstance) {
  app.get('/job-status/:jobId', async () => paged([], 0, 1, 20));
}
