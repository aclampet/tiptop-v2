import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  const { tokenId } = params
  const admin = await createAdminClient()

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

  const position = token.position as any
  const worker = position.worker as any
  const company = position.company as any

  // Increment scan count (fire-and-forget for performance)
  // Note: For high-traffic scenarios, consider using a database function 
  // for atomic increment to prevent race conditions
  admin
    .from('qr_tokens')
    .update({ scan_count: (token.scan_count || 0) + 1 })
    .eq('id', tokenId)
    .then(({ error }) => {
      if (error) console.error('Failed to update scan count:', error)
    })

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
      is_verified: position.email_verified || position.hr_verified,
    },
    worker: {
      id: worker.id,
      display_name: worker.display_name,
      slug: worker.slug,
      avatar_url: worker.avatar_url,
      overall_rating: worker.overall_rating,
      total_reviews: worker.total_reviews,
    },
    company: {
      id: company.id,
      name: company.name,
      city: company.city,
      state: company.state,
      verification_status: company.verification_status,
    },
  })
}
