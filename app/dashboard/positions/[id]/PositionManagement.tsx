'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PositionManagementProps {
  positionId: string
  title: string
  startDate: string
  endDate: string | null
  isActive: boolean
  reviewCount: number
}

export default function PositionManagement({
  positionId,
  title,
  startDate,
  endDate,
  isActive,
  reviewCount,
}: PositionManagementProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Edit form state
  const [editTitle, setEditTitle] = useState(title)
  const [editStartDate, setEditStartDate] = useState(startDate)
  const [editEndDate, setEditEndDate] = useState(endDate || '')
  const [isCurrent, setIsCurrent] = useState(!endDate)

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/positions/${positionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          start_date: editStartDate,
          end_date: isCurrent ? null : editEndDate || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Update failed (${res.status})`)

      setMessage({ type: 'success', text: 'Position updated!' })
      setShowEdit(false)
      router.refresh()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleVisibility = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/positions/${positionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Toggle failed (${res.status})`)

      setMessage({
        type: 'success',
        text: isActive ? 'Position hidden from your profile' : 'Position is now visible',
      })
      router.refresh()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/positions/${positionId}`, {
        method: 'DELETE',
      })

      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`Server returned: ${text.slice(0, 200)}`)
      }

      if (!res.ok) {
        throw new Error(data.error || `Delete failed (${res.status})`)
      }

      // Navigate away after successful delete
      window.location.href = '/dashboard/positions'
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
      setLoading(false)
    }
  }

  return (
    <div>
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
      {!showEdit && !showDeleteConfirm && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowEdit(true)}
            disabled={loading}
            className="bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
          >
            ✏️ Edit Position
          </button>

          <button
            onClick={handleToggleVisibility}
            disabled={loading}
            className="bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
          >
            {loading ? 'Updating...' : isActive ? '👁️‍🗨️ Hide Position' : '👁️ Show Position'}
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
          >
            🗑️ Delete
          </button>
        </div>
      )}

      {/* Edit Form */}
      {showEdit && (
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
            <h3 className="text-white font-semibold text-sm">Edit Position</h3>

            <div>
              <label className="block text-sm text-ink-400 mb-1">Job Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-ink-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-ink-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  disabled={isCurrent}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white disabled:opacity-50 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-ink-300">I currently work here</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => { setShowEdit(false); setMessage(null) }}
              className="bg-white/10 hover:bg-white/15 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
          <h3 className="text-red-400 font-semibold mb-2">Delete this position?</h3>
          <p className="text-ink-300 text-sm mb-4">
            {reviewCount > 0
              ? `This will permanently delete this position and all ${reviewCount} associated review${reviewCount !== 1 ? 's' : ''}. This cannot be undone.`
              : 'This will permanently delete this position and its QR code. This cannot be undone.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
            >
              {loading ? 'Deleting...' : 'Yes, Delete Permanently'}
            </button>
            <button
              onClick={() => { setShowDeleteConfirm(false); setMessage(null) }}
              disabled={loading}
              className="bg-white/10 hover:bg-white/15 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
