import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'
import type { CreateWorkerRequest, UpdateWorkerRequest } from '@/types'

// GET /api/workers - Get authenticated worker with positions
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await createAdminClient()
  
  // Get worker with positions and company details
  const { data: worker, error: workerError } = await admin
    .from('workers')
    .select(`
      *,
      positions (
        *,
        company:companies (*)
      )
    `)
    .eq('auth_user_id', user.id)
    .single()

  if (workerError) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
  }

  // Get badges
  const { data: badges } = await admin
    .from('worker_badges')
    .select('*, badge:badges(*)')
    .eq('worker_id', worker.id)

  return NextResponse.json({ 
    worker: { ...worker, badges: badges || [] }
  })
}

// POST /api/workers - Create worker profile
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: CreateWorkerRequest = await request.json()
  const { display_name, slug } = body

  if (!display_name || !slug) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  const admin = await createAdminClient()

  // Check if worker already exists
  const { data: existing } = await admin
    .from('workers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'Worker profile already exists' },
      { status: 409 }
    )
  }

  // Try to create worker, with slug uniqueness handling
  let finalSlug = slug
  let attempts = 0
  let worker = null
  let createError = null

  while (attempts < 5) {
    const { data, error } = await admin
      .from('workers')
      .insert({
        auth_user_id: user.id,
        display_name,
        slug: finalSlug,
        is_public: true,
      })
      .select()
      .single()

    if (!error) {
      worker = data
      break
    }

    // If slug conflict, try with random suffix
    if (error.code === '23505' && error.message?.includes('slug')) {
      const randomSuffix = Math.random().toString(36).substring(2, 6)
      finalSlug = `${slug}-${randomSuffix}`
      attempts++
    } else {
      createError = error
      break
    }
  }

  if (createError || !worker) {
    console.error('Error creating worker:', createError)
    return NextResponse.json(
      { error: `Failed to create worker profile: ${createError?.message || 'Unknown error'}` },
      { status: 500 }
    )
  }

  // Send welcome email (non-blocking)
  sendWelcomeEmail({
    email: user.email!,
    displayName: display_name,
    workerSlug: slug,
  }).catch(err => console.error('Failed to send welcome email:', err))

  return NextResponse.json({ worker })
}

// PATCH /api/workers - Update worker profile
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: UpdateWorkerRequest = await request.json()
  const admin = await createAdminClient()

  // Get worker ID
  const { data: worker } = await admin
    .from('workers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
  }

  // Update worker
  const { data: updated, error: updateError } = await admin
    .from('workers')
    .update(body)
    .eq('id', worker.id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating worker:', updateError)
    return NextResponse.json(
      { error: 'Failed to update worker' },
      { status: 500 }
    )
  }

  return NextResponse.json({ worker: updated })
}
