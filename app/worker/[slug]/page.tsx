import { notFound } from 'next/navigation'
import { createAdminClient } from '@/supabase/server'
import { formatRating, formatDateRange, getDurationMonths, formatDuration } from '@/lib/utils'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const admin = createAdminClient()
  
  const { data: worker } = await admin
    .from('workers')
    .select('display_name, overall_rating, total_reviews')
    .eq('slug', params.slug)
    .eq('is_public', true)
    .single()

  if (!worker) {
    return {
      title: 'Worker Not Found',
    }
  }

  return {
    title: `${worker.display_name} — TipTop Profile`,
    description: `${worker.display_name} has ${worker.total_reviews} verified reviews with a ${formatRating(worker.overall_rating)}/5 rating on TipTop.review.`,
  }
}

export default async function WorkerProfilePage({ params }: { params: { slug: string } }) {
  const admin = createAdminClient()

  // Get worker with all positions and reviews
  const { data: worker } = await admin
    .from('workers')
    .select(`
      *,
      positions (
        *,
        company:companies (*),
        reviews (
          id,
          rating,
          comment,
          reviewer_name,
          created_at
        )
      )
    `)
    .eq('slug', params.slug)
    .eq('is_public', true)
    .single()

  if (!worker) {
    notFound()
  }

  // Sort positions by start date (most recent first)
  const sortedPositions = worker.positions.sort((a: any, b: any) => {
    return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  })

  const activePositions = sortedPositions.filter((p: any) => !p.end_date)
  const pastPositions = sortedPositions.filter((p: any) => p.end_date)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-navy-600/5 to-transparent border-b border-soft-200">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-start gap-6">
            {worker.avatar_url ? (
              <img
                src={worker.avatar_url}
                alt={worker.display_name}
                className="w-24 h-24 rounded-full border-4 border-soft-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-navy-600/20 border-4 border-soft-200 flex items-center justify-center text-4xl">
                👤
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-navy-600 mb-2">
                {worker.display_name}
              </h1>
              {worker.bio && (
                <p className="text-soft-500 mb-4">{worker.bio}</p>
              )}
              
              {/* Overall Stats */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">⭐</span>
                  <div>
                    <div className="text-2xl font-bold text-navy-600">
                      {worker.overall_rating > 0 ? formatRating(worker.overall_rating) : '—'}
                    </div>
                    <div className="text-xs text-soft-400">Overall Rating</div>
                  </div>
                </div>
                
                <div className="border-l border-soft-200 pl-6">
                  <div className="text-2xl font-bold text-navy-600">
                    {worker.total_reviews}
                  </div>
                  <div className="text-xs text-soft-400">
                    Total Reviews
                  </div>
                </div>

                <div className="border-l border-soft-200 pl-6">
                  <div className="text-2xl font-bold text-navy-600">
                    {worker.positions.length}
                  </div>
                  <div className="text-xs text-soft-400">
                    Positions
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Current Positions */}
        {activePositions.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-navy-600 mb-6">Current Positions</h2>
            <div className="space-y-6">
              {activePositions.map((position: any) => (
                <PositionCard key={position.id} position={position} />
              ))}
            </div>
          </div>
        )}

        {/* Past Positions */}
        {pastPositions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-navy-600 mb-6">Experience</h2>
            <div className="space-y-6">
              {pastPositions.map((position: any) => (
                <PositionCard key={position.id} position={position} />
              ))}
            </div>
          </div>
        )}

        {/* No Positions */}
        {worker.positions.length === 0 && (
          <div className="text-center py-20 bg-white border border-soft-200 rounded-xl">
            <div className="text-6xl mb-6">💼</div>
            <p className="text-soft-500">
              {worker.display_name} hasn't added any positions yet.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-soft-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <p className="text-soft-400 text-sm mb-2">
            This is a verified TipTop.review professional profile
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

function PositionCard({ position }: { position: any }) {
  const isVerified = position.email_verified || position.hr_verified
  const dateRange = formatDateRange(position.start_date, position.end_date)
  const duration = formatDuration(getDurationMonths(position.start_date, position.end_date))
  
  const recentReviews = position.reviews
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)

  return (
    <div className="bg-white border border-soft-200 rounded-xl p-6">
      {/* Position Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-2xl font-semibold text-navy-600 mb-2">
            {position.title}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-lg text-navy-500">
              {position.company.name}
            </p>
            {position.company.verification_status === 'verified' && (
              <span className="text-navy-500">✓</span>
            )}
          </div>
          {position.company.city && position.company.state && (
            <p className="text-sm text-soft-400 mb-3">
              {position.company.city}, {position.company.state}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-soft-500">
            <span>{dateRange}</span>
            <span>•</span>
            <span>{duration}</span>
          </div>
        </div>

        {isVerified && (
          <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-medium rounded-full">
            ✓ Verified
          </span>
        )}
      </div>

      {/* Position Stats */}
      <div className="flex items-center gap-6 py-4 border-y border-soft-200 my-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⭐</span>
          <div>
            <div className="text-xl font-bold text-navy-600">
              {position.rating > 0 ? formatRating(position.rating) : '—'}
            </div>
            <div className="text-xs text-soft-400">Rating</div>
          </div>
        </div>
        
        <div className="border-l border-soft-200 pl-6">
          <div className="text-xl font-bold text-navy-600">
            {position.review_count}
          </div>
          <div className="text-xs text-soft-400">
            Reviews
          </div>
        </div>
      </div>

      {/* Recent Reviews */}
      {recentReviews.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-navy-600 mb-3">Recent Reviews</h4>
          <div className="space-y-3">
            {recentReviews.map((review: any) => (
              <div
                key={review.id}
                className="bg-white rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-sm">{'⭐'.repeat(review.rating)}</div>
                  {review.reviewer_name && (
                    <span className="text-xs text-soft-500">
                      — {review.reviewer_name}
                    </span>
                  )}
                </div>
                {review.comment && (
                  <p className="text-sm text-soft-500 italic">
                    "{review.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
          
          {position.review_count > 3 && (
            <p className="text-xs text-soft-400 mt-3">
              + {position.review_count - 3} more reviews
            </p>
          )}
        </div>
      )}

      {/* No Reviews */}
      {position.review_count === 0 && (
        <p className="text-sm text-soft-400 italic">
          No reviews yet for this position
        </p>
      )}
    </div>
  )
}
