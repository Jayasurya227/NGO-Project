'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center max-w-md px-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Page Error</h2>
        <p className="text-gray-500 text-sm mb-6">{error?.message || 'An error occurred loading this page.'}</p>
        <button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg transition-colors text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
