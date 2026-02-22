import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/supabase/server'

// Helper function to check if user is admin
async function isAdmin(userId: string, admin: any): Promise<boolean> {
  const { data } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single()
  
  return !!data
}

// GET /api/admin/companies/[id] - Get single company
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await createAdminClient()
  
  // Check admin role
  if (!(await isAdmin(user.id, admin))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: companyId } = params

  const { data: company, error } = await admin
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (error || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  return NextResponse.json({ company })
}

// PATCH /api/admin/companies/[id] - Update company (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await createAdminClient()
  
  // Check admin role
  if (!(await isAdmin(user.id, admin))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: companyId } = params
  const body = await request.json()

  // If changing verification status to verified, set verified_by and verified_at
  if (body.verification_status === 'verified') {
    body.verified_by = user.id
    body.verified_at = new Date().toISOString()
  }

  // Ensure email_domain is lowercase if provided
  if (body.email_domain) {
    body.email_domain = body.email_domain.toLowerCase()
  }

  const { data: updated, error: updateError } = await admin
    .from('companies')
    .update(body)
    .eq('id', companyId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating company:', updateError)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }

  return NextResponse.json({ company: updated })
}
