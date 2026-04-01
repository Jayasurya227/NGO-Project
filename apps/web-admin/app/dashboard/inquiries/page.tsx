'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { MessageSquare, Calendar, User, ArrowRight, ExternalLink, Send, Loader2, CheckCircle2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function InquiriesPage() {
  const queryClient = useQueryClient()
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['inquiries'],
    queryFn: () => apiFetch<{ data: any[] }>('/api/donors/inquiries')
  })

  const responseMutation = useMutation({
    mutationFn: async ({ id, response }: { id: string, response: string }) => {
      const res = await apiFetch<{ success: boolean; error?: any }>(`/api/donors/inquiries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ response })
      })
      if (!res.success) throw new Error(res.error?.message || 'Failed to save response')
      return res
    },
    onSuccess: () => {
      toast.success('Response saved successfully!')
      setRespondingTo(null)
      setResponseText('')
      queryClient.invalidateQueries({ queryKey: ['inquiries'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save response')
    }
  })
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch<{ success: boolean; error?: any }>(`/api/donors/inquiries/${id}`, {
        method: 'DELETE'
      })
      if (!res.success) throw new Error(res.error?.message || 'Failed to delete inquiry')
      return res
    },
    onSuccess: () => {
      toast.success('Inquiry deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['inquiries'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete inquiry')
    }
  })

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const inquiries = data?.data || []

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Donor Inquiries</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and respond to information requests from donors.</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Total Requests</p>
          <p className="text-xl font-black text-blue-900">{inquiries.length}</p>
        </div>
      </div>

      {inquiries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border-2 border-dashed border-gray-200 rounded-3xl">
          <MessageSquare className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">No inquiries found.</p>
          <p className="text-sm text-gray-400 mt-1">Inquiries from the "Need more information" button will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {inquiries.map((iq: any) => (
            <div key={iq.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{iq.donorOrg}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <Calendar size={12} />
                        {new Date(iq.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link 
                      href={`/dashboard/initiatives/${iq.entityId}`}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 bg-blue-50/50 transition-colors"
                    >
                      View Initiative
                      <ExternalLink size={12} />
                    </Link>
                    <button 
                      onClick={() => { if(confirm('Delete this inquiry?')) deleteMutation.mutate(iq.id) }}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Inquiry"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-4">
                  <p className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    <MessageSquare size={10} />
                    Inquiry Message
                  </p>
                  <p className="text-gray-700 leading-relaxed italic">
                    "{iq.afterState?.message}"
                  </p>
                </div>

                {iq.metadata?.response ? (
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 mb-4">
                    <p className="text-sm font-medium text-emerald-600 mb-2 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                      <CheckCircle2 size={10} />
                      DRM Response
                    </p>
                    <p className="text-emerald-900 leading-relaxed font-medium">
                      {iq.metadata.response}
                    </p>
                    <p className="text-[10px] text-emerald-500 mt-2 font-bold uppercase">
                      Responded at: {new Date(iq.metadata.respondedAt).toLocaleString()}
                    </p>
                  </div>
                ) : respondingTo === iq.id ? (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 mb-4 animate-in slide-in-from-top-2 duration-200">
                    <textarea 
                      autoFocus
                      rows={3}
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      className="w-full bg-white border border-blue-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Type your response to the donor..."
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <button 
                        onClick={() => setRespondingTo(null)}
                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                      <button 
                        disabled={!responseText.trim() || responseMutation.isPending}
                        onClick={() => responseMutation.mutate({ id: iq.id, response: responseText })}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {responseMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Send Response
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Regarding Initiative:</span>
                    <span className="text-xs font-bold text-gray-700 uppercase">{iq.afterState?.initiativeTitle || 'N/A'}</span>
                  </div>
                  {!iq.metadata?.response && respondingTo !== iq.id && (
                    <button 
                      onClick={() => { setRespondingTo(iq.id); setResponseText(''); }}
                      className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Respond
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
