import { createAdminClient } from '@/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminReviewsPage() {
  const admin = createAdminClient()

  const { data: reviews } = await admin
    .from('reviews')
    .select(`
      *,
      position:positions (
        title,
        worker:workers (display_name, slug),
        company:companies (name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const { count: totalCount } = await admin
    .from('reviews')
    .select('*', { count: 'exact', head: true })

  const flaggedCount = reviews?.filter((r: any) => r.is_flagged).length || 0

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-600 mb-2">Reviews</h1>
          <p className="text-soft-500">
            {totalCount || 0} total reviews
            {flaggedCount > 0 && (
              <span className="text-red-400 ml-2">({flaggedCount} flagged)</span>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {reviews?.map((review: any) => (
          <div
            key={review.id}
            className={`bg-white border rounded-xl p-6 ${
              review.is_flagged
                ? 'border-red-500/20'
                : 'border-soft-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-lg mb-1">
                  {'⭐'.repeat(review.rating)}
                  {'☆'.repeat(5 - review.rating)}
                </div>
                <p className="text-navy-600 font-medium">
                  {review.position?.worker?.display_name}
                  <span className="text-soft-500 font-normal">
                    {' '}— {review.position?.title} at {review.position?.company?.name}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-soft-400">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
                {review.is_flagged && (
                  <span className="text-xs text-red-400 font-medium">FLAGGED</span>
                )}
              </div>
            </div>

            {review.comment && (
              <p className="text-soft-500 text-sm mb-3 italic">
                &ldquo;{review.comment}&rdquo;
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-soft-400">
              <span>By: {review.reviewer_name || 'Anonymous'}</span>
              <span>ID: {review.id.slice(0, 8)}...</span>
            </div>
          </div>
        ))}

        {(!reviews || reviews.length === 0) && (
          <div className="text-center py-16 bg-white border border-soft-200 rounded-xl">
            <div className="text-6xl mb-6">⭐</div>
            <p className="text-soft-500">No reviews yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
