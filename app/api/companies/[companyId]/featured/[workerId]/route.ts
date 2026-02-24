import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'

// DELETE /api/companies/[companyId]/featured/[workerId] — Remove featured worker (owner/admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { companyId: string; workerId: string } }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { companyId, workerId } = params
  if (!companyId || !workerId) {
    return NextResponse.json({ error: 'Company ID and worker ID required' }, { status: 400 })
  }

  const { data: membership } = await supabase
    .from('company_memberships')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { error } = await supabase
    .from('company_featured_workers')
    .delete()
    .eq('company_id', companyId)
    .eq('worker_id', workerId)

  if (error) {
    console.error('Error removing featured worker:', error)
    return NextResponse.json({ error: 'Failed to remove featured worker' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
