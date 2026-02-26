'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/supabase/client'
import Link from 'next/link'
import { ENROLL_STORAGE_KEY, suggestTitles, type EnrollData } from '@/lib/enroll'

type CompanySearchHit = {
  id: string
  slug: string
  name: string
  city: string | null
  state: string | null
  verification_status: string | null
}

export default function EnrollConfirmPage() {
  const router = useRouter()
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  const [companyQuery, setCompanyQuery] = useState('')
  const [companyResults, setCompanyResults] = useState<CompanySearchHit[]>([])
  const [companyLoading, setCompanyLoading] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<CompanySearchHit | null>(null)
  const [showCreateCompany, setShowCreateCompany] = useState(false)
  const [createCompanyName, setCreateCompanyName] = useState('')
  const [createCompanyLoading, setCreateCompanyLoading] = useState(false)

  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([])
  const [selectedTitle, setSelectedTitle] = useState<string>('')
  const [customTitle, setCustomTitle] = useState('')

  const [finalizeLoading, setFinalizeLoading] = useState(false)
  const [finalizeError, setFinalizeError] = useState('')

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ENROLL_STORAGE_KEY)
      if (!raw) {
        router.replace('/enroll')
        return
      }
      const data = JSON.parse(raw) as EnrollData
      if (!data.name || !data.position || !data.location) {
        router.replace('/enroll')
        return
      }
      setEnrollData(data)
      setSuggestedTitles(suggestTitles(data.position))
      setSelectedTitle(data.position)
      setCustomTitle(data.position)
    } catch {
      router.replace('/enroll')
    }
  }, [router])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ? { id: u.id } : null)
      setLoadingAuth(false)
    })
  }, [])

  const searchCompanies = useCallback(async () => {
    const q = companyQuery.trim()
    if (q.length < 2) {
      setCompanyResults([])
      return
    }
    setCompanyLoading(true)
    try {
      const location = enrollData?.location?.trim() || ''
      const params = new URLSearchParams({ q, limit: '10' })
      if (location) params.set('location', location)
      const res = await fetch(`/api/companies/search?${params}`)
      const data = await res.json()
      setCompanyResults(Array.isArray(data.companies) ? data.companies : [])
    } catch {
      setCompanyResults([])
    } finally {
      setCompanyLoading(false)
    }
  }, [companyQuery, enrollData?.location])

  useEffect(() => {
    const t = setTimeout(searchCompanies, 300)
    return () => clearTimeout(t)
  }, [searchCompanies, companyQuery])

  const handleCreateCompany = async () => {
    const name = createCompanyName.trim()
    if (!name || !user) return
    setCreateCompanyLoading(true)
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create company')
      setSelectedCompany({
        id: data.company.id,
        slug: data.company.slug,
        name: data.company.name,
        city: data.company.city ?? null,
        state: data.company.state ?? null,
        verification_status: data.company.verification_status ?? null,
      })
      setShowCreateCompany(false)
      setCreateCompanyName('')
      setCompanyResults((prev) => [data.company, ...prev])
    } catch (e: any) {
      setFinalizeError(e.message || 'Failed to create company')
    } finally {
      setCreateCompanyLoading(false)
    }
  }

  const handleFinalize = async () => {
    if (!enrollData || !user) return
    const company = selectedCompany
    if (!company) {
      setFinalizeError('Please select or create a company')
      return
    }
    const title = selectedTitle || customTitle.trim() || enrollData.position
    if (!title.trim()) {
      setFinalizeError('Please choose or enter a role')
      return
    }
    setFinalizeError('')
    setFinalizeLoading(true)
    try {
      const res = await fetch('/api/enroll/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: enrollData.name,
          company_id: company.id,
          title: title.trim(),
          title_normalized: suggestedTitles.includes(selectedTitle) ? selectedTitle : undefined,
          location_text: enrollData.location,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      sessionStorage.removeItem(ENROLL_STORAGE_KEY)
      router.push('/dashboard')
      router.refresh()
    } catch (e: any) {
      setFinalizeError(e.message || 'Something went wrong')
    } finally {
      setFinalizeLoading(false)
    }
  }

  if (loadingAuth || !enrollData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-soft-500">Loading...</div>
      </div>
    )
  }

  const redirectUrl = '/enroll/confirm'

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-soft-200 py-4 px-6">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-navy-600 font-semibold text-lg">
            TipTop
          </Link>
          {!user && (
            <div className="flex gap-3">
              <Link
                href={`/signup?redirect=${encodeURIComponent(redirectUrl)}`}
                className="text-gold-300 hover:text-gold-400 font-medium text-sm"
              >
                Sign up
              </Link>
              <Link
                href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
                className="text-soft-500 hover:text-navy-600 text-sm"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl sm:text-3xl text-navy-600 mb-2">
          Welcome {enrollData.name}, your excellence matters!
        </h1>
        <p className="text-soft-500 mb-8">
          Tell us more about how you excel as <strong className="text-navy-600">{enrollData.position}</strong> in{' '}
          <strong className="text-navy-600">{enrollData.location}</strong>.
        </p>

        {!user ? (
          <div className="bg-soft-50 border border-soft-200 rounded-xl p-6 text-center">
            <p className="text-navy-600 font-medium mb-4">Sign up or sign in to save your profile and position.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/signup?redirect=${encodeURIComponent(redirectUrl)}`}
                className="inline-block bg-gold-300 hover:bg-gold-400 text-navy-600 px-6 py-3 rounded-lg font-semibold"
              >
                Sign up
              </Link>
              <Link
                href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
                className="inline-block border-2 border-navy-600 text-navy-600 hover:bg-navy-600 hover:text-white px-6 py-3 rounded-lg font-semibold"
              >
                Sign in
              </Link>
            </div>
            <p className="text-soft-400 text-sm mt-4">Your answers are saved in this browser until you continue.</p>
          </div>
        ) : (
          <>
            {/* Company chooser */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-navy-600 mb-3">Company</h2>
              {!showCreateCompany ? (
                <>
                  <input
                    type="text"
                    value={companyQuery}
                    onChange={(e) => setCompanyQuery(e.target.value)}
                    placeholder="Search by company name"
                    className="w-full px-4 py-3 border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-gold-400 mb-2"
                  />
                  {companyLoading && <p className="text-sm text-soft-500">Searching...</p>}
                  {companyResults.length > 0 && (
                    <ul className="border border-soft-200 rounded-xl overflow-hidden divide-y divide-soft-100">
                      {companyResults.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCompany(c)
                              setCompanyQuery('')
                              setCompanyResults([])
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-soft-50 flex justify-between items-center ${
                              selectedCompany?.id === c.id ? 'bg-gold-300/20' : ''
                            }`}
                          >
                            <span className="font-medium text-navy-600">
                              {c.name}
                              {(c.city || c.state) && (
                                <span className="text-soft-500 font-normal"> — {[c.city, c.state].filter(Boolean).join(', ')}</span>
                              )}
                            </span>
                            {c.verification_status === 'verified' && (
                              <span className="text-xs text-gold-600 font-medium">Verified</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCreateCompany(true)}
                    className="mt-3 text-sm text-gold-600 hover:text-gold-500 font-medium"
                  >
                    Can&apos;t find it? Create it
                  </button>
                </>
              ) : (
                <div className="border border-soft-200 rounded-xl p-4">
                  <input
                    type="text"
                    value={createCompanyName}
                    onChange={(e) => setCreateCompanyName(e.target.value)}
                    placeholder="New company name"
                    className="w-full px-4 py-3 border border-soft-200 rounded-lg mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateCompany}
                      disabled={!createCompanyName.trim() || createCompanyLoading}
                      className="bg-navy-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {createCompanyLoading ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCreateCompany(false); setCreateCompanyName('') }}
                      className="border border-soft-300 px-4 py-2 rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {selectedCompany && !showCreateCompany && (
                <p className="mt-2 text-sm text-soft-500">
                  Selected: <strong className="text-navy-600">{selectedCompany.name}</strong>
                </p>
              )}
            </section>

            {/* Role */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-navy-600 mb-3">Role</h2>
              <p className="text-sm text-soft-500 mb-2">Suggestions from &quot;{enrollData.position}&quot;</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {suggestedTitles.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setSelectedTitle(t); setCustomTitle('') }}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                      selectedTitle === t ? 'bg-navy-600 text-white border-navy-600' : 'border-soft-200 text-navy-600 hover:bg-soft-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <label className="block text-sm text-soft-500 mb-1">Or keep your own:</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => { setCustomTitle(e.target.value); setSelectedTitle('') }}
                placeholder={enrollData.position}
                className="w-full px-4 py-3 border border-soft-200 rounded-xl"
              />
            </section>

            {finalizeError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {finalizeError}
              </div>
            )}

            <button
              type="button"
              onClick={handleFinalize}
              disabled={!selectedCompany || finalizeLoading}
              className="w-full bg-gold-300 hover:bg-gold-400 text-navy-600 py-4 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {finalizeLoading ? 'Saving...' : 'Finish and go to dashboard'}
            </button>
          </>
        )}
      </main>
    </div>
  )
}
