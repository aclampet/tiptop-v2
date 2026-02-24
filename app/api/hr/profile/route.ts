import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'

// GET /api/hr/profile — User's own hr_profile
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('hr_profiles')
    .select('*, company:companies(id, name, slug)')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching hr_profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }

  return NextResponse.json({ profile })
}

// POST /api/hr/profile — Create or update own hr_profile (onboarding)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { work_email, company_id } = body

  const updates: Record<string, unknown> = {}
  if (work_email !== undefined) updates.work_email = work_email?.trim() || null
  if (company_id !== undefined) updates.company_id = company_id || null

  const { data: existing } = await supabase
    .from('hr_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let result
  if (existing) {
    const { data, error } = await supabase
      .from('hr_profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single()
    if (error) {
      console.error('Error updating hr_profile:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }
    result = data
  } else {
    const { data, error } = await supabase
      .from('hr_profiles')
      .insert({
        user_id: user.id,
        ...updates,
      })
      .select()
      .single()
    if (error) {
      console.error('Error creating hr_profile:', error)
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }
    result = data
  }

  return NextResponse.json({ profile: result })
}
