'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type SearchWorker = { slug: string; display_name: string; overall_rating: number }
type SearchCompany = { slug: string; name: string; verification_status: string }

type SearchResult = 
  | { type: 'worker'; slug: string; label: string; sublabel?: string }
  | { type: 'company'; slug: string; label: string; sublabel?: string }

const DEBOUNCE_MS = 300

export default function HomeSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`)
      if (res.status === 429) {
        setResults([])
        setLoading(false)
        return
      }
      const data = await res.json()
      const workers: SearchResult[] = (data.workers || []).map((w: SearchWorker) => ({
        type: 'worker' as const,
        slug: w.slug,
        label: w.display_name,
        sublabel: w.overall_rating ? `${w.overall_rating} ★` : undefined,
      }))
      const companies: SearchResult[] = (data.companies || []).map((c: SearchCompany) => ({
        type: 'company' as const,
        slug: c.slug,
        label: c.name,
        sublabel: c.verification_status === 'verified' ? '✓ Verified' : undefined,
      }))
      setResults([...workers, ...companies])
      setHighlight(0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      setOpen(!!query.trim())
      return
    }
    setOpen(true)
    debounceRef.current = setTimeout(() => {
      fetchResults(query.trim())
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, fetchResults])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) {
      if (e.key === 'Escape') setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const r = results[highlight]
      if (r) {
        const href = r.type === 'worker' ? `/worker/${r.slug}` : `/companies/${r.slug}`
        router.push(href)
        setOpen(false)
        setQuery('')
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const workers = results.filter((r): r is SearchResult & { type: 'worker' } => r.type === 'worker')
  const companies = results.filter((r): r is SearchResult & { type: 'company' } => r.type === 'company')

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <input
        ref={inputRef}
        type="search"
        placeholder="Search people or companies..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full px-4 py-3 rounded-xl border-2 border-soft-200 text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400"
        aria-label="Search"
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {open && (
        <div
          ref={panelRef}
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-soft-200 rounded-xl shadow-lg overflow-hidden z-50"
        >
          {loading ? (
            <div className="px-4 py-6 text-center text-soft-500 text-sm">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-soft-500 text-sm">No results found.</div>
          ) : (
            <>
              {workers.length > 0 && (
                <div className="px-3 pt-3 pb-1">
                  <p className="text-xs font-medium text-soft-400 uppercase tracking-wide">People</p>
                </div>
              )}
              {workers.map((r, i) => {
                const idx = results.indexOf(r)
                const href = `/worker/${r.slug}`
                return (
                  <Link
                    key={`w-${r.slug}`}
                    href={href}
                    role="option"
                    aria-selected={highlight === idx}
                    onMouseEnter={() => setHighlight(idx)}
                    className={`block px-4 py-2 hover:bg-soft-100 ${highlight === idx ? 'bg-soft-100' : ''}`}
                    onClick={() => { setOpen(false); setQuery(''); }}
                  >
                    <span className="font-medium text-navy-600">{r.label}</span>
                    {r.sublabel && <span className="text-soft-500 text-sm ml-2">{r.sublabel}</span>}
                  </Link>
                )
              })}
              {companies.length > 0 && (
                <div className="px-3 pt-3 pb-1">
                  <p className="text-xs font-medium text-soft-400 uppercase tracking-wide">Companies</p>
                </div>
              )}
              {companies.map((r, i) => {
                const idx = results.indexOf(r)
                const href = `/companies/${r.slug}`
                return (
                  <Link
                    key={`c-${r.slug}`}
                    href={href}
                    role="option"
                    aria-selected={highlight === idx}
                    onMouseEnter={() => setHighlight(idx)}
                    className={`block px-4 py-2 hover:bg-soft-100 ${highlight === idx ? 'bg-soft-100' : ''}`}
                    onClick={() => { setOpen(false); setQuery(''); }}
                  >
                    <span className="font-medium text-navy-600">{r.label}</span>
                    {r.sublabel && <span className="text-soft-500 text-sm ml-2">{r.sublabel}</span>}
                  </Link>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
