import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'

// GET /api/companies/[companyId]/hr-profiles — List HR verification requests (owner/admin)
export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { companyId } = params
  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
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

  const { data: profiles, error } = await supabase
    .from('hr_profiles')
    .select('user_id, work_email, status, created_at, verified_at, verified_by')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error listing hr_profiles:', error)
    return NextResponse.json({ error: 'Failed to list' }, { status: 500 })
  }

  return NextResponse.json({ profiles: profiles || [] })
}
