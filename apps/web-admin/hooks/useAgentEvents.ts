'use client'
import { useWebSocket } from './useWebSocket'
import toast from 'react-hot-toast'

export function useAgentEvents() {
  useWebSocket((event: any) => {
    console.log('[WS] Event received:', event)

    switch (event.type) {
      case 'connected':
        console.log('[WS] Handshake confirmed')
        break

      case 'REQUIREMENT_EXTRACTED':
        toast.success(
          event.requiresReview
            ? 'Requirement extracted — review needed'
            : 'Requirement extracted successfully'
        )
        break

      case 'MATCH_RESULTS_READY':
        toast.success(`${event.matchCount ?? 0} initiative matches found`)
        break

      case 'EVIDENCE_VERIFIED':
        if (event.requiresReview) {
          toast.error(`Evidence requires review (score: ${event.score})`)
        } else {
          toast.success(`Evidence verified (score: ${event.score})`)
        }
        break

      case 'STORY_GENERATED':
        toast.success('Impact story generated — ready for review')
        break

      case 'pong':
        console.log('[WS] Pong received')
        break

      default:
        console.log('[WS] Event:', event.type)
    }
  })
}