import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'
import { limitQrScan, getClientIp } from '@/lib/rateLimit'

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  const { tokenId } = params

  const clientIp = getClientIp(request)
  const rl = await limitQrScan(clientIp, tokenId)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', resetSeconds: rl.resetSeconds },
      { status: 429 }
    )
  }

  const supabase = await createClient()

  const { data: token, error: tokenError } = await supabase
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

  const { data: incremented } = await supabase.rpc('increment_qr_scan', { p_token_id: tokenId })
  if (!incremented) {
    return NextResponse.json({ error: 'QR code not found' }, { status: 404 })
  }

  const position = token.position as any
  const worker = position.worker as any
  const company = position.company as any

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
