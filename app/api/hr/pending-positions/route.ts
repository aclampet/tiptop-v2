import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/supabase/server'

// GET /api/hr/pending-positions — Positions awaiting HR verification (verified HR only)
export async function GET() {
  const supabase = await createClient()
  const admin = await createAdminClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('hr_profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('status', 'verified')
    .maybeSingle()

  if (!profile?.company_id) {
    return NextResponse.json({ error: 'No verified HR profile' }, { status: 403 })
  }

  const { data: positions, error } = await admin
    .from('positions')
    .select(`
      id,
      title,
      start_date,
      verification_email,
      hr_verified,
      email_verified,
      created_at,
      worker:workers(id, display_name, slug),
      company:companies(id, name, slug)
    `)
    .eq('company_id', profile.company_id)
    .eq('hr_verified', false)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending positions:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }

  return NextResponse.json({ positions: positions || [] })
}
