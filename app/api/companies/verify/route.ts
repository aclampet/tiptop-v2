import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'
import { sendCompanyVerificationConfirmation, notifyAdminNewVerificationRequest } from '@/lib/email'

// POST /api/companies/verify - Submit company for verification
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { company_id, verification_email, requested_domain } = await request.json()

  if (!company_id || !verification_email) {
    return NextResponse.json({
      error: 'Company ID and verification email required'
    }, { status: 400 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', company_id)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  if (company.verification_status === 'verified') {
    return NextResponse.json({ error: 'Company is already verified' }, { status: 409 })
  }

  const { data: existing } = await supabase
    .from('company_verification_requests')
    .select('*')
    .eq('company_id', company_id)
    .eq('status', 'pending')
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Verification request already pending' }, { status: 409 })
  }

  const emailDomain = verification_email.split('@')[1]?.toLowerCase()
  if (requested_domain && emailDomain !== requested_domain.toLowerCase()) {
    return NextResponse.json({
      error: 'Email domain must match requested verification domain'
    }, { status: 400 })
  }

  const { data: request_data, error: requestError } = await supabase
    .from('company_verification_requests')
    .insert({
      company_id,
      submitted_by: user.id,
      submitted_email: verification_email,
      requested_domain: requested_domain || emailDomain,
      status: 'pending',
    })
    .select()
    .single()

  if (requestError) {
    console.error('Error creating verification request:', requestError)
    return NextResponse.json({ 
      error: 'Failed to create verification request' 
    }, { status: 500 })
  }

  // Send confirmation email to requester
  sendCompanyVerificationConfirmation({
    email: verification_email,
    companyName: company.name,
  }).catch(err => console.error('Failed to send confirmation email:', err))

  // Notify admin (optional - could be handled by scheduled job)
  notifyAdminNewVerificationRequest({
    companyName: company.name,
    requestedDomain: requested_domain || emailDomain,
    submittedBy: user.email || 'Unknown',
  }).catch(err => console.error('Failed to notify admin:', err))

  return NextResponse.json({ 
    success: true,
    request: request_data,
    message: 'Verification request submitted. We will review it within 2-3 business days.'
  })
}
