'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface VerificationRequest {
  id: string
  company: any
  submitted_email: string
  requested_domain: string | null
  status: string
  created_at: string
  admin_notes: string | null
}

export default function AdminVerificationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/verifications?status=pending')
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setRequests(data.requests)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-20">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-soft-500">Loading verification requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-600 mb-2">Verification Requests</h1>
        <p className="text-soft-500">Review and approve company verification requests</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Requests List */}
      {requests.length > 0 ? (
        <div className="space-y-6">
          {requests.map((request) => (
            <VerificationRequestCard
              key={request.id}
              request={request}
              onUpdate={fetchRequests}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-soft-200 rounded-xl">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-2xl font-semibold text-navy-600 mb-4">
            All caught up!
          </h2>
          <p className="text-soft-500">
            No pending verification requests
          </p>
        </div>
      )}
    </div>
  )
}

function VerificationRequestCard({ 
  request, 
  onUpdate 
}: { 
  request: VerificationRequest
  onUpdate: () => void
}) {
  const [reviewing, setReviewing] = useState(false)
  const [emailDomain, setEmailDomain] = useState(request.requested_domain || '')
  const [adminNotes, setAdminNotes] = useState('')
  const [error, setError] = useState('')

  const handleAction = async (action: 'approved' | 'denied') => {
    setError('')
    setReviewing(true)

    try {
      if (action === 'approved' && !emailDomain) {
        throw new Error('Email domain is required for approval')
      }

      const res = await fetch(`/api/admin/verifications/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          email_domain: action === 'approved' ? emailDomain : undefined,
          admin_notes: adminNotes || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      onUpdate()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setReviewing(false)
    }
  }

  return (
    <div className="bg-white border border-soft-200 rounded-xl p-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Company Info */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-semibold text-navy-600 mb-2">
              {request.company.name}
            </h3>
            {request.company.city && request.company.state && (
              <p className="text-soft-500 mb-1">
                📍 {request.company.city}, {request.company.state}
              </p>
            )}
            {request.company.industry && (
              <p className="text-soft-500">
                🏢 {request.company.industry}
              </p>
            )}
            {request.company.website && (
              <a
                href={request.company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy-500 hover:text-navy-400 text-sm mt-2 inline-block"
              >
                {request.company.website} →
              </a>
            )}
          </div>
          <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-medium rounded-full">
            Pending Review
          </span>
        </div>

        {/* Request Details */}
        <div className="bg-white border border-soft-200 rounded-lg p-4 space-y-2">
          <div className="flex items-start justify-between text-sm">
            <span className="text-soft-500">Submitted by:</span>
            <span className="text-navy-600">{request.submitted_email}</span>
          </div>
          <div className="flex items-start justify-between text-sm">
            <span className="text-soft-500">Requested domain:</span>
            <code className="text-navy-500 bg-navy-500/10 px-2 py-1 rounded">
              {request.requested_domain || 'Not provided'}
            </code>
          </div>
          <div className="flex items-start justify-between text-sm">
            <span className="text-soft-500">Submitted:</span>
            <span className="text-navy-600">
              {new Date(request.created_at).toLocaleDateString()}
            </span>
          </div>
          {request.company.hr_email && (
            <div className="flex items-start justify-between text-sm">
              <span className="text-soft-500">HR Email:</span>
              <span className="text-navy-600">{request.company.hr_email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Review Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-soft-500 mb-2">
            Email Domain (for approval) *
          </label>
          <input
            type="text"
            value={emailDomain}
            onChange={(e) => setEmailDomain(e.target.value.toLowerCase())}
            placeholder="example.com"
            className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500"
          />
          <p className="text-xs text-soft-400 mt-2">
            Workers with @{emailDomain || 'example.com'} emails will be able to instantly verify positions
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-soft-500 mb-2">
            Admin Notes (optional)
          </label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Internal notes about this verification..."
            rows={3}
            className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => handleAction('denied')}
            disabled={reviewing}
            className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-soft-300 disabled:text-soft-400 text-navy-600 py-3 rounded-xl font-semibold transition-all"
          >
            Deny
          </button>
          <button
            onClick={() => handleAction('approved')}
            disabled={reviewing || !emailDomain}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-soft-300 disabled:text-soft-400 text-navy-600 py-3 rounded-xl font-semibold transition-all"
          >
            {reviewing ? 'Processing...' : 'Approve & Verify'}
          </button>
        </div>

        <p className="text-xs text-soft-400 text-center">
          Approval will send email to {request.submitted_email}
        </p>
      </div>
    </div>
  )
}
