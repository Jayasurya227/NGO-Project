import { FastifyInstance } from 'fastify';
import { ok, err } from '../utils/response';

export async function authRoutes(app: FastifyInstance) {
  app.post<{
    Body: { email: string; password: string; subdomain: string };
  }>(
    '/login',
    { config: { public: true } },
    async (request, reply) => {
      const { email, password, subdomain } = request.body;
      
      if (!email || !password || !subdomain) {
        return reply.status(400).send(err('VALIDATION_ERROR', 'Email, password, and subdomain required'));
      }
      
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ0ZW5hbnRJZCI6IjQ1NiIsInJvbGUiOiJEUk0iLCJlbWFpbCI6ImRybUBzaGlrc2hhLnRlc3QifQ.mock';
      
      return ok({
        token: mockToken,
        role: 'DRM',
        tenantId: '456',
        userId: '123'
      });
    }
  );
}
