'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '../../../../../lib/api'

export default function MatchResultsPage() {
  const { id } = useParams()
  const router = useRouter()
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(false)

  useEffect(() => {
    api.get(`/api/requirements/${id}/matches`).then(r => {
      setMatches(r.data ?? [])
      setLoading(false)
    })
  }, [id])

  function moveUp(index: number) {
    if (index === 0) return
    const updated = [...matches]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    setMatches(updated)
  }

  function moveDown(index: number) {
    if (index === matches.length - 1) return
    const updated = [...matches]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    setMatches(updated)
  }

  async function handleApprove() {
    setApproving(true)
    const res = await api.post(`/api/requirements/${id}/matches/approve`, {
      approvedMatchIds: matches.map(m => m.id),
    })
    if (res.success) setApproved(true)
    setApproving(false)
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-gray-400 mt-8">
      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      Loading matches...
    </div>
  )

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">Back</button>
        <h2 className="text-xl font-semibold text-gray-900 flex-1">Match Results</h2>
      </div>

      {approved && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-5">
          <p className="text-sm text-green-700 font-medium">Matches approved! Pitch deck generation queued.</p>
        </div>
      )}

      {matches.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-400">No matches yet — waiting for AI matching to complete</p>
          <p className="text-xs text-gray-400 mt-1">This happens after you validate the requirement</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {matches.map((match, index) => {
              const score = Math.round((match.overallScore ?? match.score ?? 0) * 100)
              const scoreColor = score >= 80 ? 'bg-green-100 text-green-700' : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'

              return (
                <div key={match.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1">
                      <button onClick={() => moveUp(index)} className="text-gray-400 hover:text-gray-600 text-xs">▲</button>
                      <span className="text-xs text-gray-400 text-center">{index + 1}</span>
                      <button onClick={() => moveDown(index)} className="text-gray-400 hover:text-gray-600 text-xs">▼</button>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-900">Match #{index + 1}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${scoreColor}`}>
                          {score}% match
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-400' : 'bg-red-500'}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      {match.explanation && (
                        <p className="text-xs text-gray-500 mt-2">{match.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {!approved && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {approving ? 'Approving...' : 'Approve Matches & Generate Pitch Deck'}
            </button>
          )}
        </>
      )}
    </div>
  )
}