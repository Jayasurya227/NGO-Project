'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, api } from '@/lib/api'
import toast from 'react-hot-toast'

type Tab = 'donors' | 'initiatives'

export default function RecordsPage() {
  const [tab, setTab] = useState<Tab>('donors')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: donorsData, isLoading: loadingDonors } = useQuery({
    queryKey: ['records-donors'],
    queryFn: () => apiFetch<{ data: any[] }>('/api/donors?limit=200'),
  })

  const { data: initiativesData, isLoading: loadingInitiatives } = useQuery({
    queryKey: ['records-initiatives'],
    queryFn: () => apiFetch<{ data: any[] }>('/api/initiatives?limit=200'),
  })

  const donors = donorsData?.data ?? []
  const initiatives = initiativesData?.data ?? []
  const rows = tab === 'donors' ? donors : initiatives
  const loading = tab === 'donors' ? loadingDonors : loadingInitiatives

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await api.delete(tab === 'donors' ? `/api/donors/${id}` : `/api/initiatives/${id}`)
      }
    },
    onSuccess: () => {
      toast.success(`Deleted ${selected.size} record${selected.size > 1 ? 's' : ''}`)
      setSelected(new Set())
      setConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: ['records-donors'] })
      queryClient.invalidateQueries({ queryKey: ['records-initiatives'] })
      queryClient.invalidateQueries({ queryKey: ['initiatives'] })
    },
    onError: () => toast.error('Delete failed'),
  })

  function toggleAll() {
    if (selected.size === rows.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(rows.map((r: any) => r.id)))
    }
  }

  function toggleOne(id: string) {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  function handleTabChange(t: Tab) {
    setTab(t)
    setSelected(new Set())
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Records Manager</h1>
        <p className="text-sm text-gray-500 mt-0.5">Select records and delete them</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(['donors', 'initiatives'] as Tab[]).map(t => (
          <button key={t} onClick={() => handleTabChange(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {t === 'donors' ? 'Donors' : 'NGO Initiatives'}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">
          {selected.size > 0 ? `${selected.size} selected` : `${rows.length} records`}
        </span>
        {selected.size > 0 && (
          <button
            onClick={() => setConfirmOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Delete {selected.size} record{selected.size > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No records found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox"
                    checked={selected.size === rows.length && rows.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                </th>
                {tab === 'donors' ? (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Org Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">KYC Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NGO ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sector</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row: any) => (
                <tr key={row.id}
                  onClick={() => toggleOne(row.id)}
                  className={`cursor-pointer transition-colors ${selected.has(row.id) ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleOne(row.id)}
                      onClick={e => e.stopPropagation()}
                      className="rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                  </td>
                  {tab === 'donors' ? (
                    <>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.orgName ?? 'Individual'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.kycStatus}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{new Date(row.createdAt).toLocaleDateString()}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{row.ngoId ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.sector?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.status}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{new Date(row.createdAt).toLocaleDateString()}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm Dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-base font-bold text-gray-900 mb-2">Delete {selected.size} record{selected.size > 1 ? 's' : ''}?</h2>
            <p className="text-sm text-gray-500 mb-5">
              This will permanently delete the selected {tab === 'donors' ? 'donor(s) and all their requirements, contracts, and donations' : 'initiative(s) and all their milestones and matches'}. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(Array.from(selected))}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
