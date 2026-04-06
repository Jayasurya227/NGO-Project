'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Calendar, ArrowRight, Clock, CheckCircle2, ChevronRight, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function MyInquiriesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-inquiries'],
    queryFn: async () => {
      const token = localStorage.getItem('donorAccessToken');
      const res = await fetch('http://localhost:4000/api/donors/my-inquiries', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  })

  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('donorAccessToken');
      const res = await fetch(`http://localhost:4000/api/donors/inquiries/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to delete inquiry');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Inquiry deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['my-inquiries'] })
    },
    onError: (err: any) => {
      toast.error(err.message)
    }
  })

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    )
  }

  const inquiries = data?.data || []

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen bg-slate-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Inquiries</h1>
          <p className="text-sm text-slate-700 mt-1">Track your information requests and NGO responses.</p>
        </div>
        <div className="bg-emerald-600 px-4 py-2 rounded-2xl shadow-lg shadow-emerald-600/20 text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm font-bold">{inquiries.length} Inquiries</span>
        </div>
      </div>

      {inquiries.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-10 h-10 text-slate-200" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">No inquiries yet</h2>
          <p className="text-slate-700 mb-8 max-w-sm mx-auto text-sm">
            Questions you ask via the "Need more information" button on initiative pages will appear here.
          </p>
          <Link 
            href="/dashboard/initiatives" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
          >
            Explore Initiatives
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {inquiries.map((iq: any) => (
            <div key={iq.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        {iq.afterState?.initiativeTitle || 'Initiative Inquiry'}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700 uppercase tracking-widest mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(iq.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {iq.metadata?.response ? (
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" />
                        Answered
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 border border-amber-100">
                        <Clock className="w-3 h-3" />
                        Pending Response
                      </span>
                    )}
                    <button 
                      onClick={() => { if(confirm('Delete this inquiry?')) deleteMutation.mutate(iq.id) }}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                      title="Delete Inquiry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6">
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-3">Your Message</p>
                  <p className="text-slate-700 text-sm leading-relaxed italic italic">
                    "{iq.afterState?.message}"
                  </p>
                </div>

                {iq.metadata?.response && (
                  <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">NGO Response</span>
                    </div>
                    <p className="text-emerald-900 text-sm font-medium leading-relaxed">
                      {iq.metadata.response}
                    </p>
                    <p className="text-[10px] text-emerald-500 mt-3 font-bold uppercase">
                      Answered on {new Date(iq.metadata.respondedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Link 
                    href={`/dashboard/initiatives/${iq.entityId}`}
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-600 transition-colors py-2 px-4 rounded-xl hover:bg-emerald-50"
                  >
                    View Project Details
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
