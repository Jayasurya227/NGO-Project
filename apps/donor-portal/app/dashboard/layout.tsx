'use client';
import { LayoutDashboard, BookOpen, LogOut, TrendingUp, Users, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navGroups = [
  {
    label: 'Portfolio',
    items: [
      { name: 'Impact Overview',  href: '/dashboard',             icon: LayoutDashboard },
      { name: 'Initiatives',      href: '/dashboard/initiatives', icon: Users },
    ]
  },
  {
    label: 'Actions',
    items: [
      { name: 'My Inquiries',   href: '/dashboard/inquiries', icon: MessageSquare },
      { name: 'Submit RFP',     href: '/dashboard/upload',    icon: TrendingUp },
    ]
  },
  {
    label: 'Reports',
    items: [
      { name: 'Impact Stories', href: '/dashboard/stories', icon: BookOpen },
    ]
  }
];

export default function DonorDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem('donorAccessToken');
    router.push('/login');
  }

  const allItems = navGroups.flatMap(g => g.items);
  const currentLabel = allItems.find(i => i.href === pathname || (i.href !== '/dashboard' && pathname.startsWith(i.href)))?.name ?? 'Dashboard';

  return (
    <div className="flex h-screen bg-[#f4f5f7] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        {/* Brand */}
        <div className="h-14 px-4 border-b border-slate-200 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-emerald-700 flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 leading-none truncate">NGO Impact</p>
            <p className="text-[11px] text-slate-400 font-medium tracking-wider uppercase mt-0.5">Donor Portal</p>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="text-[11px] font-bold text-slate-400 tracking-[0.1em] uppercase px-2 mb-1.5">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[15px] font-medium transition-all ${
                        active
                          ? 'bg-emerald-700 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 p-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center flex-shrink-0">
          <h1 className="text-sm font-semibold text-slate-900">{currentLabel}</h1>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
