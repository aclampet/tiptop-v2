import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'

// POST /api/companies/[companyId]/featured — Add featured worker (owner/admin)
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

  const { data: membership } = await supabase
    .from('company_memberships')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const { worker_id, sort_order } = body

  if (!worker_id) {
    return NextResponse.json({ error: 'worker_id required' }, { status: 400 })
  }

  // Ensure worker has a roster-visible position at this company
  const { data: pos } = await supabase
    .from('positions')
    .select('id')
    .eq('company_id', companyId)
    .eq('worker_id', worker_id)
    .eq('show_on_company_page', true)
    .eq('is_current', true)
    .limit(1)
    .maybeSingle()

  if (!pos) {
    return NextResponse.json({ error: 'Worker has no current roster-visible position at this company' }, { status: 400 })
  }

  const { data: row, error } = await supabase
    .from('company_featured_workers')
    .upsert(
      {
        company_id: companyId,
        worker_id,
        sort_order: typeof sort_order === 'number' ? sort_order : 0,
      },
      { onConflict: 'company_id,worker_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error adding featured worker:', error)
    return NextResponse.json({ error: 'Failed to add featured worker' }, { status: 500 })
  }

  return NextResponse.json({ featured: row })
}
