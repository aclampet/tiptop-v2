'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [email, setEmail] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    setEmail(user.email || '')

    const { data: worker } = await supabase
      .from('workers')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (worker) {
      setDisplayName(worker.display_name || '')
      setBio(worker.bio || '')
      setIsPublic(worker.is_public)
    }

    setLoading(false)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('workers')
        .update({
          display_name: displayName,
          bio: bio || null,
          is_public: isPublic,
        })
        .eq('auth_user_id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      router.refresh()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-soft-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-600 mb-2">Settings</h1>
        <p className="text-soft-500">Manage your profile and account</p>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile Settings */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="bg-white border border-soft-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-navy-600 mb-6">Profile</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-soft-500 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-soft-400 cursor-not-allowed"
              />
              <p className="text-xs text-soft-400 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-soft-500 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-soft-500 mb-2">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Tell customers about yourself..."
                className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
              />
              <p className="text-xs text-soft-400 mt-1">{bio.length}/500 characters</p>
            </div>

            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <span className="text-sm text-soft-500">Public profile</span>
                  <p className="text-xs text-soft-400">
                    When enabled, your profile is visible to anyone with the link
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-navy-600 hover:bg-navy-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-all"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
