import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/supabase/server'
import { slugify } from '@/lib/utils'

// Helper function to check if user is admin
async function isAdmin(userId: string, admin: any): Promise<boolean> {
  const { data } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single()
  
  return !!data
}

// GET /api/admin/companies - List all companies with stats
export async function GET(request: NextRequest) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  
  // Check admin role
  if (!(await isAdmin(user.id, admin))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  // Build query
  let query = admin
    .from('companies')
    .select('*', { count: 'exact' })

  if (status) {
    query = query.eq('verification_status', status)
  }

  const { data: companies, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  }

  // Get stats for each company (position count, review count, avg rating)
  const companiesWithStats = await Promise.all(
    (companies || []).map(async (company) => {
      const { data: positions } = await admin
        .from('positions')
        .select('id, rating, review_count')
        .eq('company_id', company.id)

      const positionCount = positions?.length || 0
      const totalReviews = positions?.reduce((sum, p) => sum + p.review_count, 0) || 0
      const avgRating = positions?.length 
        ? positions.reduce((sum, p) => sum + (p.rating * p.review_count), 0) / totalReviews
        : 0

      return {
        ...company,
        position_count: positionCount,
        review_count: totalReviews,
        average_rating: Math.round(avgRating * 100) / 100,
      }
    })
  )

  return NextResponse.json({
    companies: companiesWithStats,
    total: count || 0,
    page,
    limit,
    has_more: (count || 0) > offset + limit
  })
}

// POST /api/admin/companies - Create verified company (admin only)
export async function POST(request: NextRequest) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  
  // Check admin role
  if (!(await isAdmin(user.id, admin))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const {
    name,
    address,
    city,
    state,
    zip,
    industry,
    email_domain,
    hr_email,
    website,
  } = body

  if (!name) {
    return NextResponse.json({ error: 'Company name required' }, { status: 400 })
  }

  const companySlug = slugify(name)

  // Create verified company
  const { data: company, error: createError } = await admin
    .from('companies')
    .insert({
      name,
      slug: companySlug,
      address: address || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      industry: industry || null,
      email_domain: email_domain ? email_domain.toLowerCase() : null,
      hr_email: hr_email || null,
      website: website || null,
      verification_status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by: user.id,
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

// PATCH /api/admin/companies/[id] - Update company (admin only)
export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  
  // Check admin role
  if (!(await isAdmin(user.id, admin))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const companyId = url.pathname.split('/').pop()

  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  const body = await request.json()

  // If changing verification status to verified, set verified_by and verified_at
  if (body.verification_status === 'verified') {
    body.verified_by = user.id
    body.verified_at = new Date().toISOString()
  }

  // Ensure email_domain is lowercase if provided
  if (body.email_domain) {
    body.email_domain = body.email_domain.toLowerCase()
  }

  const { data: updated, error: updateError } = await admin
    .from('companies')
    .update(body)
    .eq('id', companyId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating company:', updateError)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }

  return NextResponse.json({ company: updated })
}
