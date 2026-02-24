import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'
import { sendPositionVerificationEmail, sendHRApprovalRequest } from '@/lib/email'

// POST /api/positions/[id]/resend-verification
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: positionId } = params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: worker } = await supabase
    .from('workers')
    .select('id, display_name')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
  }

  const { data: position, error: positionError } = await supabase
    .from('positions')
    .select('*, company:companies(*)')
    .eq('id', positionId)
    .eq('worker_id', worker.id)
    .single()

  if (positionError || !position) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  }

  if (position.email_verified || position.hr_verified) {
    return NextResponse.json({ error: 'Position is already verified' }, { status: 409 })
  }

  const body = await request.json()
  const { verification_email, hr_email, update_info } = body

  if (update_info) {
    if (verification_email && verification_email !== position.verification_email) {
      await supabase
        .from('positions')
        .update({ verification_email })
        .eq('id', positionId)
    }

    if (hr_email && hr_email !== position.company.hr_email) {
      await supabase
        .from('companies')
        .update({
          hr_email,
          verification_status: position.company.verification_status === 'unverified'
            ? 'registered'
            : position.company.verification_status,
        })
        .eq('id', position.company.id)
    }
  }

  const emailToUse = verification_email || position.verification_email
  const hrEmailToUse = hr_email || position.company.hr_email
  let sent = false

  // Try sending position verification email
  if (emailToUse && position.company.email_domain) {
    const emailDomain = emailToUse.split('@')[1]?.toLowerCase()
    if (emailDomain === position.company.email_domain.toLowerCase()) {
      await sendPositionVerificationEmail({
        email: emailToUse,
        workerName: worker.display_name,
        companyName: position.company.name,
        positionTitle: position.title,
        positionId: position.id,
      })
      sent = true
    }
  }

  // Try sending HR approval request
  if (hrEmailToUse) {
    await sendHRApprovalRequest({
      hrEmail: hrEmailToUse,
      workerName: worker.display_name,
      companyName: position.company.name,
      positionTitle: position.title,
      positionId: position.id,
      startDate: position.start_date,
    })
    sent = true
  }

  if (!sent) {
    return NextResponse.json({ 
      error: 'No valid email to send verification to. Please provide a work email or HR email.' 
    }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    message: sent
      ? 'Verification request resent! Check your email.'
      : 'Verification information updated.',
  })
}
