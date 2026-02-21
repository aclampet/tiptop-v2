import { redirect } from 'next/navigation'
import { createClient } from '@/supabase/server'
import Link from 'next/link'
import { formatRating, formatDateRange } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get worker with positions
  const { data: worker } = await supabase
    .from('workers')
    .select(`
      *,
      positions (
        *,
        company:companies (*)
      )
    `)
    .eq('auth_user_id', user.id)
    .single()

  if (!worker) redirect('/signup')

  // Get recent reviews across all positions
  const { data: recentReviews } = await supabase
    .from('reviews')
    .select(`
      *,
      position:positions (
        id,
        title,
        company:companies (name)
      )
    `)
    .in('position_id', worker.positions.map((p: any) => p.id))
    .order('created_at', { ascending: false })
    .limit(5)

  const activePositions = worker.positions.filter((p: any) => p.is_active)
  const verifiedPositions = worker.positions.filter((p: any) => 
    p.email_verified || p.hr_verified
  )

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {worker.display_name.split(' ')[0]}
        </h1>
        <p className="text-ink-400">
          Here's what's happening with your professional reputation
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon="⭐"
          label="Overall Rating"
          value={worker.overall_rating > 0 ? formatRating(worker.overall_rating) : '—'}
          subtext={`${worker.total_reviews} reviews`}
        />
        <StatCard
          icon="💼"
          label="Active Positions"
          value={activePositions.length.toString()}
          subtext={`${worker.positions.length} total`}
        />
        <StatCard
          icon="✅"
          label="Verified Positions"
          value={verifiedPositions.length.toString()}
          subtext={`${activePositions.length - verifiedPositions.length} pending`}
        />
        <StatCard
          icon="📱"
          label="QR Scans"
          value="0"
          subtext="Total scans"
        />
      </div>

      {/* Quick Actions */}
      {worker.positions.length === 0 && (
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🚀</div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-2">
                Get started by adding your first position
              </h2>
              <p className="text-ink-300 mb-4">
                Add a current or past job to start collecting reviews and building your portable reputation.
              </p>
              <Link
                href="/dashboard/positions/new"
                className="inline-block bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Add Your First Position
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent Positions */}
      {worker.positions.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Your Positions</h2>
            <Link
              href="/dashboard/positions"
              className="text-brand-400 hover:text-brand-300 text-sm transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {worker.positions.slice(0, 4).map((position: any) => (
              <PositionCard key={position.id} position={position} />
            ))}
          </div>
          {worker.positions.length === 0 && (
            <div className="text-center py-12 bg-white/5 rounded-xl">
              <p className="text-ink-500 mb-4">No positions yet</p>
              <Link
                href="/dashboard/positions/new"
                className="text-brand-400 hover:text-brand-300 transition-colors"
              >
                Add your first position →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Recent Reviews */}
      {recentReviews && recentReviews.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Reviews</h2>
            <Link
              href="/dashboard/reviews"
              className="text-brand-400 hover:text-brand-300 text-sm transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-4">
            {recentReviews.map((review: any) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ 
  icon, 
  label, 
  value, 
  subtext 
}: { 
  icon: string
  label: string
  value: string
  subtext: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-ink-400">{label}</div>
      <div className="text-xs text-ink-500 mt-1">{subtext}</div>
    </div>
  )
}

function PositionCard({ position }: { position: any }) {
  const isVerified = position.email_verified || position.hr_verified
  const dateRange = formatDateRange(position.start_date, position.end_date)

  return (
    <Link
      href={`/dashboard/positions/${position.id}`}
      className="block bg-white/5 border border-white/10 hover:border-brand-500/50 rounded-xl p-6 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {position.title}
          </h3>
          <p className="text-ink-400">{position.company.name}</p>
        </div>
        {isVerified ? (
          <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-medium rounded-full">
            ✓ Verified
          </span>
        ) : (
          <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-medium rounded-full">
            Pending
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-4 text-sm text-ink-400">
        <div className="flex items-center gap-1">
          <span>⭐</span>
          <span>{position.rating > 0 ? formatRating(position.rating) : '—'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>💬</span>
          <span>{position.review_count} reviews</span>
        </div>
      </div>

      <div className="text-xs text-ink-500 mt-3">{dateRange}</div>
    </Link>
  )
}

function ReviewCard({ review }: { review: any }) {
  const stars = '⭐'.repeat(review.rating)

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-lg mb-1">{stars}</div>
          <p className="text-sm text-ink-400">
            {review.position.title} at {review.position.company.name}
          </p>
        </div>
        <span className="text-xs text-ink-500">
          {new Date(review.created_at).toLocaleDateString()}
        </span>
      </div>
      {review.comment && (
        <p className="text-ink-300 italic">"{review.comment}"</p>
      )}
      {review.reviewer_name && (
        <p className="text-xs text-ink-500 mt-2">— {review.reviewer_name}</p>
      )}
    </div>
  )
}
