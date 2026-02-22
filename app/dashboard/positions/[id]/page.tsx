import { redirect, notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/supabase/server'
import Link from 'next/link'
import { formatRating, formatDateRange, getDurationMonths, formatDuration } from '@/lib/utils'
import VerificationActions from './VerificationActions'
import PositionManagement from './PositionManagement'

export const dynamic = 'force-dynamic'

export default async function PositionDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const admin = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get worker
  const { data: worker } = await admin
    .from('workers')
    .select('id, display_name')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker) redirect('/signup')

  // Get position with company and reviews
  const { data: position, error } = await admin
    .from('positions')
    .select(`
      *,
      company:companies (*),
      reviews (*),
      qr_tokens (*)
    `)
    .eq('id', params.id)
    .eq('worker_id', worker.id)
    .single()

  if (error || !position) {
    notFound()
  }

  const isVerified = position.email_verified || position.hr_verified
  const dateRange = formatDateRange(position.start_date, position.end_date)
  const duration = formatDuration(getDurationMonths(position.start_date, position.end_date))

  const verificationBadge = position.email_verified
    ? { text: 'Email Verified', color: 'green', icon: '✓' }
    : position.hr_verified
    ? { text: 'HR Verified', color: 'green', icon: '✓' }
    : position.company.verification_status === 'verified'
    ? { text: 'Pending Verification', color: 'yellow', icon: '⏳' }
    : position.company.verification_status === 'registered'
    ? { text: 'Pending HR Approval', color: 'yellow', icon: '⏳' }
    : { text: 'Unverified', color: 'gray', icon: '○' }

  const reviews = position.reviews || []
  const qrToken = position.qr_tokens?.[0] || null

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-soft-500 mb-6">
        <Link href="/dashboard/positions" className="hover:text-navy-600 transition-colors">
          Positions
        </Link>
        <span>/</span>
        <span className="text-navy-600">{position.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-600 mb-2">{position.title}</h1>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-lg text-soft-500">{position.company.name}</p>
            {position.company.verification_status === 'verified' && (
              <span className="text-navy-500 text-sm">✓ Verified Company</span>
            )}
          </div>
          {position.company.city && position.company.state && (
            <p className="text-sm text-soft-400">
              {position.company.city}, {position.company.state}
            </p>
          )}
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${
          verificationBadge.color === 'green'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : verificationBadge.color === 'yellow'
            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
        }`}>
          {verificationBadge.icon} {verificationBadge.text}
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-soft-200 rounded-xl p-4">
          <div className="text-2xl mb-1">⭐</div>
          <div className="text-2xl font-bold text-navy-600">
            {position.rating > 0 ? formatRating(position.rating) : '—'}
          </div>
          <div className="text-sm text-soft-500">Rating</div>
        </div>
        <div className="bg-white border border-soft-200 rounded-xl p-4">
          <div className="text-2xl mb-1">💬</div>
          <div className="text-2xl font-bold text-navy-600">{position.review_count}</div>
          <div className="text-sm text-soft-500">Reviews</div>
        </div>
        <div className="bg-white border border-soft-200 rounded-xl p-4">
          <div className="text-2xl mb-1">📅</div>
          <div className="text-2xl font-bold text-navy-600">{duration}</div>
          <div className="text-sm text-soft-500">Duration</div>
        </div>
        <div className="bg-white border border-soft-200 rounded-xl p-4">
          <div className="text-2xl mb-1">📱</div>
          <div className="text-2xl font-bold text-navy-600">{qrToken?.scan_count || 0}</div>
          <div className="text-sm text-soft-500">QR Scans</div>
        </div>
      </div>

      {/* Position Details */}
      <div className="bg-white border border-soft-200 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-navy-600 mb-4">Position Details</h2>
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          <div>
            <div className="text-sm text-soft-400 mb-1">Title</div>
            <div className="text-navy-600">{position.title}</div>
          </div>
          <div>
            <div className="text-sm text-soft-400 mb-1">Company</div>
            <div className="text-navy-600">{position.company.name}</div>
          </div>
          <div>
            <div className="text-sm text-soft-400 mb-1">Date Range</div>
            <div className="text-navy-600">{dateRange}</div>
          </div>
          <div>
            <div className="text-sm text-soft-400 mb-1">Status</div>
            <div className="text-navy-600">{position.is_active ? 'Active' : 'Inactive'}</div>
          </div>
          {position.verification_email && (
            <div>
              <div className="text-sm text-soft-400 mb-1">Verification Email</div>
              <div className="text-navy-600">{position.verification_email}</div>
            </div>
          )}
          {position.company.industry && (
            <div>
              <div className="text-sm text-soft-400 mb-1">Industry</div>
              <div className="text-navy-600">{position.company.industry}</div>
            </div>
          )}
        </div>
      </div>

      {/* Manage Position */}
      <div className="bg-white border border-soft-200 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-navy-600 mb-4">Manage Position</h2>
        <PositionManagement
          positionId={position.id}
          title={position.title}
          startDate={position.start_date}
          endDate={position.end_date}
          isActive={position.is_active}
          reviewCount={position.review_count}
        />
      </div>

      {/* Verification Section - Show if NOT verified */}
      {!isVerified && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-3xl">⚠️</div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-yellow-400 mb-2">
                Position Not Yet Verified
              </h2>
              <p className="text-soft-500 mb-4">
                {position.company.verification_status === 'unverified'
                  ? 'This company has not been verified yet. Submit a verification request to get your position verified, or update the company details and resubmit.'
                  : position.company.verification_status === 'registered'
                  ? 'A verification request has been sent to your company\'s HR department. You can resend the request or update your information if needed.'
                  : 'Your company is verified but your position still needs verification. Resend the verification email or update your verification email address.'}
              </p>
              <VerificationActions
                positionId={position.id}
                companyId={position.company.id}
                companyName={position.company.name}
                companyVerificationStatus={position.company.verification_status}
                verificationEmail={position.verification_email}
                companyEmailDomain={position.company.email_domain}
                companyHrEmail={position.company.hr_email}
                workerName={worker.display_name}
                positionTitle={position.title}
                startDate={position.start_date}
              />
            </div>
          </div>
        </div>
      )}

      {/* Verified Success Banner */}
      {isVerified && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="text-3xl">✅</div>
            <div>
              <h2 className="text-lg font-semibold text-green-400 mb-1">Position Verified</h2>
              <p className="text-soft-500">
                {position.email_verified
                  ? `Verified via email on ${new Date(position.email_verified_at!).toLocaleDateString()}`
                  : `Verified by HR on ${new Date(position.hr_verified_at!).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Section */}
      {qrToken && (
        <div className="bg-white border border-soft-200 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-navy-600 mb-1">QR Code</h2>
              <p className="text-soft-500 text-sm">
                {qrToken.is_active
                  ? `Active — ${qrToken.scan_count} scans`
                  : 'Inactive — Verify your position to activate'}
              </p>
            </div>
            <Link
              href="/dashboard/qr"
              className="bg-navy-600 hover:bg-navy-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            >
              Manage QR Codes
            </Link>
          </div>
        </div>
      )}

      {/* Recent Reviews */}
      <div className="bg-white border border-soft-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy-600">Reviews</h2>
          {reviews.length > 0 && (
            <Link
              href="/dashboard/reviews"
              className="text-navy-500 hover:text-navy-400 text-sm transition-colors"
            >
              View all →
            </Link>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-soft-500">No reviews yet</p>
            <p className="text-soft-400 text-sm mt-1">
              {isVerified
                ? 'Share your QR code to start collecting reviews'
                : 'Verify your position to start collecting reviews'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.slice(0, 5).map((review: any) => (
              <div key={review.id} className="border-b border-soft-200 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">
                      {'⭐'.repeat(review.rating)}
                    </span>
                    <span className="text-sm text-soft-500">
                      {review.reviewer_name || 'Anonymous'}
                    </span>
                  </div>
                  <span className="text-xs text-soft-400">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-soft-500 text-sm">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
