const colors: Record<string, string> = {
  PENDING_EXTRACTION: 'bg-yellow-100 text-yellow-700',
  EXTRACTED:          'bg-blue-100 text-blue-700',
  VALIDATED:          'bg-green-100 text-green-700',
  NEEDS_REVIEW:       'bg-red-100 text-red-700',
  QUEUED:             'bg-gray-100 text-gray-600',
  RUNNING:            'bg-blue-100 text-blue-700',
  COMPLETED:          'bg-green-100 text-green-700',
  FAILED:             'bg-red-100 text-red-700',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}