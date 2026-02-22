import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Check if user is admin
  const admin = await createAdminClient()
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
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-soft-200 flex flex-col">
        <div className="p-6">
          <Link href="/">
            <span 
              style={{ fontFamily: 'var(--font-display)' }}
              className="text-2xl text-navy-500 hover:text-navy-400 transition-colors"
            >
              TipTop
            </span>
          </Link>
          <p className="text-xs text-soft-400 mt-1">Admin Panel</p>
        </div>

        {/* Admin Badge */}
        <div className="px-6 py-4 border-y border-soft-200">
          <div className="bg-navy-500/10 border border-gold-300/20 rounded-lg px-3 py-2">
            <p className="text-navy-500 text-sm font-semibold">👑 Admin</p>
            <p className="text-soft-400 text-xs">{user.email}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-soft-500 hover:bg-white hover:text-navy-600 transition-all"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Back to Dashboard */}
        <div className="p-4 border-t border-soft-200">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-soft-500 hover:bg-white hover:text-navy-600 transition-all"
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
