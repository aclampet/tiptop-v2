'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function VerifyPositionContent() {
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

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
          <p className="text-soft-500">Verifying your position...</p>
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
          <h1 className="text-3xl font-bold text-navy-600 mb-4">Verification Failed</h1>
          <p className="text-soft-500 mb-8">{error}</p>
          <Link href="/" className="inline-block text-navy-500 hover:text-navy-400 transition-colors">
            Go to Homepage 
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="bg-green-500/10 border border-green-500/20 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
          <div className="text-5xl">✅</div>
        </div>
        <h1 className="text-3xl font-bold text-navy-600 mb-4">Position Verified!</h1>
        <p className="text-soft-500 mb-8">Your QR code is now active and you can start collecting reviews!</p>
        <Link href="/dashboard/qr" className="inline-block bg-navy-600 hover:bg-navy-500 text-white px-8 py-4 rounded-lg font-semibold transition-all">
          View My QR Codes
        </Link>
      </div>
    </div>
  )
}
