import { FastifyInstance } from 'fastify';
import { paged } from '../utils/response';

export async function reportRoutes(app: FastifyInstance) {
  app.get('/:reportId', async () => paged([], 0, 1, 20));
}
