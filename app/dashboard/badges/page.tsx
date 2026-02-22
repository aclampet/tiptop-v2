import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/supabase/server'

export const dynamic = 'force-dynamic'

export default async function BadgesPage() {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: worker } = await admin
    .from('workers')
    .select('id, display_name')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker) redirect('/signup')

  // Get worker's badges
  const { data: workerBadges } = await admin
    .from('worker_badges')
    .select(`
      *,
      badge:badges (*)
    `)
    .eq('worker_id', worker.id)
    .order('awarded_at', { ascending: false })

  // Get all available badges for context
  const { data: allBadges } = await admin
    .from('badges')
    .select('*')
    .order('tier', { ascending: true })

  const earnedBadgeIds = new Set(workerBadges?.map(wb => wb.badge_id) || [])

  const tierOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4 }
  const tierColors: Record<string, { bg: string; text: string; border: string }> = {
    bronze: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
    silver: { bg: 'bg-gray-300/10', text: 'text-gray-300', border: 'border-gray-300/20' },
    gold: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
    platinum: { bg: 'bg-cyan-400/10', text: 'text-cyan-400', border: 'border-cyan-400/20' },
  }

  const tierEmoji: Record<string, string> = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-600 mb-2">Your Badges</h1>
        <p className="text-soft-500">
          Earn badges by building your professional reputation
        </p>
      </div>

      {/* Earned Badges */}
      {workerBadges && workerBadges.length > 0 ? (
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-navy-600 mb-4">
            Earned ({workerBadges.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workerBadges.map((wb: any) => {
              const colors = tierColors[wb.badge?.tier] || tierColors.bronze
              return (
                <div
                  key={wb.id}
                  className={`${colors.bg} border ${colors.border} rounded-xl p-6`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">{tierEmoji[wb.badge?.tier] || '🏅'}</span>
                    <div>
                      <h3 className="text-navy-600 font-semibold">{wb.badge?.name}</h3>
                      <span className={`text-xs font-medium uppercase ${colors.text}`}>
                        {wb.badge?.tier}
                      </span>
                    </div>
                  </div>
                  <p className="text-soft-500 text-sm mb-3">{wb.badge?.description}</p>
                  <p className="text-xs text-soft-400">
                    Earned {new Date(wb.awarded_at).toLocaleDateString()}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-soft-200 rounded-xl mb-12">
          <div className="text-6xl mb-6">🏆</div>
          <h2 className="text-2xl font-semibold text-navy-600 mb-4">
            No badges yet
          </h2>
          <p className="text-soft-500 max-w-md mx-auto">
            Start collecting reviews to earn your first badge. Badges are awarded automatically as you build your reputation.
          </p>
        </div>
      )}

      {/* Available Badges */}
      {allBadges && allBadges.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-navy-600 mb-4">All Badges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allBadges
              .sort((a: any, b: any) => (tierOrder[a.tier as keyof typeof tierOrder] || 0) - (tierOrder[b.tier as keyof typeof tierOrder] || 0))
              .map((badge: any) => {
                const earned = earnedBadgeIds.has(badge.id)
                const colors = tierColors[badge.tier] || tierColors.bronze
                return (
                  <div
                    key={badge.id}
                    className={`border rounded-xl p-6 transition-all ${
                      earned
                        ? `${colors.bg} ${colors.border}`
                        : 'bg-white border-soft-200 opacity-50'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-3xl">
                        {earned ? tierEmoji[badge.tier] || '🏅' : '🔒'}
                      </span>
                      <div>
                        <h3 className="text-navy-600 font-semibold">{badge.name}</h3>
                        <span className={`text-xs font-medium uppercase ${earned ? colors.text : 'text-soft-400'}`}>
                          {badge.tier}
                        </span>
                      </div>
                    </div>
                    <p className="text-soft-500 text-sm">{badge.description}</p>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
