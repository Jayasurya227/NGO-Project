'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

const TYPE_ICON: Record<string, string> = {
  PITCH_DECK:     '📑',
  EMAIL_DRAFT:    '✉️',
  WHATSAPP_DRAFT: '💬',
  IMPACT_REPORT:  '📊',
};

const STATUS_STYLE: Record<string, string> = {
  PENDING_REVIEW: 'bg-amber-50  text-amber-700  border-amber-200',
  APPROVED:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED:       'bg-red-50    text-red-700    border-red-200',
  DRAFT:          'bg-slate-50  text-slate-600  border-slate-200',
  PUBLISHED:      'bg-blue-50   text-blue-700   border-blue-200',
};

export default function ContentPage() {
  const { data, isLoading } = useQuery({
    queryKey:        ['content'],
    queryFn:         () => apiFetch<{ data: any[]; meta: any }>('/api/content?limit=50'),
    refetchInterval: 15_000, // Refresh every 15s — new artifacts appear frequently
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Content & Approvals</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Review AI-generated pitch decks, email drafts, and reports
        </p>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-lg" />)}
        </div>
      ) : (data?.data?.length ?? 0) === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          No content generated yet. Approve match results to trigger pitch deck generation.
        </div>
      ) : (
        <div className="space-y-2">
          {(data?.data ?? []).map((item: any) => (
            <Link
              key={item.id}
              href={`/dashboard/content/${item.id}`}
              className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{TYPE_ICON[item.type] ?? '📄'}</span>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {item.type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(item.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLE[item.approvalStatus]}`}>
                {item.approvalStatus.replace(/_/g, ' ')}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
