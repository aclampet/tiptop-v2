import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'
import { slugify } from '@/lib/utils'
import { sendPositionVerificationEmail, sendHRApprovalRequest } from '@/lib/email'
import type { CreatePositionRequest } from '@/types'

// GET /api/positions - Get all positions for authenticated worker
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: worker } = await supabase
    .from('workers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
  }

  const { data: positions, error: positionsError } = await supabase
    .from('positions')
    .select(`
      *,
      company:companies (*)
    `)
    .eq('worker_id', worker.id)
    .order('start_date', { ascending: false })

  if (positionsError) {
    console.error('Error fetching positions:', positionsError)
    return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
  }

  return NextResponse.json({ positions: positions || [] })
}

// POST /api/positions - Create new position
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: CreatePositionRequest = await request.json()

  const { data: worker } = await supabase
    .from('workers')
    .select('id, display_name')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
  }

  let companyId = body.company_id

  if (!companyId && body.company_name) {
    const companySlug = slugify(body.company_name)

    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: body.company_name,
        slug: companySlug,
        address: body.company_address || null,
        city: body.company_city || null,
        state: body.company_state || null,
        zip: body.company_zip || null,
        industry: body.company_industry || null,
        hr_email: body.company_hr_email || null,
        verification_status: body.company_hr_email ? 'registered' : 'unverified',
        created_by: user.id,
      })
      .select()
      .single()

    if (companyError) {
      console.error('Error creating company:', companyError)
      return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
    }

    companyId = newCompany.id
  }

  if (!companyId) {
    return NextResponse.json({ error: 'Company ID or name required' }, { status: 400 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  let emailVerified = false
  if (body.verification_email && company.email_domain) {
    const emailDomain = body.verification_email.split('@')[1]?.toLowerCase()
    if (emailDomain === company.email_domain.toLowerCase()) {
      emailVerified = true
    }
  }

  const { data: position, error: positionError } = await supabase
    .from('positions')
    .insert({
      worker_id: worker.id,
      company_id: companyId,
      title: body.title,
      start_date: body.start_date,
      end_date: body.end_date || null,
      verification_email: body.verification_email || null,
      email_verified: false,
      hr_verified: false,
      is_active: true,
    })
    .select(`
      *,
      company:companies (*)
    `)
    .single()

  if (positionError) {
    console.error('Error creating position:', positionError)
    return NextResponse.json({ error: 'Failed to create position' }, { status: 500 })
  }

  const { data: qrToken } = await supabase
    .from('qr_tokens')
    .insert({
      position_id: position.id,
      label: `${body.title} at ${company.name}`,
      is_active: false,
    })
    .select()
    .single()

  // Send verification email if email provided and matches domain
  if (body.verification_email && company.email_domain) {
    const emailDomain = body.verification_email.split('@')[1]?.toLowerCase()
    if (emailDomain === company.email_domain.toLowerCase()) {
      // Send email verification
      sendPositionVerificationEmail({
        email: body.verification_email,
        workerName: worker.display_name,
        companyName: company.name,
        positionTitle: body.title,
        positionId: position.id,
      }).catch(err => console.error('Failed to send verification email:', err))
    }
  }

  // Send HR approval request if company has HR email and no email domain match
  if (company.hr_email && (!body.verification_email || !emailVerified)) {
    sendHRApprovalRequest({
      hrEmail: company.hr_email,
      workerName: worker.display_name,
      companyName: company.name,
      positionTitle: body.title,
      positionId: position.id,
      startDate: body.start_date,
    }).catch(err => console.error('Failed to send HR request:', err))
  }

  return NextResponse.json({ 
    position,
    qr_token: qrToken,
    message: body.verification_email 
      ? 'Position created. Please check your email to verify.'
      : company.hr_email
      ? 'Position created. Verification request sent to HR.'
      : 'Position created as unverified. Add HR contact to verify.'
  })
}

