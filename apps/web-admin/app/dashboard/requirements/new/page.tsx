'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '../../../../lib/auth'
import { api } from '../../../../lib/api'

export default function NewRequirementPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [donorId, setDonorId] = useState('')
  const [donors, setDonors] = useState<any[]>([])
  const [isDragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/donors?limit=100').then(r => setDonors(r.data ?? []))
  }, [])

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === 'application/pdf') {
      setFile(dropped)
      setError(null)
    } else {
      setError('Only PDF files are accepted')
    }
  }

  async function handleSubmit() {
    if (!file || !donorId) {
      setError('Please select a donor and upload a PDF')
      return
    }

    setUploading(true)
    setError(null)

    const session = getSession()
    const formData = new FormData()
    formData.append('donorId', donorId)
    formData.append('file', file)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/requirements`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.accessToken}` },
          body: formData,
        }
      )

      const data = await res.json()

      if (data.success) {
        router.push(`/dashboard/requirements/${data.data.requirementId}`)
      } else {
        setError(data.error?.message ?? 'Upload failed')
      }
    } catch {
      setError('Cannot connect to server')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Upload RFP Document</h2>
        <p className="text-sm text-gray-500 mt-1">
          Upload a corporate CSR RFP PDF. The AI will extract fields automatically.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Donor / Corporate Partner
        </label>
        <select
          value={donorId}
          onChange={e => setDonorId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Select a donor...</option>
          {donors.map((d: any) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.email})
            </option>
          ))}
        </select>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : file
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        {file ? (
          <div>
            <p className="text-3xl mb-2">📄</p>
            <p className="text-sm font-medium text-green-700">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {(file.size / 1024).toFixed(0)} KB — Click to change
            </p>
          </div>
        ) : (
          <div>
            <p className="text-3xl mb-2">📁</p>
            <p className="text-sm font-medium text-gray-700">
              Drop RFP PDF here or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-1">PDF files only · Max 50 MB</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) { setFile(f); setError(null) }
          }}
        />
      </div>

      <div className="mt-5 flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={uploading || !file || !donorId}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload & Begin Extraction'}
        </button>
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}