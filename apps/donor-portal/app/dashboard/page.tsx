'use client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, CheckCircle2, Heart, FileText, Clock, ChevronRight, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function DonorDashboardPage() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function downloadPitchDeck(artifactId: string, requirementId: string) {
    setDownloadingId(artifactId);
    try {
      const token = localStorage.getItem('donorAccessToken');
      // Find initiative matched to this requirement and download its pitch deck
      const res = await fetch(`http://localhost:4000/api/requirements/${requirementId}/pitch-deck-file`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pitch-deck-${requirementId}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Download failed. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  }

  const { data: pitchDecksData } = useQuery({
    queryKey: ['pitch-decks'],
    queryFn: async () => {
      const token = localStorage.getItem('donorAccessToken');
      const res = await fetch('http://localhost:4000/api/requirements/pitch-decks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }
  });

  const { data: storiesData } = useQuery({
    queryKey: ['stories-preview'],
    queryFn: async () => {
      const token = localStorage.getItem('donorAccessToken');
      const res = await fetch('http://localhost:4000/api/stories?limit=2', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }
  });

  const { data: reqsData } = useQuery({
    queryKey: ['requirements-preview'],
    queryFn: async () => {
      const token = localStorage.getItem('donorAccessToken');
      const res = await fetch('http://localhost:4000/api/requirements', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }
  });

  const { data: initiativesData } = useQuery({
    queryKey: ['initiatives-stats'],
    queryFn: async () => {
      const token = localStorage.getItem('donorAccessToken');
      const res = await fetch('http://localhost:4000/api/initiatives?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }
  });

  const stories = storiesData?.data || [];
  const requirements: any[] = reqsData?.data || [];
  const pitchDecks = (pitchDecksData?.data || []).filter((d: any) => d.approvalStatus === 'APPROVED');

  const allInitiatives: any[] = initiativesData?.data || [];
  const activeInitiatives = allInitiatives.filter((i: any) => i.status === 'ACTIVE').length;
  const totalMilestones   = requirements.reduce((acc: number, r: any) => acc + (r.matchCount ?? 0), 0);
  const livesImpacted     = requirements.reduce((acc: number, r: any) => {
    const matches = r.topMatches ?? [];
    return acc + matches.reduce((s: number, m: any) => s + (m.initiative?.targetBeneficiaries ?? 0), 0);
  }, 0);

  const stats = [
    { label: 'Active Initiatives', value: activeInitiatives.toString(), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Impact Milestones',  value: totalMilestones.toString(),   icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Lives Impacted',     value: livesImpacted.toLocaleString('en-IN'), icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Impact Overview</h1>
          <p className="text-slate-500 text-sm">Welcome back! Here is the latest progress from your funded initiatives.</p>
        </div>
        <Link href="/dashboard/upload" className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm">
          Submit New RFP
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className={`${stat.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* RFP Submissions */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Your Submissions</h2>
              <span className="text-slate-400 text-xs font-medium">{requirements.length} Total</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {requirements.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-sm">
                  No RFPs uploaded yet. Submit your first one to start matching.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {requirements.map((req: any) => {
                    const ef = req.extractedFields as any
                    const isResubmission = ef?.resubmissionRequested === true
                    return (
                      <div key={req.id} className="hover:bg-slate-50 transition-colors">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isResubmission ? 'bg-orange-100' : 'bg-slate-100'}`}>
                              <FileText className={`w-5 h-5 ${isResubmission ? 'text-orange-500' : 'text-slate-400'}`} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {ef?.companyName || req.donor?.orgName || req.rawDocumentUrl?.split(':')[1] || 'RFP Document'}
                              </p>

                              <div className="flex items-center gap-2 mt-0.5">
                                {isResubmission ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-orange-100 text-orange-700">
                                    Resubmission Required
                                  </span>
                                ) : (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                    req.status === 'MATCHED' ? 'bg-emerald-100 text-emerald-700' :
                                    req.status === 'PENDING_EXTRACTION' ? 'bg-amber-100 text-amber-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {req.status.replace(/_/g, ' ')}
                                  </span>
                                )}
                                <span className="text-slate-300 text-xs">•</span>
                                <span className="text-slate-400 text-[10px] flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(req.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>

                        {/* Resubmission notice */}
                        {isResubmission && (
                          <div className="mx-4 mb-3 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs text-orange-800 flex items-start gap-2">
                            <span className="text-base leading-none">📨</span>
                            <div>
                              <p className="font-semibold">Action Required: Please resubmit your document</p>
                              {ef.resubmissionNote && <p className="mt-0.5 text-orange-700">{ef.resubmissionNote}</p>}
                              <Link href="/dashboard/upload" className="mt-1 inline-block font-bold underline hover:text-orange-900">
                                Upload Revised Document →
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Stories */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Latest Impact Stories</h2>
              <Link href="/dashboard/stories" className="text-emerald-600 text-sm font-medium hover:underline">
                View all
              </Link>
            </div>
            
            <div className="space-y-4">
              {stories.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400">
                  <Heart className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No stories available yet</p>
                </div>
              ) : (
                stories.map((story: any) => (
                  <div key={story.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-200 transition-colors cursor-pointer shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">
                        {story.initiative?.sector || 'IMPACT'}
                      </span>
                      <span className="text-slate-300 text-xs">•</span>
                      <span className="text-slate-400 text-xs">{new Date(story.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">{story.contentJson?.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2">{story.contentJson?.body}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Funding Status</h2>
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600 font-medium">Total Committed</span>
                  <span className="text-slate-900 font-bold">₹0.00</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[0%]"></div>
                </div>
              </div>
              <div className="space-y-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Requirement ID</span>
                  <span className="text-slate-900 font-bold">REQ-PENDING</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Last Allocation</span>
                  <span className="text-slate-900 font-bold">N/A</span>
                </div>
                <button disabled className="w-full mt-2 py-2 bg-slate-100 text-slate-400 font-bold rounded-lg uppercase tracking-wider cursor-not-allowed">
                  View Contract
                </button>
              </div>
            </div>
          </div>

          {/* Pitch Decks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Your Pitch Decks</h2>
              <span className="text-slate-400 text-xs font-medium">{pitchDecks.length} Approved</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {pitchDecks.length === 0 ? (
                <div className="p-6 text-center text-slate-400 italic text-xs">
                  No pitch decks yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pitchDecks.map((deck: any) => {
                    const isApproved = deck.approvalStatus === 'APPROVED';
                    return (
                      <div key={deck.id} className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isApproved ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                            <FileText className={`w-4 h-4 ${isApproved ? 'text-emerald-600' : 'text-amber-500'}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{deck.initiativeTitle ?? 'Impact Partnership Proposal'}</p>
                          {deck.ngoName && <p className="text-[10px] text-slate-500 truncate">{deck.ngoName}</p>}
                            <p className="text-[10px] mt-0.5 flex items-center gap-1">
                              {isApproved ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                  <span className="text-slate-400">Approved {deck.approvedAt ? new Date(deck.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                  <span className="text-amber-600 font-medium">Awaiting DRM Review</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        {isApproved ? (
                          <button
                            disabled={downloadingId === deck.id}
                            onClick={() => downloadPitchDeck(deck.id, deck.relatedEntityId)}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                          >
                            {downloadingId === deck.id ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Downloading...</>
                            ) : (
                              <><Download className="w-3 h-3" /> Download PPTX</>
                            )}
                          </button>
                        ) : (
                          <span className="w-full flex items-center justify-center text-[10px] font-bold px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700">
                            PENDING REVIEW
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
