import { redirect } from 'next/navigation'
import { createClient } from '@/supabase/server'
import Link from 'next/link'
import LogoutButton from '@/components/dashboard/LogoutButton'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: worker } = await supabase
    .from('workers')
    .select('display_name, slug')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker) redirect('/signup')

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: '📊' },
    { href: '/dashboard/positions', label: 'Positions', icon: '💼' },
    { href: '/dashboard/reviews', label: 'Reviews', icon: '⭐' },
    { href: '/dashboard/qr', label: 'QR Codes', icon: '📱' },
    { href: '/dashboard/badges', label: 'Badges', icon: '🏆' },
  ]

  return (
    <div className="min-h-screen bg-soft-50 flex">
      <aside className="w-64 bg-navy-600 flex flex-col shrink-0">
        <div className="p-6">
          <Link href="/"><span className="font-display text-2xl text-white hover:text-gold-300 transition-colors">TipTop</span></Link>
        </div>
        <div className="px-6 py-4 border-y border-white/10">
          <p className="text-white font-semibold">{worker.display_name}</p>
          <Link href={`/worker/${worker.slug}`} className="text-gold-300 hover:text-gold-200 text-sm transition-colors">View profile →</Link>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all">
                  <span className="text-xl">{item.icon}</span><span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-white/10">
          <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all mb-1">
            <span className="text-xl">⚙️</span><span>Settings</span>
          </Link>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
