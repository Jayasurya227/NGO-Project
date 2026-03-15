import { FastifyRequest, FastifyReply } from 'fastify';
import { err } from '../utils/response';

const PERMISSIONS = {
  'GET:/api/requirements': ['ADMIN', 'DRM'],
  'POST:/api/requirements': ['ADMIN', 'DRM'],
  'GET:/api/donors': ['ADMIN'],
  'POST:/api/donors': ['ADMIN'],
};

export async function rbacMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const routeKey = ${'$'}{request.method}:{request.url.split('?')[0]};
  const user = request.user;
  
  if (!user) {
    return reply.status(401).send(err('UNAUTHORIZED', 'Missing authentication'));
  }
}
