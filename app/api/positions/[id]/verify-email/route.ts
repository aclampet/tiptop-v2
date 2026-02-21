import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient()
  const { id: positionId } = params
  const body = await request.json()
  const { token } = body

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const { data: position, error: posError } = await admin
    .from('positions')
    .select('*, company:companies!inner(*)')
    .eq('id', positionId)
    .single()

  if (posError || !position) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  }

  const company = position.company as any
  const expectedToken = Buffer.from(`${positionId}-verify`).toString('base64')
  
  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  if (!company.email_domain) {
    return NextResponse.json(
      { error: 'Company does not have email domain verification enabled' },
      { status: 400 }
    )
  }

  const { error: updateError } = await admin
    .from('positions')
    .update({ email_verified: true })
    .eq('id', positionId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await admin
    .from('qr_tokens')
    .update({ is_active: true })
    .eq('position_id', positionId)

  return NextResponse.json({ 
    success: true,
    position: { id: position.id, email_verified: true },
  })
}
