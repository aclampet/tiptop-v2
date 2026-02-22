import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/supabase/server'

// GET /api/companies/manage?slug=xxx — Load company for management (verify ownership)
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

  const admin = await createAdminClient()

  // Get company
  const { data: company } = await admin
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  // Check ownership: user must be the creator OR an admin
  const { data: userRole } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single()

  if (company.created_by !== user.id && !userRole) {
    return NextResponse.json({ error: 'You do not have permission to manage this company' }, { status: 403 })
  }

  return NextResponse.json({ company })
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

  const admin = await createAdminClient()

  // Verify ownership
  const { data: company } = await admin
    .from('companies')
    .select('id, created_by')
    .eq('id', company_id)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const { data: userRole } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single()

  if (company.created_by !== user.id && !userRole) {
    return NextResponse.json({ error: 'You do not have permission to update this company' }, { status: 403 })
  }

  // Whitelist safe fields
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

  // If HR email is being added and company is unverified, upgrade to registered
  if (allowedFields.hr_email && !company.created_by) {
    // No change needed - just update
  }

  const { data: updated, error: updateError } = await admin
    .from('companies')
    .update(allowedFields)
    .eq('id', company_id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating company:', updateError)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }

  return NextResponse.json({ company: updated })
}
