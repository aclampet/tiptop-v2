import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'
import { getClientIp, limitSearch } from '@/lib/rateLimit'

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 10

/** GET /api/search?q= — Public search for workers and companies. Rate limited. */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const limitResult = await limitSearch(ip)
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
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

  const q = raw ? raw.trim().toLowerCase() : ''
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
      .limit(limit)
      .order('display_name'),
    supabase
      .from('companies')
      .select('slug, name, verification_status')
      .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
      .limit(limit)
      .order('verification_status', { ascending: false })
      .order('name'),
  ])

  if (workersRes.error) {
    console.error('Search workers error:', workersRes.error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
  if (companiesRes.error) {
    console.error('Search companies error:', companiesRes.error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }

  return NextResponse.json({
    workers: workersRes.data || [],
    companies: companiesRes.data || [],
  })
}
