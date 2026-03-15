import Fastify from 'fastify';

async function start() {
  const app = Fastify({ logger: true });
  
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  app.post('/api/auth/login', async (request, reply) => {
    return {
      success: true,
      data: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ0ZW5hbnRJZCI6IjQ1NiIsInJvbGUiOiJEUk0iLCJlbWFpbCI6ImRybUBzaGlrc2hhLnRlc3QifQ.mock',
        role: 'DRM',
        tenantId: '456',
        userId: '123'
      }
    };
  });

  app.get('/api/requirements', async () => ({
    success: true,
    data: [],
    meta: { total: 0, page: 1, limit: 20, totalPages: 0 }
  }));

  const port = parseInt(process.env.API_PORT ?? '4000');
  await app.listen({ port, host: '0.0.0.0' });
  console.log('API server running on http://localhost:' + port);
}

start().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
