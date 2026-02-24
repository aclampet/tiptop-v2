import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'

// DELETE /api/companies/[companyId]/members/[userId] — Remove admin (owner-only)
export async function DELETE(
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

  if (!myMembership || myMembership.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required to remove members' }, { status: 403 })
  }

  const { data: target } = await supabase
    .from('company_memberships')
    .select('id, role')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .single()

  if (!target) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }
  if (target.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove the owner' }, { status: 400 })
  }

  const { error: deleteError } = await supabase
    .from('company_memberships')
    .delete()
    .eq('company_id', companyId)
    .eq('user_id', userId)

  if (deleteError) {
    console.error('Error removing member:', deleteError)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
