'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/supabase/client'
import Link from 'next/link'

export default function ManageCompanyPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState<any>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [industry, setIndustry] = useState('')
  const [website, setWebsite] = useState('')
  const [hrEmail, setHrEmail] = useState('')
  const [address, setAddress] = useState('')
  const [zip, setZip] = useState('')

  useEffect(() => {
    loadCompany()
  }, [params.slug])

  const loadCompany = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch company via API to check ownership
      const res = await fetch(`/api/companies/manage?slug=${params.slug}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Cannot access this company')
        setLoading(false)
        return
      }

      const c = data.company
      setCompany(c)
      setName(c.name || '')
      setCity(c.city || '')
      setState(c.state || '')
      setIndustry(c.industry || '')
      setWebsite(c.website || '')
      setHrEmail(c.hr_email || '')
      setAddress(c.address || '')
      setZip(c.zip || '')
    } catch (err: any) {
      setError(err.message || 'Failed to load company')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/companies/manage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: company.id,
          name,
          city: city || null,
          state: state || null,
          industry: industry || null,
          website: website || null,
          hr_email: hrEmail || null,
          address: address || null,
          zip: zip || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')

      setMessage({ type: 'success', text: 'Company profile updated!' })
      setCompany(data.company)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <p className="text-ink-400">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-ink-400 mb-8">{error}</p>
          <Link href="/dashboard" className="text-brand-400 hover:text-brand-300">
            Back to Dashboard →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <div className="max-w-2xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center gap-2 text-sm text-ink-400 mb-6">
          <Link href={`/companies/${params.slug}`} className="hover:text-white transition-colors">
            {company.name}
          </Link>
          <span>/</span>
          <span className="text-white">Manage</span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Manage Company Profile</h1>
        <p className="text-ink-400 mb-8">
          Update your company&apos;s public profile on TipTop
        </p>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {message.text}
          </div>
        )}

        {/* Verification Status */}
        <div className={`mb-8 px-4 py-3 rounded-lg text-sm ${
          company.verification_status === 'verified'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : company.verification_status === 'registered'
            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
        }`}>
          {company.verification_status === 'verified' && '✓ Verified Company'}
          {company.verification_status === 'registered' && '⏳ Pending Verification'}
          {company.verification_status === 'unverified' && '○ Unverified — submit for verification to unlock features'}
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Company Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-300 mb-2">Company Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-300 mb-2">Industry</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="IT Consulting, Restaurant, etc."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-300 mb-2">Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://avdv.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Location</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-300 mb-2">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-ink-300 mb-2">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bellefonte"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    maxLength={2}
                    placeholder="PA"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">ZIP</label>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    maxLength={10}
                    placeholder="16823"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* HR Contact */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">HR / Verification Contact</h2>
            <div>
              <label className="block text-sm font-medium text-ink-300 mb-2">HR Email</label>
              <input
                type="email"
                value={hrEmail}
                onChange={(e) => setHrEmail(e.target.value)}
                placeholder="hr@company.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-ink-500 mt-1">
                This email receives employment verification requests from workers
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white py-4 rounded-xl font-semibold transition-all"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/companies/${params.slug}`}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-xl font-semibold transition-all text-center"
            >
              View Public Profile
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
