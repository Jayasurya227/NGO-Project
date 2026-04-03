type SubScores = {
  sector:      number;
  geography:   number;
  budget:      number;
  kpi:         number;
  trackRecord: number;
};

const ROWS: {
  key:         keyof SubScores;
  question:    string;
  description: string;
  importance:  string;
}[] = [
  {
    key:         'sector',
    question:    'Same Sector?',
    description: 'Does this NGO work in the same field the donor wants to fund?',
    importance:  'Most Important',
  },
  {
    key:         'geography',
    question:    'Right Location?',
    description: 'Is this NGO working in the same state or region the donor targets?',
    importance:  'Very Important',
  },
  {
    key:         'budget',
    question:    'Budget Fits?',
    description: "Does the donor's funding amount match how much this NGO still needs?",
    importance:  'Important',
  },
  {
    key:         'kpi',
    question:    'Same Goals?',
    description: "Do this NGO's outcomes match what the donor wants to achieve?",
    importance:  'Helpful',
  },
  {
    key:         'trackRecord',
    question:    'Proven Track Record?',
    description: 'Has this NGO completed its past milestones and shown results?',
    importance:  'Helpful',
  },
];

const IMPORTANCE_STYLE: Record<string, string> = {
  'Most Important': 'bg-red-50 text-red-600 border-red-100',
  'Very Important':  'bg-orange-50 text-orange-600 border-orange-100',
  'Important':       'bg-yellow-50 text-yellow-700 border-yellow-100',
  'Helpful':         'bg-slate-50 text-slate-500 border-slate-200',
};

function ratingLabel(score: number): { text: string; colour: string } {
  if (score >= 90) return { text: '✅ Excellent',  colour: 'text-emerald-700 font-bold' };
  if (score >= 70) return { text: '👍 Good',       colour: 'text-green-700 font-semibold' };
  if (score >= 50) return { text: '🆗 Partial',    colour: 'text-amber-700 font-semibold' };
  if (score >= 25) return { text: '⚠️ Weak',       colour: 'text-orange-700 font-semibold' };
  return              { text: '❌ No Match',        colour: 'text-red-700 font-semibold' };
}

function barColour(score: number): string {
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-400';
  return 'bg-red-400';
}

export function SubScoreChart({ subScores }: { subScores: SubScores }) {
  return (
    <div className="space-y-3">
      {ROWS.map(({ key, question, description, importance }) => {
        const score  = subScores[key] ?? 0;
        const rating = ratingLabel(score);
        return (
          <div key={key} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            {/* Top row */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{question}</p>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`text-xs ${rating.colour}`}>{rating.text}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${IMPORTANCE_STYLE[importance]}`}>
                  {importance}
                </span>
              </div>
            </div>
            {/* Bar */}
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColour(score)}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
