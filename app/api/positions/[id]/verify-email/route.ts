import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/supabase/server'
import { verifyVerificationToken } from '@/lib/utils'
import { limitVerifyEmail, getClientIp } from '@/lib/rateLimit'

// POST /api/positions/[id]/verify-email
// Called when user clicks verification link in email
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: positionId } = params
  const { token } = await request.json()

  if (!token) {
    return NextResponse.json({ error: 'Verification token required' }, { status: 400 })
  }

  const clientIp = getClientIp(request)
  const rl = await limitVerifyEmail(clientIp, positionId)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', resetSeconds: rl.resetSeconds },
      { status: 429 }
    )
  }

  const admin = await createAdminClient()

  // Verify token signature and expiration
  if (!verifyVerificationToken(token, positionId)) {
    return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 })
  }

  // Get position with company
  const { data: position, error: positionError } = await admin
    .from('positions')
    .select('*, company:companies(*)')
    .eq('id', positionId)
    .single()

  if (positionError || !position) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  }

  // Verify email domain matches company domain
  if (!position.verification_email || !position.company.email_domain) {
    return NextResponse.json({ 
      error: 'Position not eligible for email verification' 
    }, { status: 400 })
  }

  const emailDomain = position.verification_email.split('@')[1]?.toLowerCase()
  const companyDomain = position.company.email_domain.toLowerCase()

  if (emailDomain !== companyDomain) {
    return NextResponse.json({ 
      error: 'Email domain does not match company domain' 
    }, { status: 400 })
  }

  // Mark position as email verified
  const { data: updated, error: updateError } = await admin
    .from('positions')
    .update({
      email_verified: true,
      email_verified_at: new Date().toISOString(),
    })
    .eq('id', positionId)
    .select()
    .single()

  if (updateError) {
    console.error('Error verifying position:', updateError)
    return NextResponse.json({ 
      error: 'Failed to verify position' 
    }, { status: 500 })
  }

  // Activate QR token for this position
  await admin
    .from('qr_tokens')
    .update({ is_active: true })
    .eq('position_id', positionId)

  return NextResponse.json({ 
    success: true,
    position: updated,
    message: 'Position verified! Your QR code is now active.'
  })
}
