'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EditCompanyPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [company, setCompany] = useState<any>(null)

  // Form state
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [industry, setIndustry] = useState('')
  const [emailDomain, setEmailDomain] = useState('')
  const [hrEmail, setHrEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [verificationStatus, setVerificationStatus] = useState('unverified')

  useEffect(() => {
    fetchCompany()
  }, [params.id])

  const fetchCompany = async () => {
    try {
      const res = await fetch(`/api/admin/companies/${params.id}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setCompany(data.company)
      setName(data.company.name)
      setAddress(data.company.address || '')
      setCity(data.company.city || '')
      setState(data.company.state || '')
      setZip(data.company.zip || '')
      setIndustry(data.company.industry || '')
      setEmailDomain(data.company.email_domain || '')
      setHrEmail(data.company.hr_email || '')
      setWebsite(data.company.website || '')
      setVerificationStatus(data.company.verification_status)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const res = await fetch(`/api/admin/companies/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          address: address || null,
          city: city || null,
          state: state || null,
          zip: zip || null,
          industry: industry || null,
          email_domain: emailDomain || null,
          hr_email: hrEmail || null,
          website: website || null,
          verification_status: verificationStatus,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      router.push('/admin/companies')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-20">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-soft-500">Loading company...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-600 mb-2">Edit Company</h1>
        <p className="text-soft-500">Update company information and verification status</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white border border-soft-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-navy-600 mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-soft-500 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-soft-500 mb-2">
                Industry
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., Hospitality, Retail"
                className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-soft-500 mb-2">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white border border-soft-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-navy-600 mb-4">Location</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-soft-500 mb-2">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
                className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-soft-500 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-soft-500 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  maxLength={2}
                  placeholder="PA"
                  className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-soft-500 mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
          </div>
        </div>

        {/* Verification */}
        <div className="bg-white border border-soft-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-navy-600 mb-4">Verification Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-soft-500 mb-2">
                Verification Status *
              </label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-500"
              >
                <option value="verified">✓ Verified</option>
                <option value="registered">Registered</option>
                <option value="unverified">Unverified</option>
              </select>
              <p className="text-xs text-soft-400 mt-2">
                Only verified companies enable instant email verification
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-soft-500 mb-2">
                Email Domain
              </label>
              <input
                type="text"
                value={emailDomain}
                onChange={(e) => setEmailDomain(e.target.value.toLowerCase())}
                placeholder="example.com"
                className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
              <p className="text-xs text-soft-400 mt-2">
                Workers with emails from this domain can instantly verify positions
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-soft-500 mb-2">
                HR Email
              </label>
              <input
                type="email"
                value={hrEmail}
                onChange={(e) => setHrEmail(e.target.value)}
                placeholder="hr@example.com"
                className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
              <p className="text-xs text-soft-400 mt-2">
                Verification requests will be sent to this email
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-white hover:bg-soft-100 text-navy-600 py-3 rounded-xl font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name}
            className="flex-1 bg-navy-600 hover:bg-navy-500 disabled:bg-soft-300 disabled:text-soft-400 text-navy-600 py-3 rounded-xl font-semibold transition-all"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
