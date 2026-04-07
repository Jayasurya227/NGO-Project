'use client';
import { useState, useRef } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Upload } from 'lucide-react';

type Mode = 'manual' | 'upload';

const SECTORS = ['EDUCATION', 'HEALTHCARE', 'LIVELIHOOD', 'ENVIRONMENT', 'WATER_SANITATION', 'OTHER'];

const reqV  = (v: string, l: string) => v.trim() === '' ? `${l} is required` : null;
const posNum = (v: string, l: string) => (isNaN(Number(v)) || Number(v) <= 0) ? `${l} must be a positive number` : null;
const Err = ({ msg }: { msg?: string }) => msg ? <p className="text-red-500 text-xs mt-1">{msg}</p> : null;

const inp = (err?: string) =>
  `w-full border rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none ${err ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`;
const sel = () =>
  'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white';
const lbl = (text: string, required = false) => (
  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
    {text}{required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

function Section({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
        <span className="bg-emerald-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold flex-shrink-0">{num}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function UploadRFPPage() {
  const [mode, setMode]     = useState<Mode>('upload');
  const [file, setFile]     = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    sectors: [] as string[],
    preferredState: '', preferredDistrict: '', specificLocation: '',
    minBudget: '', maxBudget: '', totalFunding: '',
    minDuration: '', maxDuration: '',
    kpi1: '', kpi2: '', specificMetric: '',
    reportingCadence: 'QUARTERLY', reportingFormat: 'PDF',
    evidenceTypes: '', dataSharingLevel: 'SUMMARY',
    csrScheduleVII: '', otherCompliance: '', additionalNotes: '',
  });

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }));
  const toggleSector = (s: string) => setForm(f => ({
    ...f, sectors: f.sectors.includes(s) ? f.sectors.filter(x => x !== s) : [...f.sectors, s]
  }));

  function validate() {
    const e: Record<string, string> = {};
    if (mode === 'upload') {
      if (!file) e.file = 'Please select a file to upload';
    } else {
      if (form.sectors.length === 0) e.sectors = 'Select at least one sector';
      const s = reqV(form.preferredState, 'Preferred State'); if (s) e.preferredState = s;
      const k = reqV(form.kpi1, 'KPI 1'); if (k) e.kpi1 = k;
      if (form.minBudget && form.maxBudget && Number(form.minBudget) > Number(form.maxBudget))
        e.maxBudget = 'Max budget must be greater than min budget';
      if (form.minBudget) { const n = posNum(form.minBudget, 'Min Budget'); if (n) e.minBudget = n; }
      if (form.maxBudget) { const n = posNum(form.maxBudget, 'Max Budget'); if (n) e.maxBudget = n; }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setStatus('submitting');
    setErrorMessage(null);

    try {
      const token   = localStorage.getItem('donorAccessToken');
      const donorId = localStorage.getItem('donorId');

      if (mode === 'upload') {
        const formData = new FormData();
        formData.append('file', file!);
        if (donorId) formData.append('donorId', donorId);
        const res = await fetch(`${API_URL}/api/requirements/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error?.message || 'Upload failed');
        }
      } else {
        const notes = [
          `Sectors: ${form.sectors.join(', ')}`,
          `State: ${form.preferredState}`,
          form.preferredDistrict   ? `District: ${form.preferredDistrict}` : '',
          form.specificLocation    ? `Location: ${form.specificLocation}` : '',
          form.minBudget           ? `Budget: ₹${form.minBudget}–${form.maxBudget} INR` : '',
          form.totalFunding        ? `Total Funding Available: ₹${form.totalFunding} INR` : '',
          form.minDuration         ? `Duration: ${form.minDuration}–${form.maxDuration} months` : '',
          `KPI 1: ${form.kpi1}`,
          form.kpi2                ? `KPI 2: ${form.kpi2}` : '',
          form.specificMetric      ? `Specific Metric: ${form.specificMetric}` : '',
          `Reporting Cadence: ${form.reportingCadence}`,
          `Reporting Format: ${form.reportingFormat}`,
          form.evidenceTypes       ? `Evidence Types: ${form.evidenceTypes}` : '',
          `Data Sharing Level: ${form.dataSharingLevel}`,
          form.csrScheduleVII      ? `CSR Schedule VII: ${form.csrScheduleVII}` : '',
          form.otherCompliance     ? `Other Compliance: ${form.otherCompliance}` : '',
          form.additionalNotes     ? `Notes: ${form.additionalNotes}` : '',
        ].filter(Boolean).join(' | ');

        const res = await fetch(`${API_URL}/api/requirements`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ donorId, notes }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error?.message || 'Submission failed');
        }
      }

      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'An unexpected error occurred.');
    }
  }

  function reset() {
    setFile(null); setStatus('idle'); setErrorMessage(null); setErrors({});
    setForm({
      sectors: [], preferredState: '', preferredDistrict: '', specificLocation: '',
      minBudget: '', maxBudget: '', totalFunding: '', minDuration: '', maxDuration: '',
      kpi1: '', kpi2: '', specificMetric: '', reportingCadence: 'QUARTERLY', reportingFormat: 'PDF',
      evidenceTypes: '', dataSharingLevel: 'SUMMARY', csrScheduleVII: '', otherCompliance: '', additionalNotes: '',
    });
  }

  if (status === 'success') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Submission Successful</h2>
          <p className="text-slate-700 text-sm mb-6">
            Our AI is now analyzing your RFP. You'll see the pitch deck on your Impact Overview once the DRM reviews and approves it.
          </p>
          <button onClick={reset} className="px-6 py-2.5 bg-emerald-600 text-white rounded-full text-sm font-bold hover:bg-emerald-700 transition-colors">
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Submit RFP</h1>
        <p className="text-slate-700 text-sm mt-1">Submit your Request for Proposal for AI-driven matching and pitch deck generation.</p>
      </header>

      {/* Mode Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">How would you like to submit?</p>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setMode('manual')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${mode === 'manual' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}>
            <span className="text-xl">✍️</span>
            <div>
              <p className={`text-sm font-bold ${mode === 'manual' ? 'text-emerald-700' : 'text-slate-700'}`}>Fill Form Manually</p>
              <p className="text-xs text-slate-700 mt-0.5">Enter all fields in the form below</p>
            </div>
          </button>
          <button type="button" onClick={() => setMode('upload')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${mode === 'upload' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}>
            <span className="text-xl">📁</span>
            <div>
              <p className={`text-sm font-bold ${mode === 'upload' ? 'text-emerald-700' : 'text-slate-700'}`}>Upload Document</p>
              <p className="text-xs text-slate-700 mt-0.5">AI extracts all fields automatically</p>
            </div>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── UPLOAD MODE ── */}
        {mode === 'upload' && (
          <div className={`bg-white rounded-2xl border-2 p-6 shadow-sm ${file ? 'border-emerald-400' : 'border-dashed border-slate-300'}`}>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Upload RFP Document</h3>
            <p className="text-xs text-slate-700 mb-4">AI will extract sector, geography, budget and KPIs automatically.</p>
            <div onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'}`}>
              {file ? (
                <div>
                  <p className="text-3xl mb-2">📄</p>
                  <p className="text-sm font-bold text-emerald-700">{file.name}</p>
                  <p className="text-xs text-slate-700 mt-1">{(file.size / 1024).toFixed(0)} KB — ready to submit</p>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">Click to browse or drag and drop</p>
                  <p className="text-xs text-slate-600 mt-1">PDF, DOCX, images, Excel, or any document — Max 50 MB</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setErrors({}); } }} />
            </div>
            {file && (
              <button type="button" onClick={() => setFile(null)} className="mt-2 text-xs text-red-500 hover:text-red-700">
                Remove file ✕
              </button>
            )}
            <Err msg={errors.file} />
          </div>
        )}

        {/* ── MANUAL MODE ── */}
        {mode === 'manual' && (
          <>
            <Section num={1} title="Preferred Sectors">
              <div className="flex flex-wrap gap-2">
                {SECTORS.map(s => (
                  <button key={s} type="button" onClick={() => toggleSector(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${form.sectors.includes(s) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-400'}`}>
                    {s.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              <Err msg={errors.sectors} />
            </Section>

            <Section num={2} title="Preferred Geography">
              <div className="grid grid-cols-3 gap-3">
                <div>{lbl('State', true)}<input value={form.preferredState} onChange={set('preferredState')} className={inp(errors.preferredState)} placeholder="e.g. Maharashtra" /><Err msg={errors.preferredState} /></div>
                <div>{lbl('District (Optional)')}<input value={form.preferredDistrict} onChange={set('preferredDistrict')} className={inp()} placeholder="e.g. Wardha, Nagpur" /></div>
                <div>{lbl('Specific Location (Optional)')}<input value={form.specificLocation} onChange={set('specificLocation')} className={inp()} placeholder="e.g. Arvi Village" /></div>
              </div>
            </Section>

            <Section num={3} title="Financial Parameters (INR)">
              <div className="grid grid-cols-3 gap-3">
                <div>{lbl('Minimum Budget')}<input type="number" value={form.minBudget} onChange={set('minBudget')} className={inp(errors.minBudget)} placeholder="e.g. 2500000" /><Err msg={errors.minBudget} /></div>
                <div>{lbl('Maximum Budget')}<input type="number" value={form.maxBudget} onChange={set('maxBudget')} className={inp(errors.maxBudget)} placeholder="e.g. 5000000" /><Err msg={errors.maxBudget} /></div>
                <div>{lbl('Total Funding Available')}<input type="number" value={form.totalFunding} onChange={set('totalFunding')} className={inp()} placeholder="e.g. 5000000" /></div>
              </div>
            </Section>

            <Section num={4} title="Project Duration">
              <div className="grid grid-cols-2 gap-3">
                <div>{lbl('Minimum Duration (Months)')}<input type="number" value={form.minDuration} onChange={set('minDuration')} className={inp()} placeholder="e.g. 6" /></div>
                <div>{lbl('Maximum Duration (Months)')}<input type="number" value={form.maxDuration} onChange={set('maxDuration')} className={inp()} placeholder="e.g. 24" /></div>
              </div>
            </Section>

            <Section num={5} title="KPIs / Desired Outcomes">
              <div className="space-y-3">
                <div>{lbl('KPI 1', true)}<input value={form.kpi1} onChange={set('kpi1')} className={inp(errors.kpi1)} placeholder="e.g. 1,000 students enrolled in digital literacy program" /><Err msg={errors.kpi1} /></div>
                <div>{lbl('KPI 2 (Optional)')}<input value={form.kpi2} onChange={set('kpi2')} className={inp()} placeholder="e.g. 80% pass rate in assessment" /></div>
                <div>{lbl('Specific Metric (Optional)')}<input value={form.specificMetric} onChange={set('specificMetric')} className={inp()} placeholder="e.g. cost-per-beneficiary, literacy rate improvement" /></div>
              </div>
            </Section>

            <Section num={6} title="Reporting Requirements">
              <div className="grid grid-cols-2 gap-3">
                <div>{lbl('Reporting Cadence')}<select value={form.reportingCadence} onChange={set('reportingCadence')} className={sel()}><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="HALF_YEARLY">Bi-Annual</option><option value="ANNUALLY">Annually</option><option value="MILESTONE_BASED">Milestone Based</option></select></div>
                <div>{lbl('Preferred Format')}<select value={form.reportingFormat} onChange={set('reportingFormat')} className={sel()}><option value="PDF">PDF</option><option value="DASHBOARD">Dashboard</option><option value="EXCEL">Excel</option></select></div>
                <div>{lbl('Evidence Types')}<input value={form.evidenceTypes} onChange={set('evidenceTypes')} className={inp()} placeholder="e.g. Photos, GPS Stamps, Attendance Registers" /></div>
                <div>{lbl('Data Sharing Level')}<select value={form.dataSharingLevel} onChange={set('dataSharingLevel')} className={sel()}><option value="SUMMARY">Summary Only</option><option value="AGGREGATE_ONLY">Aggregate Only</option><option value="MILESTONE_EVIDENCE">Milestone Evidence</option><option value="ANONYMISED_BENEFICIARY">Anonymised Beneficiary</option></select></div>
              </div>
            </Section>

            <Section num={7} title="Compliance (CSR)">
              <div className="grid grid-cols-2 gap-3">
                <div>{lbl('CSR Schedule VII Alignment')}<input value={form.csrScheduleVII} onChange={set('csrScheduleVII')} className={inp()} placeholder="e.g. Clause (i) Education, Clause (iv) Environment" /></div>
                <div>{lbl('Other Compliance Requirements')}<input value={form.otherCompliance} onChange={set('otherCompliance')} className={inp()} placeholder="e.g. FCRA registration required" /></div>
              </div>
            </Section>

            <Section num={8} title="Additional Notes">
              <textarea value={form.additionalNotes} onChange={set('additionalNotes')} rows={3} className={inp()} placeholder="Additional context, restrictions, or strategic priorities for this funding cycle..." />
            </Section>
          </>
        )}

        {status === 'error' && errorMessage && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100 flex items-start gap-2">
            <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        <button type="submit" disabled={status === 'submitting'}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-sm transition-colors shadow-sm">
          {status === 'submitting'
            ? '⏳ Submitting — AI agents starting...'
            : mode === 'upload'
            ? '🚀 Upload & Start AI Analysis'
            : '🚀 Submit RFP & Start AI Matching'}
        </button>
      </form>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-2">
            <AlertCircle className="w-4 h-4" /> AI Guidelines
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            Ensure your RFP clearly states the budget range, target geography, and priority sectors for better matching results.
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-blue-800 font-bold text-sm mb-2">
            <CheckCircle2 className="w-4 h-4" /> Privacy Note
          </div>
          <p className="text-xs text-blue-700 leading-relaxed">
            Your documents are processed securely. Personally Identifiable Information (PII) is handled with strict confidentiality.
          </p>
        </div>
      </div>
    </div>
  );
}
