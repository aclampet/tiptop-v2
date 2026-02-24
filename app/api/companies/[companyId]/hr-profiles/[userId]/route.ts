import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'

// PATCH /api/companies/[companyId]/hr-profiles/[userId] — Approve or reject HR (owner/admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { companyId: string; userId: string } }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { companyId, userId } = params
  if (!companyId || !userId) {
    return NextResponse.json({ error: 'Company ID and user ID required' }, { status: 400 })
  }

  const { data: myMembership } = await supabase
    .from('company_memberships')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .single()

  if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const status = body?.status
  if (!status || !['verified', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Status must be verified or rejected' }, { status: 400 })
  }

  const validRejectReasons = ['email_domain_mismatch', 'not_hr', 'insufficient_info', 'other']
  if (status === 'rejected') {
    const reasonCode = body?.reason_code?.trim()
    if (!reasonCode || !validRejectReasons.includes(reasonCode)) {
      return NextResponse.json({ error: 'reason_code required for rejection (email_domain_mismatch, not_hr, insufficient_info, other)' }, { status: 400 })
    }
  }

  const updates: Record<string, unknown> = {
    status,
    verified_at: status === 'verified' ? new Date().toISOString() : null,
    verified_by: status === 'verified' ? user.id : null,
  }

  const { data, error } = await supabase
    .from('hr_profiles')
    .update(updates)
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error) {
    console.error('Error updating hr_profile:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'HR profile not found' }, { status: 404 })
  }

  const eventType = status === 'verified' ? 'hr_profile_approved' : 'hr_profile_rejected'
  const metadata: Record<string, unknown> = { target_user_id: userId, work_email: data.work_email }
  if (status === 'rejected') {
    const reasonNote = body?.reason_note?.trim()
    metadata.reason_code = body.reason_code
    if (reasonNote) metadata.reason_note = reasonNote.slice(0, 500)
  }
  await supabase.rpc('log_verification_event', {
    p_company_id: companyId,
    p_position_id: null,
    p_event_type: eventType,
    p_metadata: metadata,
    p_actor_type: 'user',
  })

  return NextResponse.json({ profile: data })
}
