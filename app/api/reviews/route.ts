import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/supabase/server'
import { getDeviceFingerprint } from '@/lib/utils'
import { checkBadgeEligibility } from '@/lib/badges'
import { sendNewReviewEmail } from '@/lib/email'
import { limitReview, getClientIp } from '@/lib/rateLimit'
import type { SubmitReviewRequest } from '@/types'

// GET /api/reviews?position_id=xxx - Get reviews for a position (public)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const positionId = searchParams.get('position_id')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!positionId) {
    return NextResponse.json({ error: 'Position ID required' }, { status: 400 })
  }

  const supabase = await createClient()
  const offset = (page - 1) * limit

  const { data: reviews, error, count } = await supabase
    .from('reviews')
    .select('*', { count: 'exact' })
    .eq('position_id', positionId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }

  return NextResponse.json({
    reviews: reviews || [],
    total: count || 0,
    page,
    limit,
    has_more: (count || 0) > offset + limit
  })
}

// CAPTCHA switch (config flag) — not implemented yet
const REVIEW_REQUIRE_CAPTCHA = process.env.REVIEW_REQUIRE_CAPTCHA === 'true'

const MAX_REVIEW_BODY_BYTES = parseInt(process.env.REVIEW_MAX_BODY_BYTES || '32768', 10)

// POST /api/reviews - Submit a review
export async function POST(request: NextRequest) {
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > MAX_REVIEW_BODY_BYTES) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  let body: SubmitReviewRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { position_id, qr_token_id, rating, comment, reviewer_name } = body

  if (!position_id || !qr_token_id || rating === undefined || rating === null) {
    return NextResponse.json({ error: 'position_id, qr_token_id, and rating are required' }, { status: 400 })
  }

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 422 })
  }

  if (REVIEW_REQUIRE_CAPTCHA) {
    return NextResponse.json({ error: 'CAPTCHA verification required (not yet configured)' }, { status: 503 })
  }

  const supabase = await createClient()

  const { data: token, error: tokenError } = await supabase
    .from('qr_tokens')
    .select('id, position_id, is_active, scan_count')
    .eq('id', qr_token_id)
    .single()

  if (tokenError || !token) {
    return NextResponse.json({ error: 'QR token not found' }, { status: 404 })
  }

  if (!token.is_active || token.position_id !== position_id) {
    return NextResponse.json({ error: 'Invalid QR token for this position' }, { status: 403 })
  }

  const { data: position } = await supabase
    .from('positions')
    .select(`
      *,
      worker:workers(id, display_name, auth_user_id),
      company:companies(name)
    `)
    .eq('id', position_id)
    .single()

  if (!position) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  }

  // Generate device fingerprint
  const fingerprint = await getDeviceFingerprint(request)

  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('position_id', position.id)
    .eq('reviewer_fingerprint', fingerprint)
    .single()

  if (existing) {
    return NextResponse.json({ 
      error: 'You have already reviewed this position' 
    }, { status: 409 })
  }

  const clientIp = getClientIp(request)
  const rl = await limitReview(clientIp, position_id)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', resetSeconds: rl.resetSeconds },
      { status: 429 }
    )
  }

  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .insert({
      position_id: position.id,
      qr_token_id,
      rating,
      comment: comment || null,
      reviewer_name: reviewer_name || null,
      reviewer_fingerprint: fingerprint,
    })
    .select()
    .single()

  if (reviewError) {
    console.error('Error creating review:', reviewError)
    return NextResponse.json({ 
      error: 'Failed to submit review' 
    }, { status: 500 })
  }

  // Note: scan_count is already incremented when QR is scanned (in worker route)
  // No need to increment again here

  // Position rating is updated automatically by trigger
  // Worker overall rating is updated automatically by trigger

  // Check badge eligibility (runs async, non-blocking)
  checkBadgeEligibility(position.worker.id).catch(err => 
    console.error('Badge check failed:', err)
  )

  const admin = await createAdminClient()
  const { data: authUser } = await admin.auth.admin.getUserById(
    position.worker.auth_user_id
  )

  if (authUser?.user?.email) {
    sendNewReviewEmail({
      workerEmail: authUser.user.email,
      workerName: position.worker.display_name,
      companyName: position.company.name,
      positionTitle: position.title,
      reviewerName: reviewer_name || 'A customer',
      rating,
      comment: comment || null,
    }).catch(err => console.error('Failed to send email:', err))
  }

  return NextResponse.json({ 
    success: true,
    review,
    message: 'Thank you for your review!'
  })
}
