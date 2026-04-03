'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { SubScoreChart } from '@/components/SubScoreChart';
import toast from 'react-hot-toast';

function OverallScoreBadge({ score }: { score: number }) {
  const isStrong = score >= 75;
  const isOk     = score >= 50;

  const ring  = isStrong ? 'border-emerald-300 ring-emerald-100 bg-emerald-50'
              : isOk     ? 'border-amber-300 ring-amber-100 bg-amber-50'
              :             'border-red-300 ring-red-100 bg-red-50';

  const label = isStrong ? { text: 'Great Fit',  colour: 'text-emerald-700' }
              : isOk     ? { text: 'Decent Fit', colour: 'text-amber-700'   }
              :             { text: 'Weak Fit',   colour: 'text-red-700'     };

  return (
    <div className={`w-16 rounded-xl border-2 ring-4 flex flex-col items-center justify-center py-2 flex-shrink-0 ${ring}`}>
      <span className={`text-lg font-extrabold leading-none ${label.colour}`}>{score}</span>
      <span className="text-[9px] text-slate-400 leading-none mt-0.5">out of 100</span>
      <span className={`text-[10px] font-bold mt-1 ${label.colour}`}>{label.text}</span>
    </div>
  );
}

export default function MatchResultsPage() {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();

  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey:        ['matches', id],
    queryFn:         () => apiFetch<{ data: any }>(`/api/requirements/${id}/matches`),
    refetchInterval: (q) => {
      const status = q.state.data?.data?.requirementStatus;
      return status === 'VALIDATED' ? 5000 : false; // Poll while matching runs
    },
  });

  // Initialise order from AI ranking on first data load only
  useEffect(() => {
    if (data?.data?.matches?.length && !orderedIds) {
      setOrderedIds(data.data.matches.map((m: any) => m.id));
    }
  }, [data, orderedIds]);

  const approveMutation = useMutation({
    mutationFn: (payload: { approvedMatchIds: string[]; reorderedRanks?: Record<string, number> }) =>
      apiFetch(`/api/requirements/${id}/matches/approve`, {
        method: 'POST',
        body:   JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirement', id] });
      queryClient.invalidateQueries({ queryKey: ['matches', id] });
      toast.success('Matches approved — pitch deck generation started');
      router.push(`/dashboard/requirements/${id}`);
    },
    onError: () => toast.error('Approval failed — please try again'),
  });

  function moveUp(index: number) {
    if (!orderedIds || index === 0) return;
    const next = [...orderedIds];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setOrderedIds(next);
  }

  function moveDown(index: number) {
    if (!orderedIds || index === orderedIds.length - 1) return;
    const next = [...orderedIds];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setOrderedIds(next);
  }

  function handleApprove() {
    if (!orderedIds || !data?.data?.matches) return;

    // Build reorderedRanks — only changed positions
    const aiOrder: string[] = data.data.matches.map((m: any) => m.id);
    const reorderedRanks: Record<string, number> = {};
    orderedIds.forEach((matchId, pmIndex) => {
      if (aiOrder.indexOf(matchId) !== pmIndex) {
        reorderedRanks[matchId] = pmIndex + 1;
      }
    });

    approveMutation.mutate({
      approvedMatchIds: orderedIds,
      reorderedRanks:   Object.keys(reorderedRanks).length > 0 ? reorderedRanks : undefined,
    });
  }

  const matches: any[]  = data?.data?.matches ?? [];
  const canApprove      = data?.data?.canApprove ?? false;
  const reqStatus       = data?.data?.requirementStatus;

  // Map to PM's preferred order
  const orderedMatches = orderedIds
    ? orderedIds.map(oid => matches.find(m => m.id === oid)).filter(Boolean)
    : matches;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-slate-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-slate-500 mb-1">
          <button onClick={() => router.push(`/dashboard/requirements/${id}`)}
            className="hover:text-blue-600">Requirement</button> / Match Results
        </p>
        <h1 className="text-xl font-bold text-slate-900">Initiative Matches</h1>
        {reqStatus === 'VALIDATED' && matches.length === 0 && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="text-sm text-blue-700">AI matching in progress — usually 30–60 seconds</p>
          </div>
        )}
      </div>

      {/* Match cards */}
      {orderedMatches.length > 0 && (
        <div className="space-y-4">
          {orderedMatches.map((match: any, idx: number) => {
            const aiRank  = matches.findIndex(m => m.id === match.id);
            const wasMoved = aiRank !== idx;
            const init     = match.initiative;
            const gapL     = (init.fundingGapInr / 100000).toFixed(1);
            const geo      = init.geography as { state?: string; district?: string };

            return (
              <div key={match.id}
                className={`bg-white border rounded-xl overflow-hidden transition-all ${
                  wasMoved ? 'border-blue-300 shadow-sm shadow-blue-100' : 'border-slate-200'
                }`}>

                {/* Card header */}
                <div className="px-5 py-4 flex items-start gap-4">
                  {/* Rank + reorder */}
                  <div className="flex flex-col items-center gap-1 pt-1 min-w-[44px]">
                    <span className="text-[10px] font-bold text-center leading-tight text-slate-500">
                      {idx === 0 ? '🥇 Best' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`}
                    </span>
                    <button onClick={() => moveUp(idx)} disabled={idx === 0}
                      className="text-slate-300 hover:text-slate-700 disabled:opacity-20 leading-none text-sm">▲</button>
                    <button onClick={() => moveDown(idx)} disabled={idx === orderedMatches.length - 1}
                      className="text-slate-300 hover:text-slate-700 disabled:opacity-20 leading-none text-sm">▼</button>
                  </div>

                  <OverallScoreBadge score={match.overallScore} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-slate-900 text-sm">{init.title}</h3>
                      {wasMoved && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          reordered by PM
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full">📍 {geo.state ?? 'Multiple states'}</span>
                      <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full">📂 {init.sector.replace(/_/g, ' ')}</span>
                      <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">💰 Needs ₹{gapL}L more funding</span>
                      <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">👥 {init.targetBeneficiaries?.toLocaleString('en-IN')} people to be helped</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${init.completedMilestones === init.totalMilestones && init.totalMilestones > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        ✅ {init.completedMilestones} of {init.totalMilestones} tasks done
                      </span>
                    </div>

                    {/* AI explanation — visible but clearly labelled as AI-generated */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 italic mb-3">
                      <span className="text-slate-400 not-italic font-medium text-[10px] uppercase tracking-wide mr-2">
                        AI Analysis
                      </span>
                      {match.explanation}
                    </div>

                    {/* Expandable sub-score chart */}
                    <details className="group">
                      <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800 font-medium list-none">
                        <span className="group-open:hidden">▶ Why this score? See details</span>
                        <span className="hidden group-open:inline">▼ Hide details</span>
                      </summary>
                      <div className="mt-3">
                        <SubScoreChart subScores={match.subScores} />
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approve section */}
      {matches.length > 0 && canApprove && (
        <div className="mt-6 pt-5 border-t border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">
                {Object.keys(
                  orderedIds
                    ? orderedIds.reduce((acc, id, i) => {
                        if (matches.findIndex(m => m.id === id) !== i) acc[id] = i + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    : {}
                ).length > 0
                  ? '⚠ You have reordered the AI ranking — your order will be recorded'
                  : '✓ Using AI-suggested ranking'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Approval triggers pitch deck generation for the selected initiatives
              </p>
            </div>
            <button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors flex-shrink-0"
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve & Generate Pitch Deck'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
