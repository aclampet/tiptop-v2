import { NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'

// POST /api/hr/request-role — Add 'hr' role for self (self-service)
export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: user.id, role: 'hr' }, { onConflict: 'user_id,role' })

  if (error) {
    console.error('Error adding hr role:', error)
    return NextResponse.json({ error: 'Failed to add role' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
