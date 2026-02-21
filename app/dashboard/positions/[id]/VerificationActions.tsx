'use client'

import { useState } from 'react'

interface VerificationActionsProps {
  positionId: string
  companyId: string
  companyName: string
  companyVerificationStatus: string
  verificationEmail: string | null
  companyEmailDomain: string | null
  companyHrEmail: string | null
  workerName: string
  positionTitle: string
  startDate: string
}

export default function VerificationActions({
  positionId,
  companyId,
  companyName,
  companyVerificationStatus,
  verificationEmail,
  companyEmailDomain,
  companyHrEmail,
  workerName,
  positionTitle,
  startDate,
}: VerificationActionsProps) {
  const [showCorrectForm, setShowCorrectForm] = useState(false)
  const [newEmail, setNewEmail] = useState(verificationEmail || '')
  const [newHrEmail, setNewHrEmail] = useState(companyHrEmail || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleResendVerification = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/positions/${positionId}/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verification_email: verificationEmail,
          hr_email: companyHrEmail,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to resend verification' })
      } else {
        setMessage({ type: 'success', text: data.message || 'Verification resent successfully!' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateAndResend = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/positions/${positionId}/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verification_email: newEmail || null,
          hr_email: newHrEmail || null,
          update_info: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update and resend' })
      } else {
        setMessage({ type: 'success', text: data.message || 'Updated and verification resent!' })
        setShowCorrectForm(false)
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitForVerification = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/companies/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          verification_email: newEmail || verificationEmail,
          requested_domain: (newEmail || verificationEmail)?.split('@')[1],
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to submit verification request' })
      } else {
        setMessage({ type: 'success', text: data.message || 'Verification request submitted!' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Status message */}
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {message.text}
        </div>
      )}

      {/* Action Buttons */}
      {!showCorrectForm ? (
        <div className="flex flex-wrap gap-3">
          {/* Resend button - show when there's an email or HR email to resend to */}
          {(verificationEmail || companyHrEmail) && companyVerificationStatus !== 'unverified' && (
            <button
              onClick={handleResendVerification}
              disabled={loading}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">↻</span>
                  Sending...
                </>
              ) : (
                <>
                  📧 Resend Verification
                </>
              )}
            </button>
          )}

          {/* Correct Info button */}
          <button
            onClick={() => setShowCorrectForm(true)}
            className="bg-white/10 hover:bg-white/15 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
          >
            ✏️ Correct &amp; Resubmit
          </button>

          {/* Submit for verification - for unverified companies */}
          {companyVerificationStatus === 'unverified' && verificationEmail && (
            <button
              onClick={handleSubmitForVerification}
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
            >
              🔍 Submit Company for Verification
            </button>
          )}
        </div>
      ) : (
        /* Correction Form */
        <form onSubmit={handleUpdateAndResend} className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
            <h3 className="text-white font-semibold text-sm">Update Verification Info</h3>

            <div>
              <label className="block text-sm text-ink-400 mb-1">
                Your Work Email
                {companyEmailDomain && (
                  <span className="text-ink-500 ml-1">(must be @{companyEmailDomain})</span>
                )}
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-ink-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-ink-400 mb-1">
                HR / Manager Email
              </label>
              <input
                type="email"
                value={newHrEmail}
                onChange={(e) => setNewHrEmail(e.target.value)}
                placeholder="hr@company.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-ink-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || (!newEmail && !newHrEmail)}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">↻</span>
                  Updating...
                </>
              ) : (
                <>
                  ✓ Update &amp; Resend
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCorrectForm(false)
                setMessage(null)
              }}
              className="bg-white/10 hover:bg-white/15 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
