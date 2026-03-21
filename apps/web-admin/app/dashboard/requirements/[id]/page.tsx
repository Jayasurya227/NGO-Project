'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '../../../../lib/api'
import { format } from 'date-fns'

const STATUS_COLOURS: Record<string, string> = {
  PENDING_EXTRACTION: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  EXTRACTED:          'bg-blue-50 text-blue-700 border-blue-200',
  NEEDS_REVIEW:       'bg-orange-50 text-orange-700 border-orange-200',
  VALIDATED:          'bg-green-50 text-green-700 border-green-200',
  MATCHED:            'bg-purple-50 text-purple-700 border-purple-200',
}

function ConfidenceBar({ label, value, confidence }: { label: string; value: any; confidence: number }) {
  const pct = Math.round((confidence ?? 0) * 100)
  const colour = pct >= 85 ? 'bg-emerald-500' : pct >= 65 ? 'bg-amber-400' : 'bg-red-500'
  const textColour = pct >= 85 ? 'text-emerald-700' : pct >= 65 ? 'text-amber-700' : 'text-red-700'
  const bg = pct >= 85 ? '' : pct >= 65 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

  return (
    <div className={`rounded-lg border px-4 py-3 ${bg || 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <span className={`text-xs font-semibold ${textColour}`}>{pct}% confidence</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full mb-2 overflow-hidden">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-sm font-medium text-gray-900">
        {value ?? <span className="text-gray-400 italic text-xs">Not found in document</span>}
      </div>
      {pct < 75 && <p className={`text-xs mt-1 ${textColour}`}>⚠ Verify against source document</p>}
    </div>
  )
}

export default function RequirementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [req, setReq] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(() => {
    api.get(`/api/requirements/${id}`).then(r => {
      setReq(r.data)
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    load()
    // Auto-poll every 5 seconds when pending or validated
    const interval = setInterval(() => {
      if (req?.status === 'PENDING_EXTRACTION' || req?.status === 'VALIDATED') load()
    }, 5000)
    return () => clearInterval(interval)
  }, [load, req?.status])

  async function handleValidate() {
    setValidating(true)
    setError('')
    setSuccess('')
    try {
      const res = await api.post(`/api/requirements/${id}/validate`, {})
      if (res.success) {
        setSuccess('✅ Requirement validated! Gap Diagnoser agent is now running automatically...')
        load()
      } else {
        setError(res.error?.message ?? 'Validation failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setValidating(false)
    }
  }

  if (loading) return (
    <div className="p-8 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  )

  if (!req) return <div className="p-8 text-red-600 text-sm">Requirement not found</div>

  const fields = req.extractedFields as Record<string, any> | null
  const scores = req.confidenceScores as Record<string, number> | null
  const gapReport = req.gapReportJson as any | null
  const canValidate = req.status === 'EXTRACTED' || req.status === 'NEEDS_REVIEW'

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => router.push('/dashboard/requirements')} className="text-xs text-gray-400 hover:text-blue-600 mb-2 flex items-center gap-1">
            ← Back to Requirements
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {req.donor?.orgName ?? 'Individual Donor'} — Requirement
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">ID: {req.id}</p>
        </div>
        <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${STATUS_COLOURS[req.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
          {req.status?.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Success / Error */}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-xl">{success}</div>}
      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-xl">{error}</div>}

      {/* Status banners */}
      {req.status === 'PENDING_EXTRACTION' && (
        <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">AI extraction in progress</p>
            <p className="text-xs text-blue-600 mt-0.5">The Requirement Extraction Agent is reading this document. This takes 30–60 seconds. Page auto-refreshes.</p>
          </div>
        </div>
      )}

      {req.status === 'NEEDS_REVIEW' && (
        <div className="mb-5 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-orange-800">⚠ DRM Review Required</p>
          <p className="text-xs text-orange-700 mt-0.5">One or more fields have low confidence. Verify them against the source document, correct if needed, then click Validate.</p>
        </div>
      )}

      {req.status === 'VALIDATED' && (
        <div className="mb-5 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-green-500 border-t-transparent animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">✅ Validated — Gap Diagnoser agent running</p>
            <p className="text-xs text-green-600 mt-0.5">The system is analysing gaps between this requirement and existing initiatives. Page auto-refreshes.</p>
          </div>
        </div>
      )}

      {req.status === 'MATCHED' && (
        <div className="mb-5 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-purple-800">🎯 Matching complete — {req.matchCount ?? 0} initiative(s) matched</p>
          <p className="text-xs text-purple-600 mt-0.5">The Matching Agent has ranked initiatives. Review matches below.</p>
        </div>
      )}

      {/* Basic info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Submission Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-gray-400 mb-0.5">Donor</p><p className="font-medium">{req.donor?.orgName ?? 'Individual'}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Donor Type</p><p className="font-medium">{req.donor?.type ?? '—'}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Document Uploaded</p><p className="font-medium">{req.rawDocumentUrl ? '📄 Yes' : '— None'}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Created</p><p className="font-medium">{format(new Date(req.createdAt), 'dd MMM yyyy HH:mm')}</p></div>
          {req.latestJob && <div><p className="text-xs text-gray-400 mb-0.5">Agent Status</p><p className="font-medium">{req.latestJob.status}{req.latestJob.latencyMs ? ` (${(req.latestJob.latencyMs / 1000).toFixed(1)}s)` : ''}</p></div>}
        </div>
      </div>

      {/* Extracted Fields with Confidence Scores */}
      {fields && scores && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Extracted Fields & Confidence Scores</h3>
          <p className="text-xs text-gray-500 mb-3">Green = high confidence (AI is certain). Orange = medium (check recommended). Red = low (DRM must verify manually).</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ConfidenceBar label="Sector" value={fields.sector} confidence={scores.sector ?? 0} />
            <ConfidenceBar
              label="Geography"
              value={fields.geography?.state ? `${fields.geography.state}${fields.geography.districts?.length ? ` · ${fields.geography.districts.join(', ')}` : ''}` : null}
              confidence={scores.state ?? 0}
            />
            <ConfidenceBar
              label="Budget Range"
              value={fields.budget?.minInr != null ? `₹${(fields.budget.minInr / 100000).toFixed(1)}L – ₹${(fields.budget.maxInr / 100000).toFixed(1)}L` : null}
              confidence={scores.budget ?? 0}
            />
            <ConfidenceBar
              label="Duration"
              value={fields.durationMonths?.value != null ? `${fields.durationMonths.value} months` : null}
              confidence={scores.durationMonths ?? 0}
            />
            <ConfidenceBar
              label="Reporting Cadence"
              value={fields.reportingCadence?.value?.replace(/_/g, ' ')}
              confidence={scores.reportingCadence ?? 0}
            />
            <ConfidenceBar
              label="Primary KPIs"
              value={fields.primaryKpis?.length > 0 ? fields.primaryKpis.map((k: any) => `${k.metric}${k.target ? ` (${k.target} ${k.unit ?? ''})` : ''}`).join(', ') : null}
              confidence={scores.primaryKpis ?? 0}
            />
          </div>

          {/* Constraints */}
          {fields.constraints?.length > 0 && (
            <div className="mt-3 bg-white rounded-xl border border-gray-200 p-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase">Constraints / Requirements</h4>
              <div className="flex flex-wrap gap-2">
                {fields.constraints.map((c: any, i: number) => (
                  <span key={i} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                    {c.type} {c.value !== undefined ? `(${String(c.value)})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gap Report */}
      {gapReport && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Gap Analysis Report</h3>

          {/* Recommendation badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border mb-3 ${
            gapReport.recommendation === 'PROCEED_TO_MATCHING' ? 'bg-green-50 text-green-700 border-green-200' :
            gapReport.recommendation === 'CREATE_INITIATIVE_FIRST' ? 'bg-orange-50 text-orange-700 border-orange-200' :
            'bg-red-50 text-red-700 border-red-200'
          }`}>
            {gapReport.recommendation === 'PROCEED_TO_MATCHING' ? '✅' : gapReport.recommendation === 'CREATE_INITIATIVE_FIRST' ? '⚠' : '🔴'}
            {gapReport.recommendation?.replace(/_/g, ' ')}
          </div>

          {/* Narrative */}
          <p className="text-sm text-gray-700 leading-relaxed mb-3">{gapReport.narrative}</p>

          {/* Critical gaps */}
          {gapReport.criticalGaps?.length > 0 && (
            <div className="space-y-1 mb-2">
              <p className="text-xs font-semibold text-red-700 uppercase">Critical Gaps</p>
              {gapReport.criticalGaps.map((g: any, i: number) => (
                <div key={i} className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                  🔴 [{g.category}] {g.description}
                </div>
              ))}
            </div>
          )}

          {/* Minor gaps */}
          {gapReport.minorGaps?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-amber-700 uppercase">Minor Gaps</p>
              {gapReport.minorGaps.map((g: any, i: number) => (
                <div key={i} className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                  ⚠ [{g.category}] {g.description}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Match Results */}
      {req.status === 'MATCHED' && req.matchCount > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">🎯 Matched Initiatives ({req.matchCount})</h3>
          <div className="space-y-2">
            {req.topMatches?.map((m: any, i: number) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-purple-50 rounded-lg border border-purple-100">
                <span className="text-sm text-purple-800 font-medium">#{i + 1} Match</span>
                <span className="text-xs text-purple-600">Score: {m.overallScore ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validate Button */}
      {canValidate && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">DRM Validation</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {req.status === 'NEEDS_REVIEW'
                  ? 'Review all flagged fields above before validating'
                  : 'All fields extracted with acceptable confidence'}
              </p>
            </div>
            <button
              onClick={handleValidate}
              disabled={validating}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              {validating ? 'Validating...' : 'Validate & Start Gap Analysis →'}
            </button>
          </div>
        </div>
      )}

      {/* Already validated message */}
      {req.status !== 'PENDING_EXTRACTION' && !canValidate && req.status !== 'MATCHED' && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4 text-center text-xs text-gray-500">
          {req.status === 'VALIDATED'
            ? 'Gap analysis is running. Matching Agent will start automatically after it completes.'
            : 'This requirement has already been processed.'}
        </div>
      )}
    </div>
  )
}