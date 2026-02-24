import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/supabase/server'
import { verifyVerificationToken } from '@/lib/utils'
import { limitHrApprove, getClientIp } from '@/lib/rateLimit'

// POST /api/positions/[id]/hr-approve
// Called when HR clicks approve link in email (token) or from HR management page (session)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: positionId } = params
  const body = await request.json()
  const { token, action, reason_code, reason_note } = body

  if (!action || !['approve', 'deny'].includes(action)) {
    return NextResponse.json({
      error: 'Action must be approve or deny'
    }, { status: 400 })
  }

  if (token) {
    const clientIp = getClientIp(request)
    const rl = await limitHrApprove(clientIp, positionId)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', resetSeconds: rl.resetSeconds },
        { status: 429 }
      )
    }
  }

  const admin = await createAdminClient()
  const supabase = await createClient()

  const actorType = token ? 'token' : 'user'

  // Get position
  const { data: position } = await admin
    .from('positions')
    .select('*, company:companies(*)')
    .eq('id', positionId)
    .single()

  if (!position) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  }

  let hrVerifiedBy: string
  let actorUserId: string | null = null

  if (token) {
    // Token-based: from email link
    if (!verifyVerificationToken(token, positionId)) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }
    hrVerifiedBy = position.company.hr_email || 'hr@company.com'
  } else {
    // Session-based: verified HR user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    actorUserId = user.id
    const { data: hrProfile } = await supabase
      .from('hr_profiles')
      .select('work_email')
      .eq('user_id', user.id)
      .eq('company_id', position.company_id)
      .eq('status', 'verified')
      .single()
    if (!hrProfile) {
      return NextResponse.json({ error: 'Not a verified HR for this company' }, { status: 403 })
    }
    hrVerifiedBy = hrProfile.work_email || user.email || 'hr@company.com'
  }

  if (action === 'approve') {
    // Approve position
    const { data: updated, error: updateError } = await admin
      .from('positions')
      .update({
        hr_verified: true,
        hr_verified_at: new Date().toISOString(),
        hr_verified_by: hrVerifiedBy,
      })
      .eq('id', positionId)
      .select()
      .single()

    if (updateError) {
      console.error('Error approving position:', updateError)
      return NextResponse.json({ 
        error: 'Failed to approve position' 
      }, { status: 500 })
    }

    // Activate QR token
    await admin
      .from('qr_tokens')
      .update({ is_active: true })
      .eq('position_id', positionId)

    await supabase.rpc('log_verification_event', {
      p_company_id: position.company_id,
      p_position_id: positionId,
      p_event_type: 'position_approved',
      p_metadata: { email_used: hrVerifiedBy, token_based: !!token },
      p_actor_type: actorType,
    })

    return NextResponse.json({ 
      success: true,
      position: updated,
      message: 'Position approved! QR code is now active.'
    })
  } else {
    const validDenyReasons = ['not_employee', 'wrong_role_or_dates', 'insufficient_info', 'suspicious_or_fraud', 'other']
    const rc = reason_code?.trim()
    if (!rc || !validDenyReasons.includes(rc)) {
      return NextResponse.json({ error: 'reason_code required for deny (not_employee, wrong_role_or_dates, insufficient_info, suspicious_or_fraud, other)' }, { status: 400 })
    }

    // Deny position - mark as inactive
    const { error: updateError } = await admin
      .from('positions')
      .update({ is_active: false })
      .eq('id', positionId)

    if (updateError) {
      console.error('Error denying position:', updateError)
      return NextResponse.json({ 
        error: 'Failed to deny position' 
      }, { status: 500 })
    }

    const denyMeta: Record<string, unknown> = { email_used: hrVerifiedBy, token_based: !!token, reason_code: rc }
    if (reason_note?.trim()) denyMeta.reason_note = String(reason_note).trim().slice(0, 500)
    await supabase.rpc('log_verification_event', {
      p_company_id: position.company_id,
      p_position_id: positionId,
      p_event_type: 'position_denied',
      p_metadata: denyMeta,
      p_actor_type: actorType,
    })

    return NextResponse.json({ 
      success: true,
      message: 'Position denied and marked inactive.'
    })
  }
}
