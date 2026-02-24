import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'
import { limitMembersInvite } from '@/lib/rateLimit'

// GET /api/companies/[companyId]/members — List members (admin-only)
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

  const { data: members, error } = await supabase
    .from('company_memberships')
    .select('id, user_id, role, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error listing members:', error)
    return NextResponse.json({ error: 'Failed to list members' }, { status: 500 })
  }

  const { data: invites } = await supabase
    .from('company_invites')
    .select('id, email, role, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    members: members || [],
    invites: invites || [],
  })
}

// POST /api/companies/[companyId]/members — Invite admin by email
export async function POST(
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

  const rl = await limitMembersInvite(user.id, companyId)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many invites. Please try again later.', resetSeconds: rl.resetSeconds },
      { status: 429 }
    )
  }

  const body = await request.json()
  const email = body?.email?.trim()?.toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const { data: invite, error } = await supabase
    .from('company_invites')
    .upsert(
      {
        company_id: companyId,
        email,
        role: 'admin',
        invited_by: user.id,
      },
      { onConflict: 'company_id,email' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error creating invite:', error)
    return NextResponse.json({ error: 'Failed to invite' }, { status: 500 })
  }

  return NextResponse.json({ invite })
}
