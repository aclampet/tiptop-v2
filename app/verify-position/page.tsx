'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function VerifyPositionPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [position, setPosition] = useState<any>(null)

  useEffect(() => {
    const positionId = searchParams.get('id')
    const token = searchParams.get('token')

    if (!positionId || !token) {
      setError('Invalid verification link')
      setLoading(false)
      return
    }

    verifyPosition(positionId, token)
  }, [searchParams])

  const verifyPosition = async (positionId: string, token: string) => {
    try {
      const res = await fetch(`/api/positions/${positionId}/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed')
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
          <p className="text-ink-400">Verifying your position...</p>
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
          <h1 className="text-3xl font-bold text-white mb-4">Verification Failed</h1>
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
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="bg-green-500/10 border border-green-500/20 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <div className="text-5xl">✓</div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Position Verified!</h1>
          <p className="text-ink-300 mb-2">
            Your position has been successfully verified.
          </p>
          <p className="text-sm text-ink-500 mb-8">
            Your QR code is now active and you can start collecting reviews!
          </p>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
            <div className="text-center">
              <div className="text-3xl mb-2">🎉</div>
              <h2 className="text-xl font-semibold text-white mb-4">
                What's Next?
              </h2>
              <ul className="text-left text-ink-300 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-brand-400">→</span>
                  <span>Go to your dashboard to view your QR code</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-400">→</span>
                  <span>Download and print your QR code</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-400">→</span>
                  <span>Share it with customers to start collecting reviews</span>
                </li>
              </ul>
            </div>
          </div>

          <Link
            href="/dashboard/qr"
            className="inline-block bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-lg font-semibold transition-all mb-4"
          >
            View My QR Codes
          </Link>

          <div className="text-center">
            <Link
              href="/dashboard"
              className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
            >
              Go to Dashboard →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return null
}
