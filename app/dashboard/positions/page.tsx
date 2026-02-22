import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/supabase/server'
import Link from 'next/link'
import { formatRating, formatDateRange, getDurationMonths, formatDuration } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function PositionsPage() {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get worker
  const { data: worker } = await admin
    .from('workers')
    .select('id, display_name')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker) redirect('/signup')

  // Get all positions with company details
  const { data: positions } = await admin
    .from('positions')
    .select(`
      *,
      company:companies (*)
    `)
    .eq('worker_id', worker.id)
    .order('start_date', { ascending: false })

  const activePositions = positions?.filter(p => p.is_active) || []
  const inactivePositions = positions?.filter(p => !p.is_active) || []

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-600 mb-2">Your Positions</h1>
          <p className="text-soft-500">
            Manage your work history and verification status
          </p>
        </div>
        <Link
          href="/dashboard/positions/new"
          className="bg-navy-600 hover:bg-navy-500 text-navy-600 px-6 py-3 rounded-lg font-semibold transition-all"
        >
          + Add Position
        </Link>
      </div>

      {/* Empty State */}
      {(!positions || positions.length === 0) && (
        <div className="text-center py-20 bg-white border border-soft-200 rounded-xl">
          <div className="text-6xl mb-6">💼</div>
          <h2 className="text-2xl font-semibold text-navy-600 mb-4">
            No positions yet
          </h2>
          <p className="text-soft-500 mb-8 max-w-md mx-auto">
            Add your current or past positions to start collecting reviews and building your portable professional reputation.
          </p>
          <Link
            href="/dashboard/positions/new"
            className="inline-block bg-navy-600 hover:bg-navy-500 text-navy-600 px-8 py-4 rounded-lg font-semibold transition-all"
          >
            Add Your First Position
          </Link>
        </div>
      )}

      {/* Active Positions */}
      {activePositions.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-navy-600 mb-4">
            Active Positions ({activePositions.length})
          </h2>
          <div className="space-y-4">
            {activePositions.map((position) => (
              <PositionCard key={position.id} position={position} />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Positions */}
      {inactivePositions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-navy-600 mb-4">
            Past Positions ({inactivePositions.length})
          </h2>
          <div className="space-y-4">
            {inactivePositions.map((position) => (
              <PositionCard key={position.id} position={position} inactive />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PositionCard({ 
  position, 
  inactive = false 
}: { 
  position: any
  inactive?: boolean
}) {
  const isVerified = position.email_verified || position.hr_verified
  const dateRange = formatDateRange(position.start_date, position.end_date)
  const duration = formatDuration(getDurationMonths(position.start_date, position.end_date))
  
  const verificationBadge = position.email_verified 
    ? { text: 'Email Verified', color: 'green' }
    : position.hr_verified
    ? { text: 'HR Verified', color: 'green' }
    : position.company.verification_status === 'verified'
    ? { text: 'Pending Verification', color: 'yellow' }
    : position.company.verification_status === 'registered'
    ? { text: 'Pending HR Approval', color: 'yellow' }
    : { text: 'Unverified', color: 'gray' }

  return (
    <Link
      href={`/dashboard/positions/${position.id}`}
      className={`block bg-white border border-soft-200 hover:border-gold-300 rounded-xl p-6 transition-all ${
        inactive ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-2">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-navy-600 mb-1">
                {position.title}
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-soft-500">{position.company.name}</p>
                {position.company.verification_status === 'verified' && (
                  <span className="text-navy-500 text-sm">✓</span>
                )}
              </div>
              {position.company.city && position.company.state && (
                <p className="text-sm text-soft-400 mt-1">
                  {position.company.city}, {position.company.state}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-soft-500 mb-3">
            <div>{dateRange}</div>
            <div>•</div>
            <div>{duration}</div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg">⭐</span>
              <span className="text-navy-600 font-semibold">
                {position.rating > 0 ? formatRating(position.rating) : '—'}
              </span>
              <span className="text-soft-400">
                ({position.review_count} reviews)
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            verificationBadge.color === 'green'
              ? 'bg-green-500/10 text-green-400'
              : verificationBadge.color === 'yellow'
              ? 'bg-yellow-500/10 text-yellow-400'
              : 'bg-gray-500/10 text-gray-400'
          }`}>
            {verificationBadge.text}
          </span>
          {inactive && (
            <span className="px-3 py-1 bg-soft-200 text-soft-500 rounded-full text-xs font-medium">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center gap-4 pt-4 border-t border-soft-200">
        <div className="text-sm text-soft-500">
          <span className="text-soft-400">QR Scans:</span> 0
        </div>
        <div className="text-sm text-soft-500">
          <span className="text-soft-400">Last review:</span>{' '}
          {position.review_count > 0 ? 'Recently' : 'No reviews yet'}
        </div>
      </div>
    </Link>
  )
}
