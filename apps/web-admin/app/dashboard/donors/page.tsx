'use client'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import { format } from 'date-fns'

export default function DonorsPage() {
  const [donors, setDonors] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/donors').then(r => {
      setDonors(r.data ?? [])
      setTotal(r.meta?.total ?? 0)
      setLoading(false)
    })
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Donors</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} total donors</p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {donors.map((donor: any) => (
                <tr key={donor.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{donor.name}</td>
                  <td className="px-4 py-3 text-gray-500">{donor.email}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {format(new Date(donor.createdAt), 'dd MMM yyyy')}
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