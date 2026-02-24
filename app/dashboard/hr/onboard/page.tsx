'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/supabase/client'
import Link from 'next/link'

export default function HROnboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [workEmail, setWorkEmail] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [companyQuery, setCompanyQuery] = useState('')
  const [companies, setCompanies] = useState<{ id: string; name: string; slug: string }[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!companyQuery || companyQuery.length < 2) {
      setCompanies([])
      return
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/companies?query=${encodeURIComponent(companyQuery)}&limit=10`)
      const data = await res.json()
      setCompanies(data.companies || [])
    }, 300)
    return () => clearTimeout(t)
  }, [companyQuery])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    await fetch('/api/hr/request-role', { method: 'POST' })
    const res = await fetch('/api/hr/profile')
    const data = await res.json()
    setProfile(data.profile)
    if (data.profile) {
      setWorkEmail(data.profile.work_email || '')
      setCompanyId(data.profile.company_id || '')
      setCompanyQuery((data.profile as any).company?.name || '')
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/hr/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_email: workEmail || null, company_id: companyId || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setProfile(data.profile)
      setMessage({ type: 'success', text: 'Profile saved. A company admin will verify your request.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-soft-500">Loading...</p>
      </div>
    )
  }

  if (profile?.status === 'verified') {
    router.replace('/dashboard/hr')
    return null
  }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-navy-600 mb-2">HR Verification</h1>
      <p className="text-soft-500 mb-6">
        Verify your HR role to manage position approvals for your company.
      </p>

      {profile?.status === 'rejected' && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm">
          Your request was rejected. You may update your details and try again.
        </div>
      )}

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-soft-500 mb-2">Work Email</label>
          <input
            type="email"
            value={workEmail}
            onChange={(e) => setWorkEmail(e.target.value)}
            placeholder="hr@company.com"
            className="w-full px-4 py-3 border border-soft-200 rounded-xl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-soft-500 mb-2">Company</label>
          <input
            type="text"
            value={companyQuery}
            onChange={(e) => {
              setCompanyQuery(e.target.value)
              if (!companies.find(c => c.id === companyId)) setCompanyId('')
            }}
            placeholder="Search for your company"
            className="w-full px-4 py-3 border border-soft-200 rounded-xl"
          />
          {companies.length > 0 && (
            <ul className="mt-2 border border-soft-200 rounded-lg overflow-hidden">
              {companies.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyId(c.id)
                      setCompanyQuery(c.name)
                      setCompanies([])
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-soft-100 text-navy-600"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-navy-600 hover:bg-navy-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold"
          >
            {saving ? 'Saving...' : 'Save & Request Verification'}
          </button>
          <Link href="/dashboard" className="text-navy-500 hover:text-navy-400 py-3">
            Back to Dashboard
          </Link>
        </div>
      </form>
    </div>
  )
}
