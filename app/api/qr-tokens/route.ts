import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'

// GET /api/qr-tokens - Get all QR tokens for a position
export async function GET(request: NextRequest) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const positionId = searchParams.get('position_id')

  if (!positionId) {
    return NextResponse.json({ error: 'position_id required' }, { status: 400 })
  }

  // Verify position belongs to authenticated worker
  const { data: position } = await supabase
    .from('positions')
    .select('worker_id')
    .eq('id', positionId)
    .single()

  if (!position) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  }

  const { data: worker } = await supabase
    .from('workers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker || worker.id !== position.worker_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get QR tokens for this position
  const { data: tokens, error } = await supabase
    .from('qr_tokens')
    .select('*')
    .eq('position_id', positionId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tokens })
}

// POST /api/qr-tokens - Create QR token for position
export async function POST(request: NextRequest) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { position_id, label } = body

  if (!position_id) {
    return NextResponse.json({ error: 'position_id required' }, { status: 400 })
  }

  // Verify position belongs to authenticated worker
  const { data: position } = await supabase
    .from('positions')
    .select(`
      id,
      worker_id,
      title,
      company:companies!inner (
        name
      )
    `)
    .eq('id', position_id)
    .single()

  if (!position) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  }

  const { data: worker } = await supabase
    .from('workers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker || worker.id !== position.worker_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Create QR token
  const companyName = (position.company as any).name
  const defaultLabel = label || `${position.title} at ${companyName}`

  const { data: token, error: tokenError } = await supabase
    .from('qr_tokens')
    .insert({
      position_id,
      label: defaultLabel,
      is_active: false, // Will be activated when position is verified
    })
    .select()
    .single()

  if (tokenError) {
    return NextResponse.json({ error: tokenError.message }, { status: 500 })
  }

  return NextResponse.json({ token })
}

// PATCH /api/qr-tokens - Update QR token
export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { token_id, label, is_active } = body

  if (!token_id) {
    return NextResponse.json({ error: 'token_id required' }, { status: 400 })
  }

  // Verify token belongs to authenticated worker's position
  const { data: token } = await supabase
    .from('qr_tokens')
    .select(`
      *,
      position:positions (
        worker_id
      )
    `)
    .eq('id', token_id)
    .single()

  if (!token) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  const { data: worker } = await supabase
    .from('workers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const positionWorkerId = (token.position as any).worker_id
  if (!worker || worker.id !== positionWorkerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Update token
  const updates: any = {}
  if (label !== undefined) updates.label = label
  if (is_active !== undefined) updates.is_active = is_active

  const { data: updatedToken, error } = await supabase
    .from('qr_tokens')
    .update(updates)
    .eq('id', token_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ token: updatedToken })
}
