import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/supabase/server'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ReviewsPage() {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get worker
  const { data: worker } = await admin
    .from('workers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker) redirect('/signup')

  // Get all positions
  const { data: positions } = await admin
    .from('positions')
    .select('id, title, company:companies(name)')
    .eq('worker_id', worker.id)

  const positionIds = positions?.map(p => p.id) || []

  // Get all reviews across positions
  const { data: reviews } = positionIds.length > 0
    ? await admin
        .from('reviews')
        .select(`
          *,
          position:positions (
            id,
            title,
            company:companies (name)
          )
        `)
        .in('position_id', positionIds)
        .order('created_at', { ascending: false })
    : { data: [] as any[] }

  // Group reviews by position
  const reviewsByPosition = reviews?.reduce((acc: any, review: any) => {
    const posId = review.position_id
    if (!acc[posId]) {
      acc[posId] = {
        position: review.position,
        reviews: []
      }
    }
    acc[posId].reviews.push(review)
    return acc
  }, {})

  const totalReviews = reviews?.length || 0
  const averageRating = reviews?.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-600 mb-2">Reviews</h1>
        <p className="text-soft-500">
          See what customers are saying about your work
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-soft-200 rounded-xl p-6">
          <div className="text-3xl mb-2">⭐</div>
          <div className="text-3xl font-bold text-navy-600 mb-1">{averageRating}</div>
          <div className="text-sm text-soft-500">Average Rating</div>
        </div>
        <div className="bg-white border border-soft-200 rounded-xl p-6">
          <div className="text-3xl mb-2">💬</div>
          <div className="text-3xl font-bold text-navy-600 mb-1">{totalReviews}</div>
          <div className="text-sm text-soft-500">Total Reviews</div>
        </div>
        <div className="bg-white border border-soft-200 rounded-xl p-6">
          <div className="text-3xl mb-2">💼</div>
          <div className="text-3xl font-bold text-navy-600 mb-1">{positions?.length || 0}</div>
          <div className="text-sm text-soft-500">Positions</div>
        </div>
      </div>

      {/* No Reviews */}
      {totalReviews === 0 && (
        <div className="text-center py-20 bg-white border border-soft-200 rounded-xl">
          <div className="text-6xl mb-6">⭐</div>
          <h2 className="text-2xl font-semibold text-navy-600 mb-4">
            No reviews yet
          </h2>
          <p className="text-soft-500 mb-8 max-w-md mx-auto">
            Share your QR codes with customers to start collecting reviews and building your reputation.
          </p>
          <a
            href="/dashboard/qr"
            className="inline-block bg-navy-600 hover:bg-navy-500 text-navy-600 px-8 py-4 rounded-lg font-semibold transition-all"
          >
            View QR Codes
          </a>
        </div>
      )}

      {/* Reviews by Position */}
      {reviewsByPosition && Object.keys(reviewsByPosition).length > 0 && (
        <div className="space-y-8">
          {Object.values(reviewsByPosition).map((group: any) => (
            <div key={group.position.id}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-navy-600">
                    {group.position.title}
                  </h2>
                  <p className="text-sm text-soft-500">
                    {group.position.company.name}
                  </p>
                </div>
                <span className="text-soft-400 text-sm">
                  {group.reviews.length} {group.reviews.length === 1 ? 'review' : 'reviews'}
                </span>
              </div>

              <div className="space-y-4">
                {group.reviews.map((review: any) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewCard({ review }: { review: any }) {
  const stars = '⭐'.repeat(review.rating)
  const emptyStars = '☆'.repeat(5 - review.rating)

  return (
    <div className="bg-white border border-soft-200 rounded-xl p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-lg">{stars}{emptyStars}</div>
            <span className="text-sm text-soft-400">
              {formatDate(review.created_at)}
            </span>
          </div>
          {review.reviewer_name && (
            <p className="text-sm font-medium text-navy-600 mb-2">
              {review.reviewer_name}
            </p>
          )}
        </div>
        {review.is_flagged && (
          <span className="px-3 py-1 bg-red-500/10 text-red-400 text-xs rounded-full">
            Flagged
          </span>
        )}
      </div>

      {review.comment && (
        <p className="text-soft-500 leading-relaxed">
          "{review.comment}"
        </p>
      )}

      {!review.comment && (
        <p className="text-soft-400 italic text-sm">
          No written comment
        </p>
      )}
    </div>
  )
}
