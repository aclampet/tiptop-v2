'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { POSITION_DENIED_REASONS, getReasonLabel } from '@/lib/verification-reasons'

export default function HRApproveContent() {
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [action, setAction] = useState<'approve' | 'deny'>('approve')
  const [error, setError] = useState('')
  const [denyForm, setDenyForm] = useState(false)
  const [denyReason, setDenyReason] = useState('')
  const [denyNote, setDenyNote] = useState('')

  useEffect(() => {
    const positionId = searchParams.get('id')
    const token = searchParams.get('token')
    const actionParam = searchParams.get('action') as 'approve' | 'deny'
    const reasonParam = searchParams.get('reason')

    if (!positionId || !token || !actionParam) {
      setError('Invalid approval link')
      setLoading(false)
      return
    }

    setAction(actionParam)

    if (actionParam === 'deny' && reasonParam && POSITION_DENIED_REASONS.includes(reasonParam as any)) {
      handleAction(positionId, token, 'deny', reasonParam, '')
    } else if (actionParam === 'deny') {
      setDenyForm(true)
      setLoading(false)
    } else {
      handleAction(positionId, token, actionParam)
    }
  }, [searchParams])

  const handleAction = async (positionId: string, token: string, action: 'approve' | 'deny', reasonCode?: string, reasonNote?: string) => {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { token, action }
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

      if (!res.ok) {
        throw new Error(data.error || 'Action failed')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">⏳</div>
          <p className="text-soft-500">Processing...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-500/10 border border-red-500/20 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <div className="text-5xl">❌</div>
          </div>
          <h1 className="text-3xl font-bold text-navy-600 mb-4">Action Failed</h1>
          <p className="text-soft-500 mb-8">{error}</p>
          <Link href="/" className="inline-block text-navy-500 hover:text-navy-400 transition-colors">
            Go to Homepage 
          </Link>
        </div>
      </div>
    )
  }

  if (success && action === 'approve') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="bg-green-500/10 border border-green-500/20 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <div className="text-5xl">✅</div>
          </div>
          <h1 className="text-3xl font-bold text-navy-600 mb-4">Position Approved</h1>
          <p className="text-soft-500 mb-8">The employment position has been verified.</p>
        </div>
      </div>
    )
  }

  if (denyForm) {
    const positionId = searchParams.get('id')
    const token = searchParams.get('token')
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <h1 className="text-2xl font-bold text-navy-600 mb-4">Deny Verification</h1>
          <p className="text-soft-500 mb-4">Please select a reason for denying this position.</p>
          <select
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            className="w-full px-4 py-3 border border-soft-200 rounded-xl mb-4"
          >
            <option value="">Select reason...</option>
            {POSITION_DENIED_REASONS.map((r) => (
              <option key={r} value={r}>{getReasonLabel('position_denied', r)}</option>
            ))}
          </select>
          <textarea
            placeholder="Optional note (max 500 chars)"
            value={denyNote}
            onChange={(e) => setDenyNote(e.target.value)}
            maxLength={500}
            className="w-full px-4 py-3 border border-soft-200 rounded-xl mb-4"
            rows={3}
          />
          <div className="flex gap-4">
            <button
              onClick={() => positionId && token && handleAction(positionId, token, 'deny', denyReason, denyNote)}
              disabled={loading || !denyReason}
              className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold"
            >
              {loading ? 'Submitting...' : 'Confirm Deny'}
            </button>
            <Link
              href="/"
              className="flex-1 bg-soft-200 hover:bg-soft-300 text-navy-600 py-3 rounded-xl font-semibold text-center"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
          <div className="text-5xl">🚫</div>
        </div>
        <h1 className="text-3xl font-bold text-navy-600 mb-4">Position Denied</h1>
        <p className="text-soft-500 mb-8">The employment position could not be verified.</p>
      </div>
    </div>
  )
}
