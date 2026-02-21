'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/supabase/client'
import { slugify } from '@/lib/utils'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Auth
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Step 2: Profile
  const [displayName, setDisplayName] = useState('')

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) throw signUpError

      if (data.user) {
        setStep(2)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const slug = slugify(displayName)

      // Create worker profile
      const res = await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          slug,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create profile')
      }

      // Redirect to dashboard (add position prompt will show there)
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <span 
              style={{ fontFamily: 'var(--font-display)' }}
              className="text-4xl text-brand-400 hover:text-brand-300 transition-colors"
            >
              TipTop
            </span>
          </Link>
          <p className="text-ink-500 mt-2 text-sm">Create your free profile</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${
            step >= 1 ? 'bg-brand-500' : 'bg-white/10'
          }`} />
          <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${
            step >= 2 ? 'bg-brand-500' : 'bg-white/10'
          }`} />
        </div>

        {/* Form */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleAuthSubmit} className="space-y-5">
              <h2 className="text-white font-semibold text-lg mb-4">Your account</h2>

              <div>
                <label className="block text-sm font-medium text-ink-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  placeholder="8+ characters"
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-ink-700 disabled:text-ink-500 text-white py-3 rounded-xl font-semibold transition-all active:scale-95"
              >
                {loading ? 'Creating account...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <h2 className="text-white font-semibold text-lg mb-4">Your profile</h2>

              <div>
                <label className="block text-sm font-medium text-ink-300 mb-1.5">
                  Your Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  placeholder="John Smith"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !displayName}
                className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-ink-700 disabled:text-ink-500 text-white py-3 rounded-xl font-semibold transition-all active:scale-95"
              >
                {loading ? 'Creating profile...' : 'Create profile'}
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-ink-500 text-sm">
              Already have an account?{' '}
              <Link 
                href="/login"
                className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
