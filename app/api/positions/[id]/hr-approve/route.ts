import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient()
  const { id: positionId } = params
  const body = await request.json()
  const { token, action } = body

  if (!token || !action || (action !== 'approve' && action !== 'deny')) {
    return NextResponse.json(
      { error: 'Valid token and action required' },
      { status: 400 }
    )
  }

  const { data: position, error: posError } = await admin
    .from('positions')
    .select('*')
    .eq('id', positionId)
    .single()

  if (posError || !position) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  }

  const expectedToken = Buffer.from(`${positionId}-hr-approve`).toString('base64')
  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  if (action === 'approve') {
    await admin
      .from('positions')
      .update({ hr_verified: true })
      .eq('id', positionId)

    await admin
      .from('qr_tokens')
      .update({ is_active: true })
      .eq('position_id', positionId)

    return NextResponse.json({
      success: true,
      action: 'approved',
      position: { id: position.id, hr_verified: true },
    })
  } else {
    await admin
      .from('positions')
      .update({ is_active: false })
      .eq('id', positionId)

    return NextResponse.json({
      success: true,
      action: 'denied',
      position: { id: position.id, is_active: false },
    })
  }
}
