'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/supabase/client'

interface Company {
  id: string
  name: string
  city: string | null
  state: string | null
  verification_status: 'verified' | 'registered' | 'unverified'
  email_domain: string | null
}

export default function NewPositionPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Company selection
  const [companySearch, setCompanySearch] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  // New company fields
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyAddress, setNewCompanyAddress] = useState('')
  const [newCompanyCity, setNewCompanyCity] = useState('')
  const [newCompanyState, setNewCompanyState] = useState('')
  const [newCompanyZip, setNewCompanyZip] = useState('')
  const [newCompanyIndustry, setNewCompanyIndustry] = useState('')
  const [newCompanyHrEmail, setNewCompanyHrEmail] = useState('')

  // Position fields
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isCurrent, setIsCurrent] = useState(true)
  const [verificationEmail, setVerificationEmail] = useState('')

  // Search companies as user types
  useEffect(() => {
    if (companySearch.length < 2) {
      setCompanies([])
      return
    }

    const timer = setTimeout(async () => {
      const res = await fetch(`/api/companies?query=${encodeURIComponent(companySearch)}&limit=10`)
      const data = await res.json()
      setCompanies(data.companies || [])
      setShowDropdown(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [companySearch])

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company)
    setCompanySearch(company.name)
    setShowDropdown(false)
    
    // If company has email domain, prompt for verification email
    if (company.email_domain) {
      setVerificationEmail(`@${company.email_domain}`)
    }
  }

  const handleCreateNew = () => {
    setSelectedCompany(null)
    setNewCompanyName(companySearch)
    setStep(2)
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    try {
      // Validate
      if (!title || !startDate) {
        throw new Error('Position title and start date are required')
      }

      if (!selectedCompany && !newCompanyName) {
        throw new Error('Please select or create a company')
      }

      const payload = {
        company_id: selectedCompany?.id,
        company_name: !selectedCompany ? newCompanyName : undefined,
        company_address: !selectedCompany ? newCompanyAddress : undefined,
        company_city: !selectedCompany ? newCompanyCity : undefined,
        company_state: !selectedCompany ? newCompanyState : undefined,
        company_zip: !selectedCompany ? newCompanyZip : undefined,
        company_industry: !selectedCompany ? newCompanyIndustry : undefined,
        company_hr_email: !selectedCompany ? newCompanyHrEmail : undefined,
        title,
        start_date: startDate,
        end_date: isCurrent ? null : endDate,
        verification_email: verificationEmail || undefined,
      }

      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create position')
      }

      // Success! Redirect to positions list
      router.push('/dashboard/positions')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Add Position</h1>
        <p className="text-ink-400">
          Add a current or past job to build your portable reputation
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {step === 1 ? (
        <>
          {/* Company Search */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Where did you work?
            </h2>
            
            <div className="relative mb-6">
              <label className="block text-sm font-medium text-ink-300 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                onFocus={() => companies.length > 0 && setShowDropdown(true)}
                placeholder="Start typing company name..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />

              {/* Dropdown */}
              {showDropdown && companies.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-ink-900 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleCompanySelect(company)}
                      className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">
                            {company.name}
                            {company.verification_status === 'verified' && (
                              <span className="text-brand-400 ml-2">✓</span>
                            )}
                          </p>
                          {company.city && company.state && (
                            <p className="text-sm text-ink-400">
                              {company.city}, {company.state}
                            </p>
                          )}
                        </div>
                        {company.verification_status === 'verified' && (
                          <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-full">
                            Verified
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  
                  <button
                    onClick={handleCreateNew}
                    className="w-full px-4 py-3 text-left bg-brand-600/10 hover:bg-brand-600/20 transition-colors"
                  >
                    <p className="text-brand-400 font-medium">
                      + Create "{companySearch}"
                    </p>
                  </button>
                </div>
              )}
            </div>

            {selectedCompany && (
              <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">
                      {selectedCompany.name}
                      {selectedCompany.verification_status === 'verified' && (
                        <span className="text-brand-400 ml-2">✓</span>
                      )}
                    </p>
                    {selectedCompany.city && selectedCompany.state && (
                      <p className="text-sm text-ink-300">
                        {selectedCompany.city}, {selectedCompany.state}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCompany(null)
                      setCompanySearch('')
                    }}
                    className="text-ink-400 hover:text-white"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Position Details */}
          {(selectedCompany || companySearch.length > 0) && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Position Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Bartender, Server, Manager"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-300 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={isCurrent}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-ink-300">
                  <input
                    type="checkbox"
                    checked={isCurrent}
                    onChange={(e) => setIsCurrent(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-500 focus:ring-2 focus:ring-brand-500"
                  />
                  I currently work here
                </label>

                {/* Verification Email */}
                {selectedCompany?.email_domain && (
                  <div>
                    <label className="block text-sm font-medium text-ink-300 mb-2">
                      Work Email (for instant verification)
                    </label>
                    <input
                      type="email"
                      value={verificationEmail}
                      onChange={(e) => setVerificationEmail(e.target.value)}
                      placeholder={`your.name@${selectedCompany.email_domain}`}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <p className="text-xs text-ink-500 mt-2">
                      ✓ This company is verified. Use your company email for instant verification.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          {selectedCompany && title && startDate && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-ink-700 disabled:text-ink-500 text-white py-4 rounded-xl font-semibold transition-all"
            >
              {loading ? 'Adding Position...' : 'Add Position'}
            </button>
          )}
        </>
      ) : (
        /* Step 2: New Company Details */
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Tell us about {newCompanyName}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-300 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-300 mb-2">
                Address
              </label>
              <input
                type="text"
                value={newCompanyAddress}
                onChange={(e) => setNewCompanyAddress(e.target.value)}
                placeholder="123 Main St"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-ink-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={newCompanyCity}
                  onChange={(e) => setNewCompanyCity(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-300 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={newCompanyState}
                  onChange={(e) => setNewCompanyState(e.target.value)}
                  maxLength={2}
                  placeholder="PA"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-300 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={newCompanyZip}
                  onChange={(e) => setNewCompanyZip(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-300 mb-2">
                  Industry
                </label>
                <input
                  type="text"
                  value={newCompanyIndustry}
                  onChange={(e) => setNewCompanyIndustry(e.target.value)}
                  placeholder="e.g. Hospitality"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-300 mb-2">
                HR Email (optional)
              </label>
              <input
                type="email"
                value={newCompanyHrEmail}
                onChange={(e) => setNewCompanyHrEmail(e.target.value)}
                placeholder="hr@company.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-ink-500 mt-2">
                We'll send verification requests here
              </p>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-semibold transition-all"
            >
              Back
            </button>
            <button
              onClick={() => setStep(1)}
              disabled={!newCompanyName}
              className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:bg-ink-700 disabled:text-ink-500 text-white py-3 rounded-xl font-semibold transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
