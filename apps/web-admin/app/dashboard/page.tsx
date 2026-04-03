'use client'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Users, FileText, Landmark, BrainCircuit } from 'lucide-react'

const AGENT_COUNT = 4

export default function DashboardPage() {
  const [donors, setDonors]             = useState(0)
  const [requirements, setRequirements] = useState(0)
  const [initiatives, setInitiatives]   = useState(0)

  useEffect(() => {
    api.get('/api/donors').then(r => setDonors(r.meta?.total ?? 0)).catch(() => {})
    api.get('/api/requirements').then(r => setRequirements(r.meta?.total ?? 0)).catch(() => {})
    api.get('/api/initiatives').then(r => setInitiatives(r.meta?.total ?? 0)).catch(() => {})
  }, [])

  const stats = [
    { label: 'Total Donors',    value: donors,       icon: Users,        color: 'bg-blue-50 text-blue-700' },
    { label: 'Requirements',    value: requirements, icon: FileText,     color: 'bg-purple-50 text-purple-700' },
    { label: 'NGO Initiatives', value: initiatives,  icon: Landmark,     color: 'bg-green-50 text-green-700' },
    { label: 'AI Agents',       value: AGENT_COUNT,  icon: BrainCircuit, color: 'bg-amber-50 text-amber-700' },
  ]

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Dashboard</h2>
      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-1">Quick start</h3>
        <p className="text-sm text-gray-500">Use <strong>Agent Jobs</strong> in the sidebar to upload donor documents or NGO initiative files and start the AI pipeline.</p>
      </div>
    </div>
  )
}
