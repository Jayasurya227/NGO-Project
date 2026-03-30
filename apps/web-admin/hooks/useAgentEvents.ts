'use client'
import { useWebSocket } from './useWebSocket'
import toast from 'react-hot-toast'

export function useAgentEvents() {
  useWebSocket((event: any) => {
    console.log('[WS] Event:', event)

    switch (event.type) {
      case 'connected':
        console.log('[WS] Handshake confirmed')
        break

      case 'REQUIREMENT_EXTRACTED':
        toast.success(
          event.requiresReview
            ? 'RFP extracted — review needed for low-confidence fields'
            : 'RFP extracted successfully'
        )
        break

      case 'MATCH_RESULTS_READY':
        toast.success(`${event.matchCount ?? 0} initiative matches found`)
        break

      case 'PITCH_DECK_READY':
        toast.success('Pitch deck generated — ready for review')
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

      case 'AGENT_JOB_STATUS':
        if (event.status === 'FAILED') {
          toast.error(`Agent job failed: ${event.agentName}`)
        } else if (event.status === 'COMPLETED') {
          toast.success(`Agent job completed: ${event.agentName}`)
        }
        break

      case 'APPROVAL_REQUIRED':
        toast(
          `Action required: ${event.message ?? 'Review needed'}`,
          { icon: '⚠️', duration: 8000 }
        )
        break

      case 'pong':
        console.log('[WS] Pong received')
        break

      default:
        console.log('[WS] Unhandled event:', event.type)
    }
  })
}