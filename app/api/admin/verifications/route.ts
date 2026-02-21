import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/supabase/server'
import { sendVerificationApproved, sendVerificationDenied } from '@/lib/email'

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

// GET /api/admin/verifications - List all verification requests
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
  const status = searchParams.get('status') || 'pending'

  // Get verification requests with company details
  const { data: requests, error } = await admin
    .from('company_verification_requests')
    .select(`
      *,
      company:companies (*),
      submitted_by_user:auth.users!submitted_by (email)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching verification requests:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch verification requests' 
    }, { status: 500 })
  }

  return NextResponse.json({ requests: requests || [] })
}

// PATCH /api/admin/verifications/[id] - Review verification request
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
  const requestId = url.pathname.split('/').pop()

  if (!requestId) {
    return NextResponse.json({ error: 'Request ID required' }, { status: 400 })
  }

  const { status, admin_notes, email_domain } = await request.json()

  if (!['approved', 'denied', 'needs_info'].includes(status)) {
    return NextResponse.json({ 
      error: 'Status must be approved, denied, or needs_info' 
    }, { status: 400 })
  }

  // Get verification request with company
  const { data: verificationRequest } = await admin
    .from('company_verification_requests')
    .select('*, company:companies(*)')
    .eq('id', requestId)
    .single()

  if (!verificationRequest) {
    return NextResponse.json({ 
      error: 'Verification request not found' 
    }, { status: 404 })
  }

  // Update verification request
  const { error: updateError } = await admin
    .from('company_verification_requests')
    .update({
      status,
      admin_notes: admin_notes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (updateError) {
    console.error('Error updating verification request:', updateError)
    return NextResponse.json({ 
      error: 'Failed to update verification request' 
    }, { status: 500 })
  }

  // If approved, update company
  if (status === 'approved') {
    const updateData: any = {
      verification_status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by: user.id,
    }

    // Add email_domain if provided
    if (email_domain) {
      updateData.email_domain = email_domain.toLowerCase()
    }

    const { error: companyError } = await admin
      .from('companies')
      .update(updateData)
      .eq('id', verificationRequest.company_id)

    if (companyError) {
      console.error('Error updating company:', companyError)
      return NextResponse.json({ 
        error: 'Failed to update company' 
      }, { status: 500 })
    }

    // Send approval email
    sendVerificationApproved({
      email: verificationRequest.submitted_email,
      companyName: verificationRequest.company.name,
      emailDomain: email_domain || null,
    }).catch(err => console.error('Failed to send approval email:', err))
  }

  // If denied, send denial email
  if (status === 'denied') {
    sendVerificationDenied({
      email: verificationRequest.submitted_email,
      companyName: verificationRequest.company.name,
      reason: admin_notes || 'Your verification request was not approved.',
    }).catch(err => console.error('Failed to send denial email:', err))
  }

  return NextResponse.json({ 
    success: true,
    message: `Verification request ${status}`
  })
}
