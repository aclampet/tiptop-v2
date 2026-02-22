'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GenerateQRButton({
  positionId,
  label,
}: {
  positionId: string
  label: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/qr-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position_id: positionId,
          label,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate QR code')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-navy-600 hover:bg-navy-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
      >
        {loading ? 'Generating...' : 'Generate QR Code'}
      </button>
    </div>
  )
}
