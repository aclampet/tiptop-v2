import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/supabase/server'
import { getDeviceFingerprint } from '@/lib/utils'
import { checkBadgeEligibility } from '@/lib/badges'
import { sendNewReviewEmail } from '@/lib/email'
import type { SubmitReviewRequest } from '@/types'

// Rate limiting (in-memory - upgrade to Redis/Vercel KV for production)
const rateLimitStore = new Map<string, number>()

// GET /api/reviews?position_id=xxx - Get reviews for a position
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const positionId = searchParams.get('position_id')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!positionId) {
    return NextResponse.json({ error: 'Position ID required' }, { status: 400 })
  }

  const admin = await createAdminClient()
  const offset = (page - 1) * limit

  // Get reviews for this position
  const { data: reviews, error, count } = await admin
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

// POST /api/reviews - Submit a review
export async function POST(request: NextRequest) {
  const body: SubmitReviewRequest = await request.json()
  const { qr_token_id, rating, comment, reviewer_name } = body

  if (!qr_token_id || !rating) {
    return NextResponse.json({ 
      error: 'QR token ID and rating required' 
    }, { status: 400 })
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json({ 
      error: 'Rating must be between 1 and 5' 
    }, { status: 400 })
  }

  const admin = await createAdminClient()

  // Get QR token and verify it's active
  const { data: token, error: tokenError } = await admin
    .from('qr_tokens')
    .select('id, position_id, is_active, scan_count')
    .eq('id', qr_token_id)
    .single()

  if (tokenError || !token) {
    return NextResponse.json({ error: 'Invalid QR token' }, { status: 404 })
  }

  if (!token.is_active) {
    return NextResponse.json({ 
      error: 'This QR code is no longer active' 
    }, { status: 400 })
  }

  // Get position with worker and company info
  const { data: position } = await admin
    .from('positions')
    .select(`
      *,
      worker:workers(id, display_name, auth_user_id),
      company:companies(name)
    `)
    .eq('id', token.position_id)
    .single()

  if (!position) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  }

  // Generate device fingerprint
  const fingerprint = await getDeviceFingerprint(request)

  // Check for duplicate review (same device, same position)
  const { data: existing } = await admin
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

  // Rate limiting: 1 review per IP per 60 seconds
  const clientIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
  const rateLimitKey = `${clientIp}`
  const now = Date.now()
  const lastReview = rateLimitStore.get(rateLimitKey)

  if (lastReview && now - lastReview < 60000) {
    return NextResponse.json({ 
      error: 'Please wait before submitting another review' 
    }, { status: 429 })
  }

  // Insert review
  const { data: review, error: reviewError } = await admin
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

  // Update rate limit
  rateLimitStore.set(rateLimitKey, now)

  // Note: scan_count is already incremented when QR is scanned (in worker route)
  // No need to increment again here

  // Position rating is updated automatically by trigger
  // Worker overall rating is updated automatically by trigger

  // Check badge eligibility (runs async, non-blocking)
  checkBadgeEligibility(position.worker.id).catch(err => 
    console.error('Badge check failed:', err)
  )

  // Send email notification to worker (non-blocking)
  // Get worker's email from auth.users
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
