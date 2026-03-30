'use client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, CheckCircle2, Heart, FileText, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function DonorDashboardPage() {
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

  const stats = [
    { label: 'Active Initiatives', value: '0', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Impact Milestones', value: '0', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Lives Impacted', value: '0', icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  const stories = storiesData?.data || [];
  const requirements = reqsData?.data || [];

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
              <span className="text-xs text-slate-400 font-medium">Coming Soon</span>
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
                  {requirements.map((req: any) => (
                    <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-100 w-10 h-10 rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {(req.extractedFields as any)?.companyName || req.donor?.orgName || req.rawDocumentUrl?.split(':')[1] || 'RFP Document'}
                          </p>

                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              req.status === 'MATCHED' ? 'bg-emerald-100 text-emerald-700' :
                              req.status === 'PENDING_EXTRACTION' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {req.status.replace('_', ' ')}
                            </span>
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
                  ))}
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
      </div>
    </div>
  );
}
