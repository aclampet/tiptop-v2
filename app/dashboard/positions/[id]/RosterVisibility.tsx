'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface RosterVisibilityProps {
  positionId: string
  showOnCompanyPage: boolean
  startedAt: string | null
  endedAt: string | null
  isCurrent: boolean
}

export default function RosterVisibility({
  positionId,
  showOnCompanyPage: initialShow,
  startedAt: initialStartedAt,
  endedAt: initialEndedAt,
  isCurrent: initialIsCurrent,
}: RosterVisibilityProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showOnCompanyPage, setShowOnCompanyPage] = useState(initialShow)
  const [startedAt, setStartedAt] = useState(initialStartedAt || '')
  const [endedAt, setEndedAt] = useState(initialEndedAt || '')
  const [isCurrent, setIsCurrent] = useState(initialIsCurrent)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/positions/${positionId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          show_on_company_page: showOnCompanyPage,
          started_at: startedAt || null,
          ended_at: isCurrent ? null : endedAt || null,
          is_current: isCurrent,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setMessage({ type: 'success', text: 'Visibility updated!' })
      router.refresh()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {message.text}
        </div>
      )}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={showOnCompanyPage}
          onChange={(e) => setShowOnCompanyPage(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm text-soft-600">Show me on employer page</span>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-soft-500 mb-1">Started at (optional)</label>
          <input
            type="date"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            className="w-full px-4 py-2 border border-soft-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-soft-500 mb-1">Ended at (optional)</label>
          <input
            type="date"
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
            disabled={isCurrent}
            className="w-full px-4 py-2 border border-soft-200 rounded-lg text-sm disabled:opacity-50"
          />
        </div>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isCurrent}
          onChange={(e) => {
            setIsCurrent(e.target.checked)
            if (e.target.checked) setEndedAt('')
          }}
          className="w-4 h-4"
        />
        <span className="text-sm text-soft-600">I currently work here</span>
      </label>
      <button
        type="submit"
        disabled={loading}
        className="bg-navy-600 hover:bg-navy-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
      >
        {loading ? 'Saving...' : 'Save visibility'}
      </button>
    </form>
  )
}
