import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Check if user is admin
  const admin = createAdminClient()
  const { data: userRole } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single()

  if (!userRole) {
    redirect('/dashboard')
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/companies', label: 'Companies', icon: '🏢' },
    { href: '/admin/verifications', label: 'Verifications', icon: '✅' },
    { href: '/admin/workers', label: 'Workers', icon: '👥' },
    { href: '/admin/reviews', label: 'Reviews', icon: '⭐' },
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
          <p className="text-xs text-ink-500 mt-1">Admin Panel</p>
        </div>

        {/* Admin Badge */}
        <div className="px-6 py-4 border-y border-white/10">
          <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg px-3 py-2">
            <p className="text-brand-400 text-sm font-semibold">👑 Admin</p>
            <p className="text-ink-500 text-xs">{user.email}</p>
          </div>
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

        {/* Back to Dashboard */}
        <div className="p-4 border-t border-white/10">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-ink-300 hover:bg-white/5 hover:text-white transition-all"
          >
            <span className="text-xl">←</span>
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
