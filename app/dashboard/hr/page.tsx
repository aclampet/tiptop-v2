'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/supabase/client'
import Link from 'next/link'
import { POSITION_DENIED_REASONS, getReasonLabel } from '@/lib/verification-reasons'

export default function HRManagementPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [positions, setPositions] = useState<any[]>([])
  const [acting, setActing] = useState<string | null>(null)
  const [denyingFor, setDenyingFor] = useState<string | null>(null)
  const [denyReason, setDenyReason] = useState('')
  const [denyNote, setDenyNote] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    const res = await fetch('/api/hr/pending-positions')
    if (res.status === 403) {
      router.replace('/dashboard/hr/onboard')
      return
    }
    const data = await res.json()
    setPositions(data.positions || [])
    setLoading(false)
  }

  const handleAction = async (positionId: string, action: 'approve' | 'deny', reasonCode?: string, reasonNote?: string) => {
    setActing(positionId)
    try {
      const body: Record<string, unknown> = { action }
      if (action === 'deny') {
        if (!reasonCode) throw new Error('Please select a reason')
        body.reason_code = reasonCode
        if (reasonNote?.trim()) body.reason_note = reasonNote.trim().slice(0, 500)
      }
      const res = await fetch(`/api/positions/${positionId}/hr-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setPositions((prev) => prev.filter((p) => p.id !== positionId))
      setDenyingFor(null)
      setDenyReason('')
      setDenyNote('')
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setActing(null)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-soft-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-navy-600 mb-2">Position Verifications</h1>
      <p className="text-soft-500 mb-8">
        Approve or deny employment verification requests for your company.
      </p>

      {positions.length === 0 ? (
        <div className="bg-white border border-soft-200 rounded-xl p-12 text-center">
          <p className="text-soft-500">No pending position verifications.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {positions.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-soft-200 rounded-xl p-6 flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold text-navy-600">{p.title}</h3>
                <p className="text-sm text-soft-500">
                  {p.worker?.display_name} {p.verification_email && `• ${p.verification_email}`}
                </p>
                <p className="text-xs text-soft-400 mt-1">
                  Requested {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {denyingFor === p.id ? (
                  <>
                    <label className="text-xs font-medium text-soft-500">Reason for denial</label>
                    <select
                      value={denyReason}
                      onChange={(e) => setDenyReason(e.target.value)}
                      className="px-3 py-2 border border-soft-200 rounded-lg text-sm"
                    >
                      <option value="">Select...</option>
                      {POSITION_DENIED_REASONS.map((r) => (
                        <option key={r} value={r}>{getReasonLabel('position_denied', r)}</option>
                      ))}
                    </select>
                    <textarea
                      placeholder="Optional note (max 500 chars)"
                      value={denyNote}
                      onChange={(e) => setDenyNote(e.target.value)}
                      maxLength={500}
                      className="px-3 py-2 border border-soft-200 rounded-lg text-sm"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(p.id, 'deny', denyReason, denyNote)}
                        disabled={!!acting || !denyReason}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm"
                      >
                        {acting === p.id ? '...' : 'Confirm Deny'}
                      </button>
                      <button
                        onClick={() => { setDenyingFor(null); setDenyReason(''); setDenyNote(''); }}
                        disabled={!!acting}
                        className="px-4 py-2 bg-soft-200 hover:bg-soft-300 text-navy-600 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(p.id, 'approve')}
                      disabled={!!acting}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-sm"
                    >
                      {acting === p.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => setDenyingFor(p.id)}
                      disabled={!!acting}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm"
                    >
                      Deny
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link href="/dashboard" className="text-navy-500 hover:text-navy-400">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
