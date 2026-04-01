'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { getSession } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function ContentDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/content/${id}/download`, {
        headers: { 'Authorization': `Bearer ${getSession()?.accessToken}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pitch-deck-${id}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  }

  // Every load generates a fresh signed URL — never stale
  const { data, isLoading } = useQuery({
    queryKey: ['content', id],
    queryFn:  () => apiFetch<{ data: any }>(`/api/content/${id}`),
    staleTime:0, // Always re-fetch to get fresh signed URL
  });

  const approveMutation = useMutation({
    mutationFn: () => apiFetch(`/api/content/${id}/approve`, {
      method: 'POST',
      body:   JSON.stringify({ notes: notes || undefined }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      queryClient.invalidateQueries({ queryKey: ['content', id] });
      toast.success('✅ Content approved');
      router.push('/dashboard/content');
    },
    onError: () => toast.error('Approval failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => apiFetch(`/api/content/${id}/reject`, {
      method: 'POST',
      body:   JSON.stringify({ notes: notes || undefined }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast.success('Content rejected — AI will be notified');
      router.push('/dashboard/content');
    },
  });

  if (isLoading) return <div className="p-8 text-slate-400 text-sm">Loading...</div>;

  const item = data?.data;
  if (!item) return <div className="p-8 text-red-600 text-sm">Content not found</div>;

  const isPending = item.approvalStatus === 'PENDING_REVIEW';
  const isApproved = item.approvalStatus === 'APPROVED';

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <p className="text-xs text-slate-500 mb-4">
        <button onClick={() => router.push('/dashboard/content')} className="hover:text-blue-600">
          Content
        </button>{' '}
        / {item.type.replace(/_/g, ' ')}
      </p>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {item.type.replace(/_/g, ' ')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generated {new Date(item.createdAt).toLocaleString('en-IN')} ·
            Model: {item.aiModelUsed ?? 'AI'}
          </p>
        </div>

        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
          isPending  ? 'bg-amber-50 text-amber-700 border-amber-200' :
          isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                       'bg-red-50 text-red-700 border-red-200'
        }`}>
          {item.approvalStatus.replace(/_/g, ' ')}
        </span>
      </div>

      {/* File download */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">📑 Generated Pitch Deck</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {item.downloadUrl ? 'Review the PPTX before approving or rejecting' : 'File not found on server'}
            </p>
          </div>
          <button
            onClick={handleDownload}
            disabled={!item.downloadUrl || downloading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex-shrink-0"
          >
            {downloading ? 'Downloading...' : 'Download PPTX ↓'}
          </button>
        </div>
      </div>


      {/* Approval action — only shown for PENDING_REVIEW */}
      {isPending && (
        <div className="border-t border-slate-200 pt-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">DRM Review Decision</h2>

          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Review notes (optional — shown in audit trail)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Any corrections or concerns to note..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-900"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {approveMutation.isPending ? 'Approving...' : '✓ Approve — Send to Outreach Queue'}
            </button>

            <button
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
              className="border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {rejectMutation.isPending ? 'Rejecting...' : '✗ Reject'}
            </button>
          </div>
        </div>
      )}

      {/* Approved state */}
      {isApproved && (
        <div className="border-t border-slate-200 pt-5">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-emerald-800">
              ✅ Approved by {item.approvedBy ?? 'DRM'} on{' '}
              {item.approvedAt ? new Date(item.approvedAt).toLocaleDateString('en-IN') : '—'}
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Outreach drafts will be generated automatically
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
