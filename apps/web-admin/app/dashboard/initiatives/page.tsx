'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, api } from '@/lib/api'

const SECTOR_MAP: Record<string, string> = {
  'EDUCATION': 'Education',
  'HEALTHCARE': 'Healthcare',
  'LIVELIHOOD': 'Livelihood',
  'INFRASTRUCTURE': 'Infrastructure',
  'ENVIRONMENT': 'Environment',
  'WATER_SANITATION': 'Water & Sanitation',
  'WOMEN_EMPOWERMENT': 'Women Empowerment',
  'CHILD_WELFARE': 'Child Welfare'
}

const SECTORS = ['EDUCATION', 'HEALTHCARE', 'LIVELIHOOD', 'ENVIRONMENT', 'WATER_SANITATION', 'INFRASTRUCTURE', 'WOMEN_EMPOWERMENT', 'CHILD_WELFARE', 'OTHER']


type Mode = 'manual' | 'upload'

function getToken(): string {
  try {
    const raw = localStorage.getItem('admin_session')
    if (!raw) return ''
    return JSON.parse(raw)?.accessToken ?? ''
  } catch { return '' }
}

const Err = ({ msg }: { msg?: string }) => msg ? <p className="text-red-500 text-xs mt-1">{msg}</p> : null

function Section({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="bg-green-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold flex-shrink-0">{num}</span>
        {title}
      </h3>
      {children}
    </div>
  )
}

function FileUploadBox({ file, setFile }: { file: File | null; setFile: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className={`bg-white rounded-xl border-2 p-5 ${file ? 'border-green-400' : 'border-dashed border-gray-300'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Upload NGO Initiative Document</h3>
          <p className="text-xs text-gray-700 mt-0.5">AI will extract all details automatically</p>
        </div>
        {file && <button type="button" onClick={() => setFile(null)} className="text-xs text-red-500 hover:text-red-700 ml-4">Remove ✕</button>}
      </div>
      <div onClick={() => ref.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-300 hover:bg-green-50'}`}>
        {file ? (
          <div>
            <p className="text-3xl mb-2">📄</p>
            <p className="text-sm font-semibold text-green-700">{file.name}</p>
            <p className="text-xs text-gray-700 mt-1">{(file.size / 1024).toFixed(0)} KB — ready to submit</p>
          </div>
        ) : (
          <div>
            <p className="text-3xl mb-2">📁</p>
            <p className="text-sm font-medium text-gray-700">Click to browse or drag and drop</p>
            <p className="text-xs text-gray-600 mt-1">PDF, DOCX, images, Excel, or any document — Max 50 MB</p>
          </div>
        )}
        <input ref={ref} type="file" accept="*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
      </div>
      {file && <p className="text-xs text-green-600 mt-2">✓ AI will extract all fields from this document automatically</p>}
    </div>
  )
}

function CreateInitiativeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<Mode>('manual')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    initiativeTitle: '', sector: 'EDUCATION',
    state: '', district: '', village: '', gpsCoordinates: '',
    briefDescription: '', detailedDescription: '',
    totalBeneficiaries: '', totalBudget: '', amountFunded: '',
    startDate: '', endDate: '',
    kpi1: '', kpi2: '', kpi3: '', overallOutcome: '',
    fcraCompliant: 'YES', csrAlignment: '', reportingFrequency: 'QUARTERLY',
    evidenceTypes: '', sdgAlignment: '', uniqueValue: '',
  })

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))
  const ginp = (err?: string) => `w-full border rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none ${err ? 'border-red-400 bg-red-50' : 'border-gray-300'}`
  const gsel = () => `w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white`
  const lbl = (text: string, required = false) => (
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {text}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )

  function validate() {
    const e: Record<string, string> = {}
    if (mode === 'upload') {
      if (!file) e.file = 'Please select a file to upload'
      if (!form.initiativeTitle.trim()) e.initiativeTitle = 'Initiative Title is required'
    } else {
      if (!form.initiativeTitle.trim()) e.initiativeTitle = 'Initiative Title is required'
      if (!form.state.trim()) e.state = 'State is required'
      if (!form.briefDescription.trim()) e.briefDescription = 'Brief Description is required'
      if (!form.totalBeneficiaries || isNaN(Number(form.totalBeneficiaries)) || Number(form.totalBeneficiaries) <= 0)
        e.totalBeneficiaries = 'Total Beneficiaries must be a positive number'
      if (!form.totalBudget || isNaN(Number(form.totalBudget)) || Number(form.totalBudget) <= 0)
        e.totalBudget = 'Total Budget must be a positive number'
      if (!form.kpi1.trim()) e.kpi1 = 'KPI 1 is required'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      if (mode === 'upload' && file) {
        const formData = new FormData()
        formData.append('file', file)
        const token = getToken()
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/initiatives/upload`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
        )
        const data = await res.json()
        if (!data.success) { alert(data.error?.message ?? 'Upload failed'); return }
      } else {
        const sdgTags = form.sdgAlignment
          ? form.sdgAlignment.split(',').map((s: string) => s.trim()).filter(Boolean)
          : ['QUALITY_EDUCATION']

        const res = await api.post('/api/initiatives', {
          title: form.initiativeTitle,
          sector: form.sector,
          geography: {
            state: form.state || 'India',
            district: form.district || undefined,
            lat: form.gpsCoordinates ? parseFloat(form.gpsCoordinates.split(',')[0]) : 0,
            lng: form.gpsCoordinates ? parseFloat(form.gpsCoordinates.split(',')[1]) : 0,
          },
          description: [form.briefDescription, form.detailedDescription].filter(Boolean).join('\n\n'),
          targetBeneficiaries: parseInt(form.totalBeneficiaries) || 100,
          budgetRequired: parseFloat(form.totalBudget) || 1000000,
          sdgTags,
          startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
          endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        })
        if (!res.success) { alert(res.error?.message ?? 'Failed to create initiative'); return }
      }
      onSuccess()
    } catch {
      alert('Network error. Please check the API server is running.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create NGO Initiative</h2>
            <p className="text-xs text-gray-700 mt-0.5">Fill the form manually or upload a document</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-xl font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Mode Toggle */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">How would you like to submit?</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setMode('manual')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${mode === 'manual' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
                <span className="text-xl">✍️</span>
                <div>
                  <p className={`text-sm font-semibold ${mode === 'manual' ? 'text-green-700' : 'text-gray-700'}`}>Fill Form Manually</p>
                  <p className="text-xs text-gray-700 mt-0.5">Enter all fields in the form below</p>
                </div>
              </button>
              <button type="button" onClick={() => setMode('upload')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${mode === 'upload' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
                <span className="text-xl">📁</span>
                <div>
                  <p className={`text-sm font-semibold ${mode === 'upload' ? 'text-green-700' : 'text-gray-700'}`}>Upload Document</p>
                  <p className="text-xs text-gray-700 mt-0.5">AI extracts all fields automatically</p>
                </div>
              </button>
            </div>
          </div>

          {mode === 'upload' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-700">
                <strong>🏛 NGO Initiative</strong> — AI will extract all fields from the document and add it to the Initiatives dashboard.
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                {lbl('Initiative Title (for record keeping)', true)}
                <input value={form.initiativeTitle} onChange={set('initiativeTitle')} className={ginp(errors.initiativeTitle)} placeholder="e.g. Digital Literacy Program — Vidarbha Villages" />
                <Err msg={errors.initiativeTitle} />
              </div>
              <FileUploadBox file={file} setFile={setFile} />
              <Err msg={errors.file} />
            </>
          )}

          {mode === 'manual' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-700">
                <strong>🏛 NGO Initiative</strong> — This will be added directly to the Initiatives dashboard and matched with CSR donors.
              </div>

              <Section num={1} title="Initiative Overview">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">{lbl('Initiative Title', true)}<input value={form.initiativeTitle} onChange={set('initiativeTitle')} className={ginp(errors.initiativeTitle)} placeholder="e.g. Digital Literacy Program — Vidarbha Villages" /><Err msg={errors.initiativeTitle} /></div>
                  <div>{lbl('Sector', true)}<select value={form.sector} onChange={set('sector')} className={gsel()}>{SECTORS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</select></div>
                </div>
              </Section>

              <Section num={2} title="Project Location">
                <div className="grid grid-cols-2 gap-3">
                  <div>{lbl('State', true)}<input value={form.state} onChange={set('state')} className={ginp(errors.state)} placeholder="e.g. Maharashtra" /><Err msg={errors.state} /></div>
                  <div>{lbl('District')}<input value={form.district} onChange={set('district')} className={ginp()} placeholder="e.g. Wardha" /></div>
                  <div>{lbl('Village / Specific Location')}<input value={form.village} onChange={set('village')} className={ginp()} placeholder="e.g. Arvi Village" /></div>
                  <div>{lbl('GPS Coordinates (Optional)')}<input value={form.gpsCoordinates} onChange={set('gpsCoordinates')} className={ginp()} placeholder="e.g. 20.7453, 78.6022" /></div>
                </div>
              </Section>

              <Section num={3} title="Project Description">
                <div className="space-y-3">
                  <div>{lbl('Brief Description', true)}<textarea value={form.briefDescription} onChange={set('briefDescription')} rows={2} className={ginp(errors.briefDescription)} placeholder="Summarise the initiative in 2-3 sentences..." /><Err msg={errors.briefDescription} /></div>
                  <div>{lbl('Detailed Description')}<textarea value={form.detailedDescription} onChange={set('detailedDescription')} rows={4} className={ginp()} placeholder="Describe the problem, planned activities, and expected community impact..." /></div>
                </div>
              </Section>

              <Section num={4} title="Beneficiary Details">
                <div className="grid grid-cols-2 gap-3">
                  <div>{lbl('Total Number of Beneficiaries', true)}<input type="number" value={form.totalBeneficiaries} onChange={set('totalBeneficiaries')} className={ginp(errors.totalBeneficiaries)} placeholder="e.g. 500" /><Err msg={errors.totalBeneficiaries} /></div>
                </div>
              </Section>

              <Section num={5} title="Financial Details (INR)">
                <div className="grid grid-cols-2 gap-3">
                  <div>{lbl('Total Budget Required (INR)', true)}<input type="number" value={form.totalBudget} onChange={set('totalBudget')} className={ginp(errors.totalBudget)} placeholder="e.g. 1500000" /><Err msg={errors.totalBudget} /></div>
                  <div>{lbl('Amount Already Funded (INR)')}<input type="number" value={form.amountFunded} onChange={set('amountFunded')} className={ginp()} placeholder="e.g. 500000" /></div>
                </div>
              </Section>

              <Section num={6} title="Project Timeline">
                <div className="grid grid-cols-2 gap-3">
                  <div>{lbl('Start Date')}<input type="date" value={form.startDate} onChange={set('startDate')} className={ginp()} /></div>
                  <div>{lbl('End Date')}<input type="date" value={form.endDate} onChange={set('endDate')} className={ginp()} /></div>
                </div>
              </Section>

              <Section num={7} title="KPIs & Expected Outcomes">
                <div className="space-y-3">
                  {(['kpi1', 'kpi2', 'kpi3'] as const).map((k, i) => (
                    <div key={k}>
                      {lbl(`KPI ${i + 1}`, i === 0)}
                      <input value={form[k]} onChange={set(k)} className={ginp(errors[k])}
                        placeholder={i === 0 ? '500 students complete digital literacy training' : 'Enter KPI (optional)'} />
                      <Err msg={errors[k]} />
                    </div>
                  ))}
                  <div>{lbl('Overall Expected Outcome')}<textarea value={form.overallOutcome} onChange={set('overallOutcome')} rows={2} className={ginp()} placeholder="Describe the overall expected community impact..." /></div>
                </div>
              </Section>

              <Section num={8} title="Compliance & Reporting">
                <div className="grid grid-cols-2 gap-3">
                  <div>{lbl('FCRA Compliant')}<select value={form.fcraCompliant} onChange={set('fcraCompliant')} className={gsel()}><option value="YES">Yes</option><option value="NO">No</option></select></div>
                  <div>{lbl('CSR Schedule VII Alignment')}<input value={form.csrAlignment} onChange={set('csrAlignment')} className={ginp()} placeholder="e.g. Clause (i) Education" /></div>
                  <div>{lbl('Reporting Frequency')}<select value={form.reportingFrequency} onChange={set('reportingFrequency')} className={gsel()}><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="HALF_YEARLY">Bi-Annual</option><option value="ANNUALLY">Annually</option></select></div>
                  <div>{lbl('Evidence Types Collected')}<input value={form.evidenceTypes} onChange={set('evidenceTypes')} className={ginp()} placeholder="e.g. Photos, GPS Stamps, Testimonials" /></div>
                </div>
              </Section>

              <Section num={9} title="SDG Alignment (Optional)">
                <input value={form.sdgAlignment} onChange={set('sdgAlignment')} className={ginp()} placeholder="e.g. SDG 4 Quality Education, SDG 10 Reduced Inequalities" />
              </Section>

              <Section num={10} title="Unique Value / Impact Story">
                <textarea value={form.uniqueValue} onChange={set('uniqueValue')} rows={3} className={ginp()} placeholder="Why this initiative stands out — key differentiators and community impact..." />
              </Section>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors shadow-sm">
              {submitting ? '⏳ Submitting...' : mode === 'upload' ? '🚀 Upload Document & Create Initiative' : '🚀 Create Initiative'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface Initiative {
  id: string
  ngoId: string | null
  title: string
  description: string
  status: string
  sector: string
  budgetRequired: number
  budgetFunded: number
  startDate: string
  endDate: string
  sdgTags: string[]
  targetBeneficiaries: number
  createdAt: string
}

export default function InitiativesPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingNgoId, setEditingNgoId] = useState<string | null>(null)   // initiative id being edited
  const [ngoIdDraft, setNgoIdDraft]     = useState('')
  const [savingNgoId, setSavingNgoId]   = useState<string | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['initiatives'],
    queryFn:  () => apiFetch<{ data: Initiative[] }>('/api/initiatives')
  })

  const initiatives = data?.data || []

  async function saveNgoId(initiativeId: string) {
    setSavingNgoId(initiativeId)
    try {
      await api.patch(`/api/initiatives/${initiativeId}`, { ngoId: ngoIdDraft.trim() || null })
      await refetch()
      setEditingNgoId(null)
    } catch {
      alert('Failed to save NGO ID')
    } finally {
      setSavingNgoId(null)
    }
  }

  const handleDeleteInitiative = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this initiative?')) return
    try {
      const res = await api.delete(`/api/initiatives/${id}`)
      if (!res.success) throw new Error(res.error?.message || 'Failed to delete initiative')
      await refetch()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete initiative')
    }
  }

  const filteredInitiatives = initiatives.filter(i =>
    i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Loading initiatives...</div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-red-600">Error: {(error as Error).message}</div>
    </div>
  )

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

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search initiatives..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredInitiatives.length} of {initiatives.length} initiatives
      </div>

      {/* Initiatives Table */}
      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[130px]">
                NGO ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[200px]">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[110px]">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[140px]">
                Sector
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[140px]">
                Beneficiaries
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[140px]">
                Budget Required
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[110px]">
                Start Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[160px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInitiatives.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-700">
                  No initiatives found
                </td>
              </tr>
            ) : (
              filteredInitiatives.map((initiative) => (
                <tr
                  key={initiative.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/initiatives/${initiative.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono" onClick={e => e.stopPropagation()}>
                    {editingNgoId === initiative.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={ngoIdDraft}
                          onChange={e => setNgoIdDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveNgoId(initiative.id); if (e.key === 'Escape') setEditingNgoId(null) }}
                          className="w-28 border border-blue-400 rounded px-1.5 py-0.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="NGO-XXXX"
                        />
                        <button
                          onClick={() => saveNgoId(initiative.id)}
                          disabled={savingNgoId === initiative.id}
                          className="text-[10px] text-white bg-blue-600 hover:bg-blue-700 px-1.5 py-0.5 rounded disabled:opacity-50">
                          {savingNgoId === initiative.id ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingNgoId(null)} className="text-[10px] text-gray-700 hover:text-gray-900">✕</button>
                      </div>
                    ) : (
                      <span
                        title="Click to set NGO ID"
                        onClick={() => { setEditingNgoId(initiative.id); setNgoIdDraft(initiative.ngoId ?? '') }}
                        className="cursor-pointer group flex items-center gap-1">
                        {initiative.ngoId ? (
                          <>
                            <span className="text-gray-700">{initiative.ngoId}</span>
                            <span className="text-[10px] text-gray-500 group-hover:text-blue-400">✎</span>
                          </>
                        ) : (
                          <span className="text-[11px] text-blue-400 group-hover:text-blue-600 border border-dashed border-blue-200 group-hover:border-blue-400 px-1.5 py-0.5 rounded transition-colors">
                            + Add ID
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {initiative.title}
                    </div>
                    <div className="text-sm text-gray-700 truncate max-w-[240px]">
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
                    }`}>{initiative.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                    {SECTOR_MAP[initiative.sector] || initiative.sector}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {initiative.targetBeneficiaries?.toLocaleString('en-IN') ?? '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{initiative.budgetRequired?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {initiative.startDate ? new Date(initiative.startDate).toLocaleDateString() : 'TBD'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/initiatives/${initiative.id}`) }}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      View
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/initiatives/${initiative.id}`) }}
                      className="text-green-600 hover:text-green-900 font-medium mr-4"
                    >
                      Milestones
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteInitiative(initiative.id) }}
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

      {showCreateModal && (
        <CreateInitiativeModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            refetch()
          }}
        />
      )}
    </div>
  )
}
