'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface CompanySuggestion {
  id: string
  name: string
  city: string | null
  state: string | null
  verification_status: 'verified' | 'registered' | 'unverified'
  email_domain: string | null
}

export default function NewPositionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Company autocomplete state
  const [companyQuery, setCompanyQuery] = useState('')
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<CompanySuggestion | null>(null)
  const [searchingCompanies, setSearchingCompanies] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Search companies as user types
  useEffect(() => {
    if (selectedCompany) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (companyQuery.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearchingCompanies(true)
      try {
        const res = await fetch(`/api/companies?query=${encodeURIComponent(companyQuery)}`)
        const data = await res.json()
        if (res.ok) {
          setSuggestions(data.companies || [])
          setShowSuggestions(true)
        }
      } catch {
        // Silently fail search
      } finally {
        setSearchingCompanies(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [companyQuery, selectedCompany])

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectCompany = (company: CompanySuggestion) => {
    setSelectedCompany(company)
    setCompanyQuery(company.name)
    setShowSuggestions(false)
    setSuggestions([])
  }

  const handleClearCompany = () => {
    setSelectedCompany(null)
    setCompanyQuery('')
    setSuggestions([])
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    const payload: any = {
      title: formData.get('title'),
      start_date: formData.get('start_date'),
      end_date: formData.get('current') ? null : formData.get('end_date'),
    }

    if (selectedCompany) {
      payload.company_id = selectedCompany.id
    } else {
      if (!companyQuery.trim()) {
        setError('Please enter a company name')
        setLoading(false)
        return
      }
      payload.company_name = companyQuery.trim()
      payload.company_city = formData.get('city') || undefined
      payload.company_state = formData.get('state') || undefined
      payload.company_hr_email = formData.get('hr_email') || undefined
    }

    const workEmail = formData.get('work_email')
    if (workEmail) {
      payload.verification_email = workEmail
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
        <h1 className="text-3xl font-bold text-navy-600 mb-2">Add Position</h1>
        <p className="text-soft-500 mb-8">Add a current or past job to build your portable reputation</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Details */}
          <div className="bg-white border border-soft-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-navy-600 mb-6">Company</h2>

            <div className="space-y-4">
              {/* Company Name with Autocomplete */}
              <div className="relative" ref={suggestionsRef}>
                <label className="block text-sm font-medium text-soft-500 mb-2">
                  Company Name *
                </label>

                {selectedCompany ? (
                  <div className="flex items-center gap-3 bg-navy-600/10 border border-gold-300/30 rounded-xl px-4 py-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-navy-600 font-medium">{selectedCompany.name}</span>
                        {selectedCompany.verification_status === 'verified' && (
                          <span className="text-navy-500 text-xs">✓ Verified</span>
                        )}
                      </div>
                      {(selectedCompany.city || selectedCompany.state) && (
                        <p className="text-sm text-soft-500">
                          {[selectedCompany.city, selectedCompany.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleClearCompany}
                      className="text-soft-500 hover:text-navy-600 text-sm px-2 py-1 rounded transition-colors"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <input
                        type="text"
                        value={companyQuery}
                        onChange={(e) => setCompanyQuery(e.target.value)}
                        onFocus={() => {
                          if (suggestions.length > 0) setShowSuggestions(true)
                        }}
                        placeholder="Start typing to search existing companies..."
                        className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500"
                      />
                      {searchingCompanies && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-soft-400 text-sm">
                          Searching...
                        </div>
                      )}
                    </div>

                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-soft-50 border border-soft-200 rounded-xl shadow-xl overflow-hidden">
                        {suggestions.map((company) => (
                          <button
                            key={company.id}
                            type="button"
                            onClick={() => handleSelectCompany(company)}
                            className="w-full text-left px-4 py-3 hover:bg-soft-100 transition-colors border-b border-soft-100 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-navy-600 font-medium">{company.name}</span>
                              {company.verification_status === 'verified' && (
                                <span className="text-navy-500 text-xs px-2 py-0.5 bg-navy-500/10 rounded-full">✓ Verified</span>
                              )}
                              {company.verification_status === 'registered' && (
                                <span className="text-yellow-400 text-xs px-2 py-0.5 bg-yellow-500/10 rounded-full">Registered</span>
                              )}
                            </div>
                            {(company.city || company.state) && (
                              <p className="text-sm text-soft-400">
                                {[company.city, company.state].filter(Boolean).join(', ')}
                              </p>
                            )}
                          </button>
                        ))}
                        <div className="px-4 py-2 bg-white text-xs text-soft-400">
                          Don&apos;t see your company? Just type the full name and fill in details below.
                        </div>
                      </div>
                    )}

                    {companyQuery.length >= 2 && !searchingCompanies && suggestions.length === 0 && showSuggestions && (
                      <div className="absolute z-10 w-full mt-1 bg-soft-50 border border-soft-200 rounded-xl shadow-xl px-4 py-3">
                        <p className="text-sm text-soft-500">
                          No existing companies found for &ldquo;{companyQuery}&rdquo; — fill in the details below to create it.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!selectedCompany && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-soft-500 mb-2">City</label>
                      <input type="text" name="city" placeholder="Bellefonte" className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-soft-500 mb-2">State</label>
                      <input type="text" name="state" maxLength={2} placeholder="PA" className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-soft-500 mb-2">HR Email (optional)</label>
                    <input type="email" name="hr_email" placeholder="hr@company.com" className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500" />
                    <p className="text-xs text-soft-400 mt-1">If provided, HR will receive a verification request</p>
                  </div>
                </>
              )}

              {selectedCompany && selectedCompany.email_domain && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                  <p className="text-green-400 text-sm">
                    ✓ This company is verified. Use your <strong>@{selectedCompany.email_domain}</strong> email below for instant verification.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Position Details */}
          <div className="bg-white border border-soft-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-navy-600 mb-6">Position Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-soft-500 mb-2">Job Title *</label>
                <input type="text" name="title" required placeholder="CEO" className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-soft-500 mb-2">Start Date *</label>
                  <input type="date" name="start_date" required className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-soft-500 mb-2">End Date</label>
                  <input type="date" name="end_date" className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-500" />
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input type="checkbox" name="current" className="w-4 h-4" />
                <span className="text-sm text-soft-500">I currently work here</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-soft-500 mb-2">Work Email (optional)</label>
                <input
                  type="email"
                  name="work_email"
                  placeholder={selectedCompany?.email_domain ? `you@${selectedCompany.email_domain}` : 'you@company.com'}
                  className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
                <p className="text-xs text-soft-400 mt-1">
                  {selectedCompany?.email_domain
                    ? `Enter your @${selectedCompany.email_domain} email for instant verification`
                    : 'For instant verification if company email domain is verified'}
                </p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pb-8">
            <button type="button" onClick={() => router.back()} className="flex-1 bg-white hover:bg-soft-100 text-navy-600 py-4 rounded-xl font-semibold transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-navy-600 hover:bg-navy-500 disabled:bg-soft-300 text-white py-4 rounded-xl font-semibold transition-all text-lg">
              {loading ? 'Adding Position...' : 'Add Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
