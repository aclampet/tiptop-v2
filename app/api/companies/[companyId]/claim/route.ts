import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'
import { limitClaim, getClientIp } from '@/lib/rateLimit'

// POST /api/companies/[companyId]/claim — Claim company (become owner)
// Allowed if: company has no owner yet OR company.created_by = auth.uid()
export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  const { companyId } = params
  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  const clientIp = getClientIp(request)
  const rl = await limitClaim(clientIp, companyId)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', resetSeconds: rl.resetSeconds },
      { status: 429 }
    )
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, created_by')
    .eq('id', companyId)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const { data: existingOwner } = await supabase
    .from('company_memberships')
    .select('id')
    .eq('company_id', companyId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  if (existingOwner && company.created_by !== user.id) {
    return NextResponse.json({ error: 'Company already has an owner' }, { status: 403 })
  }

  const { data: membership, error } = await supabase
    .from('company_memberships')
    .upsert(
      {
        company_id: companyId,
        user_id: user.id,
        role: 'owner',
      },
      { onConflict: 'company_id,user_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error claiming company:', error)
    return NextResponse.json({ error: 'Failed to claim company' }, { status: 500 })
  }

  return NextResponse.json({ membership })
}
