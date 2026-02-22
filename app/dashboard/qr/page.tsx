import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/supabase/server'
import QRCodeDisplay from '@/components/qr/QRCodeDisplay'
import GenerateQRButton from './GenerateQRButton'

export const dynamic = 'force-dynamic'

export default async function QRCodesPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Get worker
  const { data: worker } = await admin
    .from('workers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker) redirect('/signup')

  // Get all active positions with QR tokens
  const { data: positions } = await admin
    .from('positions')
    .select(`
      *,
      company:companies (name, city, state, verification_status),
      qr_tokens (*)
    `)
    .eq('worker_id', worker.id)
    .eq('is_active', true)
    .order('start_date', { ascending: false })

  const positionsWithQR = positions?.filter(p => p.qr_tokens && p.qr_tokens.length > 0) || []
  const positionsWithoutQR = positions?.filter(p => !p.qr_tokens || p.qr_tokens.length === 0) || []

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">QR Codes</h1>
        <p className="text-ink-400">
          Share your QR codes to collect reviews for each position
        </p>
      </div>

      {/* No Positions */}
      {(!positions || positions.length === 0) && (
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-xl">
          <div className="text-6xl mb-6">📱</div>
          <h2 className="text-2xl font-semibold text-white mb-4">
            No positions yet
          </h2>
          <p className="text-ink-400 mb-8 max-w-md mx-auto">
            Add a position first to generate QR codes for collecting reviews.
          </p>
          <a
            href="/dashboard/positions/new"
            className="inline-block bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-lg font-semibold transition-all"
          >
            Add Your First Position
          </a>
        </div>
      )}

      {/* Positions with QR Codes */}
      {positionsWithQR.length > 0 && (
        <div className="space-y-8">
          {positionsWithQR.map((position) => (
            <div key={position.id} className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-1">
                  {position.title}
                </h2>
                <p className="text-ink-400">
                  {position.company.name}
                  {position.company.city && position.company.state && (
                    <span className="text-ink-500"> • {position.company.city}, {position.company.state}</span>
                  )}
                </p>
                
                <div className="mt-3">
                  {position.email_verified || position.hr_verified ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/10 text-green-400 text-sm rounded-full">
                      <span>✓</span>
                      <span>Verified — QR Active</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/10 text-yellow-400 text-sm rounded-full">
                      <span>⚠</span>
                      <span>Pending Verification — QR Inactive</span>
                    </span>
                  )}
                </div>
              </div>

              {position.qr_tokens && position.qr_tokens[0] && (
                <QRCodeDisplay 
                  token={position.qr_tokens[0]}
                  position={position}
                  isActive={position.email_verified || position.hr_verified}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Positions Without QR — with generate button */}
      {positionsWithoutQR.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            Positions Missing QR Codes
          </h2>
          <div className="space-y-3">
            {positionsWithoutQR.map((position) => (
              <div 
                key={position.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-white font-medium">{position.title}</p>
                  <p className="text-sm text-ink-400">{position.company.name}</p>
                </div>
                <GenerateQRButton
                  positionId={position.id}
                  label={`${position.title} at ${position.company.name}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
