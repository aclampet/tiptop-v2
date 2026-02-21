import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/supabase/server'
import type { CreateQRTokenRequest, UpdateQRTokenRequest } from '@/types'

// GET /api/qr-tokens?position_id=xxx - Get QR tokens for a position
export async function GET(request: NextRequest) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const positionId = searchParams.get('position_id')

  if (!positionId) {
    return NextResponse.json({ error: 'Position ID required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify position ownership
  const { data: position } = await admin
    .from('positions')
    .select('worker_id')
    .eq('id', positionId)
    .single()

  if (!position) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  }

  const { data: worker } = await admin
    .from('workers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker || worker.id !== position.worker_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Get QR tokens for this position
  const { data: tokens, error } = await admin
    .from('qr_tokens')
    .select('*')
    .eq('position_id', positionId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching QR tokens:', error)
    return NextResponse.json({ error: 'Failed to fetch QR tokens' }, { status: 500 })
  }

  return NextResponse.json({ qr_tokens: tokens || [] })
}

// POST /api/qr-tokens - Create QR token for position
export async function POST(request: NextRequest) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: CreateQRTokenRequest = await request.json()
  const { position_id, label } = body

  if (!position_id) {
    return NextResponse.json({ error: 'Position ID required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify position ownership
  const { data: position } = await admin
    .from('positions')
    .select('worker_id, title, company:companies!inner(name)')
    .eq('id', position_id)
    .single()

  if (!position) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  }

  const { data: worker } = await admin
    .from('workers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker || worker.id !== position.worker_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Create QR token
  const company = position.company as any
  const defaultLabel = label || `${position.title} at ${company.name}`
  
  const { data: token, error: tokenError } = await admin
    .from('qr_tokens')
    .insert({
      position_id,
      label: defaultLabel,
      is_active: true,  // Active by default (position verification controls access)
    })
    .select()
    .single()

  if (tokenError) {
    console.error('Error creating QR token:', tokenError)
    return NextResponse.json({ error: 'Failed to create QR token' }, { status: 500 })
  }

  return NextResponse.json({ qr_token: token })
}

// PATCH /api/qr-tokens/[id] - Update QR token
export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const tokenId = url.pathname.split('/').pop()

  if (!tokenId) {
    return NextResponse.json({ error: 'Token ID required' }, { status: 400 })
  }

  const body: UpdateQRTokenRequest = await request.json()
  const admin = createAdminClient()

  // Verify ownership through position → worker chain
  const { data: token } = await admin
    .from('qr_tokens')
    .select('position_id, position:positions!inner(worker_id)')
    .eq('id', tokenId)
    .single()

  if (!token) {
    return NextResponse.json({ error: 'QR token not found' }, { status: 404 })
  }

  const { data: worker } = await admin
    .from('workers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const position = token.position as any
  if (!worker || worker.id !== position.worker_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Update token
  const { data: updated, error: updateError } = await admin
    .from('qr_tokens')
    .update(body)
    .eq('id', tokenId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating QR token:', updateError)
    return NextResponse.json({ error: 'Failed to update QR token' }, { status: 500 })
  }

  return NextResponse.json({ qr_token: updated })
}
