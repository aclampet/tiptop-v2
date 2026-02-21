import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/supabase/server'
import { getDeviceFingerprint } from '@/lib/utils'
import { sendNewReviewEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  const admin = createAdminClient()
  
  const { searchParams } = new URL(request.url)
  const positionId = searchParams.get('position_id')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  if (!positionId) {
    return NextResponse.json({ error: 'position_id required' }, { status: 400 })
  }

  const { data: reviews, error, count } = await admin
    .from('reviews')
    .select('*', { count: 'exact' })
    .eq('position_id', positionId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ 
    reviews,
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const admin = createAdminClient()
  
  const body = await request.json()
  const { qr_token_id, rating, comment, reviewer_name } = body

  if (!qr_token_id || !rating) {
    return NextResponse.json(
      { error: 'qr_token_id and rating are required' },
      { status: 400 }
    )
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: 'Rating must be between 1 and 5' },
      { status: 400 }
    )
  }

  const { data: token, error: tokenError } = await admin
    .from('qr_tokens')
    .select('id, position_id, is_active, scan_count')
    .eq('id', qr_token_id)
    .single()

  if (tokenError || !token) {
    return NextResponse.json({ error: 'Invalid QR code' }, { status: 404 })
  }

  if (!token.is_active) {
    return NextResponse.json(
      { error: 'This QR code is not active' },
      { status: 403 }
    )
  }

  const deviceFingerprint = await getDeviceFingerprint(request)

  const { data: existingReview } = await admin
    .from('reviews')
    .select('id')
    .eq('position_id', token.position_id)
    .eq('device_fingerprint', deviceFingerprint)
    .single()

  if (existingReview) {
    return NextResponse.json(
      { error: 'You have already reviewed this position' },
      { status: 409 }
    )
  }

  const clientIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'

  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
  
  const { data: recentReviews } = await admin
    .from('reviews')
    .select('id')
    .eq('reviewer_ip', clientIp)
    .gte('created_at', oneMinuteAgo)

  if (recentReviews && recentReviews.length > 0) {
    return NextResponse.json(
      { error: 'Please wait a minute before submitting another review' },
      { status: 429 }
    )
  }

  const { data: review, error: reviewError } = await admin
    .from('reviews')
    .insert({
      position_id: token.position_id,
      qr_token_id,
      rating,
      comment: comment || null,
      reviewer_name: reviewer_name || null,
      reviewer_ip: clientIp,
      device_fingerprint: deviceFingerprint,
    })
    .select()
    .single()

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 })
  }

  void admin
    .from('qr_tokens')
    .update({ scan_count: (token.scan_count || 0) + 1 })
    .eq('id', qr_token_id)

  const { data: position } = await admin
    .from('positions')
    .select('worker_id, title, worker:workers!inner(display_name, auth_user_id)')
    .eq('id', token.position_id)
    .single()

  if (position) {
    const workerData = position.worker as any
    const { data: { user } } = await admin.auth.admin.getUserById(workerData.auth_user_id)
    
    if (user?.email) {
      void sendNewReviewEmail({
        to: user.email,
        workerName: workerData.display_name,
        positionTitle: position.title,
        rating,
        comment,
        reviewerName: reviewer_name,
      })
    }
  }

  return NextResponse.json({ review })
}
