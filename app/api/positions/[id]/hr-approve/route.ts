import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/supabase/server'

// POST /api/positions/[id]/hr-approve
// Called when HR clicks approve link in email
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: positionId } = params
  const { token, action } = await request.json()

  if (!token || !action) {
    return NextResponse.json({ 
      error: 'Token and action required' 
    }, { status: 400 })
  }

  if (!['approve', 'deny'].includes(action)) {
    return NextResponse.json({ 
      error: 'Action must be approve or deny' 
    }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify token (in production, validate JWT with HR email)
  // For now, simple approach where token = position_id
  if (token !== positionId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  // Get position
  const { data: position } = await admin
    .from('positions')
    .select('*, company:companies(*)')
    .eq('id', positionId)
    .single()

  if (!position) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  }

  if (action === 'approve') {
    // Approve position
    const { data: updated, error: updateError } = await admin
      .from('positions')
      .update({
        hr_verified: true,
        hr_verified_at: new Date().toISOString(),
        hr_verified_by: position.company.hr_email,
      })
      .eq('id', positionId)
      .select()
      .single()

    if (updateError) {
      console.error('Error approving position:', updateError)
      return NextResponse.json({ 
        error: 'Failed to approve position' 
      }, { status: 500 })
    }

    // Activate QR token
    await admin
      .from('qr_tokens')
      .update({ is_active: true })
      .eq('position_id', positionId)

    return NextResponse.json({ 
      success: true,
      position: updated,
      message: 'Position approved! QR code is now active.'
    })
  } else {
    // Deny position - mark as inactive
    const { error: updateError } = await admin
      .from('positions')
      .update({ is_active: false })
      .eq('id', positionId)

    if (updateError) {
      console.error('Error denying position:', updateError)
      return NextResponse.json({ 
        error: 'Failed to deny position' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Position denied and marked inactive.'
    })
  }
}
