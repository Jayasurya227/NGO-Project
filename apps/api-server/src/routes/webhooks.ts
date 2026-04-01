import { FastifyInstance } from 'fastify';
import { ok } from '../utils/response';

export async function webhookRoutes(app: FastifyInstance) {
  app.post('/razorpay', { config: { public: true } }, async () => ok({ received: true }));
}
