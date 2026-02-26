import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'
import { slugify } from '@/lib/utils'

export type FinalizeEnrollBody = {
  name: string
  company_id: string
  title: string
  title_normalized?: string
  location_text?: string
}

/** POST /api/enroll/finalize — Create/update worker + position (signed-in only). */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: FinalizeEnrollBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = (body.name || '').trim()
  const companyId = (body.company_id || '').trim()
  const title = (body.title || '').trim()

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Name is required (at least 2 characters)' }, { status: 400 })
  }
  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }
  if (!title || title.length < 1) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const displayName = name
  const slug = slugify(name)
  const positionTitle = body.title_normalized && body.title_normalized.trim() ? body.title_normalized.trim() : title
  const startDate = new Date().toISOString().slice(0, 10)

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', companyId)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  let worker = await supabase
    .from('workers')
    .select('id, display_name, slug')
    .eq('auth_user_id', user.id)
    .single()
    .then((r) => r.data)

  if (!worker) {
    let finalSlug = slug
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: created, error: createErr } = await supabase
        .from('workers')
        .insert({
          auth_user_id: user.id,
          display_name: displayName,
          slug: finalSlug,
          is_public: true,
        })
        .select()
        .single()

      if (!createErr) {
        worker = created
        break
      }
      if (createErr?.code === '23505' && createErr?.message?.includes('slug')) {
        finalSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
      } else {
        console.error('Create worker error:', createErr)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }
    }
    if (!worker) {
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }
  } else {
    const { error: updateErr } = await supabase
      .from('workers')
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq('id', worker.id)

    if (updateErr) {
      console.error('Update worker error:', updateErr)
    }
  }

  const { data: position, error: positionError } = await supabase
    .from('positions')
    .insert({
      worker_id: worker.id,
      company_id: companyId,
      title: positionTitle,
      start_date: startDate,
      end_date: null,
      is_active: true,
    })
    .select(`*, company:companies(*)`)
    .single()

  if (positionError) {
    console.error('Create position error:', positionError)
    return NextResponse.json({ error: 'Failed to add position' }, { status: 500 })
  }

  await supabase
    .from('qr_tokens')
    .insert({
      position_id: position.id,
      label: `${positionTitle} at ${company.name}`,
      is_active: false,
    })
    .select()
    .single()

  const workerSlug = (worker as { slug?: string }).slug ?? slug
  return NextResponse.json({
    worker: { id: worker!.id, display_name: (worker as { display_name: string }).display_name, slug: workerSlug },
    position: { id: position.id, title: position.title, company_id: position.company_id },
    message: 'Enrollment complete',
  })
}
