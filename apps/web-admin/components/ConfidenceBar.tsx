type Props = {
  label:      string
  value:      string
  confidence: number
}

export function ConfidenceBar({ label, value, confidence }: Props) {
  const pct = Math.round(confidence * 100)

  const colors = confidence >= 0.85
    ? { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-white border-gray-200' }
    : confidence >= 0.65
    ? { bar: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' }
    : { bar: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50 border-red-200' }

  return (
    <div className={`rounded-lg border px-4 py-3 ${colors.bg}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <span className={`text-xs font-medium ${colors.text}`}>{pct}% confidence</span>
      </div>
      <p className="text-sm text-gray-900 mb-2">{value}</p>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colors.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}