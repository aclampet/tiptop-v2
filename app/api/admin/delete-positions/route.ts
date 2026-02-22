import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/supabase/server'

// Temporary admin endpoint to delete positions
// DELETE /api/admin/delete-positions?worker_name=adam%20clampet&count=2
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const workerName = searchParams.get('worker_name')
  const count = parseInt(searchParams.get('count') || '2')
  const secret = searchParams.get('secret')

  // Simple secret check (use env var in production)
  if (secret !== 'delete-now-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!workerName) {
    return NextResponse.json({ error: 'worker_name is required' }, { status: 400 })
  }

  const admin = await createAdminClient()

  // Find the worker
  const { data: worker, error: workerError } = await admin
    .from('workers')
    .select('id, display_name')
    .ilike('display_name', `%${workerName}%`)
    .single()

  if (workerError || !worker) {
    return NextResponse.json({ error: 'Worker not found', details: workerError }, { status: 404 })
  }

  // Find their positions
  const { data: positions, error: positionsError } = await admin
    .from('positions')
    .select('id, title, company:companies(name)')
    .eq('worker_id', worker.id)
    .limit(count)

  if (positionsError) {
    return NextResponse.json({ error: 'Error fetching positions', details: positionsError }, { status: 500 })
  }

  if (!positions || positions.length === 0) {
    return NextResponse.json({ error: 'No positions found for this worker' }, { status: 404 })
  }

  const deleted = []
  const errors = []

  for (const pos of positions) {
    // Delete reviews
    const { error: reviewsErr } = await admin.from('reviews').delete().eq('position_id', pos.id)
    if (reviewsErr) errors.push({ position: pos.id, step: 'reviews', error: reviewsErr })

    // Delete QR tokens
    const { error: tokensErr } = await admin.from('qr_tokens').delete().eq('position_id', pos.id)
    if (tokensErr) errors.push({ position: pos.id, step: 'qr_tokens', error: tokensErr })

    // Delete position
    const { error: posErr } = await admin.from('positions').delete().eq('id', pos.id)
    if (posErr) {
      errors.push({ position: pos.id, step: 'position', error: posErr })
    } else {
      deleted.push({ id: pos.id, title: pos.title, company: (pos.company as any)?.name })
    }
  }

  return NextResponse.json({
    worker: worker.display_name,
    deleted,
    errors: errors.length > 0 ? errors : undefined
  })
}
