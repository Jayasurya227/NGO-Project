import { FastifyInstance } from 'fastify';
import { paged } from '../utils/response';

export async function initiativesRoutes(app: FastifyInstance) {
  app.get('/', async () => paged([], 0, 1, 20));
  app.post('/', async () => paged([], 0, 1, 20));
}
