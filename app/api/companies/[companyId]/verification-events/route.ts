import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'

// GET /api/companies/[companyId]/verification-events — Verification history (owner/admin)
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

  const limit = Math.min(parseInt(new URL(request.url).searchParams.get('limit') || '50') || 50, 100)

  const { data: events, error } = await supabase
    .from('verification_events')
    .select(`
      id,
      company_id,
      position_id,
      actor_user_id,
      actor_type,
      event_type,
      metadata,
      created_at
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching verification events:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }

  return NextResponse.json({ events: events || [] })
}
