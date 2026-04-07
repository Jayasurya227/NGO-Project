'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Clock,
  MapPin,
  Heart,
  Loader2,
  Upload,
  FileText,
  XCircle,
  AlertCircle,
  MessageSquare,
  Send
} from 'lucide-react';
import Link from 'next/link';

import { useState } from 'react';

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

const SDG_MAP: Record<string, string> = {
  'NO_POVERTY': 'SDG 1: No Poverty',
  'ZERO_HUNGER': 'SDG 2: Zero Hunger',
  'GOOD_HEALTH': 'SDG 3: Good Health',
  'QUALITY_EDUCATION': 'SDG 4: Quality Education',
  'GENDER_EQUALITY': 'SDG 5: Gender Equality',
  'CLEAN_WATER': 'SDG 6: Clean Water',
  'REDUCED_INEQUALITY': 'SDG 10: Reduced Inequality',
  'SDG4': 'SDG 4: Quality Education',
  'SDG1': 'SDG 1: No Poverty',
  'SDG2': 'SDG 2: Zero Hunger',
  'SDG3': 'SDG 3: Good Health',
  'SDG5': 'SDG 5: Gender Equality',
  'SDG6': 'SDG 6: Clean Water',
  'SDG10': 'SDG 10: Reduced Inequality'
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function DonorInitiativeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoRequestStatus, setInfoRequestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [infoMessage, setInfoMessage] = useState('');
  const [infoError, setInfoError] = useState<string | null>(null);

  const { data: initData, isLoading, refetch } = useQuery({
    queryKey: ['donor-initiative', id],
    queryFn: async () => {
      const token = localStorage.getItem('donorAccessToken');
      const res = await fetch(`${API_URL}/api/initiatives/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const { data: inquiryData, refetch: refetchInquiries } = useQuery({
    queryKey: ['donor-inquiries', id],
    queryFn: async () => {
      const token = localStorage.getItem('donorAccessToken');
      const res = await fetch(`${API_URL}/api/initiatives/${id}/inquiries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return { data: [] };
      return res.json();
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus('idle');
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploadStatus('uploading');
    setUploadError(null);
    
    try {
      const token = localStorage.getItem('donorAccessToken');
      const donorId = localStorage.getItem('donorId');
      const formData = new FormData();
      formData.append('file', file);
      if (donorId) {
        formData.append('donorId', donorId);
      }
      
      const res = await fetch(`${API_URL}/api/requirements/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error?.message || 'Upload failed');
      }
      setUploadStatus('success');
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadStatus('idle');
        setFile(null);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setUploadStatus('error');
      setUploadError(err.message || 'An unexpected error occurred during upload.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const initiative = initData?.data;

  // Strip raw PDF/binary content from description
  function safeDescription(raw: string | null | undefined): string {
    if (!raw) return "";
    if (raw.trimStart().startsWith("%PDF") || raw.includes("\x00") || /[\x00-\x08\x0e-\x1f]/.test(raw)) return "";
    return raw;
  }

  if (!initiative) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="text-xl font-bold mb-4">Initiative not found</p>
        <button onClick={() => router.push('/dashboard/initiatives')} className="text-emerald-600 font-bold">
          Back to list
        </button>
      </div>
    );
  }

  const progress = (initiative.budgetFunded / initiative.budgetRequired) * 100 || 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Banner / Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <button 
            onClick={() => router.push('/dashboard/initiatives')}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-widest">Back to Initiatives</span>
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  {SECTOR_MAP[initiative.sector] || initiative.sector}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-lg">
                  {initiative.tenant?.name || "Verified NGO"}
                </span>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">

                  <MapPin className="w-3.5 h-3.5" />
                  {initiative.geography.state}{initiative.geography.district ? `, ${initiative.geography.district}` : ''}
                </div>
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-4 leading-tight max-w-3xl">
                {initiative.title}
              </h1>
              <p className="text-slate-500 text-base leading-relaxed max-w-2xl mb-6 line-clamp-3">
                 {safeDescription(initiative.description) || "Fund this verified initiative to drive sustainable impact in the community."}
              </p>
              <div className="flex flex-wrap gap-2">
                {initiative.sdgTags?.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100/50">
                    {SDG_MAP[tag] || `#${tag}`}
                  </span>
                ))}
              </div>
            </div>

            <div className="w-full md:w-80 bg-slate-900 text-white rounded-3xl p-8 shadow-2xl shadow-emerald-900/20 shrink-0">
              <div className="mb-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Total Requirement</p>
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-6 h-6 text-emerald-400" />
                  <span className="text-3xl font-bold">₹{initiative.budgetRequired.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2 mb-8">
                <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${Math.min(100, progress)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-emerald-400">{Math.round(progress)}% Funded</span>
                  <span className="text-slate-400">₹{initiative.budgetFunded?.toLocaleString() ?? 0} Received</span>
                </div>
              </div>

              <button disabled className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                Co-Invest Now
              </button>
              <p className="text-[10px] text-center mt-3 text-slate-500 font-medium italic">Contact your DRM to start funding this project</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 text-sm">01</div>
                Project Description
              </h2>
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {safeDescription(initiative.description) || "No detailed description provided for this initiative yet."}
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 text-sm">02</div>
                  Impact Milestones
                </h2>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Roadmap</span>
              </div>
              
              <div className="space-y-4">
                {initiative.milestones?.length === 0 ? (
                  <div className="p-12 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400 font-medium italic">
                    Roadmap is currently being finalized by the field team.
                  </div>
                ) : (
                  initiative.milestones?.map((ml: any, idx: number) => (
                    <div key={ml.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between hover:border-emerald-200 transition-colors shadow-sm group">
                      <div className="flex items-center gap-6">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 mb-1">{ml.title}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due {new Date(ml.dueDate).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" /> ₹{ml.budgetAllocated.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                        ml.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {ml.status}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <InquiryHistory id={id} inquiries={inquiryData?.data} onRefetch={refetchInquiries} />
          </div>

          {/* Sidebar / Impact Stats */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 px-2">Key Metrics</h2>
            
            <ImpactCard 
              label="Target Lives" 
              value={initiative.targetBeneficiaries?.toLocaleString()} 
              icon={Users} 
              sub="Total beneficiaries"
              color="emerald"
            />
            
            <ImpactCard 
              label="Duration" 
              value={initiative.startDate ? `${Math.ceil((new Date(initiative.endDate).getTime() - new Date(initiative.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} Months` : 'N/A'} 
              icon={Clock} 
              sub="Estimated project span"
              color="blue"
            />

            <div className="bg-emerald-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-600/20 relative overflow-hidden group">
              <Heart className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-700" />
              <h3 className="text-lg font-bold mb-2">Support this Cause</h3>
              <p className="text-emerald-100 text-xs leading-relaxed mb-6">
                This initiative directly supports {initiative.sdgTags?.[0] ? SDG_MAP[initiative.sdgTags[0]] : 'impact goals'}. 
                Join us in making a sustainable difference.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push('/dashboard/upload')}
                  className="w-full py-3 bg-white text-emerald-600 font-bold rounded-xl text-sm flex items-center justify-center gap-2 border border-emerald-100 ring-4 ring-emerald-50/50"
                >
                  Upload RFP for Analysis
                  <Upload className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowInfoModal(true)}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/40 active:scale-95"
                >
                  Need more information
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Request Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Request Information</h3>
              <button 
                onClick={() => { setShowInfoModal(false); setInfoRequestStatus('idle'); setInfoMessage(''); }} 
                className="text-slate-400 hover:text-slate-900"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {infoRequestStatus === 'success' ? (
              <div className="text-center py-8">
                <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">Request Sent</h4>
                <p className="text-slate-500 text-sm">Our DRM will get back to you shortly with the details you requested.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-slate-500 text-sm">
                  Specify what information you need regarding <span className="font-bold text-slate-900">{initiative.title}</span>.
                </p>

                {infoError && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>{infoError}</p>
                  </div>
                )}

                <textarea 
                  rows={4}
                  value={infoMessage}
                  onChange={(e) => { setInfoMessage(e.target.value); setInfoError(null); }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 placeholder:text-slate-400"
                  placeholder="e.g., Can I get more details on the target location?"
                />

                <button
                  disabled={!infoMessage.trim() || infoRequestStatus === 'sending'}
                  onClick={async () => {
                    setInfoRequestStatus('sending');
                    setInfoError(null);
                    try {
                      const token = localStorage.getItem('donorAccessToken');
                      const res = await fetch(`${API_URL}/api/initiatives/${id}/inquiry`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ message: infoMessage })
                      });

                      if (!res.ok) {
                        const errData = await res.json().catch(() => null);
                        throw new Error(errData?.error?.message || 'Failed to send inquiry');
                      }
                      setInfoRequestStatus('success');
                      setInfoMessage('');
                      refetchInquiries();
                    } catch (err: any) {
                      setInfoRequestStatus('error');
                      setInfoError(err.message || 'An unexpected error occurred.');
                    }
                  }}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {infoRequestStatus === 'sending' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Send Request
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Upload RFP</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-900">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {uploadStatus === 'success' ? (
              <div className="text-center py-8">
                <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">Upload Successful</h4>
                <p className="text-slate-500 text-sm">Our AI is now analyzing your document.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-slate-500 text-sm">
                  Upload your Request for Proposal (RFP) to see how it matches with this initiative.
                </p>

                {uploadError && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>{uploadError}</p>
                  </div>
                )}

                {!file ? (
                  <label className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer group hover:border-emerald-500 transition-colors">
                    <Upload className="w-10 h-10 text-slate-300 group-hover:text-emerald-500 transition-colors mb-4" />
                    <span className="text-sm font-bold text-slate-500 group-hover:text-emerald-600">Select RFP Document</span>
                    <span className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest">PDF or DOCX</span>
                    <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.docx,.doc" />
                  </label>
                ) : (
                  <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-emerald-500" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[150px]">{file.name}</p>
                        <p className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {file && (
                  <button
                    onClick={handleUpload}
                    disabled={uploadStatus === 'uploading'}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {uploadStatus === 'uploading' ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </div>
                    ) : (
                      'Submit for Analysis'
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InquiryHistory({ id, inquiries, onRefetch }: { id: string, inquiries: any[], onRefetch: () => void }) {
  if (!inquiries || inquiries.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 text-sm">03</div>
          My Inquiry History
        </h2>
      </div>

      <div className="space-y-6">
        {inquiries.map((iq) => (
          <div key={iq.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-50">
              <div className="flex items-center justify-between mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Inquiry on {new Date(iq.timestamp).toLocaleDateString()}</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">Sent</span>
              </div>
              <p className="text-slate-700 italic">"{iq.afterState?.message}"</p>
            </div>

            {iq.metadata?.response ? (
              <div className="p-6 bg-emerald-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={14} />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">DRM Response</span>
                </div>
                <p className="text-emerald-900 font-medium">{iq.metadata.response}</p>
                <p className="text-[10px] text-emerald-500 mt-2 font-bold uppercase">
                  Answered at: {new Date(iq.metadata.respondedAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <div className="p-6 bg-slate-50/30 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <Clock className="w-3 h-3" />
                Awaiting response from DRM...
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ImpactCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: any = {
    emerald: 'text-emerald-600 bg-emerald-50',
    blue: 'text-blue-600 bg-blue-50'
  };

  return (
    <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500 mt-1 font-medium italic">{sub}</p>
    </div>
  );
}

function Users(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
