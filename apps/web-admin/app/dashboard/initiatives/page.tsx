'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, api } from '@/lib/api'
import { getSession } from '@/lib/auth'


const SDG_MAP: Record<string, string> = {
  'NO_POVERTY': 'SDG 1: No Poverty',
  'ZERO_HUNGER': 'SDG 2: Zero Hunger',
  'GOOD_HEALTH': 'SDG 3: Good Health',
  'QUALITY_EDUCATION': 'SDG 4: Quality Education',
  'GENDER_EQUALITY': 'SDG 5: Gender Equality',
  'CLEAN_WATER': 'SDG 6: Clean Water',
  'REDUCED_INEQUALITY': 'SDG 10: Reduced Inequality'
};

const SECTOR_MAP: Record<string, string> = {
  'EDUCATION': 'Education',
  'HEALTHCARE': 'Healthcare',
  'LIVELIHOOD': 'Livelihood',
  'INFRASTRUCTURE': 'Infrastructure',
  'ENVIRONMENT': 'Environment',
  'WATER_SANITATION': 'Water & Sanitation',
  'WOMEN_EMPOWERMENT': 'Women Empowerment',
  'CHILD_WELFARE': 'Child Welfare'
};

interface Initiative {
  id: string
  title: string
  description: string
  status: string
  sector: string
  budgetRequired: number
  budgetFunded: number
  startDate: string
  endDate: string
  sdgTags: string[]
  createdAt: string
}

interface CreateInitiativeForm {
  title: string
  description: string
  sector: string
  budgetRequired: string
  startDate: string
  endDate: string
  beneficiaryCount: string
  location: string
  sdgTags: string[]
}

export default function InitiativesPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState<CreateInitiativeForm>({
    title: '',
    description: '',
    sector: 'EDUCATION',
    budgetRequired: '',
    startDate: '',
    endDate: '',
    beneficiaryCount: '',
    location: '',
    sdgTags: ['QUALITY_EDUCATION'],
  })
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['initiatives'],
    queryFn:  () => apiFetch<{ data: Initiative[] }>('/api/initiatives')
  })


  const initiatives = data?.data || []



  const handleCreateInitiative = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const session = getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        sector: formData.sector,
        budgetRequired: parseFloat(formData.budgetRequired),
        startDate: formData.startDate,
        endDate: formData.endDate,
        targetBeneficiaries: parseInt(formData.beneficiaryCount),
        geography: {
          state: formData.location,
          lat: 0,
          lng: 0,
        },
        sdgTags: formData.sdgTags,
      };
      const res = await api.post('/api/initiatives', payload)

      if (!res.success) {
        throw new Error(res.error?.message || 'Failed to create initiative')
      }


      // Reset form and close modal
      setFormData({
        title: '',
        description: '',
        sector: 'EDUCATION',
        budgetRequired: '',
        startDate: '',
        endDate: '',
        beneficiaryCount: '',
        location: '',
        sdgTags: ['QUALITY_EDUCATION'],
      })
      setShowCreateModal(false)

      // Refresh the initiatives list
      await refetch()

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create initiative')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteInitiative = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this initiative? This will also delete all associated milestones.')) {
      return
    }

    try {
      const res = await api.delete(`/api/initiatives/${id}`)
      if (!res.success) {
        throw new Error(res.error?.message || 'Failed to delete initiative')
      }
      await refetch()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete initiative')
    }
  }

  const filteredInitiatives = initiatives.filter(initiative =>
    initiative.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    initiative.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading initiatives...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {(error as Error).message}</div>
      </div>
    )
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Initiatives</h1>
          <p className="text-gray-600">Manage and track all NGO initiatives</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          + Create Initiative
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search initiatives..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Initiatives Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredInitiatives.length} of {initiatives.length} initiatives
      </div>

      {/* Initiatives Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Focused Area
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SDG Tags
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Budget
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInitiatives.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No initiatives found
                </td>
              </tr>
            ) : (
              filteredInitiatives.map((initiative) => (
                <tr key={initiative.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {initiative.title}
                    </div>
                    <div className="text-sm text-gray-500 truncate max-w-[200px]">
                      {initiative.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      initiative.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      initiative.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      initiative.status === 'COMPLETED' ? 'bg-indigo-100 text-indigo-800' :
                      initiative.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {initiative.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                    {SECTOR_MAP[initiative.sector] || initiative.sector}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {initiative.sdgTags?.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100">
                          {SDG_MAP[tag] || tag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{initiative.budgetRequired?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {initiative.startDate ? new Date(initiative.startDate).toLocaleDateString() : 'TBD'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => router.push(`/dashboard/initiatives/${initiative.id}`)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      View
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/initiatives/${initiative.id}`)}
                      className="text-green-600 hover:text-green-900 font-medium mr-4"
                    >
                      Milestones
                    </button>
                    <button
                      onClick={() => handleDeleteInitiative(initiative.id)}
                      className="text-red-600 hover:text-red-900 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Initiative Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Create New Initiative</h2>
            </div>

            <form onSubmit={handleCreateInitiative} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Rural Education Program"
                  />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  minLength={10}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the initiative goals and activities (min 10 chars)..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sector *
                  </label>
                  <select
                    required
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="EDUCATION">Education</option>
                    <option value="HEALTHCARE">Healthcare</option>
                    <option value="LIVELIHOOD">Livelihood</option>
                    <option value="INFRASTRUCTURE">Infrastructure</option>
                    <option value="ENVIRONMENT">Environment</option>
                    <option value="WATER_SANITATION">Water & Sanitation</option>
                    <option value="WOMEN_EMPOWERMENT">Women Empowerment</option>
                    <option value="CHILD_WELFARE">Child Welfare</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Required (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.budgetRequired}
                    onChange={(e) => setFormData({ ...formData, budgetRequired: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 500000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Rural Karnataka"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SDG Focus Areas
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SDG_MAP).map(([id, label]) => {
                    const selected = formData.sdgTags.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          const newTags = selected 
                            ? formData.sdgTags.filter(t => t !== id)
                            : [...formData.sdgTags, id];
                          setFormData({ ...formData, sdgTags: newTags });
                        }}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                          selected 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setFormData({
                      title: '',
                      description: '',
                      sector: 'EDUCATION',
                      budgetRequired: '',
                      startDate: '',
                      endDate: '',
                      beneficiaryCount: '',
                      location: '',
                      sdgTags: ['QUALITY_EDUCATION'],
                    })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Initiative'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
