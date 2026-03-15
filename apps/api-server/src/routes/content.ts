import { FastifyInstance } from 'fastify';
import { paged } from '../utils/response';

export async function contentRoutes(app: FastifyInstance) {
  app.get('/', async () => paged([], 0, 1, 20));
}
