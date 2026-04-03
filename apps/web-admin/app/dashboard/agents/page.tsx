'use client'
import { useState, useRef } from 'react'
import { api } from '../../../lib/api'

type Mode = 'manual' | 'upload'

function getToken(): string {
  try {
    const raw = localStorage.getItem('admin_session')
    if (!raw) return ''
    const session = JSON.parse(raw)
    return session?.accessToken ?? ''
  } catch { return '' }
}

function reqV(val: string, label: string) { return val.trim() === '' ? `${label} is required` : null }
function posNum(val: string, label: string) { return (isNaN(Number(val)) || Number(val) <= 0) ? `${label} must be a positive number` : null }
function emailVal(val: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? null : 'Invalid email address' }

const Err = ({ msg }: { msg?: string }) => msg ? <p className="text-red-500 text-xs mt-1">{msg}</p> : null

const Section = ({ num, title, color, children }: { num: number; title: string; color: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <span className={`${color} text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold flex-shrink-0`}>{num}</span>
      {title}
    </h3>
    {children}
  </div>
)

function ModeToggle({ mode, setMode, color }: { mode: Mode; setMode: (m: Mode) => void; color: 'blue' | 'green' }) {
  const active = color === 'blue' ? 'border-blue-500 bg-blue-50' : 'border-green-500 bg-green-50'
  const hover  = color === 'blue' ? 'hover:border-blue-300' : 'hover:border-green-300'
  const textActive = color === 'blue' ? 'text-blue-700' : 'text-green-700'
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">How would you like to submit?</p>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setMode('manual')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${mode === 'manual' ? active : `border-gray-200 ${hover}`}`}>
          <span className="text-xl">✍️</span>
          <div>
            <p className={`text-sm font-semibold ${mode === 'manual' ? textActive : 'text-gray-700'}`}>Fill Form Manually</p>
            <p className="text-xs text-gray-500 mt-0.5">Enter all fields in the form below</p>
          </div>
        </button>
        <button type="button" onClick={() => setMode('upload')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${mode === 'upload' ? active : `border-gray-200 ${hover}`}`}>
          <span className="text-xl">📁</span>
          <div>
            <p className={`text-sm font-semibold ${mode === 'upload' ? textActive : 'text-gray-700'}`}>Upload Document</p>
            <p className="text-xs text-gray-500 mt-0.5">AI extracts all fields automatically</p>
          </div>
        </button>
      </div>
    </div>
  )
}

function FileUploadBox({ file, setFile, color, title, description }: {
  file: File | null; setFile: (f: File | null) => void
  color: 'blue' | 'green'; title: string; description: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const borderActive = color === 'blue' ? 'border-blue-400 bg-blue-50' : 'border-green-400 bg-green-50'
  const borderHover  = color === 'blue' ? 'hover:border-blue-300 hover:bg-blue-50' : 'hover:border-green-300 hover:bg-green-50'
  const textActive   = color === 'blue' ? 'text-blue-700' : 'text-green-700'
  const textNote     = color === 'blue' ? 'text-blue-600' : 'text-green-600'
  return (
    <div className={`bg-white rounded-xl border-2 p-5 ${file ? (color === 'blue' ? 'border-blue-400' : 'border-green-400') : 'border-dashed border-gray-300'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        {file && <button type="button" onClick={() => setFile(null)} className="text-xs text-red-500 hover:text-red-700 ml-4 whitespace-nowrap">Remove ✕</button>}
      </div>
      <div onClick={() => ref.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? borderActive : `border-gray-200 ${borderHover}`}`}>
        {file ? (
          <div>
            <p className="text-3xl mb-2">📄</p>
            <p className={`text-sm font-semibold ${textActive}`}>{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(0)} KB — ready to submit</p>
          </div>
        ) : (
          <div>
            <p className="text-3xl mb-2">📁</p>
            <p className="text-sm font-medium text-gray-700">Click to browse or drag and drop</p>
            <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX — Max 50 MB</p>
          </div>
        )}
        <input ref={ref} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
      </div>
      {file && <p className={`text-xs ${textNote} mt-2`}>✓ AI will extract all fields from this document automatically</p>}
    </div>
  )
}

// ── DONOR FORM ────────────────────────────────────────────────────────────────
function DonorForm({ onSubmit, submitting }: {
  onSubmit: (data: any, file: File | null, mode: Mode) => void
  submitting: boolean
}) {
  const [mode, setMode]     = useState<Mode>('manual')
  const [file, setFile]     = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm]     = useState({
    donorType: 'CSR', donorName: '', contactPerson: '', contactEmail: '', contactPhone: '',
    sectors: [] as string[], preferredState: '', preferredDistrict: '', specificLocation: '',
    minBudget: '', maxBudget: '', totalFunding: '', minDuration: '', maxDuration: '',
    kpi1: '', kpi2: '', specificMetric: '', reportingCadence: 'QUARTERLY', reportingFormat: 'PDF',
    evidenceTypes: '', dataSharingLevel: 'SUMMARY', csrScheduleVII: '', otherCompliance: '', additionalNotes: '',
  })

  const SECTORS = ['EDUCATION', 'HEALTHCARE', 'LIVELIHOOD', 'ENVIRONMENT', 'WATER_SANITATION', 'OTHER']
  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))
  const toggleSector = (s: string) => setForm(f => ({
    ...f, sectors: f.sectors.includes(s) ? f.sectors.filter(x => x !== s) : [...f.sectors, s]
  }))
  const inp = (err?: string) => `w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${err ? 'border-red-400 bg-red-50' : 'border-gray-300'}`
  const sel = () => `w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white`
  const lbl = (text: string, required = false) => (
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {text}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )

  function validate() {
    const e: Record<string, string> = {}
    if (mode === 'upload') {
      if (!file) e.file = 'Please select a file to upload'
      const n = reqV(form.donorName, 'Donor Name'); if (n) e.donorName = n
      const em = reqV(form.contactEmail, 'Contact Email'); if (em) e.contactEmail = em
      else { const ev = emailVal(form.contactEmail); if (ev) e.contactEmail = ev }
    } else {
      const n = reqV(form.donorName, 'Donor Name'); if (n) e.donorName = n
      const em = reqV(form.contactEmail, 'Contact Email'); if (em) e.contactEmail = em
      else { const ev = emailVal(form.contactEmail); if (ev) e.contactEmail = ev }
      if (form.sectors.length === 0) e.sectors = 'Select at least one sector'
      const s = reqV(form.preferredState, 'Preferred State'); if (s) e.preferredState = s
      const k = reqV(form.kpi1, 'KPI 1'); if (k) e.kpi1 = k
      if (form.minBudget && form.maxBudget && Number(form.minBudget) > Number(form.maxBudget))
        e.maxBudget = 'Max budget must be greater than min budget'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); if (validate()) onSubmit(form, file, mode) }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <ModeToggle mode={mode} setMode={setMode} color="blue" />

      {mode === 'upload' && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
            <strong>Type: 🏢 CSR / Donor</strong> — This file will be added to the <strong>Donors (CSR) dashboard</strong> and processed by the AI extraction agent.
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Donor Information (Required for record)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>{lbl('Donor Name / Organisation', true)}<input value={form.donorName} onChange={set('donorName')} className={inp(errors.donorName)} placeholder="e.g. Tata Consultancy Services" /><Err msg={errors.donorName} /></div>
              <div>{lbl('Contact Email', true)}<input type="email" value={form.contactEmail} onChange={set('contactEmail')} className={inp(errors.contactEmail)} placeholder="csr@company.com" /><Err msg={errors.contactEmail} /></div>
            </div>
          </div>
          <FileUploadBox file={file} setFile={setFile} color="blue"
            title="Upload Donor Requirement Document (CSR)"
            description="Upload your RFP document. AI will extract sector, geography, budget, KPIs automatically. This will appear in the Donors (CSR) dashboard." />
          <Err msg={errors.file} />
        </>
      )}

      {mode === 'manual' && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
            <strong>Type: 🏢 CSR / Donor</strong> — This form will be added to the <strong>Donors (CSR) dashboard</strong>.
          </div>

          <Section num={1} title="Donor Information" color="bg-blue-600">
            <div className="grid grid-cols-2 gap-3">
              <div>{lbl('Donor Type')}<select value={form.donorType} onChange={set('donorType')} className={sel()}><option value="CSR">CSR / Corporate</option><option value="INDIVIDUAL">Individual</option></select></div>
              <div>{lbl('Donor Name / Organisation', true)}<input value={form.donorName} onChange={set('donorName')} className={inp(errors.donorName)} placeholder="e.g. Tata Consultancy Services" /><Err msg={errors.donorName} /></div>
              <div>{lbl('Contact Person (CSR only)')}<input value={form.contactPerson} onChange={set('contactPerson')} className={inp()} placeholder="e.g. Anita Sharma" /></div>
              <div>{lbl('Contact Email', true)}<input type="email" value={form.contactEmail} onChange={set('contactEmail')} className={inp(errors.contactEmail)} placeholder="csr@company.com" /><Err msg={errors.contactEmail} /></div>
              <div>{lbl('Contact Phone (Optional)')}<input value={form.contactPhone} onChange={set('contactPhone')} className={inp()} placeholder="9876543210" /></div>
            </div>
          </Section>

          <Section num={2} title="Preferred Sectors" color="bg-blue-600">
            <div className="flex flex-wrap gap-2">
              {SECTORS.map(s => (
                <button key={s} type="button" onClick={() => toggleSector(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${form.sectors.includes(s) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            <Err msg={errors.sectors} />
          </Section>

          <Section num={3} title="Preferred Geography" color="bg-blue-600">
            <div className="grid grid-cols-3 gap-3">
              <div>{lbl('Preferred State(s)', true)}<input value={form.preferredState} onChange={set('preferredState')} className={inp(errors.preferredState)} placeholder="e.g. Maharashtra" /><Err msg={errors.preferredState} /></div>
              <div>{lbl('Preferred District(s) (Optional)')}<input value={form.preferredDistrict} onChange={set('preferredDistrict')} className={inp()} placeholder="e.g. Wardha, Nagpur" /></div>
              <div>{lbl('Specific Location / Village (Optional)')}<input value={form.specificLocation} onChange={set('specificLocation')} className={inp()} placeholder="e.g. Arvi Village" /></div>
            </div>
          </Section>

          <Section num={4} title="Financial Parameters (INR)" color="bg-blue-600">
            <div className="grid grid-cols-3 gap-3">
              <div>{lbl('Minimum Budget (INR)')}<input type="number" value={form.minBudget} onChange={set('minBudget')} className={inp(errors.minBudget)} placeholder="e.g. 2500000" /><Err msg={errors.minBudget} /></div>
              <div>{lbl('Maximum Budget (INR)')}<input type="number" value={form.maxBudget} onChange={set('maxBudget')} className={inp(errors.maxBudget)} placeholder="e.g. 5000000" /><Err msg={errors.maxBudget} /></div>
              <div>{lbl('Total Funding Available (INR)')}<input type="number" value={form.totalFunding} onChange={set('totalFunding')} className={inp()} placeholder="e.g. 5000000" /></div>
            </div>
          </Section>

          <Section num={5} title="Desired Project Duration" color="bg-blue-600">
            <div className="grid grid-cols-2 gap-3">
              <div>{lbl('Minimum Duration (Months)')}<input type="number" value={form.minDuration} onChange={set('minDuration')} className={inp()} placeholder="e.g. 6" /></div>
              <div>{lbl('Maximum Duration (Months)')}<input type="number" value={form.maxDuration} onChange={set('maxDuration')} className={inp()} placeholder="e.g. 24" /></div>
            </div>
          </Section>

          <Section num={6} title="KPIs / Desired Outcomes" color="bg-blue-600">
            <div className="space-y-3">
              <div>{lbl('KPI 1', true)}<input value={form.kpi1} onChange={set('kpi1')} className={inp(errors.kpi1)} placeholder="e.g. 1,000 students enrolled in digital literacy program" /><Err msg={errors.kpi1} /></div>
              <div>{lbl('KPI 2')}<input value={form.kpi2} onChange={set('kpi2')} className={inp()} placeholder="e.g. 80% pass rate in assessment" /></div>
              <div>{lbl('Specific Metric (Optional)')}<input value={form.specificMetric} onChange={set('specificMetric')} className={inp()} placeholder="e.g. cost-per-beneficiary, literacy rate improvement" /></div>
            </div>
          </Section>

          <Section num={7} title="Reporting Requirements" color="bg-blue-600">
            <div className="grid grid-cols-2 gap-3">
              <div>{lbl('Reporting Cadence')}<select value={form.reportingCadence} onChange={set('reportingCadence')} className={sel()}><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="HALF_YEARLY">Bi-Annual</option><option value="ANNUALLY">Annually</option><option value="MILESTONE_BASED">Milestone Based</option></select></div>
              <div>{lbl('Preferred Reporting Format')}<select value={form.reportingFormat} onChange={set('reportingFormat')} className={sel()}><option value="PDF">PDF</option><option value="DASHBOARD">Dashboard</option><option value="EXCEL">Excel</option></select></div>
              <div>{lbl('Evidence Types Preferred')}<input value={form.evidenceTypes} onChange={set('evidenceTypes')} className={inp()} placeholder="e.g. Photos, GPS Stamps, Attendance Registers" /></div>
              <div>{lbl('Data Sharing Level')}<select value={form.dataSharingLevel} onChange={set('dataSharingLevel')} className={sel()}><option value="AGGREGATE_ONLY">Aggregate Only</option><option value="MILESTONE_EVIDENCE">Milestone Evidence</option><option value="ANONYMISED_BENEFICIARY">Anonymised Beneficiary</option></select></div>
            </div>
          </Section>

          <Section num={8} title="Compliance Needs (CSR Only)" color="bg-blue-600">
            <div className="grid grid-cols-2 gap-3">
              <div>{lbl('CSR Schedule VII Alignment')}<input value={form.csrScheduleVII} onChange={set('csrScheduleVII')} className={inp()} placeholder="e.g. Clause (i) Education, Clause (iv) Environment" /></div>
              <div>{lbl('Other Compliance Requirements (Optional)')}<input value={form.otherCompliance} onChange={set('otherCompliance')} className={inp()} placeholder="e.g. FCRA registration required" /></div>
            </div>
          </Section>

          <Section num={9} title="Additional Notes / Preferences" color="bg-blue-600">
            <textarea value={form.additionalNotes} onChange={set('additionalNotes')} rows={3} className={inp()} placeholder="Additional context, restrictions, or strategic priorities for this funding cycle..." />
          </Section>
        </>
      )}

      <button type="submit" disabled={submitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors shadow-sm">
        {submitting ? '⏳ Submitting — AI agents starting...' : mode === 'upload' ? '🚀 Upload Donor Document & Start AI Extraction' : '🚀 Submit Donor Requirement & Start AI Agents'}
      </button>
    </form>
  )
}

// ── INITIATIVE FORM ───────────────────────────────────────────────────────────
function InitiativeForm({ onSubmit, submitting }: {
  onSubmit: (data: any, file: File | null, mode: Mode) => void
  submitting: boolean
}) {
  const [mode, setMode]     = useState<Mode>('manual')
  const [file, setFile]     = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const SECTORS = ['EDUCATION', 'HEALTHCARE', 'LIVELIHOOD', 'ENVIRONMENT', 'WATER_SANITATION', 'OTHER']
  const [form, setForm] = useState({
    initiativeTitle: '', ngoId: '', sector: 'EDUCATION',
    state: '', district: '', village: '', gpsCoordinates: '',
    briefDescription: '', detailedDescription: '',
    totalBeneficiaries: '', beneficiaryDemographics: '',
    totalBudget: '', amountFunded: '', amountNeeded: '', fundingStatus: 'FULLY_UNFUNDED',
    startDate: '', endDate: '', durationMonths: '',
    kpi1: '', kpi2: '', kpi3: '', overallOutcome: '',
    fcraCompliant: 'YES', csrAlignment: '', reportingFrequency: 'QUARTERLY',
    reportingFormat: 'PDF', evidenceTypes: '', sdgAlignment: '', uniqueValue: '',
  })

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))
  const ginp = (err?: string) => `w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none ${err ? 'border-red-400 bg-red-50' : 'border-gray-300'}`
  const gsel = () => `w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none bg-white`
  const lbl = (text: string, required = false) => (
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {text}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )

  function validate() {
    const e: Record<string, string> = {}
    if (mode === 'upload') {
      if (!file) e.file = 'Please select a file to upload'
      const t = reqV(form.initiativeTitle, 'Initiative Title'); if (t) e.initiativeTitle = t
    } else {
      const t = reqV(form.initiativeTitle, 'Initiative Title'); if (t) e.initiativeTitle = t
      const s = reqV(form.state, 'State'); if (s) e.state = s
      const b = reqV(form.briefDescription, 'Brief Description'); if (b) e.briefDescription = b
      const bn = reqV(form.totalBeneficiaries, 'Total Beneficiaries'); if (bn) e.totalBeneficiaries = bn
      else { const n = posNum(form.totalBeneficiaries, 'Total Beneficiaries'); if (n) e.totalBeneficiaries = n }
      const bu = reqV(form.totalBudget, 'Total Budget Required'); if (bu) e.totalBudget = bu
      else { const n = posNum(form.totalBudget, 'Total Budget'); if (n) e.totalBudget = n }
      const k = reqV(form.kpi1, 'KPI 1'); if (k) e.kpi1 = k
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); if (validate()) onSubmit(form, file, mode) }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <ModeToggle mode={mode} setMode={setMode} color="green" />

      {mode === 'upload' && (
        <>
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-700">
            <strong>Type: 🏛 NGO</strong> — This file will be added directly to the <strong>NGO Initiatives dashboard</strong> and the embedding agent will make it discoverable for donor matching.
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Initiative Title (Required for record)</h3>
            <div>{lbl('Initiative Title', true)}<input value={form.initiativeTitle} onChange={set('initiativeTitle')} className={ginp(errors.initiativeTitle)} placeholder="e.g. Digital Literacy Program — Vidarbha Villages" /><Err msg={errors.initiativeTitle} /></div>
          </div>
          <FileUploadBox file={file} setFile={setFile} color="green"
            title="Upload NGO Initiative Document"
            description="Upload your initiative submission form. AI will extract all details. This will appear in the NGO Initiatives dashboard." />
          <Err msg={errors.file} />
        </>
      )}

      {mode === 'manual' && (
        <>
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-700">
            <strong>Type: 🏛 NGO</strong> — This form will be added directly to the <strong>NGO Initiatives dashboard</strong>.
          </div>

          <Section num={1} title="Initiative Overview" color="bg-green-600">
            <div className="grid grid-cols-2 gap-3">
              <div>{lbl('NGO Internal ID (Optional)')}<input value={form.ngoId} onChange={set('ngoId')} className={ginp()} placeholder="e.g. NGO-2025-001" /></div>
              <div>{lbl('Initiative Title', true)}<input value={form.initiativeTitle} onChange={set('initiativeTitle')} className={ginp(errors.initiativeTitle)} placeholder="e.g. Digital Literacy Program — Vidarbha Villages" /><Err msg={errors.initiativeTitle} /></div>
              <div>{lbl('Sector', true)}<select value={form.sector} onChange={set('sector')} className={gsel()}>{SECTORS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</select></div>
            </div>
          </Section>

          <Section num={2} title="Project Location" color="bg-green-600">
            <div className="grid grid-cols-2 gap-3">
              <div>{lbl('State', true)}<input value={form.state} onChange={set('state')} className={ginp(errors.state)} placeholder="e.g. Maharashtra" /><Err msg={errors.state} /></div>
              <div>{lbl('District')}<input value={form.district} onChange={set('district')} className={ginp()} placeholder="e.g. Wardha" /></div>
              <div>{lbl('Village / Specific Location (Optional)')}<input value={form.village} onChange={set('village')} className={ginp()} placeholder="e.g. Arvi Village" /></div>
              <div>{lbl('GPS Coordinates (Optional)')}<input value={form.gpsCoordinates} onChange={set('gpsCoordinates')} className={ginp()} placeholder="e.g. 20.7453, 78.6022" /></div>
            </div>
          </Section>

          <Section num={3} title="Project Description" color="bg-green-600">
            <div className="space-y-3">
              <div>{lbl('Brief Description (2-3 sentences)', true)}<textarea value={form.briefDescription} onChange={set('briefDescription')} rows={2} className={ginp(errors.briefDescription)} placeholder="Summarise the initiative in 2-3 sentences..." /><Err msg={errors.briefDescription} /></div>
              <div>{lbl('Detailed Description')}<textarea value={form.detailedDescription} onChange={set('detailedDescription')} rows={4} className={ginp()} placeholder="Describe the problem, planned activities, and expected community impact..." /></div>
            </div>
          </Section>

          <Section num={4} title="Beneficiary Details" color="bg-green-600">
            <div className="grid grid-cols-2 gap-3">
              <div>{lbl('Total Number of Beneficiaries', true)}<input type="number" value={form.totalBeneficiaries} onChange={set('totalBeneficiaries')} className={ginp(errors.totalBeneficiaries)} placeholder="e.g. 500" /><Err msg={errors.totalBeneficiaries} /></div>
              <div>{lbl('Beneficiary Demographics')}<input value={form.beneficiaryDemographics} onChange={set('beneficiaryDemographics')} className={ginp()} placeholder="e.g. Girls aged 10-18, rural communities" /></div>
            </div>
          </Section>

          <Section num={5} title="Financial Details (INR)" color="bg-green-600">
            <div className="grid grid-cols-2 gap-3">
              <div>{lbl('Total Budget Required (INR)', true)}<input type="number" value={form.totalBudget} onChange={set('totalBudget')} className={ginp(errors.totalBudget)} placeholder="e.g. 1500000" /><Err msg={errors.totalBudget} /></div>
              <div>{lbl('Amount Already Funded (INR)')}<input type="number" value={form.amountFunded} onChange={set('amountFunded')} className={ginp()} placeholder="e.g. 500000" /></div>
              <div>{lbl('Amount Still Needed (INR)')}<input type="number" value={form.amountNeeded} onChange={set('amountNeeded')} className={ginp()} placeholder="e.g. 1000000" /></div>
              <div>{lbl('Funding Status')}<select value={form.fundingStatus} onChange={set('fundingStatus')} className={gsel()}><option value="FULLY_UNFUNDED">Fully Unfunded</option><option value="PARTIALLY_FUNDED">Partially Funded</option><option value="FULLY_MATCHED">Fully Matched</option></select></div>
            </div>
          </Section>

          <Section num={6} title="Project Timeline" color="bg-green-600">
            <div className="grid grid-cols-3 gap-3">
              <div>{lbl('Start Date')}<input type="date" value={form.startDate} onChange={set('startDate')} className={ginp()} /></div>
              <div>{lbl('End Date')}<input type="date" value={form.endDate} onChange={set('endDate')} className={ginp()} /></div>
              <div>{lbl('Total Duration (Months)')}<input type="number" value={form.durationMonths} onChange={set('durationMonths')} className={ginp()} placeholder="e.g. 18" /></div>
            </div>
          </Section>

          <Section num={7} title="KPIs & Expected Outcomes" color="bg-green-600">
            <div className="space-y-3">
              {[['kpi1', 'KPI 1', true], ['kpi2', 'KPI 2', false], ['kpi3', 'KPI 3', false]].map(([k, l, r]) => (
                <div key={k as string}>
                  {lbl(l as string, r as boolean)}
                  <input value={(form as any)[k as string]} onChange={set(k as string)} className={ginp(errors[k as string])}
                    placeholder={k === 'kpi1' ? '500 students complete digital literacy training' : 'Enter KPI'} />
                  <Err msg={errors[k as string]} />
                </div>
              ))}
              <div>{lbl('Overall Expected Outcome')}<textarea value={form.overallOutcome} onChange={set('overallOutcome')} rows={2} className={ginp()} placeholder="Describe the overall expected community impact..." /></div>
            </div>
          </Section>

          <Section num={8} title="Compliance & Reporting" color="bg-green-600">
            <div className="grid grid-cols-2 gap-3">
              <div>{lbl('FCRA Compliant')}<select value={form.fcraCompliant} onChange={set('fcraCompliant')} className={gsel()}><option value="YES">Yes</option><option value="NO">No</option></select></div>
              <div>{lbl('CSR Schedule VII Alignment')}<input value={form.csrAlignment} onChange={set('csrAlignment')} className={ginp()} placeholder="e.g. Clause (i) Education / Clause (iv) Environment" /></div>
              <div>{lbl('Reporting Frequency')}<select value={form.reportingFrequency} onChange={set('reportingFrequency')} className={gsel()}><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="HALF_YEARLY">Bi-Annual</option><option value="ANNUALLY">Annually</option></select></div>
              <div>{lbl('Evidence Types Collected')}<input value={form.evidenceTypes} onChange={set('evidenceTypes')} className={ginp()} placeholder="e.g. Photos, GPS Stamps, Testimonials" /></div>
            </div>
          </Section>

          <Section num={9} title="SDG Alignment (Optional)" color="bg-green-600">
            <input value={form.sdgAlignment} onChange={set('sdgAlignment')} className={ginp()} placeholder="e.g. SDG 4 Quality Education, SDG 10 Reduced Inequalities" />
          </Section>

          <Section num={10} title="Unique Value / Impact Story" color="bg-green-600">
            <textarea value={form.uniqueValue} onChange={set('uniqueValue')} rows={3} className={ginp()} placeholder="Why this initiative stands out — key differentiators and community impact..." />
          </Section>
        </>
      )}

      <button type="submit" disabled={submitting}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors shadow-sm">
        {submitting ? '⏳ Submitting — AI agents starting...' : mode === 'upload' ? '🚀 Upload NGO Document & Add to NGO Initiatives' : '🚀 Submit NGO Initiative & Start AI Agents'}
      </button>
    </form>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const [showForm, setShowForm]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]         = useState<{ success: boolean; message: string; id?: string } | null>(null)

  async function submitDonor(data: any, file: File | null, mode: Mode) {
    setSubmitting(true); setResult(null)
    try {
      // Step 1 — Create donor record (Type: CSR → goes to Donors dashboard)
      const donorRes = await api.post('/api/donors', {
        type: data.donorType,
        orgName: data.donorName,
        contactName: data.contactPerson || data.donorName,
        email: data.contactEmail,
        phone: data.contactPhone || undefined,
      })
      if (!donorRes.success) {
        setResult({ success: false, message: donorRes.error?.message ?? 'Failed to create donor record' })
        return
      }
      const donorId = donorRes.data.id

      // Step 2 — Submit requirement (file or manual)
      let reqData: any
      if (mode === 'upload' && file) {
        const formData = new FormData()
        formData.append('donorId', donorId)
        formData.append('file', file)
        const token = getToken()
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/requirements/upload`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
        )
        reqData = await res.json()
      } else {
        const notes = [
          `Sectors: ${data.sectors.join(', ')}`,
          `State: ${data.preferredState}`,
          data.minBudget ? `Budget: ₹${data.minBudget}–${data.maxBudget}` : '',
          data.minDuration ? `Duration: ${data.minDuration}–${data.maxDuration} months` : '',
          `KPI 1: ${data.kpi1}`,
          data.kpi2 ? `KPI 2: ${data.kpi2}` : '',
          data.additionalNotes ? `Notes: ${data.additionalNotes}` : '',
        ].filter(Boolean).join(' | ')
        reqData = await api.post('/api/requirements', { donorId, notes })
      }

      if (!reqData.success) {
        setResult({ success: false, message: reqData.error?.message ?? 'Failed to submit requirement' })
        return
      }

      setResult({
        success: true,
        message: `✅ Donor requirement submitted! Agent pipeline started: Extraction → Gap Diagnoser → Matching. Requirement ID: ${reqData.data.requirementId}`,
        id: reqData.data.requirementId,
      })
      setShowForm(false)
    } catch {
      setResult({ success: false, message: 'Network error. Please check the API server is running.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function submitInitiative(data: any, file: File | null, mode: Mode) {
    setSubmitting(true); setResult(null)
    try {
      if (mode === 'upload' && file) {
        // NGO upload → multipart to /api/initiatives/upload (server-side AI extraction for PDF/DOCX)
        const formData = new FormData()
        formData.append('file', file)
        const token = getToken()
        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/initiatives/upload`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
        )
        const res = await uploadRes.json()

        if (!res.success) {
          setResult({ success: false, message: res.error?.message ?? 'Failed to create NGO initiative from document' })
          return
        }

        setResult({
          success: true,
          message: `✅ NGO Initiative uploaded! Type: 🏛 NGO. Added to NGO Initiatives dashboard. Title: "${res.data.title}" | Sector: ${res.data.sector}. Embedding agent is running to make it discoverable for donor matching.`,
          id: res.data.id,
        })
        setShowForm(false)
        return
      }

      // Manual mode → create initiative directly (Type: NGO → goes to NGO Initiatives dashboard)
      const sdgTags = data.sdgAlignment
        ? data.sdgAlignment.split(',').map((s: string) => s.trim()).filter(Boolean)
        : ['SDG4']

      const res = await api.post('/api/initiatives', {
        title: data.initiativeTitle,
        sector: data.sector,
        geography: {
          state: data.state || 'India',
          district: data.district || undefined,
          lat: data.gpsCoordinates ? parseFloat(data.gpsCoordinates.split(',')[0]) : 0,
          lng: data.gpsCoordinates ? parseFloat(data.gpsCoordinates.split(',')[1]) : 0,
        },
        description: [data.briefDescription, data.detailedDescription].filter(Boolean).join('\n\n'),
        targetBeneficiaries: parseInt(data.totalBeneficiaries) || 100,
        budgetRequired: parseFloat(data.totalBudget) || 1000000,
        sdgTags,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
      })

      if (!res.success) {
        setResult({ success: false, message: res.error?.message ?? 'Failed to create initiative' })
        return
      }

      setResult({
        success: true,
        message: `✅ NGO Initiative submitted! Type: 🏛 NGO. Added to NGO Initiatives dashboard. ID: ${res.data.id}. Embedding agent is running.`,
        id: res.data.id,
      })
      setShowForm(false)
    } catch {
      setResult({ success: false, message: 'Network error. Please check the API server is running.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">CSR Intake</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Submit CSR donor requirements to trigger AI extraction, gap analysis and initiative matching
        </p>
      </div>

      {result && (
        <div className={`mb-6 rounded-xl border px-5 py-4 text-sm ${result.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <p className="font-medium">{result.message}</p>
          {result.success && <p className="mt-1 text-xs opacity-70">Go to CSR Review Panel to track progress in real time.</p>}
          <button onClick={() => setResult(null)} className="mt-2 text-xs underline opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {!showForm ? (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Submit a donor requirement</p>
          <button onClick={() => setShowForm(true)}
            className="bg-white border-2 border-blue-200 hover:border-blue-500 rounded-xl p-6 text-left transition-all group cursor-pointer w-full max-w-sm">
            <div className="text-3xl mb-3">📋</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 text-sm">Donor / CSR Requirements</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Submit a CSR or individual donor requirement. Fill form manually or upload a document.
            </p>
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 border border-blue-300 px-2 py-0.5 rounded-md">🏢 CSR / Donor</div>
            <div className="mt-2 text-xs text-blue-500">Agents: Extraction → Gap Diagnoser → Matching</div>
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => { setShowForm(false); setResult(null) }}
              className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
              ← Back
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
              🏢 Donor Requirements (CSR)
            </span>
          </div>
          <DonorForm onSubmit={submitDonor} submitting={submitting} />
        </div>
      )}
    </div>
  )
}