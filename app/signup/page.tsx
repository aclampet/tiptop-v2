'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/supabase/client'
import { slugify } from '@/lib/utils'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()

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
      const supabase = createClient()
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
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <span 
              style={{ fontFamily: 'var(--font-display)' }}
              className="text-4xl text-navy-500 hover:text-navy-400 transition-colors"
            >
              TipTop
            </span>
          </Link>
          <p className="text-soft-400 mt-2 text-sm">Create your free profile</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${
            step >= 1 ? 'bg-navy-500' : 'bg-soft-100'
          }`} />
          <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${
            step >= 2 ? 'bg-navy-500' : 'bg-soft-100'
          }`} />
        </div>

        {/* Form */}
        <div className="bg-white border border-soft-200 rounded-2xl p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleAuthSubmit} className="space-y-5">
              <h2 className="text-navy-600 font-semibold text-lg mb-4">Your account</h2>

              <div>
                <label className="block text-sm font-medium text-soft-500 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-soft-500 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all"
                  placeholder="8+ characters"
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-navy-600 hover:bg-navy-500 disabled:bg-soft-300 disabled:text-soft-400 text-white py-3 rounded-xl font-semibold transition-all active:scale-95"
              >
                {loading ? 'Creating account...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <h2 className="text-navy-600 font-semibold text-lg mb-4">Your profile</h2>

              <div>
                <label className="block text-sm font-medium text-soft-500 mb-1.5">
                  Your Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all"
                  placeholder="John Smith"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !displayName}
                className="w-full bg-navy-600 hover:bg-navy-500 disabled:bg-soft-300 disabled:text-soft-400 text-white py-3 rounded-xl font-semibold transition-all active:scale-95"
              >
                {loading ? 'Creating profile...' : 'Create profile'}
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-soft-200 text-center">
            <p className="text-soft-400 text-sm">
              Already have an account?{' '}
              <Link 
                href="/login"
                className="text-navy-500 hover:text-navy-400 font-medium transition-colors"
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
