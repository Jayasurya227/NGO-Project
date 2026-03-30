type SubScores = {
  sector:      number;
  geography:   number;
  budget:      number;
  kpi:         number;
  trackRecord: number;
};

const LABELS: Record<keyof SubScores, string> = {
  sector:      'Sector Alignment',
  geography:   'Geography Match',
  budget:      'Budget Fit',
  kpi:         'KPI Alignment',
  trackRecord: 'Track Record',
};

const WEIGHTS: Record<keyof SubScores, number> = {
  sector:      30,
  geography:   25,
  budget:      20,
  kpi:         15,
  trackRecord: 10,
};

function barColour(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-400';
  return 'bg-red-400';
}

export function SubScoreChart({ subScores }: { subScores: SubScores }) {
  return (
    <div className="space-y-2">
      {(Object.keys(LABELS) as (keyof SubScores)[]).map(key => (
        <div key={key}>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-xs text-slate-600">{LABELS[key]}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">weight {WEIGHTS[key]}%</span>
              <span className="text-xs font-semibold text-slate-700 w-8 text-right">
                {subScores[key]}
              </span>
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColour(subScores[key])}`}
              style={{ width: `${subScores[key]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
