'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/supabase/client'
import Link from 'next/link'
import { HR_PROFILE_REJECTED_REASONS, getReasonLabel } from '@/lib/verification-reasons'
import type { VerificationEventMetadata } from '@/types'

export default function ManageCompanyPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState<any>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [canClaim, setCanClaim] = useState(false)
  const [userMembership, setUserMembership] = useState<{ role: string } | null>(null)
  const [members, setMembers] = useState<{ id: string; user_id: string; role: string }[]>([])
  const [invites, setInvites] = useState<{ id: string; email: string; role: string }[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [hrProfiles, setHrProfiles] = useState<{ user_id: string; work_email: string; status: string; created_at: string }[]>([])
  const [hrActing, setHrActing] = useState<string | null>(null)
  const [rejectingFor, setRejectingFor] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectNote, setRejectNote] = useState('')
  const [verificationEvents, setVerificationEvents] = useState<{ id: string; event_type: string; actor_type: string; actor_user_id: string | null; position_id: string | null; metadata: unknown; created_at: string }[]>([])
  const [featuredEmployees, setFeaturedEmployees] = useState<{ position: any; worker: any }[]>([])
  const [allEmployees, setAllEmployees] = useState<{ position: any; worker: any }[]>([])
  const [featuredActing, setFeaturedActing] = useState<string | null>(null)

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
      setCanClaim(!!data.can_claim)
      setUserMembership(data.user_membership || null)
      setName(c.name || '')
      setCity(c.city || '')
      setState(c.state || '')
      setIndustry(c.industry || '')
      setWebsite(c.website || '')
      setHrEmail(c.hr_email || '')
      setAddress(c.address || '')
      setZip(c.zip || '')

      if (c && (data.user_membership?.role === 'owner' || data.user_membership?.role === 'admin')) {
        const [memRes, hrRes, eventsRes] = await Promise.all([
          fetch(`/api/companies/${c.id}/members`),
          fetch(`/api/companies/${c.id}/hr-profiles`),
          fetch(`/api/companies/${c.id}/verification-events`),
        ])
        if (memRes.ok) {
          const memData = await memRes.json()
          setMembers(memData.members || [])
          setInvites(memData.invites || [])
        }
        if (hrRes.ok) {
          const hrData = await hrRes.json()
          setHrProfiles(hrData.profiles || [])
        }
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json()
          setVerificationEvents(eventsData.events || [])
        }
        const empRes = await fetch(`/api/companies/${c.id}/employees`)
        if (empRes.ok) {
          const empData = await empRes.json()
          setFeaturedEmployees(empData.featured || [])
          setAllEmployees([...(empData.featured || []), ...(empData.employees || [])])
        }
      }
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-soft-500">Loading...</p>
      </div>
    )
  }

  const isAdmin = userMembership?.role === 'owner' || userMembership?.role === 'admin'

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-2xl font-bold text-navy-600 mb-4">Access Denied</h1>
          <p className="text-soft-500 mb-8">{error}</p>
          <Link href="/dashboard" className="text-navy-500 hover:text-navy-400">
            Back to Dashboard →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center gap-2 text-sm text-soft-500 mb-6">
          <Link href={`/companies/${params.slug}`} className="hover:text-navy-600 transition-colors">
            {company.name}
          </Link>
          <span>/</span>
          <span className="text-navy-600">Manage</span>
        </div>

        <h1 className="text-3xl font-bold text-navy-600 mb-2">Manage Company Profile</h1>
        <p className="text-soft-500 mb-8">
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

        {/* Claim business */}
        {canClaim && (
          <div className="mb-8 p-4 border border-soft-200 rounded-xl bg-soft-50">
            <p className="text-sm text-soft-600 mb-3">Claim this business to become the owner and manage admins.</p>
            <button
              type="button"
              disabled={claiming}
              onClick={async () => {
                setClaiming(true)
                setMessage(null)
                try {
                  const res = await fetch(`/api/companies/${company.id}/claim`, { method: 'POST' })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data.error || 'Failed to claim')
                  setMessage({ type: 'success', text: 'You are now the owner!' })
                  setCanClaim(false)
                  setUserMembership({ role: 'owner' })
                  const memRes = await fetch(`/api/companies/${company.id}/members`)
                  if (memRes.ok) {
                    const memData = await memRes.json()
                    setMembers(memData.members || [])
                    setInvites(memData.invites || [])
                  }
                } catch (err: any) {
                  setMessage({ type: 'error', text: err.message })
                } finally {
                  setClaiming(false)
                }
              }}
              className="bg-navy-600 hover:bg-navy-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {claiming ? 'Claiming...' : 'Claim this business'}
            </button>
          </div>
        )}

        {/* HR Verification Requests */}
        {(userMembership?.role === 'owner' || userMembership?.role === 'admin') && (
          <div className="mb-8 p-6 border border-soft-200 rounded-xl">
            <h2 className="text-xl font-semibold text-navy-600 mb-4">HR Verification Requests</h2>
            {hrProfiles.length === 0 ? (
              <p className="text-sm text-soft-500">No pending requests.</p>
            ) : (
              <ul className="space-y-3">
                {hrProfiles.map((hp) => (
                  <li key={hp.user_id} className="flex items-center justify-between py-2 border-b border-soft-100 last:border-0">
                    <span className="text-sm text-soft-600">
                      {hp.work_email || hp.user_id} <span className="text-soft-400">({hp.status})</span>
                    </span>
                    {hp.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!!hrActing}
                          onClick={async () => {
                            setHrActing(hp.user_id)
                            try {
                              const res = await fetch(`/api/companies/${company.id}/hr-profiles/${hp.user_id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'verified' }),
                              })
                              if (!res.ok) {
                                const d = await res.json()
                                setMessage({ type: 'error', text: d.error || 'Failed' })
                                return
                              }
                              setHrProfiles((prev) => prev.map((p) => p.user_id === hp.user_id ? { ...p, status: 'verified' } : p))
                              setMessage({ type: 'success', text: 'HR verified' })
                              const evRes = await fetch(`/api/companies/${company.id}/verification-events`)
                              if (evRes.ok) setVerificationEvents((await evRes.json()).events || [])
                            } catch (e: any) {
                              setMessage({ type: 'error', text: e.message })
                            } finally {
                              setHrActing(null)
                            }
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded text-xs"
                        >
                          Approve
                        </button>
                        {rejectingFor === hp.user_id ? (
                          <div className="flex flex-col gap-2">
                            <select
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className="px-2 py-1 border border-soft-200 rounded text-xs"
                            >
                              <option value="">Reason...</option>
                              {HR_PROFILE_REJECTED_REASONS.map((r) => (
                                <option key={r} value={r}>{getReasonLabel('hr_profile_rejected', r)}</option>
                              ))}
                            </select>
                            <textarea
                              placeholder="Optional note"
                              value={rejectNote}
                              onChange={(e) => setRejectNote(e.target.value)}
                              maxLength={500}
                              className="px-2 py-1 border border-soft-200 rounded text-xs"
                              rows={2}
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                disabled={!!hrActing || !rejectReason}
                                onClick={async () => {
                                  setHrActing(hp.user_id)
                                  try {
                                    const res = await fetch(`/api/companies/${company.id}/hr-profiles/${hp.user_id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: 'rejected', reason_code: rejectReason, reason_note: rejectNote || undefined }),
                                    })
                                    if (!res.ok) {
                                      const d = await res.json()
                                      setMessage({ type: 'error', text: d.error || 'Failed' })
                                      return
                                    }
                                    setHrProfiles((prev) => prev.map((p) => p.user_id === hp.user_id ? { ...p, status: 'rejected' } : p))
                                    setMessage({ type: 'success', text: 'Request rejected' })
                                    setRejectingFor(null)
                                    setRejectReason('')
                                    setRejectNote('')
                                    const evRes = await fetch(`/api/companies/${company.id}/verification-events`)
                                    if (evRes.ok) setVerificationEvents((await evRes.json()).events || [])
                                  } catch (e: any) {
                                    setMessage({ type: 'error', text: e.message })
                                  } finally {
                                    setHrActing(null)
                                  }
                                }}
                                className="px-2 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded text-xs"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => { setRejectingFor(null); setRejectReason(''); setRejectNote(''); }}
                                className="px-2 py-1 bg-soft-200 text-navy-600 rounded text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                        <button
                          type="button"
                          disabled={!!hrActing}
                          onClick={() => setRejectingFor(hp.user_id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded text-xs"
                        >
                          Reject
                        </button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Featured Employees */}
        {(userMembership?.role === 'owner' || userMembership?.role === 'admin') && (
          <div className="mb-8 p-6 border border-soft-200 rounded-xl">
            <h2 className="text-xl font-semibold text-navy-600 mb-4">Featured Employees</h2>
            <p className="text-sm text-soft-500 mb-4">
              Highlight top performers on your company page. Only current roster-visible employees can be featured.
            </p>
            <ul className="space-y-2 mb-4">
              {featuredEmployees.map((e, idx) => (
                <li key={e.worker.id} className="flex items-center justify-between py-2 border-b border-soft-100 last:border-0">
                  <span className="text-sm text-soft-600">
                    {idx + 1}. {e.worker.display_name} — {e.position?.title}
                  </span>
                  <button
                    type="button"
                    disabled={!!featuredActing}
                    onClick={async () => {
                      setFeaturedActing(e.worker.id)
                      try {
                        const res = await fetch(`/api/companies/${company.id}/featured/${e.worker.id}`, { method: 'DELETE' })
                        if (!res.ok) {
                          const d = await res.json()
                          setMessage({ type: 'error', text: d.error || 'Failed' })
                          return
                        }
                        setFeaturedEmployees((prev) => prev.filter((x) => x.worker.id !== e.worker.id))
                        setMessage({ type: 'success', text: 'Removed from featured' })
                      } catch (err: any) {
                        setMessage({ type: 'error', text: err.message })
                      } finally {
                        setFeaturedActing(null)
                      }
                    }}
                    className="text-red-500 hover:text-red-600 text-xs"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            {featuredEmployees.length === 0 && (
              <p className="text-sm text-soft-400 mb-4">No featured employees yet.</p>
            )}
            <div className="flex gap-2 flex-wrap items-center">
              <select
                className="px-4 py-2 border border-soft-200 rounded-lg text-sm min-w-[200px]"
                defaultValue=""
                onChange={async (ev) => {
                  const workerId = ev.target.value
                  if (!workerId) return
                  ev.target.value = ''
                  setFeaturedActing(workerId)
                  try {
                    const res = await fetch(`/api/companies/${company.id}/featured`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ worker_id: workerId, sort_order: featuredEmployees.length }),
                    })
                    if (!res.ok) {
                      const d = await res.json()
                      setMessage({ type: 'error', text: d.error || 'Failed' })
                      return
                    }
                    const emp = allEmployees.find((x) => x.worker.id === workerId)
                    if (emp) setFeaturedEmployees((prev) => [...prev, emp])
                    setMessage({ type: 'success', text: 'Added to featured' })
                  } catch (err: any) {
                    setMessage({ type: 'error', text: err.message })
                  } finally {
                    setFeaturedActing(null)
                  }
                }}
              >
                <option value="">Add employee...</option>
                {allEmployees
                  .filter((e) => !featuredEmployees.some((f) => f.worker.id === e.worker.id))
                  .map((e) => (
                    <option key={e.worker.id} value={e.worker.id}>
                      {e.worker.display_name} — {e.position?.title}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* Admins panel */}
        {(userMembership?.role === 'owner' || userMembership?.role === 'admin') && (
          <div className="mb-8 p-6 border border-soft-200 rounded-xl">
            <h2 className="text-xl font-semibold text-navy-600 mb-4">Admins</h2>
            <ul className="space-y-2 mb-4">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <span className="text-soft-600">
                    {m.user_id} <span className="text-soft-400">({m.role})</span>
                  </span>
                  {userMembership?.role === 'owner' && m.role !== 'owner' && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm('Remove this admin?')) return
                        const res = await fetch(`/api/companies/${company.id}/members/${m.user_id}`, { method: 'DELETE' })
                        if (!res.ok) {
                          const d = await res.json()
                          setMessage({ type: 'error', text: d.error || 'Failed to remove' })
                          return
                        }
                        setMembers((prev) => prev.filter((x) => x.user_id !== m.user_id))
                        setMessage({ type: 'success', text: 'Admin removed' })
                      }}
                      className="text-red-500 hover:text-red-600 text-xs"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {invites.length > 0 && (
              <p className="text-sm text-soft-500 mb-2">Pending: {invites.map((i) => i.email).join(', ')}</p>
            )}
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="admin@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 px-4 py-2 border border-soft-200 rounded-lg text-sm"
              />
              <button
                type="button"
                disabled={!inviteEmail || inviting}
                onClick={async () => {
                  setInviting(true)
                  setMessage(null)
                  try {
                    const res = await fetch(`/api/companies/${company.id}/members`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: inviteEmail }),
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || 'Failed to invite')
                    setInvites((prev) => [...prev, { id: data.invite.id, email: inviteEmail, role: 'admin' }])
                    setInviteEmail('')
                    setMessage({ type: 'success', text: 'Invite sent' })
                  } catch (err: any) {
                    setMessage({ type: 'error', text: err.message })
                  } finally {
                    setInviting(false)
                  }
                }}
                className="bg-navy-600 hover:bg-navy-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
              >
                {inviting ? 'Inviting...' : 'Invite admin'}
              </button>
            </div>
          </div>
        )}

        {/* Verification History */}
        {(userMembership?.role === 'owner' || userMembership?.role === 'admin') && (
          <div className="mb-8 p-6 border border-soft-200 rounded-xl">
            <h2 className="text-xl font-semibold text-navy-600 mb-4">Verification History</h2>
            {verificationEvents.length === 0 ? (
              <p className="text-sm text-soft-500">No verification events yet.</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {verificationEvents.map((ev) => {
                  const metadata: VerificationEventMetadata | null =
                    typeof ev.metadata === 'object' && ev.metadata !== null
                      ? (ev.metadata as VerificationEventMetadata)
                      : null
                  return (
                    <li key={ev.id} className="flex items-start gap-3 py-2 border-b border-soft-100 last:border-0 text-sm">
                      <span className="text-soft-400 shrink-0">
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                      <span className="text-soft-600">
                        {ev.event_type === 'hr_profile_approved' && 'HR profile approved'}
                        {ev.event_type === 'hr_profile_rejected' && 'HR profile rejected'}
                        {ev.event_type === 'position_approved' && 'Position approved'}
                        {ev.event_type === 'position_denied' && 'Position denied'}
                      </span>
                      {metadata?.work_email && (
                        <span className="text-soft-400">— {metadata.work_email}</span>
                      )}
                      {(ev.event_type === 'position_denied' || ev.event_type === 'hr_profile_rejected') && metadata?.reason_code && (
                        <span className="text-soft-500">
                          ({getReasonLabel(ev.event_type as 'position_denied' | 'hr_profile_rejected', metadata.reason_code)}
                          {metadata.reason_note ? `: ${metadata.reason_note.slice(0, 80)}${metadata.reason_note.length > 80 ? '…' : ''}` : ''})
                        </span>
                      )}
                      <span className="text-soft-400">
                        {ev.actor_type === 'user' ? 'Action by Verified HR' : 'Action via HR Email Link'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">

          {/* Basic Info */}
          <div className="bg-white border border-soft-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-navy-600 mb-6">Company Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-soft-500 mb-2">Company Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={!isAdmin}
                  className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-soft-500 mb-2">Industry</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="IT Consulting, Restaurant, etc."
                  disabled={!isAdmin}
                  className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-soft-500 mb-2">Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://avdv.com"
                  disabled={!isAdmin}
                  className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white border border-soft-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-navy-600 mb-6">Location</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-soft-500 mb-2">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street"
                  disabled={!isAdmin}
                  className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-soft-500 mb-2">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bellefonte"
                    disabled={!isAdmin}
                    className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-soft-500 mb-2">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    maxLength={2}
                    placeholder="PA"
                    disabled={!isAdmin}
                    className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-soft-500 mb-2">ZIP</label>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    maxLength={10}
                    placeholder="16823"
                    disabled={!isAdmin}
                    className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* HR Contact */}
          <div className="bg-white border border-soft-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-navy-600 mb-6">HR / Verification Contact</h2>
            <div>
              <label className="block text-sm font-medium text-soft-500 mb-2">HR Email</label>
              <input
                type="email"
                value={hrEmail}
                onChange={(e) => setHrEmail(e.target.value)}
                placeholder="hr@company.com"
                className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
              <p className="text-xs text-soft-400 mt-1">
                This email receives employment verification requests from workers
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-navy-600 hover:bg-navy-500 disabled:opacity-50 text-white py-4 rounded-xl font-semibold transition-all"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/companies/${params.slug}`}
              className="flex-1 bg-white hover:bg-soft-100 text-navy-600 py-4 rounded-xl font-semibold transition-all text-center"
            >
              View Public Profile
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
