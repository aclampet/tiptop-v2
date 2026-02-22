import { createAdminClient } from '@/supabase/server'

/**
 * Check if worker is eligible for new badges based on their review count and rating
 * This is called after a new review is submitted
 */
export async function checkBadgeEligibility(workerId: string): Promise<void> {
  const admin = await createAdminClient()

  // Get worker stats
  const { data: worker } = await admin
    .from('workers')
    .select('overall_rating, total_reviews')
    .eq('id', workerId)
    .single()

  if (!worker) return

  // Get all badges
  const { data: badges } = await admin
    .from('badges')
    .select('*')
    .in('category', ['volume', 'rating'])

  if (!badges) return

  // Get worker's current badges
  const { data: currentBadges } = await admin
    .from('worker_badges')
    .select('badge_id')
    .eq('worker_id', workerId)

  const currentBadgeIds = new Set(currentBadges?.map(b => b.badge_id) || [])

  // Check each badge
  for (const badge of badges) {
    // Skip if already awarded
    if (currentBadgeIds.has(badge.id)) continue

    const criteria = badge.criteria_json
    let eligible = false

    // Volume badges
    if (criteria.type === 'review_count') {
      eligible = worker.total_reviews >= criteria.threshold
    }

    // Rating badges
    if (criteria.type === 'rating_threshold') {
      eligible = 
        worker.total_reviews >= criteria.min_reviews &&
        worker.overall_rating >= criteria.threshold
    }

    // Award badge if eligible
    if (eligible) {
      await admin
        .from('worker_badges')
        .insert({
          worker_id: workerId,
          badge_id: badge.id,
          awarded_by: 'system',
        })
    }
  }
}
