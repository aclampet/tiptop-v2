'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewPositionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    const payload: any = {
      company_name: formData.get('company_name'),
      title: formData.get('title'),
      start_date: formData.get('start_date'),
      end_date: formData.get('current') ? null : formData.get('end_date'),
      is_current: !!formData.get('current'),
      city: formData.get('city') || undefined,
      state: formData.get('state') || undefined,
      hr_email: formData.get('hr_email') || undefined,
    }

    const workEmail = formData.get('work_email')
    if (workEmail) {
      payload.work_email = workEmail
    }

    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create position')

      router.push('/dashboard/positions')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Add Position</h1>
        <p className="text-ink-400 mb-8">Add a current or past job to build your portable reputation</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Details */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Company Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-300 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="company_name"
                  required
                  placeholder="AVDV"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">City</label>
                  <input
                    type="text"
                    name="city"
                    placeholder="Bellefonte"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">State</label>
                  <input
                    type="text"
                    name="state"
                    maxLength={2}
                    placeholder="PA"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-300 mb-2">HR Email (optional)</label>
                <input
                  type="email"
                  name="hr_email"
                  placeholder="hr@avdv.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-ink-500 mt-1">If provided, HR will receive verification request</p>
              </div>
            </div>
          </div>

          {/* Position Details */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Position Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-300 mb-2">Job Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="CEO"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">Start Date *</label>
                  <input
                    type="date"
                    name="start_date"
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">End Date</label>
                  <input
                    type="date"
                    name="end_date"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input type="checkbox" name="current" className="w-4 h-4" />
                <span className="text-sm text-ink-300">I currently work here</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-ink-300 mb-2">
                  Work Email (optional)
                </label>
                <input
                  type="email"
                  name="work_email"
                  placeholder="adam@avdv.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-ink-500 mt-1">For instant verification if company email domain is verified</p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pb-8">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-xl font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:bg-ink-700 text-white py-4 rounded-xl font-semibold transition-all text-lg"
            >
              {loading ? 'Adding Position...' : 'Add Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
