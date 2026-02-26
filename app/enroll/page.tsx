'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ENROLL_STORAGE_KEY, type EnrollData } from '@/lib/enroll'

function loadEnrollData(): Partial<EnrollData> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(ENROLL_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<EnrollData>
  } catch {
    return {}
  }
}

function saveEnrollData(data: Partial<EnrollData>) {
  if (typeof window === 'undefined') return
  try {
    const current = loadEnrollData()
    sessionStorage.setItem(ENROLL_STORAGE_KEY, JSON.stringify({ ...current, ...data }))
  } catch {}
}

const SCENES: { headline: string; prompt: string; placeholder: string; key: keyof EnrollData }[] = [
  { headline: 'Excellence has a name.', prompt: "What's your name?", placeholder: 'Your full name', key: 'name' },
  { headline: 'Excellence has purpose.', prompt: 'What is yours?', placeholder: 'Position or role', key: 'position' },
  { headline: 'Excellence happens.', prompt: 'Where do you excel?', placeholder: 'Company or City, State', key: 'location' },
]

export default function EnrollPage() {
  const router = useRouter()
  const [scene, setScene] = useState(0)
  const [values, setValues] = useState<EnrollData>({ name: '', position: '', location: '' })

  useEffect(() => {
    const stored = loadEnrollData()
    setValues((v) => ({ name: stored.name ?? v.name, position: stored.position ?? v.position, location: stored.location ?? v.location }))
  }, [])

  const current = SCENES[scene]
  const value = values[current.key]
  const canContinue = value.trim().length >= (current.key === 'name' ? 2 : 1)

  const goNext = useCallback(() => {
    if (!canContinue) return
    const next = value.trim()
    setValues((v) => ({ ...v, [current.key]: next }))
    saveEnrollData({ [current.key]: next })
    if (scene < SCENES.length - 1) {
      setScene((s) => s + 1)
    } else {
      saveEnrollData({ name: values.name, position: values.position, location: next })
      router.push('/enroll/confirm')
    }
  }, [scene, current.key, value, canContinue, values.name, values.position, router])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex-shrink-0 py-4 px-6 flex justify-between items-center">
        <Link href="/" className="text-navy-600 font-semibold text-lg">
          TipTop
        </Link>
        <Link href="/login" className="text-soft-500 hover:text-navy-600 text-sm">
          Sign in
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl mx-auto text-center">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-navy-600 mb-2 transition-all duration-300">
            {current.headline}
          </h1>
          <p className="text-lg sm:text-xl text-soft-500 mb-8">{current.prompt}</p>

          <input
            type="text"
            value={value}
            onChange={(e) => setValues((v) => ({ ...v, [current.key]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                goNext()
              }
            }}
            placeholder={current.placeholder}
            autoFocus
            autoComplete="off"
            className="w-full max-w-md mx-auto px-6 py-4 text-lg border-2 border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400"
            aria-label={current.prompt}
          />

          <div className="mt-10">
            <button
              type="button"
              onClick={goNext}
              disabled={!canContinue}
              className="inline-flex items-center justify-center gap-2 w-12 h-12 rounded-full bg-navy-600 text-white hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2"
              aria-label="Continue"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {scene > 0 && (
            <button
              type="button"
              onClick={() => setScene((s) => s - 1)}
              className="mt-6 text-sm text-soft-500 hover:text-navy-600"
            >
              Back
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
