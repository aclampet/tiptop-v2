import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/supabase/server'

// GET /api/qr-tokens/[tokenId]/worker
// Public endpoint - returns worker info for review page
export async function GET(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  const { tokenId } = params
  const admin = createAdminClient()

  // Get QR token with full position, worker, and company details
  const { data: token, error: tokenError } = await admin
    .from('qr_tokens')
    .select(`
      id,
      label,
      scan_count,
      is_active,
      position:positions (
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
        ),
        company:companies (
          id,
          name,
          city,
          state,
          verification_status
        )
      )
    `)
    .eq('id', tokenId)
    .single()

  if (tokenError || !token) {
    return NextResponse.json({ error: 'QR code not found' }, { status: 404 })
  }

  if (!token.is_active) {
    return NextResponse.json({ 
      error: 'This QR code is no longer active' 
    }, { status: 410 })
  }

  // Increment scan count (non-blocking)
  admin
    .from('qr_tokens')
    .update({ scan_count: (token.scan_count || 0) + 1 })
    .eq('id', tokenId)
    .then(() => {})
    .catch(err => console.error('Failed to update scan count:', err))

  return NextResponse.json({ 
    token: {
      id: token.id,
      label: token.label,
    },
    position: {
      id: token.position.id,
      title: token.position.title,
      rating: token.position.rating,
      review_count: token.position.review_count,
      is_verified: token.position.email_verified || token.position.hr_verified,
    },
    worker: {
      id: token.position.worker.id,
      display_name: token.position.worker.display_name,
      slug: token.position.worker.slug,
      avatar_url: token.position.worker.avatar_url,
      overall_rating: token.position.worker.overall_rating,
      total_reviews: token.position.worker.total_reviews,
    },
    company: {
      id: token.position.company.id,
      name: token.position.company.name,
      city: token.position.company.city,
      state: token.position.company.state,
      verification_status: token.position.company.verification_status,
    }
  })
}
