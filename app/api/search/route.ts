import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'
import { getClientIp, limitSearch } from '@/lib/rateLimit'

type SearchWorker = { slug: string; display_name: string; overall_rating: number | null }
type SearchCompany = { slug: string; name: string; verification_status: string | null }

const DEFAULT_LIMIT = 6
const MAX_LIMIT = 10

/** Sort workers: slug prefix first, display_name prefix second, then overall_rating desc, display_name asc */
function sortWorkers(workers: SearchWorker[], q: string): SearchWorker[] {
  const ql = q.toLowerCase()
  return [...workers].sort((a, b) => {
    const aSlug = a.slug.toLowerCase().startsWith(ql) ? 0 : 1
    const bSlug = b.slug.toLowerCase().startsWith(ql) ? 0 : 1
    if (aSlug !== bSlug) return aSlug - bSlug
    const aName = a.display_name.toLowerCase().startsWith(ql) ? 0 : 1
    const bName = b.display_name.toLowerCase().startsWith(ql) ? 0 : 1
    if (aName !== bName) return aName - bName
    const ar = a.overall_rating ?? -1
    const br = b.overall_rating ?? -1
    if (br !== ar) return br - ar
    return a.display_name.localeCompare(b.display_name)
  })
}

/** Sort companies: slug prefix first, name prefix second, then name asc */
function sortCompanies(companies: SearchCompany[], q: string): SearchCompany[] {
  const ql = q.toLowerCase()
  return [...companies].sort((a, b) => {
    const aSlug = a.slug.toLowerCase().startsWith(ql) ? 0 : 1
    const bSlug = b.slug.toLowerCase().startsWith(ql) ? 0 : 1
    if (aSlug !== bSlug) return aSlug - bSlug
    const aName = a.name.toLowerCase().startsWith(ql) ? 0 : 1
    const bName = b.name.toLowerCase().startsWith(ql) ? 0 : 1
    if (aName !== bName) return aName - bName
    return a.name.localeCompare(b.name)
  })
}

/** GET /api/search?q=&limit= — Public search for workers and companies. Rate limited. */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const limitResult = await limitSearch(ip)
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', resetSeconds: limitResult.resetSeconds },
      {
        status: 429,
        headers: {
          'Retry-After': String(limitResult.resetSeconds),
        },
      }
    )
  }

  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('q')
  const limitParam = searchParams.get('limit')

  const q = raw ? raw.trim() : ''
  if (q.length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    )
  }

  const limit = Math.min(
    Math.max(1, parseInt(limitParam || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
    MAX_LIMIT
  )

  const supabase = await createClient()
  const pattern = `${q}%`

  const [workersRes, companiesRes] = await Promise.all([
    supabase
      .from('workers')
      .select('slug, display_name, overall_rating')
      .eq('is_public', true)
      .or(`display_name.ilike.${pattern},slug.ilike.${pattern}`)
      .limit(limit),
    supabase
      .from('companies')
      .select('slug, name, verification_status')
      .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
      .limit(limit),
  ])

  if (workersRes.error) {
    console.error('Search workers error:', workersRes.error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
  if (companiesRes.error) {
    console.error('Search companies error:', companiesRes.error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }

  const workers = sortWorkers((workersRes.data || []) as SearchWorker[], q).slice(0, limit)
  const companies = sortCompanies((companiesRes.data || []) as SearchCompany[], q).slice(0, limit)

  return NextResponse.json({
    q,
    workers,
    companies,
  })
}
