'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/supabase/client'

interface Company {
  id: string
  name: string
  city: string | null
  state: string | null
  verification_status: string
}

export default function NewPositionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Company search
  const [companyQuery, setCompanyQuery] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [createNew, setCreateNew] = useState(false)

  // Step 2: Position details
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentJob, setCurrentJob] = useState(false)
  const [workEmail, setWorkEmail] = useState('')

  // New company fields
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyCity, setNewCompanyCity] = useState('')
  const [newCompanyState, setNewCompanyState] = useState('')
  const [hrEmail, setHrEmail] = useState('')

  useEffect(() => {
    if (companyQuery.length < 2) {
      setCompanies([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/companies?query=${encodeURIComponent(companyQuery)}`)
        const data = await res.json()
        setCompanies(data.companies || [])
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [companyQuery])

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company)
    setCompanyQuery(company.name)
    setCompanies([])
    setCreateNew(false)
    setStep(2)
  }

  const handleCreateNew = () => {
    setCreateNew(true)
    setNewCompanyName(companyQuery)
    setSelectedCompany(null)
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload: any = {
        title,
        start_date: startDate,
        end_date: currentJob ? null : endDate || null,
        is_current: currentJob,
      }

      if (createNew) {
        payload.company = {
          name: newCompanyName,
          city: newCompanyCity || undefined,
          state: newCompanyState || undefined,
          hr_email: hrEmail || undefined,
        }
      } else if (selectedCompany) {
        payload.company_id = selectedCompany.id
      }

      if (workEmail) {
        payload.work_email = workEmail
      }

      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      router.push('/dashboard/positions')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Add Position</h1>
        <p className="text-ink-400 mb-8">Add a current or past job to build your portable reputation</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {step === 1 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Where did you work?</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-ink-300 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={companyQuery}
                onChange={(e) => setCompanyQuery(e.target.value)}
                placeholder="Start typing company name..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              
              {searching && (
                <p className="text-sm text-ink-500 mt-2">Searching...</p>
              )}

              {companies.length > 0 && (
                <div className="mt-2 bg-white/10 border border-white/10 rounded-lg overflow-hidden">
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleSelectCompany(company)}
                      className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/10 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{company.name}</p>
                          {company.city && company.state && (
                            <p className="text-xs text-ink-500">{company.city}, {company.state}</p>
                          )}
                        </div>
                        {company.verification_status === 'verified' && (
                          <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded">✓ Verified</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {companyQuery.length >= 2 && !searching && companies.length === 0 && (
                <button
                  onClick={handleCreateNew}
                  className="w-full mt-2 px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors text-left"
                >
                  + Create new company "{companyQuery}"
                </button>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {createNew ? 'Company Details' : 'Selected Company'}
                </h2>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-brand-400 hover:text-brand-300"
                >
                  ← Change
                </button>
              </div>

              {createNew ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-300 mb-2">Company Name *</label>
                    <input
                      type="text"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ink-300 mb-2">City</label>
                      <input
                        type="text"
                        value={newCompanyCity}
                        onChange={(e) => setNewCompanyCity(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink-300 mb-2">State</label>
                      <input
                        type="text"
                        value={newCompanyState}
                        onChange={(e) => setNewCompanyState(e.target.value.toUpperCase())}
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
                      value={hrEmail}
                      onChange={(e) => setHrEmail(e.target.value)}
                      placeholder="hr@company.com"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <p className="text-xs text-ink-500 mt-1">If provided, HR will receive verification request</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-white font-medium">{selectedCompany?.name}</p>
                  {selectedCompany?.city && selectedCompany?.state && (
                    <p className="text-sm text-ink-400">{selectedCompany.city}, {selectedCompany.state}</p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Position Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">Job Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
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
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-300 mb-2">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={currentJob}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentJob}
                    onChange={(e) => setCurrentJob(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-ink-300">I currently work here</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">
                    Work Email (optional - for instant verification)
                  </label>
                  <input
                    type="email"
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="text-xs text-ink-500 mt-1">If company is verified, matching email domain enables instant verification</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:bg-ink-700 disabled:text-ink-500 text-white py-3 rounded-xl font-semibold transition-all"
              >
                {loading ? 'Adding...' : 'Add Position'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
