'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function DonorLoginPage() {
  const router = useRouter();
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const subdomain = formData.get('subdomain') ||
      (hostname.includes('.') && !hostname.endsWith('localhost') ? hostname.split('.')[0] : 'shiksha-foundation');

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/auth/donor-login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.get('email'), password: formData.get('password'), subdomain }),
      }
    );

    const data = await res.json();
    if (!data.success) {
      setError(data.error?.message || 'Authentication failed. Please check your credentials.');
      setLoading(false);
      return;
    }

    localStorage.setItem('donorAccessToken', data.data.accessToken);
    localStorage.setItem('donorId', data.data.donorId);
    router.push('/dashboard');
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col items-center justify-center px-4">
      {/* Wordmark */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded bg-emerald-700 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="text-emerald-900 font-semibold text-lg tracking-tight">NGO Impact Platform</span>
        </div>
        <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">Donor Partner Portal</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-[380px] bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <h1 className="text-lg font-semibold text-slate-900 mb-1">Sign in</h1>
        <p className="text-sm text-slate-500 mb-6">Access your CSR impact dashboard.</p>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-3.5 py-3 mb-5">
            <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" strokeWidth="2"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2"/>
            </svg>
            <p className="text-red-700 text-xs leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email address</label>
            <input
              name="email" type="email" required
              autoComplete="email"
              placeholder="you@company.com"
              className="w-full h-9 border border-slate-300 rounded-md px-3 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <input
              name="password" type="password" required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full h-9 border border-slate-300 rounded-md px-3 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full h-9 bg-emerald-700 text-white rounded-md text-sm font-semibold transition-all hover:bg-emerald-800 active:scale-[0.99] disabled:opacity-60 mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="text-[11px] text-slate-400 mt-6">
        © 2025 NGO Impact Platform · CSR Partner Portal
      </p>
    </div>
  );
}
