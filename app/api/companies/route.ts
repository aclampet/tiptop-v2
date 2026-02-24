import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'
import { slugify } from '@/lib/utils'
import type { CreateCompanyRequest, UpdateCompanyRequest } from '@/types'

// GET /api/companies?query=search - Search companies (autocomplete, public)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  const limit = parseInt(searchParams.get('limit') || '10')

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, city, state, verification_status, email_domain')
    .ilike('name', `%${query}%`)
    .order('verification_status', { ascending: false })
    .order('name')
    .limit(limit)

  if (error) {
    console.error('Error searching companies:', error)
    return NextResponse.json({ error: 'Failed to search companies' }, { status: 500 })
  }

  const exactMatch = (companies || []).find(
    c => c.name.toLowerCase() === query.toLowerCase()
  )

  return NextResponse.json({
    companies: companies || [],
    exact_match: exactMatch || null
  })
}

// POST /api/companies - Create new company
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: CreateCompanyRequest = await request.json()

  if (!body.name) {
    return NextResponse.json({ error: 'Company name required' }, { status: 400 })
  }

  const companySlug = slugify(body.name)

  const { data: existing } = await supabase
    .from('companies')
    .select('id, name')
    .eq('slug', companySlug)
    .single()

  if (existing) {
    return NextResponse.json({
      error: 'Company with similar name already exists',
      existing_company: existing
    }, { status: 409 })
  }

  const { data: company, error: createError } = await supabase
    .from('companies')
    .insert({
      name: body.name,
      slug: companySlug,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      zip: body.zip || null,
      industry: body.industry || null,
      website: body.website || null,
      verification_status: 'unverified',
      created_by: user.id,
    })
    .select()
    .single()

  if (createError) {
    console.error('Error creating company:', createError)
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }

  return NextResponse.json({ company })
}

// PATCH /api/companies - Update company (requires company_id in body)
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: UpdateCompanyRequest & { company_id?: string } = await request.json()
  const { company_id: companyId, ...updates } = body

  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required in request body' }, { status: 400 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', companyId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating company:', updateError)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }

  if (!updated) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  return NextResponse.json({ company: updated })
}
