import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/supabase/server'

// Helper: verify the authenticated user owns this position
async function verifyOwnership(request: NextRequest, positionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error('Auth error:', authError)
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const admin = await createAdminClient()

  const { data: position, error: positionError } = await admin
    .from('positions')
    .select('worker_id')
    .eq('id', positionId)
    .single()

  if (positionError) {
    console.error('Error fetching position:', positionError)
    return { error: NextResponse.json({ error: 'Position not found' }, { status: 404 }) }
  }

  if (!position) {
    return { error: NextResponse.json({ error: 'Position not found' }, { status: 404 }) }
  }

  const { data: worker, error: workerError } = await admin
    .from('workers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (workerError) {
    console.error('Error fetching worker:', workerError)
    return { error: NextResponse.json({ error: 'Worker profile not found' }, { status: 404 }) }
  }

  if (!worker || worker.id !== position.worker_id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) }
  }

  return { admin, worker, user }
}

// PATCH /api/positions/[id] — Update position (title, dates, is_active)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await verifyOwnership(request, params.id)
  if ('error' in result && result.error) return result.error

  const { admin } = result as { admin: Awaited<ReturnType<typeof createAdminClient>>; worker: any; user: any }
  const body = await request.json()

  // Only allow safe fields to be updated
  const allowedFields: Record<string, any> = {}
  if (body.title !== undefined) allowedFields.title = body.title
  if (body.start_date !== undefined) allowedFields.start_date = body.start_date
  if (body.end_date !== undefined) allowedFields.end_date = body.end_date
  if (body.is_active !== undefined) allowedFields.is_active = body.is_active
  if (body.verification_email !== undefined) allowedFields.verification_email = body.verification_email

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data: updated, error: updateError } = await admin
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

// DELETE /api/positions/[id] — Delete position and associated data
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const positionId = params.id
  console.log('DELETE position request:', positionId)

  const result = await verifyOwnership(request, positionId)
  if ('error' in result && result.error) return result.error

  const { admin } = result as { admin: Awaited<ReturnType<typeof createAdminClient>>; worker: any; user: any }

  // Delete in order: reviews → qr_tokens → position (cascade should handle this,
  // but be explicit for safety)
  const { error: reviewsError, count: reviewsDeleted } = await admin
    .from('reviews')
    .delete()
    .eq('position_id', positionId)
    .select('id', { count: 'exact', head: true })

  if (reviewsError) {
    console.error('Error deleting reviews:', reviewsError)
    return NextResponse.json({ error: 'Failed to delete associated reviews' }, { status: 500 })
  }
  console.log('Deleted reviews:', reviewsDeleted)

  const { error: tokensError, count: tokensDeleted } = await admin
    .from('qr_tokens')
    .delete()
    .eq('position_id', positionId)
    .select('id', { count: 'exact', head: true })

  if (tokensError) {
    console.error('Error deleting QR tokens:', tokensError)
    return NextResponse.json({ error: 'Failed to delete associated QR tokens' }, { status: 500 })
  }
  console.log('Deleted QR tokens:', tokensDeleted)

  const { error: positionError } = await admin
    .from('positions')
    .delete()
    .eq('id', positionId)

  if (positionError) {
    console.error('Error deleting position:', positionError)
    return NextResponse.json({ error: 'Failed to delete position' }, { status: 500 })
  }

  console.log('Position deleted successfully:', positionId)
  return NextResponse.json({ success: true, message: 'Position deleted' })
}
