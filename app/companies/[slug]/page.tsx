import { notFound } from 'next/navigation'
import { createAdminClient } from '@/supabase/server'
import { formatRating } from '@/lib/utils'
import Link from 'next/link'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const admin = createAdminClient()
  
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
  const admin = createAdminClient()

  // Get company with positions and worker details
  const { data: company } = await admin
    .from('companies')
    .select(`
      *,
      positions (
        *,
        worker:workers (
          id,
          display_name,
          slug,
          overall_rating,
          total_reviews
        )
      )
    `)
    .eq('slug', params.slug)
    .single()

  if (!company) {
    notFound()
  }

  // Calculate company stats
  const activePositions = company.positions.filter((p: any) => p.is_active)
  const verifiedPositions = company.positions.filter((p: any) => p.email_verified || p.hr_verified)
  
  const allRatings = company.positions
    .filter((p: any) => p.review_count > 0)
    .flatMap((p: any) => Array(p.review_count).fill(p.rating))
  
  const averageRating = allRatings.length > 0
    ? allRatings.reduce((sum: number, r: number) => sum + r, 0) / allRatings.length
    : 0

  const totalReviews = company.positions.reduce((sum: number, p: any) => sum + p.review_count, 0)

  // Get unique workers
  const uniqueWorkers = Array.from(
    new Map(company.positions.map((p: any) => [p.worker.id, p.worker])).values()
  )

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
              value={uniqueWorkers.length.toString()}
              label="Employees"
            />
            <StatCard
              icon="✅"
              value={verifiedPositions.length.toString()}
              label="Verified Positions"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Employees */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-navy-600 mb-6">
            Employees & Former Employees
          </h2>
          
          {uniqueWorkers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uniqueWorkers.map((worker: any) => {
                const workerPositions = company.positions.filter((p: any) => p.worker.id === worker.id)
                return (
                  <WorkerCard key={worker.id} worker={worker} positions={workerPositions} />
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white border border-soft-200 rounded-xl">
              <p className="text-soft-400">No employees have added positions yet</p>
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

function WorkerCard({ worker, positions }: { worker: any; positions: any[] }) {
  const currentPosition = positions.find((p: any) => !p.end_date)
  const positionCount = positions.length

  return (
    <Link
      href={`/worker/${worker.slug}`}
      className="block bg-white border border-soft-200 hover:border-gold-300 rounded-xl p-6 transition-all"
    >
      <h3 className="text-lg font-semibold text-navy-600 mb-2">
        {worker.display_name}
      </h3>
      
      {currentPosition ? (
        <p className="text-navy-500 text-sm mb-3">
          {currentPosition.title}
        </p>
      ) : (
        <p className="text-soft-400 text-sm mb-3">
          Former Employee
        </p>
      )}

      <div className="flex items-center gap-4 text-sm text-soft-500 mb-3">
        <div className="flex items-center gap-1">
          <span>⭐</span>
          <span>{worker.overall_rating > 0 ? formatRating(worker.overall_rating) : '—'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>💬</span>
          <span>{worker.total_reviews} reviews</span>
        </div>
      </div>

      <div className="text-xs text-soft-400">
        {positionCount} {positionCount === 1 ? 'position' : 'positions'} at this company
      </div>
    </Link>
  )
}
