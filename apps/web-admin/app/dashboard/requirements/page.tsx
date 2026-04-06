'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../../lib/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const STATUS_COLOURS: Record<string, string> = {
  PENDING_EXTRACTION: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  EXTRACTED:          'bg-blue-50 text-blue-700 border-blue-200',
  NEEDS_REVIEW:       'bg-orange-50 text-orange-700 border-orange-200',
  VALIDATED:          'bg-green-50 text-green-700 border-green-200',
  MATCHED:            'bg-purple-50 text-purple-700 border-purple-200',
  CONTRACTED:         'bg-indigo-50 text-indigo-700 border-indigo-200',
  CLOSED:             'bg-gray-50 text-gray-600 border-gray-200',
  REJECTED:           'bg-red-50 text-red-700 border-red-200',
}

const ACTION_NEEDED = ['EXTRACTED', 'NEEDS_REVIEW']
const AI_RUNNING   = ['PENDING_EXTRACTION', 'VALIDATED']
const COMPLETED    = ['MATCHED', 'CONTRACTED', 'CLOSED']

function detectType(req: any): 'NGO' | 'Donor' {
  const url  = (req.rawDocumentUrl ?? '').toLowerCase()
  const name = (req.donor?.orgName ?? '').toLowerCase()
  if (url.includes('ngo') || url.includes('initiative')) return 'NGO'
  if (url.includes('donor') || url.includes('rfp') || url.includes('requirement')) return 'Donor'
  if (
    name.includes('programme') || name.includes('program') ||
    name.includes('initiative') || name.includes('literacy') ||
    name.includes('health') || name.includes('water') ||
    name.includes('rural') || name.includes('village')
  ) return 'NGO'
  return 'Donor'
}

export default function RequirementsPage() {
  const router = useRouter()
  const [requirements, setRequirements] = useState<any[]>([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState<'all' | 'action' | 'running' | 'done'>('all')
  const [deleting, setDeleting]         = useState<string | null>(null)

  function loadRequirements() {
    api.get('/api/requirements?limit=100').then(r => {
      setRequirements(r.data?.requirements ?? [])
      setTotal(r.data?.total ?? 0)
      setLoading(false)
    })
  }

  useEffect(() => { loadRequirements() }, [])

  async function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation()
    if (!window.confirm(`Delete requirement "${name}"?\n\nThis cannot be undone.`)) return
    setDeleting(id)
    try {
      const res = await api.delete(`/api/requirements/${id}`)
      if (!res.success) throw new Error(res.error?.message || 'Failed to delete')
      toast.success('Requirement deleted')
      setRequirements(prev => prev.filter(r => r.id !== id))
      setTotal(prev => prev - 1)
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = requirements.filter(r => {
    if (filter === 'action')  return ACTION_NEEDED.includes(r.status)
    if (filter === 'running') return AI_RUNNING.includes(r.status)
    if (filter === 'done')    return COMPLETED.includes(r.status)
    return true
  })

  const actionCount  = requirements.filter(r => ACTION_NEEDED.includes(r.status)).length
  const runningCount = requirements.filter(r => AI_RUNNING.includes(r.status)).length
  const doneCount    = requirements.filter(r => COMPLETED.includes(r.status)).length

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">DRM Workspace</h2>
        <p className="text-sm text-gray-700 mt-0.5">
          Review and validate CSR submissions through AI extraction → DRM approval → Gap analysis → Initiative matching
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5 text-xs text-gray-800">
        <strong>How this works:</strong> When a Donor or NGO submits a form or document, the Extraction
        Agent reads it and pulls out sector, geography, budget and KPIs. The DRM (you) reviews the
        confidence scores and clicks <strong>Validate</strong>. The Gap Diagnoser then runs, followed by
        the Matching Agent which finds the best NGO initiatives for each donor requirement.
      </div>

      {/* Pipeline stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <button onClick={() => setFilter('all')}
          className={`rounded-xl border p-3 text-left transition-all ${filter === 'all' ? 'border-gray-400 bg-white shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-700 mt-0.5">All Submissions</p>
        </button>
        <button onClick={() => setFilter('running')}
          className={`rounded-xl border p-3 text-left transition-all ${filter === 'running' ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:bg-blue-50'}`}>
          <p className="text-2xl font-bold text-blue-600">{runningCount}</p>
          <p className="text-xs text-blue-600 mt-0.5 font-medium">⏳ AI Running</p>
        </button>
        <button onClick={() => setFilter('done')}
          className={`rounded-xl border p-3 text-left transition-all ${filter === 'done' ? 'border-purple-400 bg-purple-50 shadow-sm' : 'border-gray-200 bg-white hover:bg-purple-50'}`}>
          <p className="text-2xl font-bold text-purple-600">{doneCount}</p>
          <p className="text-xs text-purple-600 mt-0.5 font-medium">✅ Matched / Done</p>
        </button>
      </div>

      {actionCount > 0 && (filter === 'all' || filter === 'action') && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <span className="text-lg">⚠</span>
          <div>
            <p className="text-sm font-semibold text-orange-800">
              {actionCount} submission{actionCount > 1 ? 's' : ''} need your review
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              Click a row with status EXTRACTED or NEEDS REVIEW to review confidence scores and validate
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm font-medium text-gray-700">
            {filter === 'action' ? 'No submissions need DRM action right now' :
             filter === 'running' ? 'No AI jobs currently running' :
             filter === 'done'   ? 'No completed submissions yet' :
             'No submissions yet'}
          </p>
          <p className="text-xs text-gray-700 mt-1">
            Go to Agent Jobs to submit a donor requirement or NGO initiative
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase">Submitted By</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase">Sector</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase">Geography</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase">Budget</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase">Pipeline Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase">DRM Action</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase">Submitted</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((req: any) => {
                const fields      = req.extractedFields as any
                const needsAction = ACTION_NEEDED.includes(req.status)
                const subType     = detectType(req)
                return (
                  <tr
                    key={req.id}
                    onClick={() => router.push(`/dashboard/requirements/${req.id}`)}
                    className={`transition-colors cursor-pointer ${needsAction ? 'hover:bg-orange-50 bg-orange-50/30' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{fields?.companyName || req.donor?.orgName || 'Unknown'}</p>
                      {req.rawDocumentUrl && (
                        <p className="text-[10px] text-gray-600 mt-0.5 font-mono">
                          📄 {req.rawDocumentUrl.replace('uploaded:', '')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-md border ${
                        subType === 'NGO'
                          ? 'text-green-700 border-green-300'
                          : 'text-blue-700 border-blue-300'
                      }`}>
                        {subType === 'NGO' ? '🏛 NGO' : '🏢 Donor / CSR'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {fields?.sector ? (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                          {fields.sector.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {fields?.geography?.state
                        ? `${fields.geography.state}${fields.geography.districts?.length ? `, ${fields.geography.districts[0]}` : ''}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 font-medium">
                      {fields?.budget?.minInr != null
                        ? `₹${(fields.budget.minInr / 100000).toFixed(1)}L – ₹${(fields.budget.maxInr / 100000).toFixed(1)}L`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${STATUS_COLOURS[req.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {req.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {req.status === 'EXTRACTED' && (
                        <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg">
                          ✍ Review & Validate
                        </span>
                      )}
                      {req.status === 'NEEDS_REVIEW' && (
                        <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                          ⚠ Click row → Fill correction form
                        </span>
                      )}
                      {req.status === 'PENDING_EXTRACTION' && (
                        <span className="text-xs text-yellow-600">⏳ Extraction running...</span>
                      )}
                      {req.status === 'VALIDATED' && (
                        <span className="text-xs text-green-600">⏳ Gap Diagnoser running...</span>
                      )}
                      {req.status === 'MATCHED' && (
                        <span className="text-xs font-semibold text-purple-600">🎯 View matches →</span>
                      )}
                      {req.status === 'CONTRACTED' && (
                        <span className="text-xs text-indigo-600">📄 Contracted</span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                          ❌ No fields matched — invalid document
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {format(new Date(req.createdAt), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => handleDelete(e, req.id, fields?.companyName || req.donor?.orgName || req.id)}
                        disabled={deleting === req.id}
                        className="text-red-600 hover:text-red-900 text-xs font-medium disabled:opacity-40">
                        {deleting === req.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}