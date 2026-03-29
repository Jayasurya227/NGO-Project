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

function ConfidenceBar({ label, value, confidence, fieldKey, editing, onEdit }: {
  label: string; value: any; confidence: number
  fieldKey: string; editing: boolean; onEdit: (key: string, value: string) => void
}) {
  const pct        = Math.round((confidence ?? 0) * 100)
  const colour     = pct >= 85 ? 'bg-emerald-500' : pct >= 65 ? 'bg-amber-400' : 'bg-red-500'
  const textColour = pct >= 85 ? 'text-emerald-700' : pct >= 65 ? 'text-amber-700' : 'text-red-700'
  const bg         = pct >= 85 ? '' : pct >= 65 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
  const [editVal, setEditVal] = useState(String(value ?? ''))

  return (
    <div className={`rounded-lg border px-4 py-3 ${bg || 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <span className={`text-xs font-semibold ${textColour}`}>{pct}% confidence</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full mb-2 overflow-hidden">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      {editing ? (
        <input value={editVal} onChange={e => { setEditVal(e.target.value); onEdit(fieldKey, e.target.value) }}
          className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      ) : (
        <div className="text-sm font-medium text-gray-900">
          {value ?? <span className="text-gray-400 italic text-xs">Not found in document</span>}
        </div>
      )}
      {pct < 75 && !editing && <p className={`text-xs mt-1 ${textColour}`}>⚠ Verify against source document</p>}
    </div>
  )
}

export default function RequirementDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const [req, setReq]               = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [validating, setValidating] = useState(false)
  const [approving, setApproving]   = useState(false)
  const [editing, setEditing]       = useState(false)
  const [corrections, setCorrections] = useState<Record<string, string>>({})
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  const load = useCallback(() => {
    api.get(`/api/requirements/${id}`).then(r => { setReq(r.data); setLoading(false) })
  }, [id])

  useEffect(() => {
    load()
    const interval = setInterval(() => {
      if (req?.status === 'PENDING_EXTRACTION' || req?.status === 'VALIDATED') load()
    }, 5000)
    return () => clearInterval(interval)
  }, [load, req?.status])

  async function handleValidate() {
    setValidating(true); setError(''); setSuccess('')
    try {
      const body = Object.keys(corrections).length > 0 ? { corrections } : {}
      const res  = await api.post(`/api/requirements/${id}/validate`, body)
      if (res.success) {
        setSuccess('✅ Validated! Gap Diagnoser → Matching Agent will run automatically...')
        setEditing(false); setCorrections({}); load()
      } else { setError(res.error?.message ?? 'Validation failed') }
    } catch { setError('Network error. Please try again.') }
    finally { setValidating(false) }
  }

  async function handlePMApprove() {
    setApproving(true); setError(''); setSuccess('')
    try {
      const res = await api.post(`/api/requirements/${id}/pm-approve`, {})
      if (res.success) {
        setSuccess('✅ Program Manager approved! Pitch Deck Agent will be triggered next.')
        load()
      } else { setError(res.error?.message ?? 'PM approval failed') }
    } catch { setError('Network error. Please try again.') }
    finally { setApproving(false) }
  }

  if (loading) return (
    <div className="p-8 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  )

  if (!req) return <div className="p-8 text-red-600 text-sm">Requirement not found</div>

  const fields    = req.extractedFields as Record<string, any> | null
  const scores    = req.confidenceScores as Record<string, number> | null
  const gapReport = req.gapReportJson as any | null
  const canValidate  = req.status === 'EXTRACTED' || req.status === 'NEEDS_REVIEW'
  const canPMApprove = req.status === 'MATCHED' && req.matchCount > 0

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => router.push('/dashboard/requirements')}
            className="text-xs text-gray-400 hover:text-blue-600 mb-2 flex items-center gap-1">
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

      {/* Pipeline progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Pipeline Progress</p>
        <div className="flex items-center gap-1 text-xs flex-wrap">
          {[
            { label: '1. Extraction',   active: req.status === 'EXTRACTED' || req.status === 'NEEDS_REVIEW', done: ['VALIDATED','MATCHED'].includes(req.status) },
            { label: '2. DRM Review',   active: req.status === 'NEEDS_REVIEW', done: ['VALIDATED','MATCHED'].includes(req.status) },
            { label: '3. Gap Analysis', active: req.status === 'VALIDATED', done: req.status === 'MATCHED' },
            { label: '4. Matching',     active: false, done: req.status === 'MATCHED' },
            { label: '5. PM Approval',  active: req.status === 'MATCHED', done: false },
            { label: '6. Pitch Deck',   active: false, done: false },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-1">
              <div className={`px-2 py-1 rounded-full font-medium ${
                step.done   ? 'bg-green-100 text-green-700' :
                step.active ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-400'
              }`}>
                {step.done ? '✓ ' : ''}{step.label}
              </div>
              {i < 5 && <span className="text-gray-300">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Banners */}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-xl">{success}</div>}
      {error   && <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-xl">{error}</div>}

      {req.status === 'PENDING_EXTRACTION' && (
        <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">AI extraction in progress...</p>
            <p className="text-xs text-blue-600 mt-0.5">Page auto-refreshes every 5 seconds.</p>
          </div>
        </div>
      )}

      {req.status === 'NEEDS_REVIEW' && (
        <div className="mb-5 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-orange-800">⚠ DRM Review Required</p>
          <p className="text-xs text-orange-700 mt-0.5">One or more fields have low confidence. Click Edit Fields to correct before validating.</p>
        </div>
      )}

      {req.status === 'VALIDATED' && (
        <div className="mb-5 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-green-500 border-t-transparent animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Gap Diagnoser running → Matching Agent will follow automatically...</p>
            <p className="text-xs text-green-600 mt-0.5">Page auto-refreshes every 5 seconds.</p>
          </div>
        </div>
      )}

      {/* Basic info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Submission Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-gray-400 mb-0.5">Donor</p><p className="font-medium">{req.donor?.orgName ?? 'Individual'}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Type</p><p className="font-medium">{req.donor?.type ?? '—'}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Document</p><p className="font-medium">{req.rawDocumentUrl ? '📄 Yes' : '— None'}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Created</p><p className="font-medium">{format(new Date(req.createdAt), 'dd MMM yyyy HH:mm')}</p></div>
        </div>
      </div>

      {/* Extracted Fields */}
      {fields && scores && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Extracted Fields & Confidence Scores</h3>
            {canValidate && (
              <button onClick={() => { setEditing(!editing); setCorrections({}) }}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${editing ? 'bg-orange-50 text-orange-700 border-orange-300' : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'}`}>
                {editing ? '✕ Cancel Editing' : '✏ Edit Fields'}
              </button>
            )}
          </div>
          {editing && (
            <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
              ✏ Edit mode — modify fields then click Validate to save and start Gap Analysis
            </div>
          )}
          <p className="text-xs text-gray-500 mb-3">🟢 High confidence. 🟡 Check recommended. 🔴 Must verify.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ConfidenceBar label="Sector" fieldKey="sector"
              value={fields.sector} confidence={scores.sector ?? 0}
              editing={editing} onEdit={(k, v) => setCorrections(p => ({ ...p, [k]: v }))} />
            <ConfidenceBar label="Geography" fieldKey="geography.state"
              value={fields.geography?.state ? `${fields.geography.state}${fields.geography.districts?.length ? ` · ${fields.geography.districts.join(', ')}` : ''}` : null}
              confidence={scores.state ?? 0} editing={editing} onEdit={(k, v) => setCorrections(p => ({ ...p, [k]: v }))} />
            <ConfidenceBar label="Budget Range" fieldKey="budget"
              value={fields.budget?.minInr != null ? `₹${(fields.budget.minInr / 100000).toFixed(1)}L – ₹${(fields.budget.maxInr / 100000).toFixed(1)}L` : null}
              confidence={scores.budget ?? 0} editing={editing} onEdit={(k, v) => setCorrections(p => ({ ...p, [k]: v }))} />
            <ConfidenceBar label="Duration" fieldKey="durationMonths"
              value={fields.durationMonths?.value != null ? `${fields.durationMonths.value} months` : null}
              confidence={scores.durationMonths ?? 0} editing={editing} onEdit={(k, v) => setCorrections(p => ({ ...p, [k]: v }))} />
            <ConfidenceBar label="Reporting Cadence" fieldKey="reportingCadence"
              value={fields.reportingCadence?.value?.replace(/_/g, ' ')}
              confidence={scores.reportingCadence ?? 0} editing={editing} onEdit={(k, v) => setCorrections(p => ({ ...p, [k]: v }))} />
            <ConfidenceBar label="Primary KPIs" fieldKey="primaryKpis"
              value={fields.primaryKpis?.length > 0 ? fields.primaryKpis.map((k: any) => `${k.metric}${k.target ? ` (${k.target} ${k.unit ?? ''})` : ''}`).join(', ') : null}
              confidence={scores.primaryKpis ?? 0} editing={editing} onEdit={(k, v) => setCorrections(p => ({ ...p, [k]: v }))} />
          </div>
        </div>
      )}

      {/* DRM Validate Button */}
      {canValidate && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">DRM Validation</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {editing && Object.keys(corrections).length > 0
                  ? `${Object.keys(corrections).length} field(s) modified`
                  : req.status === 'NEEDS_REVIEW'
                  ? 'Review flagged fields before validating'
                  : 'Ready to validate'}
              </p>
            </div>
            <button onClick={handleValidate} disabled={validating}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              {validating ? 'Validating...' : 'Validate & Start Gap Analysis →'}
            </button>
          </div>
        </div>
      )}

      {/* Gap Report */}
      {gapReport && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Gap Analysis Report</h3>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border mb-3 ${
            gapReport.recommendation === 'PROCEED_TO_MATCHING'     ? 'bg-green-50 text-green-700 border-green-200' :
            gapReport.recommendation === 'CREATE_INITIATIVE_FIRST' ? 'bg-orange-50 text-orange-700 border-orange-200' :
            'bg-red-50 text-red-700 border-red-200'
          }`}>
            {gapReport.recommendation === 'PROCEED_TO_MATCHING' ? '✅' : '⚠'}
            {gapReport.recommendation?.replace(/_/g, ' ')}
          </div>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">{gapReport.narrative}</p>
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
          <h3 className="text-sm font-semibold text-gray-900 mb-3">🎯 AI Matched Initiatives ({req.matchCount})</h3>
          <div className="space-y-2">
            {req.topMatches?.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3 bg-purple-50 rounded-lg border border-purple-100">
                <div>
                  <span className="text-sm font-semibold text-purple-900">#{m.rank} Match</span>
                  {m.explanation && <p className="text-xs text-purple-700 mt-0.5 line-clamp-2">{m.explanation}</p>}
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ml-4 flex-shrink-0 ${
                  m.overallScore >= 70 ? 'bg-green-100 text-green-700' :
                  m.overallScore >= 50 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {m.overallScore}/100
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HUMAN GATE 1 — PM Approval — shows AFTER matching */}
      {canPMApprove && (
        <div className="bg-purple-50 rounded-xl border-2 border-purple-400 p-5 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🔐</span>
                <p className="text-sm font-bold text-purple-900">Human Gate 1 — Program Manager Approval</p>
              </div>
              <p className="text-xs text-purple-700 leading-relaxed">
                The AI Matching Agent has found <strong>{req.matchCount} initiative(s)</strong> for this donor requirement.
                A Program Manager must review the match results above and approve before the Pitch Deck Agent generates the proposal.
              </p>
              <div className="mt-2 space-y-0.5 text-xs text-purple-700">
                <p>✓ Gap analysis complete</p>
                <p>✓ {req.matchCount} initiative(s) matched by AI</p>
                <p>✓ Top match score: {req.topMatches?.[0]?.overallScore ?? '—'}/100</p>
                <p>⏳ Waiting for PM to approve before Pitch Deck generation</p>
              </div>
            </div>
            <button onClick={handlePMApprove} disabled={approving}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap ml-4 flex-shrink-0">
              {approving ? 'Approving...' : '✓ Approve & Generate Pitch Deck →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}