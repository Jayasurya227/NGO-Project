'use client'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import { format } from 'date-fns'

export default function AgentJobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 5000)
    return () => clearInterval(interval)
  }, [])

  function fetchJobs() {
    api.get('/api/agents/jobs').then(r => {
      setJobs(r.data ?? [])
      setTotal(r.meta?.total ?? 0)
      setLoading(false)
    })
  }

  const statusColors: Record<string, string> = {
    QUEUED:    'bg-gray-100 text-gray-600',
    RUNNING:   'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    FAILED:    'bg-red-100 text-red-700',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Agent Jobs</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} total jobs — auto-refreshes every 5s</p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
          No agent jobs yet — upload an RFP to trigger the first job
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Job ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Agent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Latency</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job: any) => (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{job.jobId.slice(0, 16)}...</td>
                  <td className="px-4 py-3 text-gray-700">{job.agentName ?? 'unknown'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[job.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {job.latencyMs ? `${(job.latencyMs / 1000).toFixed(1)}s` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {format(new Date(job.createdAt), 'dd MMM HH:mm')}
                  </td>
                  <td className="px-4 py-3 text-red-500 text-xs">
                    {job.error ?? '—'}
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