import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'

async function verifyOwnership(request: NextRequest, positionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: position, error: positionError } = await supabase
    .from('positions')
    .select('worker_id')
    .eq('id', positionId)
    .single()

  if (positionError || !position) {
    return { error: NextResponse.json({ error: 'Position not found' }, { status: 404 }) }
  }

  const { data: worker } = await supabase
    .from('workers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker || worker.id !== position.worker_id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) }
  }

  return { supabase, worker, user }
}

// PATCH /api/positions/[id] — Update position (title, dates, is_active)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await verifyOwnership(request, params.id)
  if ('error' in result && result.error) return result.error

  const { supabase } = result as { supabase: Awaited<ReturnType<typeof createClient>>; worker: any; user: any }
  const body = await request.json()

  const allowedFields: Record<string, any> = {}
  if (body.title !== undefined) allowedFields.title = body.title
  if (body.start_date !== undefined) allowedFields.start_date = body.start_date
  if (body.end_date !== undefined) allowedFields.end_date = body.end_date
  if (body.is_active !== undefined) allowedFields.is_active = body.is_active
  if (body.verification_email !== undefined) allowedFields.verification_email = body.verification_email

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('positions')
    .update(allowedFields)
    .eq('id', params.id)
    .select(`*, company:companies (*)`)
    .single()

  if (updateError) {
    console.error('Error updating position:', updateError)
    return NextResponse.json({ error: 'Failed to update position' }, { status: 500 })
  }

  return NextResponse.json({ position: updated })
}

// DELETE /api/positions/[id] — Delete position (CASCADE removes reviews, qr_tokens)
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id: positionId } = context.params

  if (!positionId) {
    return NextResponse.json({ error: 'Position ID is required' }, { status: 400 })
  }

  const result = await verifyOwnership(request, positionId)
  if ('error' in result && result.error) return result.error

  const { supabase } = result as { supabase: Awaited<ReturnType<typeof createClient>>; worker: any; user: any }

  const { error: positionError } = await supabase
    .from('positions')
    .delete()
    .eq('id', positionId)

  if (positionError) {
    console.error('Error deleting position:', positionError)
    return NextResponse.json({ error: 'Failed to delete position' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Position deleted' })
}
