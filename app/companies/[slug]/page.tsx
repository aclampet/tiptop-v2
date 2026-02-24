import { notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/supabase/server'
import { formatRating } from '@/lib/utils'
import Link from 'next/link'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const admin = await createAdminClient()
  
  const { data: company } = await admin
    .from('companies')
    .select('name, city, state')
    .eq('slug', params.slug)
    .single()

  if (!company) {
    return {
      title: 'Company Not Found',
    }
  }

  const location = [company.city, company.state].filter(Boolean).join(', ')

  return {
    title: `${company.name}${location ? ` — ${location}` : ''} — TipTop`,
    description: `See verified employee reviews and work history at ${company.name} on TipTop.review.`,
  }
}

export default async function CompanyProfilePage({ params }: { params: { slug: string } }) {
  const supabase = await createClient()
  const admin = await createAdminClient()

  const { data: company } = await admin
    .from('companies')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!company) {
    notFound()
  }

  // Roster: RLS-filtered positions (show_on_company_page, is_current, worker is_public)
  const { data: rosterPositions } = await supabase
    .from('positions')
    .select(`
      id,
      title,
      rating,
      review_count,
      email_verified,
      hr_verified,
      worker:workers (
        id,
        display_name,
        slug,
        avatar_url,
        overall_rating,
        total_reviews
      )
    `)
    .eq('company_id', company.id)
    .eq('show_on_company_page', true)
    .eq('is_current', true)

  const { data: featuredRows } = await supabase
    .from('company_featured_workers')
    .select('worker_id, sort_order')
    .eq('company_id', company.id)
    .order('sort_order', { ascending: true })

  const featuredWorkerIds = (featuredRows || []).map((r) => r.worker_id)
  const byWorker = new Map<string, { position: any; worker: any }>()
  for (const p of rosterPositions || []) {
    const w = (p as any).worker
    if (!w?.id) continue
    if (!byWorker.has(w.id)) {
      byWorker.set(w.id, { position: p, worker: w })
    }
  }
  const featured = featuredWorkerIds.map((wid) => byWorker.get(wid)).filter(Boolean) as { position: any; worker: any }[]
  const restIds = new Set(featuredWorkerIds)
  const employees = Array.from(byWorker.values()).filter((e) => !restIds.has(e.worker.id))

  // Stats from roster positions
  const positions = rosterPositions || []
  const allRatings = positions
    .filter((p: any) => p.review_count > 0)
    .flatMap((p: any) => Array(p.review_count).fill(p.rating))
  const averageRating = allRatings.length > 0
    ? allRatings.reduce((sum: number, r: number) => sum + r, 0) / allRatings.length
    : 0
  const totalReviews = positions.reduce((sum: number, p: any) => sum + (p.review_count || 0), 0)
  const verifiedCount = positions.filter((p: any) => p.email_verified || p.hr_verified).length

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-navy-600/5 to-transparent border-b border-soft-200">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-start gap-6">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-24 h-24 rounded-xl border-4 border-soft-200 bg-white object-contain"
              />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-navy-600/20 border-4 border-soft-200 flex items-center justify-center text-4xl">
                🏢
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-navy-600">
                  {company.name}
                </h1>
                {company.verification_status === 'verified' && (
                  <span className="px-3 py-1 bg-green-500/10 text-green-400 text-sm font-medium rounded-full">
                    ✓ Verified
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-soft-500 mb-4">
                {company.city && company.state && (
                  <div className="flex items-center gap-1">
                    <span>📍</span>
                    <span>{company.city}, {company.state}</span>
                  </div>
                )}
                {company.industry && (
                  <div className="flex items-center gap-1">
                    <span>•</span>
                    <span>{company.industry}</span>
                  </div>
                )}
              </div>

              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-navy-500 hover:text-navy-400 text-sm transition-colors"
                >
                  {company.website} →
                </a>
              )}
            </div>
          </div>

          {/* Company Stats */}
          <div className="grid grid-cols-4 gap-6 mt-8">
            <StatCard
              icon="⭐"
              value={averageRating > 0 ? formatRating(averageRating) : '—'}
              label="Average Rating"
            />
            <StatCard
              icon="💬"
              value={totalReviews.toString()}
              label="Total Reviews"
            />
            <StatCard
              icon="👥"
              value={employees.length.toString()}
              label="Employees"
            />
            <StatCard
              icon="✅"
              value={verifiedCount.toString()}
              label="Verified Positions"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Top Performers */}
        {featured.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-navy-600 mb-6">Top Performers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map(({ position, worker }) => (
                <EmployeeCard key={worker.id} worker={worker} position={position} />
              ))}
            </div>
          </div>
        )}

        {/* Team */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-navy-600 mb-6">Team</h2>
          {employees.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employees.map(({ position, worker }) => (
                <EmployeeCard key={worker.id} worker={worker} position={position} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white border border-soft-200 rounded-xl">
              <p className="text-soft-400">No employees on the roster yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-soft-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <div className="flex items-center justify-center gap-6 mb-4">
            <a
              href={`/companies/${params.slug}/manage`}
              className="text-navy-500 hover:text-navy-400 text-sm transition-colors"
            >
              Manage this company →
            </a>
          </div>
          <p className="text-soft-400 text-sm mb-2">
            Company profiles on TipTop.review showcase verified employee work history and reviews
          </p>
          <a
            href="https://tiptop.review"
            className="text-navy-600 hover:text-navy-500 transition-colors font-medium"
          >
            TipTop.review
          </a>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="bg-white border border-soft-200 rounded-xl p-4 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-navy-600 mb-1">{value}</div>
      <div className="text-xs text-soft-500">{label}</div>
    </div>
  )
}

function EmployeeCard({ worker, position }: { worker: any; position: any }) {
  const rating = position?.rating > 0 ? position.rating : worker?.overall_rating || 0
  const reviewCount = position?.review_count ?? worker?.total_reviews ?? 0
  const isVerified = position?.email_verified || position?.hr_verified

  return (
    <Link
      href={`/worker/${worker.slug}`}
      className="block bg-white border border-soft-200 hover:border-gold-300 rounded-xl p-6 transition-all"
    >
      {worker.avatar_url && (
        <img
          src={worker.avatar_url}
          alt={worker.display_name}
          className="w-12 h-12 rounded-full object-cover mb-3"
        />
      )}
      <h3 className="text-lg font-semibold text-navy-600 mb-2">
        {worker.display_name}
      </h3>
      <p className="text-navy-500 text-sm mb-3">
        {position?.title || 'Employee'}
      </p>
      <div className="flex items-center gap-4 text-sm text-soft-500 mb-2">
        <div className="flex items-center gap-1">
          <span>⭐</span>
          <span>{rating > 0 ? formatRating(rating) : '—'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>💬</span>
          <span>{reviewCount} reviews</span>
        </div>
      </div>
      {isVerified && (
        <span className="inline-flex items-center gap-1 text-xs text-green-400">
          ✓ Verified
        </span>
      )}
    </Link>
  )
}
