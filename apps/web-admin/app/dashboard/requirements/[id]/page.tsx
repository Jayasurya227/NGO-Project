'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '../../../../lib/api'
import { format } from 'date-fns'

const SECTORS = ['EDUCATION', 'HEALTHCARE', 'LIVELIHOOD', 'ENVIRONMENT', 'WATER_SANITATION', 'OTHER']
const CADENCES = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUALLY']

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
  const [resubmitting, setResubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [corrections, setCorrections] = useState<Record<string, any>>({})
  const [showResubmitForm, setShowResubmitForm] = useState(false)
  const [resubmitNote, setResubmitNote] = useState('')

  const load = useCallback(() => {
    api.get(`/api/requirements/${id}`).then(r => {
      setReq(r.data)
      setLoading(false)
      if (r.data?.extractedFields) initCorrections(r.data.extractedFields, r.data.confidenceScores)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    load()
    // Auto-poll every 5 seconds when pending or validated
    const interval = setInterval(() => {
      if (req?.status === 'PENDING_EXTRACTION' || req?.status === 'VALIDATED') load()
    }, 5000)
    return () => clearInterval(interval)
  }, [load, req?.status])

  function setCorrection(key: string, value: any) {
    setCorrections(prev => ({ ...prev, [key]: value }))
  }

  function initCorrections(f: Record<string, any>, s?: Record<string, number> | null) {
    // Only pre-fill a field if AI confidence is high (≥75%). Low-confidence fields are left
    // blank so DRM is forced to fill them in from the source document.
    const conf = (key: string) => (s?.[key] ?? 0) >= 0.75
    setCorrections({
      companyName: conf('companyName') ? (f.companyName ?? '') : '',
      sector:      conf('sector')      ? (f.sector ?? '')      : '',
      state:       conf('state')       ? (f.geography?.state ?? '') : '',
      districts:   conf('state')       ? (f.geography?.districts?.join(', ') ?? '') : '',
      budgetMin:   conf('budget') && f.budget?.minInr != null ? String(Math.round(f.budget.minInr / 100000)) : '',
      budgetMax:   conf('budget') && f.budget?.maxInr != null ? String(Math.round(f.budget.maxInr / 100000)) : '',
      durationMonths:   conf('durationMonths')   && f.durationMonths?.value != null   ? String(f.durationMonths.value) : '',
      reportingCadence: conf('reportingCadence') ? (f.reportingCadence?.value ?? '') : '',
    })
  }

  async function handleValidate() {
    setValidating(true)
    setError('')
    setSuccess('')
    try {
      // Build corrections payload from edited fields
      const correctionPayload: Record<string, any> = {}
      if (corrections.companyName !== undefined) correctionPayload.companyName = corrections.companyName || null
      if (corrections.sector) correctionPayload.sector = corrections.sector
      if (corrections.state || corrections.districts) {
        correctionPayload.geography = {
          state: corrections.state || null,
          districts: corrections.districts ? corrections.districts.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        }
      }
      if (corrections.budgetMin || corrections.budgetMax) {
        correctionPayload.budget = {
          minInr: corrections.budgetMin ? parseFloat(corrections.budgetMin) * 100000 : null,
          maxInr: corrections.budgetMax ? parseFloat(corrections.budgetMax) * 100000 : null,
        }
      }
      if (corrections.durationMonths) correctionPayload.durationMonths = { value: parseInt(corrections.durationMonths) }
      if (corrections.reportingCadence) correctionPayload.reportingCadence = { value: corrections.reportingCadence }

      const res = await api.post(`/api/requirements/${id}/validate`, {
        corrections: Object.keys(correctionPayload).length > 0 ? correctionPayload : undefined,
      })
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

  async function handleResubmit() {
    setResubmitting(true)
    setError('')
    setSuccess('')
    try {
      const res = await api.post(`/api/requirements/${id}/request-resubmission`, { note: resubmitNote })
      if (res.success) {
        setSuccess('📨 Resubmission request sent. Donor has been notified.')
        setShowResubmitForm(false)
        setResubmitNote('')
        load()
      } else {
        setError(res.error?.message ?? 'Request failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setResubmitting(false)
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

  // Returns red border style when AI confidence is low for a score key
  const lowConf = (key: string) => (scores?.[key] ?? 0) < 0.75
  const inputCls = (key: string) =>
    `w-full border rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
      lowConf(key)
        ? 'border-red-300 bg-red-50 focus:ring-red-400'
        : 'border-gray-200 focus:ring-blue-500'
    }`

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => router.push('/dashboard/requirements')} className="text-xs text-gray-400 hover:text-blue-600 mb-2 flex items-center gap-1">
            ← Back to Requirements
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {req.extractedFields?.companyName || req.donor?.orgName || 'Individual Donor'} — Requirement
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
        <div className="grid grid-cols-2 gap-3 text-sm text-gray-900">
          <div><p className="text-xs text-gray-600 mb-0.5">Donor</p><p className="font-medium">{fields?.companyName || req.donor?.orgName || 'Individual'}</p></div>
          <div><p className="text-xs text-gray-600 mb-0.5">Donor Type</p><p className="font-medium">{req.donor?.type ?? '—'}</p></div>
          <div><p className="text-xs text-gray-600 mb-0.5">Document Uploaded</p><p className="font-medium">{req.rawDocumentUrl ? '📄 Yes' : '— None'}</p></div>
          <div><p className="text-xs text-gray-600 mb-0.5">Created</p><p className="font-medium">{format(new Date(req.createdAt), 'dd MMM yyyy HH:mm')}</p></div>
          {req.latestJob && <div><p className="text-xs text-gray-600 mb-0.5">Agent Status</p><p className="font-medium">{req.latestJob.status}{req.latestJob.latencyMs ? ` (${(req.latestJob.latencyMs / 1000).toFixed(1)}s)` : ''}</p></div>}
        </div>
      </div>

      {/* Document Text — DRM reads this to verify/fill low-confidence fields */}
      {canValidate && (
        <div className="mb-4 bg-white rounded-xl border border-blue-200 overflow-hidden">
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-200 flex items-center gap-2">
            <span className="text-sm font-bold text-blue-900">📄 Original CSR Document</span>
            <span className="text-xs text-blue-600">— Uploaded by the CSR donor</span>
          </div>
          <div className="px-5 py-4">
            {fields?.rawText ? (
              <pre className="text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto max-h-80 whitespace-pre-wrap font-mono leading-relaxed">
                {fields.rawText}
              </pre>
            ) : req.rawDocumentUrl ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-800">
                  File uploaded by donor: <span className="text-blue-700 font-mono text-xs">{req.rawDocumentUrl.replace('uploaded:', '')}</span>
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-1">
                  <p className="text-xs font-semibold text-red-700">⚠ Text extraction failed for this document</p>
                  <p className="text-xs text-red-600">The PDF could not be read (likely scanned/image-based). You have two options:</p>
                  <ul className="text-xs text-red-600 list-disc list-inside mt-1 space-y-0.5">
                    <li><strong>Option A:</strong> Fill in the correction form below manually</li>
                    <li><strong>Option B:</strong> Click <em>Request Resubmission</em> — the donor will be asked to re-upload a text-based or clearer document</li>
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No document uploaded — manual form submission. Fill the correction form below using any available information.</p>
            )}
          </div>
        </div>
      )}

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

      {/* Match Results Section */}
      {req.status === 'MATCHED' && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-4 shadow-sm shadow-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                🎯 {req.matchCount ?? 0} Initiative Matches Found
              </h3>
              <p className="text-xs text-purple-700 mt-1">
                AI has ranked the best initiatives for this requirement. Review the score breakdown and approve matches to proceed.
              </p>
            </div>
            <button
              onClick={() => router.push(`/dashboard/requirements/${id}/matches`)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all flex-shrink-0"
            >
              View Full Match Results & Breakdown →
            </button>
          </div>
        </div>
      )}

      {/* DRM Correction Form + Actions */}
      {canValidate && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">DRM Correction Form</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Fields with <span className="text-red-600 font-medium">red border are left blank</span> (low AI confidence) — read the <span className="font-medium text-blue-700">Original CSR Document above</span> and fill them in. Green-border fields are pre-filled by AI but can be edited.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Company Name */}
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center gap-1">
                <span className={lowConf('companyName') ? 'text-red-600' : 'text-gray-500'}>Company / Donor Name</span>
                {lowConf('companyName') && <span className="text-red-500 text-[10px] font-bold">● Fill required</span>}
              </label>
              <input
                type="text"
                value={corrections.companyName ?? ''}
                onChange={e => setCorrection('companyName', e.target.value)}
                placeholder={lowConf('companyName') ? 'Read document above and enter company name' : 'e.g. Infosys Foundation'}
                className={inputCls('companyName')}
              />
            </div>

            {/* Sector */}
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center gap-1">
                <span className={lowConf('sector') ? 'text-red-600' : 'text-gray-500'}>Sector</span>
                {lowConf('sector') && <span className="text-red-500 text-[10px] font-bold">● Fill required</span>}
              </label>
              <select
                value={corrections.sector ?? ''}
                onChange={e => setCorrection('sector', e.target.value)}
                className={inputCls('sector') + ' bg-white'}
              >
                <option value="">{lowConf('sector') ? '— Select sector from document —' : '— Keep AI value —'}</option>
                {SECTORS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center gap-1">
                <span className={lowConf('state') ? 'text-red-600' : 'text-gray-500'}>State</span>
                {lowConf('state') && <span className="text-red-500 text-[10px] font-bold">● Fill required</span>}
              </label>
              <input
                type="text"
                value={corrections.state ?? ''}
                onChange={e => setCorrection('state', e.target.value)}
                placeholder={lowConf('state') ? 'Read document above and enter state' : 'e.g. Maharashtra'}
                className={inputCls('state')}
              />
            </div>

            {/* Districts */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Districts (comma-separated)</label>
              <input
                type="text"
                value={corrections.districts ?? ''}
                onChange={e => setCorrection('districts', e.target.value)}
                placeholder="e.g. Pune, Nashik"
                className={inputCls('state')}
              />
            </div>

            {/* Budget Min */}
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center gap-1">
                <span className={lowConf('budget') ? 'text-red-600' : 'text-gray-500'}>Min Budget (₹ Lakhs)</span>
                {lowConf('budget') && <span className="text-red-500 text-[10px] font-bold">● Fill required</span>}
              </label>
              <input
                type="number"
                value={corrections.budgetMin ?? ''}
                onChange={e => setCorrection('budgetMin', e.target.value)}
                placeholder={lowConf('budget') ? 'Enter min budget from document' : 'e.g. 10'}
                min={0}
                className={inputCls('budget')}
              />
            </div>

            {/* Budget Max */}
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center gap-1">
                <span className={lowConf('budget') ? 'text-red-600' : 'text-gray-500'}>Max Budget (₹ Lakhs)</span>
                {lowConf('budget') && <span className="text-red-500 text-[10px] font-bold">● Fill required</span>}
              </label>
              <input
                type="number"
                value={corrections.budgetMax ?? ''}
                onChange={e => setCorrection('budgetMax', e.target.value)}
                placeholder={lowConf('budget') ? 'Enter max budget from document' : 'e.g. 50'}
                min={0}
                className={inputCls('budget')}
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center gap-1">
                <span className={lowConf('durationMonths') ? 'text-red-600' : 'text-gray-500'}>Duration (months)</span>
                {lowConf('durationMonths') && <span className="text-red-500 text-[10px] font-bold">● Fill required</span>}
              </label>
              <input
                type="number"
                value={corrections.durationMonths ?? ''}
                onChange={e => setCorrection('durationMonths', e.target.value)}
                placeholder={lowConf('durationMonths') ? 'Enter duration from document' : 'e.g. 12'}
                min={1}
                className={inputCls('durationMonths')}
              />
            </div>

            {/* Reporting Cadence */}
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center gap-1">
                <span className={lowConf('reportingCadence') ? 'text-red-600' : 'text-gray-500'}>Reporting Cadence</span>
                {lowConf('reportingCadence') && <span className="text-red-500 text-[10px] font-bold">● Fill required</span>}
              </label>
              <select
                value={corrections.reportingCadence ?? ''}
                onChange={e => setCorrection('reportingCadence', e.target.value)}
                className={inputCls('reportingCadence') + ' bg-white'}
              >
                <option value="">{lowConf('reportingCadence') ? '— Select from document —' : '— Keep AI value —'}</option>
                {CADENCES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              onClick={() => setShowResubmitForm(v => !v)}
              className="text-sm text-orange-600 hover:text-orange-800 font-medium border border-orange-200 bg-orange-50 px-4 py-2 rounded-lg transition-colors"
            >
              📨 Request Resubmission
            </button>
            <button
              onClick={handleValidate}
              disabled={validating}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {validating ? 'Validating...' : 'Validate & Start Gap Analysis →'}
            </button>
          </div>

          {/* Resubmission form */}
          {showResubmitForm && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-orange-800">Request Resubmission from Donor</p>
              <p className="text-xs text-orange-900">
                This will notify the donor that their document needs to be resubmitted. The requirement status will reset to Pending Extraction.
              </p>
              <textarea
                value={resubmitNote}
                onChange={e => setResubmitNote(e.target.value)}
                placeholder="Optional: explain what needs to be corrected or clarified in the resubmission..."
                rows={3}
                className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowResubmitForm(false)}
                  className="text-sm text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-200 bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResubmit}
                  disabled={resubmitting}
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {resubmitting ? 'Sending...' : 'Send Resubmission Request'}
                </button>
              </div>
            </div>
          )}
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