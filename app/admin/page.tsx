import { createAdminClient } from '@/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const admin = createAdminClient()

  // Get system stats
  const [
    { count: totalWorkers },
    { count: totalCompanies },
    { count: totalReviews },
    { count: totalPositions },
    { data: pendingVerifications },
    { data: companies }
  ] = await Promise.all([
    admin.from('workers').select('*', { count: 'exact', head: true }),
    admin.from('companies').select('*', { count: 'exact', head: true }),
    admin.from('reviews').select('*', { count: 'exact', head: true }),
    admin.from('positions').select('*', { count: 'exact', head: true }),
    admin.from('company_verification_requests').select('*').eq('status', 'pending'),
    admin.from('companies').select('*')
  ])

  const verifiedCompanies = companies?.filter(c => c.verification_status === 'verified').length || 0
  const registeredCompanies = companies?.filter(c => c.verification_status === 'registered').length || 0
  const unverifiedCompanies = companies?.filter(c => c.verification_status === 'unverified').length || 0

  // Recent activity
  const { data: recentReviews } = await admin
    .from('reviews')
    .select(`
      *,
      position:positions (
        title,
        worker:workers (display_name),
        company:companies (name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: recentWorkers } = await admin
    .from('workers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-600 mb-2">Admin Dashboard</h1>
        <p className="text-soft-500">System overview and management</p>
      </div>

      {/* Alert: Pending Verifications */}
      {pendingVerifications && pendingVerifications.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-4xl">⚠️</div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-navy-600 mb-2">
                {pendingVerifications.length} Pending Verification{pendingVerifications.length !== 1 ? 's' : ''}
              </h2>
              <p className="text-soft-500 mb-4">
                Companies waiting for verification review
              </p>
              <Link
                href="/admin/verifications"
                className="inline-block bg-yellow-600 hover:bg-yellow-500 text-navy-600 px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Review Requests
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon="👥"
          label="Total Workers"
          value={totalWorkers?.toString() || '0'}
          subtext="Registered users"
          href="/admin/workers"
        />
        <StatCard
          icon="🏢"
          label="Total Companies"
          value={totalCompanies?.toString() || '0'}
          subtext={`${verifiedCompanies} verified`}
          href="/admin/companies"
        />
        <StatCard
          icon="⭐"
          label="Total Reviews"
          value={totalReviews?.toString() || '0'}
          subtext="All positions"
          href="/admin/reviews"
        />
        <StatCard
          icon="💼"
          label="Total Positions"
          value={totalPositions?.toString() || '0'}
          subtext="Active & inactive"
        />
      </div>

      {/* Company Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl">✅</div>
            <span className="text-xs text-green-400 font-medium">VERIFIED</span>
          </div>
          <div className="text-3xl font-bold text-navy-600 mb-1">{verifiedCompanies}</div>
          <div className="text-sm text-soft-500">Verified Companies</div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl">📋</div>
            <span className="text-xs text-blue-400 font-medium">REGISTERED</span>
          </div>
          <div className="text-3xl font-bold text-navy-600 mb-1">{registeredCompanies}</div>
          <div className="text-sm text-soft-500">Registered Companies</div>
        </div>

        <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl">⚪</div>
            <span className="text-xs text-gray-400 font-medium">UNVERIFIED</span>
          </div>
          <div className="text-3xl font-bold text-navy-600 mb-1">{unverifiedCompanies}</div>
          <div className="text-sm text-soft-500">Unverified Companies</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recent Reviews */}
        <div>
          <h2 className="text-xl font-semibold text-navy-600 mb-4">Recent Reviews</h2>
          <div className="space-y-3">
            {recentReviews?.map((review) => (
              <div key={review.id} className="bg-white border border-soft-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="text-lg">{'⭐'.repeat(review.rating)}</div>
                  <span className="text-xs text-soft-400">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-navy-600 font-medium mb-1">
                  {review.position?.worker?.display_name}
                </p>
                <p className="text-xs text-soft-500">
                  {review.position?.title} at {review.position?.company?.name}
                </p>
                {review.comment && (
                  <p className="text-xs text-soft-400 mt-2 italic line-clamp-2">
                    "{review.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Workers */}
        <div>
          <h2 className="text-xl font-semibold text-navy-600 mb-4">Recent Signups</h2>
          <div className="space-y-3">
            {recentWorkers?.map((worker) => (
              <div key={worker.id} className="bg-white border border-soft-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-navy-600 font-medium mb-1">
                      {worker.display_name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-soft-500">
                      <span>⭐ {worker.overall_rating > 0 ? worker.overall_rating.toFixed(1) : '—'}</span>
                      <span>💬 {worker.total_reviews} reviews</span>
                    </div>
                  </div>
                  <span className="text-xs text-soft-400">
                    {new Date(worker.created_at).toLocaleDateString()}
                  </span>
                </div>
                <Link
                  href={`/worker/${worker.slug}`}
                  className="text-xs text-navy-500 hover:text-navy-400 mt-2 inline-block"
                >
                  View profile →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ 
  icon, 
  label, 
  value, 
  subtext,
  href 
}: { 
  icon: string
  label: string
  value: string
  subtext: string
  href?: string
}) {
  const content = (
    <div className="bg-white border border-soft-200 rounded-xl p-6 h-full">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-3xl font-bold text-navy-600 mb-1">{value}</div>
      <div className="text-sm text-soft-500 mb-1">{label}</div>
      <div className="text-xs text-soft-400">{subtext}</div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block hover:scale-105 transition-transform">
        {content}
      </Link>
    )
  }

  return content
}
