'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Toaster } from 'react-hot-toast'
import { getSession, clearSession } from '../../lib/auth'
import { useAgentEvents } from '../../hooks/useAgentEvents'
import { Users, FileText, LayoutDashboard, LogOut, Landmark, Activity } from 'lucide-react'

const navItems = [
  { href: '/dashboard',              label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/dashboard/donors',       label: 'Donors (CSR)',    icon: Users },
  { href: '/dashboard/initiatives',  label: 'NGO Initiatives', icon: Landmark },
  { href: '/dashboard/requirements', label: 'Requirements',    icon: FileText },
  { href: '/dashboard/agents',       label: 'Agent Jobs',      icon: Activity },
]

function DashboardInner({ children }: { children: React.ReactNode }) {
  useAgentEvents()
  return <>{children}</>
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const session = getSession()
    if (!session) router.push('/login')
  }, [router])

  function handleLogout() {
    clearSession()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Toaster position="top-right" />
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <h1 className="text-base font-semibold text-gray-900">NGO Impact</h1>
          <p className="text-xs text-gray-400 mt-0.5">Admin Portal</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 w-full transition-colors">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <DashboardInner>{children}</DashboardInner>
      </main>
    </div>
  )
}