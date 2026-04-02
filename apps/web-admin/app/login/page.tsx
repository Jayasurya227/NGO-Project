'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveSession } from '../../lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [subdomain, setSubdomain] = useState('shiksha-foundation')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, subdomain }),
      })
      const data = await res.json()
      if (data.success && data.data?.accessToken) {
        saveSession({
          accessToken: data.data.accessToken,
          tenantId: data.data.tenantId ?? '',
          userId: data.data.userId ?? '',
          role: data.data.role,
          email,
        })
        router.push('/dashboard')
      } else {
        setError(data.error?.message ?? 'Invalid credentials. Please try again.')
      }
    } catch {
      setError('Unable to connect. Please ensure the server is running.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col items-center justify-center px-4">
      {/* Top wordmark */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded bg-[#1b3a6b] flex items-center justify-center">
            <span className="text-white text-[10px] font-bold tracking-tight">NGO</span>
          </div>
          <span className="text-[#1b3a6b] font-semibold text-lg tracking-tight">Impact Platform</span>
        </div>
        <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">Admin Console</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-[380px] bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <h1 className="text-lg font-semibold text-slate-900 mb-1">Sign in</h1>
        <p className="text-sm text-slate-500 mb-6">Enter your credentials to access the admin portal.</p>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-3.5 py-3 mb-5">
            <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" strokeWidth="2"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2"/>
            </svg>
            <p className="text-red-700 text-xs leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full h-9 border border-slate-300 rounded-md px-3 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3a6b]/20 focus:border-[#1b3a6b] transition-all"
              placeholder="admin@organisation.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full h-9 border border-slate-300 rounded-md px-3 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3a6b]/20 focus:border-[#1b3a6b] transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Organisation slug</label>
            <input
              type="text" value={subdomain} onChange={e => setSubdomain(e.target.value)}
              className="w-full h-9 border border-slate-300 rounded-md px-3 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3a6b]/20 focus:border-[#1b3a6b] transition-all"
              placeholder="shiksha-foundation"
              required
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full h-9 bg-[#1b3a6b] text-white rounded-md text-sm font-semibold transition-all hover:bg-[#15305a] active:scale-[0.99] disabled:opacity-60 mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="text-[11px] text-slate-400 mt-6">
        © 2025 NGO Impact Platform · Secure Admin Portal
      </p>
    </div>
  )
}