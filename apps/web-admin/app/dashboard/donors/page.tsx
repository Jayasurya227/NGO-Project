'use client'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import { format } from 'date-fns'

export default function DonorsPage() {
  const [donors, setDonors]               = useState<any[]>([])
  const [total, setTotal]                 = useState(0)
  const [loading, setLoading]             = useState(true)
  const [selected, setSelected]           = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    api.get('/api/donors?limit=100').then(r => {
      const real = (r.data ?? []).filter((d: any) =>
        d.orgName !== 'Document Upload' &&
        d.orgName !== 'NGO Upload' &&
        !d.email?.includes('@upload.internal') &&
        !d.email?.includes('@document.upload')
      )
      setDonors(real)
      setTotal(real.length)
      setLoading(false)
    })
  }, [])

  async function viewPII(id: string) {
    setDetailLoading(true)
    const r = await api.get(`/api/donors/${id}`)
    setSelected(r.data)
    setDetailLoading(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Donors</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Corporate CSR and individual donors registered on the platform
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 text-xs text-blue-700">
        <strong>What is a Donor?</strong> A donor is a corporate (CSR) or individual entity that wants
        to fund NGO initiatives. Their RFP requirements are submitted via Agent Jobs and processed by
        the AI pipeline. Click <strong>🔒 View PII →</strong> to see their confidential contact details.
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : donors.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <p className="text-2xl mb-2">🤝</p>
              <p className="text-sm font-medium text-gray-700">No donors yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Submit a donor requirement via Agent Jobs to register a donor
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  🤝 Donors — {total} registered
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Donor Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">KYC Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Registered On</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Confidential PII</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {donors.map((donor: any) => (
                    <tr key={donor.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{donor.orgName ?? 'Individual Donor'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">ID: {donor.id.slice(0, 8)}...</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${
                          donor.type === 'CSR' ? 'text-blue-700' : 'text-purple-700'
                        }`}>
                          {donor.type === 'CSR' ? '🏢 CSR' : '👤 Individual'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          donor.kycStatus === 'VERIFIED'
                            ? 'bg-green-50 text-green-700'
                            : donor.kycStatus === 'PENDING'
                            ? 'bg-yellow-50 text-yellow-700'
                            : 'bg-gray-50 text-gray-500'
                        }`}>
                          {donor.kycStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {format(new Date(donor.createdAt), 'dd MMM yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => viewPII(donor.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                          🔒 View PII →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PII Panel */}
        {selected && (
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">🔒 Donor PII</h3>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs text-gray-400 hover:text-gray-700">
                  ✕ Close
                </button>
              </div>
              {detailLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Organisation</p>
                    <p className="font-semibold text-gray-900">{selected.orgName ?? 'Individual'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Type</p>
                    <p className={`font-semibold text-sm ${
                      selected.type === 'CSR' ? 'text-blue-700' : 'text-purple-700'
                    }`}>
                      {selected.type === 'CSR' ? '🏢 CSR' : '👤 Individual'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Contact Name</p>
                    <p className="text-gray-800">{selected.contactName}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Email Address</p>
                    <p className="text-gray-800">{selected.email}</p>
                  </div>
                  {selected.phone && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Phone</p>
                      <p className="text-gray-800">{selected.phone}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">KYC Status</p>
                    <p className="text-gray-800 text-xs font-medium">{selected.kycStatus}</p>
                  </div>
                  <div className="pt-2 border-t border-gray-100 text-xs text-gray-400 text-center">
                    🔒 PII decrypted server-side. Never stored in browser.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}