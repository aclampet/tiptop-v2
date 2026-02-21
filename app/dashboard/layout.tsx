import { redirect } from 'next/navigation'
import { createClient } from '@/supabase/server'
import Link from 'next/link'
import LogoutButton from '@/components/dashboard/LogoutButton'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Get worker info for display name
  const { data: worker } = await supabase
    .from('workers')
    .select('display_name, slug')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker) {
    redirect('/signup')
  }

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: '📊' },
    { href: '/dashboard/positions', label: 'Positions', icon: '💼' },
    { href: '/dashboard/reviews', label: 'Reviews', icon: '⭐' },
    { href: '/dashboard/qr', label: 'QR Codes', icon: '📱' },
    { href: '/dashboard/badges', label: 'Badges', icon: '🏆' },
  ]

  return (
    <div className="min-h-screen bg-ink-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white/5 border-r border-white/10 flex flex-col">
        <div className="p-6">
          <Link href="/">
            <span 
              style={{ fontFamily: 'var(--font-display)' }}
              className="text-2xl text-brand-400 hover:text-brand-300 transition-colors"
            >
              TipTop
            </span>
          </Link>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-y border-white/10">
          <p className="text-white font-semibold">{worker.display_name}</p>
          <Link 
            href={`/worker/${worker.slug}`}
            className="text-brand-400 hover:text-brand-300 text-sm transition-colors"
          >
            👁 View profile
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-ink-300 hover:bg-white/5 hover:text-white transition-all"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Settings & Logout */}
        <div className="p-4 border-t border-white/10">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-ink-300 hover:bg-white/5 hover:text-white transition-all mb-2"
          >
            <span className="text-xl">⚙️</span>
            <span>Settings</span>
          </Link>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
