import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'

// PATCH /api/positions/[id]/visibility — Update roster visibility (worker or company admin)
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Handle params (may be Promise in Next.js 15+)
  const resolvedParams = await Promise.resolve(context.params)
  const positionId = resolvedParams.id
  if (!positionId) {
    return NextResponse.json({ error: 'Position ID required' }, { status: 400 })
  }

  const body = await request.json()
  const { show_on_company_page, started_at, ended_at, is_current } = body

  const { data: position } = await supabase
    .from('positions')
    .select('id, worker_id, company_id')
    .eq('id', positionId)
    .single()

  if (!position) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  }

  const { data: worker, error: workerError } = await supabase
    .from('workers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const { data: membership } = await supabase
    .from('company_memberships')
    .select('role')
    .eq('company_id', position.company_id)
    .eq('user_id', user.id)
    .single()

  const isOwner = worker?.id === position.worker_id
  const isAdmin = membership && ['owner', 'admin'].includes(membership.role)

  if (process.env.NODE_ENV !== 'production') {
    console.log('[visibility] user.id:', user.id, 'worker:', worker, 'workerError:', workerError?.message)
    console.log('[visibility] position.worker_id:', position.worker_id, 'isOwner:', isOwner, 'isAdmin:', isAdmin)
  }

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ 
      error: 'Not authorized to update this position',
      debug: { hasWorker: !!worker, isOwner, isAdmin, workerIdMatch: worker?.id === position.worker_id }
    }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}

  if (isOwner) {
    if (show_on_company_page !== undefined) updates.show_on_company_page = !!show_on_company_page
    if (started_at !== undefined) updates.started_at = started_at || null
    if (ended_at !== undefined) updates.ended_at = ended_at || null
    if (is_current !== undefined) updates.is_current = !!is_current
    if (updates.ended_at != null && updates.is_current !== false) updates.is_current = false
  }

  if (isAdmin) {
    if (show_on_company_page !== undefined) updates.show_on_company_page = !!show_on_company_page
    if (is_current !== undefined) updates.is_current = !!is_current
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Debug: log what we're about to update
  if (process.env.NODE_ENV !== 'production') {
    console.log('[visibility] positionId:', positionId, 'updates:', updates, 'isOwner:', isOwner, 'isAdmin:', isAdmin)
  }

  const { data: updated, error } = await supabase
    .from('positions')
    .update(updates)
    .eq('id', positionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating position visibility:', error)
    return NextResponse.json(
      { error: 'Failed to update', detail: error.message, code: error.code },
      { status: 500 }
    )
  }

  return NextResponse.json({ position: updated })
}
