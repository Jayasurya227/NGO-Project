'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../../lib/api'
import { format } from 'date-fns'

export default function RequirementsPage() {
  const router = useRouter()
  const [requirements, setRequirements] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/requirements').then(r => {
      setRequirements(r.data ?? [])
      setTotal(r.meta?.total ?? 0)
      setLoading(false)
    })
  }, [])

  const statusColors: Record<string, string> = {
    PENDING_EXTRACTION: 'bg-yellow-100 text-yellow-700',
    EXTRACTED:          'bg-blue-100 text-blue-700',
    VALIDATED:          'bg-green-100 text-green-700',
    NEEDS_REVIEW:       'bg-red-100 text-red-700',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Requirements</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} total requirements</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/requirements/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Upload RFP
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requirements.map((req: any) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{req.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[req.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {req.status ?? 'PENDING'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {format(new Date(req.createdAt), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/dashboard/requirements/${req.id}`)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}