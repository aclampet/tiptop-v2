import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'

// GET /api/companies/manage?slug=xxx — Load company for management
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'Company slug required' }, { status: 400 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single()

  const { data: userMembership } = await supabase
    .from('company_memberships')
    .select('role')
    .eq('company_id', company.id)
    .eq('user_id', user.id)
    .maybeSingle()

  let hasPosition = false
  const { data: worker } = await supabase
    .from('workers')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (worker) {
    const { data: pos } = await supabase
      .from('positions')
      .select('id')
      .eq('company_id', company.id)
      .eq('worker_id', worker.id)
      .limit(1)
      .maybeSingle()
    hasPosition = !!pos
  }

  const isAllowed =
    company.created_by === user.id ||
    !!userRole ||
    (userMembership && ['owner', 'admin'].includes(userMembership.role)) ||
    hasPosition
  if (!isAllowed) {
    return NextResponse.json({ error: 'You do not have permission to manage this company' }, { status: 403 })
  }

  const { data: ownerRow } = await supabase
    .from('company_memberships')
    .select('id')
    .eq('company_id', company.id)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()
  const hasOwner = !!ownerRow

  const canClaim =
    !hasOwner &&
    (company.created_by === user.id || hasPosition)

  return NextResponse.json({
    company,
    has_owner: hasOwner,
    user_membership: userMembership ? { role: userMembership.role } : null,
    can_claim: canClaim,
  })
}

// PATCH /api/companies/manage — Update company profile
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { company_id, ...updates } = body

  if (!company_id) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  const allowedFields: Record<string, any> = {}
  const safeFields = ['name', 'city', 'state', 'zip', 'address', 'industry', 'website', 'hr_email']
  for (const field of safeFields) {
    if (updates[field] !== undefined) {
      allowedFields[field] = updates[field]
    }
  }

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('companies')
    .update(allowedFields)
    .eq('id', company_id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating company:', updateError)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }

  if (!updated) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  return NextResponse.json({ company: updated })
}
