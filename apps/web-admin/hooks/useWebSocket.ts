'use client'
import { useEffect, useRef, useCallback } from 'react'
import { getSession } from '../lib/auth'

export function useWebSocket(onEvent: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const retryCount = useRef(0)
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  const connect = useCallback(() => {
    const session = getSession()
    if (!session) return

    const ws = new WebSocket('ws://localhost:4000/ws/notifications')
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WS] Connected')
      retryCount.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onEventRef.current(data)
      } catch {
        console.warn('[WS] Could not parse message:', event.data)
      }
    }

    ws.onclose = () => {
      console.log('[WS] Disconnected — reconnecting...')
      const delay = Math.min(1000 * 2 ** retryCount.current, 30000)
      retryCount.current++
      setTimeout(connect, delay)
    }

    ws.onerror = (err) => {
      console.error('[WS] Error:', err)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => wsRef.current?.close()
  }, [connect])
}