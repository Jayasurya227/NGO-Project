'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, api } from '@/lib/api'
import toast from 'react-hot-toast'

export default function DonorsPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['donors-list'],
    queryFn: () => apiFetch<{ data: any[] }>('/api/donors?limit=200'),
  })

  const donors: any[] = data?.data ?? []

  const filtered = donors.filter(d =>
    (d.orgName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.type ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete donor "${name}"?\n\nThis will also delete all their requirements, contracts, and donations. This cannot be undone.`)) return
    setDeleting(id)
    try {
      const res = await api.delete(`/api/donors/${id}`)
      if (!res.success) throw new Error(res.error?.message || 'Failed to delete')
      toast.success('Donor deleted')
      queryClient.invalidateQueries({ queryKey: ['donors-list'] })
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg text-gray-700">Loading donors...</div>
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Donors</h1>
          <p className="text-gray-800">Manage all registered donors</p>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search donors..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4 text-sm text-gray-800">
        Showing {filtered.length} of {donors.length} donors
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[200px]">Org Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[110px]">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[130px]">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-700">No donors found</td>
              </tr>
            ) : (
              filtered.map(donor => (
                <tr key={donor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{donor.orgName ?? 'Individual'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{donor.type}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(donor.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      onClick={() => handleDelete(donor.id, donor.orgName ?? 'Individual')}
                      disabled={deleting === donor.id}
                      className="text-red-600 hover:text-red-900 font-medium disabled:opacity-40"
                    >
                      {deleting === donor.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
