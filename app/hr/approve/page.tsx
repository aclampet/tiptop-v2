'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function HRApprovePage() {
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [action, setAction] = useState<'approve' | 'deny'>('approve')
  const [error, setError] = useState('')
  const [position, setPosition] = useState<any>(null)

  useEffect(() => {
    const positionId = searchParams.get('id')
    const token = searchParams.get('token')
    const actionParam = searchParams.get('action') as 'approve' | 'deny'

    if (!positionId || !token || !actionParam) {
      setError('Invalid approval link')
      setLoading(false)
      return
    }

    setAction(actionParam)
    handleAction(positionId, token, actionParam)
  }, [searchParams])

  const handleAction = async (positionId: string, token: string, action: 'approve' | 'deny') => {
    try {
      const res = await fetch(`/api/positions/${positionId}/hr-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Action failed')
      }

      setSuccess(true)
      setPosition(data.position)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">⏳</div>
          <p className="text-ink-400">Processing...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-500/10 border border-red-500/20 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <div className="text-5xl">❌</div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Action Failed</h1>
          <p className="text-ink-400 mb-8">{error}</p>
          <Link
            href="/"
            className="inline-block text-brand-400 hover:text-brand-300 transition-colors"
          >
            Go to Homepage →
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    if (action === 'approve') {
      return (
        <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="bg-green-500/10 border border-green-500/20 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <div className="text-5xl">✓</div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Position Approved</h1>
            <p className="text-ink-300 mb-2">
              The employment position has been verified.
            </p>
            <p className="text-sm text-ink-500 mb-8">
              The employee can now collect verified reviews for this position.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 text-left">
              <h2 className="text-lg font-semibold text-white mb-4">About TipTop.review</h2>
              <p className="text-sm text-ink-300 mb-4">
                TipTop helps service workers build portable professional reputations through verified customer reviews. Each review is tied to a specific position at your company.
              </p>
              <div className="space-y-2 text-sm text-ink-400">
                <div className="flex items-start gap-2">
                  <span className="text-brand-400">✓</span>
                  <span>Reviews are immutable and permanent</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-brand-400">✓</span>
                  <span>Workers carry their reputation between jobs</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-brand-400">✓</span>
                  <span>Employers can see verified work history</span>
                </div>
              </div>
            </div>

            <a
              href="https://tiptop.review"
              className="inline-block text-brand-400 hover:text-brand-300 transition-colors"
            >
              Learn More About TipTop →
            </a>
          </div>
        </div>
      )
    } else {
      return (
        <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <div className="text-5xl">⚠</div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Position Denied</h1>
            <p className="text-ink-300 mb-2">
              The employment position could not be verified.
            </p>
            <p className="text-sm text-ink-500 mb-8">
              The employee has been notified that their position was not approved.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
              <p className="text-sm text-ink-400">
                If this was a mistake or if you have questions, please contact us at{' '}
                <a href="mailto:support@tiptop.review" className="text-brand-400 hover:text-brand-300">
                  support@tiptop.review
                </a>
              </p>
            </div>

            <a
              href="https://tiptop.review"
              className="inline-block text-brand-400 hover:text-brand-300 transition-colors"
            >
              Go to Homepage →
            </a>
          </div>
        </div>
      )
    }
  }

  return null
}
