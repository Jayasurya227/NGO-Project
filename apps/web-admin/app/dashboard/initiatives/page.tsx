'use client'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import { format } from 'date-fns'

const SECTOR_COLOURS: Record<string, string> = {
  EDUCATION:        'bg-blue-100 text-blue-700',
  HEALTHCARE:       'bg-red-100 text-red-700',
  LIVELIHOOD:       'bg-green-100 text-green-700',
  ENVIRONMENT:      'bg-emerald-100 text-emerald-700',
  WATER_SANITATION: 'bg-cyan-100 text-cyan-700',
  OTHER:            'bg-gray-100 text-gray-700',
}

const FUNDING_COLOURS: Record<string, string> = {
  FULLY_UNFUNDED:   'bg-red-50 text-red-700 border-red-200',
  PARTIALLY_FUNDED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  FULLY_MATCHED:    'bg-green-50 text-green-700 border-green-200',
}

export default function InitiativesPage() {
  const [initiatives, setInitiatives] = useState<any[]>([])
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState<any>(null)

  useEffect(() => {
    api.get('/api/initiatives?limit=50').then(r => {
      setInitiatives(r.data ?? [])
      setTotal(r.meta?.total ?? 0)
      setLoading(false)
    })
  }, [])

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">NGO Initiatives</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          NGO programs available for CSR donor matching
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5 text-xs text-green-700">
        <strong>What is an NGO Initiative?</strong> These are programs submitted by NGOs that need CSR funding.
        The Matching Agent compares donor requirements against these initiatives using AI vector search and weighted scoring.
        Each initiative has an embedding vector that enables semantic matching.
      </div>

      <div className="flex gap-6">
        {/* Initiatives table */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : initiatives.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <p className="text-2xl mb-2">🎯</p>
              <p className="text-sm font-medium text-gray-700">No NGO initiatives yet</p>
              <p className="text-xs text-gray-400 mt-1">Submit an initiative via Agent Jobs to add it to the matching pool</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  🎯 NGO Initiatives — {total} programs in matching pool
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Initiative Title</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Sector</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Budget Needed</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Beneficiaries</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Funding Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">AI Embedding</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {initiatives.map((item: any) => (
                    <tr key={item.id}
                      onClick={() => setSelected(selected?.id === item.id ? null : item)}
                      className="hover:bg-green-50 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 max-w-xs truncate">{item.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">ID: {item.id.slice(0, 8)}...</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${SECTOR_COLOURS[item.sector] ?? 'bg-gray-100 text-gray-700'}`}>
                          {item.sector?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {(item.geography as any)?.state ?? '—'}
                        {(item.geography as any)?.district && `, ${(item.geography as any).district}`}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 font-medium">
                        {item.budgetRequired
                          ? `₹${(Number(item.budgetRequired) / 100000).toFixed(1)}L`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {item.targetBeneficiaries?.toLocaleString() ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${FUNDING_COLOURS[item.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {item.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.embeddingVector ? (
                          <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">✓ Ready</span>
                        ) : (
                          <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">⏳ Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {format(new Date(item.createdAt), 'dd MMM yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Initiative Details</h3>
                <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-700">✕</button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase font-medium mb-1">Title</p>
                  <p className="font-semibold text-gray-900 text-xs leading-relaxed">{selected.title}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase font-medium mb-1">Description</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{selected.description ?? '—'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Sector</p>
                    <p className="text-xs font-semibold text-gray-800">{selected.sector?.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Location</p>
                    <p className="text-xs text-gray-800">{(selected.geography as any)?.state ?? '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Budget</p>
                    <p className="text-xs font-semibold text-gray-800">
                      {selected.budgetRequired ? `₹${(Number(selected.budgetRequired) / 100000).toFixed(1)}L` : '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Beneficiaries</p>
                    <p className="text-xs font-semibold text-gray-800">{selected.targetBeneficiaries?.toLocaleString() ?? '—'}</p>
                  </div>
                </div>
                {selected.sdgTags?.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 uppercase font-medium mb-2">SDG Alignment</p>
                    <div className="flex flex-wrap gap-1">
                      {selected.sdgTags.map((tag: string) => (
                        <span key={tag} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">AI Embedding Status</p>
                  <p className={`text-xs font-semibold ${selected.embeddingVector ? 'text-green-700' : 'text-orange-600'}`}>
                    {selected.embeddingVector
                      ? '✓ Vector ready — eligible for AI matching'
                      : '⏳ Embedding pending — not yet in matching pool'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}