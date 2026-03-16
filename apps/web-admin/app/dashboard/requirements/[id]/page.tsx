'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '../../../../lib/api'
import { format } from 'date-fns'

export default function RequirementDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [req, setReq] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [validated, setValidated] = useState(false)

  const fetchRequirement = useCallback(() => {
    api.get(`/api/requirements/${id}`).then(r => {
      setReq(r.data)
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    fetchRequirement()
    const interval = setInterval(fetchRequirement, 5000)
    return () => clearInterval(interval)
  }, [fetchRequirement])

  async function handleValidate() {
    setValidating(true)
    const res = await api.post(`/api/requirements/${id}/validate`, {})
    if (res.success) {
      setReq((prev: any) => ({ ...prev, status: 'VALIDATED' }))
      setValidated(true)
    }
    setValidating(false)
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-gray-400 mt-8">
      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      Loading...
    </div>
  )

  if (!req) return <div className="text-sm text-gray-400">Requirement not found</div>

  const confidenceScores = req.confidenceScores as Record<string, number> | null
  const extractedFields  = req.extractedFields  as Record<string, any>    | null
  const gapReport        = req.gapReportJson    as any | null
  const lowCount = confidenceScores
    ? Object.values(confidenceScores).filter((s: number) => s < 0.65).length
    : 0

  const statusColors: Record<string, string> = {
    PENDING_EXTRACTION: 'bg-yellow-100 text-yellow-700',
    EXTRACTED:          'bg-blue-100 text-blue-700',
    VALIDATED:          'bg-green-100 text-green-700',
    NEEDS_REVIEW:       'bg-red-100 text-red-700',
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">Back</button>
        <h2 className="text-xl font-semibold text-gray-900 flex-1">{req.title}</h2>
        <button
          onClick={() => router.push(`/dashboard/requirements/${id}/matches`)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1.5 border border-blue-200 rounded-lg"
        >
          View Matches
        </button>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[req.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {req.status}
        </span>
      </div>

      {req.status === 'PENDING_EXTRACTION' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-5 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-yellow-400 border-t-yellow-600 rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-yellow-700">AI extraction in progress — auto-refreshing every 5 seconds</p>
        </div>
      )}

      {validated && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-5">
          <p className="text-sm text-green-700 font-medium">Validated! Gap analysis queued.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs mb-1">Created</p>
            <p className="font-medium">{format(new Date(req.createdAt), 'dd MMM yyyy HH:mm')}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Version</p>
            <p className="font-medium">{req.version ?? 1}</p>
          </div>
        </div>
      </div>

      {extractedFields && Object.keys(extractedFields).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Extracted fields</h3>
            {lowCount > 0 && <span className="text-xs text-red-600 font-medium">{lowCount} need review</span>}
          </div>
          <div className="space-y-3">
            {Object.entries(extractedFields).map(([key, value]) => {
              const confidence = confidenceScores?.[key] ?? 1
              const pct = Math.round(confidence * 100)
              const barColor = confidence >= 0.85 ? 'bg-emerald-500' : confidence >= 0.65 ? 'bg-amber-400' : 'bg-red-500'
              const bgColor  = confidence >= 0.85 ? 'bg-white border-gray-200' : confidence >= 0.65 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
              const txtColor = confidence >= 0.85 ? 'text-gray-400' : confidence >= 0.65 ? 'text-amber-600' : 'text-red-600'
              return (
                <div key={key} className={`rounded-lg border px-4 py-3 ${bgColor}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500 uppercase">{key}</span>
                    <span className={`text-xs font-medium ${txtColor}`}>{pct}% confidence</span>
                  </div>
                  <p className="text-sm text-gray-900 mb-2">{String(value)}</p>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {gapReport && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Gap report</h3>
          {gapReport.narrative && <p className="text-sm text-gray-600 mb-3">{gapReport.narrative}</p>}
        </div>
      )}

      <div className="flex gap-3">
        {['EXTRACTED', 'NEEDS_REVIEW'].includes(req.status) && !validated && (
          <button
            onClick={handleValidate}
            disabled={validating}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {validating ? 'Validating...' : 'Validate & Proceed to Matching'}
          </button>
        )}
        <button
          onClick={() => router.push(`/dashboard/requirements/${id}/matches`)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          View Matches
        </button>
      </div>
    </div>
  )
}