import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  const admin = createAdminClient()
  const { tokenId } = params

  // Get QR token with position, worker, and company details
  const { data: token, error } = await admin
    .from('qr_tokens')
    .select(`
      *,
      position:positions (
        *,
        worker:workers (*),
        company:companies (*)
      )
    `)
    .eq('id', tokenId)
    .single()

  if (error || !token) {
    return NextResponse.json(
      { error: 'QR code not found' },
      { status: 404 }
    )
  }

  // Check if QR code is active
  if (!token.is_active) {
    return NextResponse.json(
      { error: 'This QR code is no longer active' },
      { status: 410 }
    )
  }

  // Check if position is verified
  const position = token.position
  const isVerified = position.email_verified || position.hr_verified

  // Increment scan count (fire and forget - don't await)
  void admin
    .from('qr_tokens')
    .update({ scan_count: (token.scan_count || 0) + 1 })
    .eq('id', tokenId)

  return NextResponse.json({
    token: {
      id: token.id,
      label: token.label,
    },
    position: {
      id: position.id,
      title: position.title,
      rating: position.rating,
      review_count: position.review_count,
      is_verified: isVerified,
    },
    worker: {
      id: position.worker.id,
      display_name: position.worker.display_name,
      slug: position.worker.slug,
      avatar_url: position.worker.avatar_url,
      overall_rating: position.worker.overall_rating,
      total_reviews: position.worker.total_reviews,
    },
    company: {
      id: position.company.id,
      name: position.company.name,
      city: position.company.city,
      state: position.company.state,
      verification_status: position.company.verification_status,
    },
  })
}
