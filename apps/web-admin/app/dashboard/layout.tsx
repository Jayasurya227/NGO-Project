'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Toaster } from 'react-hot-toast'
import { getSession, clearSession } from '../../lib/auth'
import { useAgentEvents } from '../../hooks/useAgentEvents'
import { FileText, LayoutDashboard, LogOut, Landmark, Activity, FileCheck, BarChart2, Trash2 } from 'lucide-react'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Management',
    items: [
      { href: '/dashboard/initiatives',  label: 'NGO Initiatives',     icon: Landmark },
      { href: '/dashboard/requirements', label: 'DRM Workspace',        icon: FileText },
      { href: '/dashboard/inquiries',    label: 'Donor Inquiries',     icon: Activity },
    ]
  },
  {
    label: 'AI & Matching',
    items: [
      { href: '/dashboard/content',     label: 'Proposal Approvals',  icon: FileCheck },
      { href: '/dashboard/agents',      label: 'CSR Intake',           icon: BarChart2 },
      { href: '/dashboard/records',     label: 'Delete Records',       icon: Trash2 },
    ]
  }
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
    if (!session) {
      router.push('/login')
    } else if (!['NGO_ADMIN', 'DRM', 'PROGRAM_MANAGER'].includes(session.role)) {
      clearSession()
      router.push('/login')
    }
  }, [router])

  function handleLogout() {
    clearSession()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-[#f4f5f7] overflow-hidden">
      <Toaster position="top-right" />

      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        {/* Brand */}
        <div className="h-14 px-4 border-b border-slate-200 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#1b3a6b] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[9px] font-bold tracking-tight">NGO</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 leading-none truncate">Impact Platform</p>
            <p className="text-[11px] text-slate-400 font-medium tracking-wider uppercase mt-0.5">Admin Console</p>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="text-[11px] font-bold text-slate-400 tracking-[0.1em] uppercase px-2 mb-1.5">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        active
                          ? 'bg-[#1b3a6b] text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}>
                      <Icon size={15} className="flex-shrink-0" />
                      <span className="truncate">{label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 p-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 w-full transition-colors">
            <LogOut size={15} className="flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center flex-shrink-0">
          <h1 className="text-sm font-semibold text-slate-900">
            {navGroups.flatMap(g => g.items).find(i => i.href === pathname || (i.href !== '/dashboard' && pathname.startsWith(i.href)))?.label ?? 'Dashboard'}
          </h1>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <DashboardInner>{children}</DashboardInner>
        </main>
      </div>
    </div>
  )
}