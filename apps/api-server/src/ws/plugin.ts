import { FastifyInstance } from 'fastify'
import websocket from '@fastify/websocket'

export async function websocketPlugin(app: FastifyInstance) {
  await app.register(websocket)

  app.get('/ws', { websocket: true }, (socket, req) => {
    console.log('Client connected via WebSocket')

    socket.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket connection established',
      timestamp: new Date().toISOString()
    }))

    socket.on('message', (raw) => {
      const msg = raw.toString()
      console.log('Received:', msg)

      try {
        const data = JSON.parse(msg)

        if (data.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
        } else {
          socket.send(JSON.stringify({ type: 'echo', data, timestamp: new Date().toISOString() }))
        }
      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }))
      }
    })

    socket.on('close', () => {
      console.log('Client disconnected')
    })
  })
}