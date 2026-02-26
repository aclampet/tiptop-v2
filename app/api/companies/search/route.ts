import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'

/** GET /api/companies/search?q=&location= — Public company search for enrollment (anon). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''
  const location = searchParams.get('location')?.trim() || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 20)

  if (q.length < 2) {
    return NextResponse.json(
      { error: 'Query q must be at least 2 characters' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const pattern = `%${q}%`

  const [byName, bySlug] = await Promise.all([
    supabase
      .from('companies')
      .select('id, slug, name, city, state, verification_status')
      .ilike('name', pattern)
      .limit(limit),
    supabase
      .from('companies')
      .select('id, slug, name, city, state, verification_status')
      .ilike('slug', pattern)
      .limit(limit),
  ])

  if (byName.error || bySlug.error) {
    console.error('Companies search error:', byName.error || bySlug.error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }

  const byId = new Map<string, (typeof byName.data)[0]>()
  for (const c of [...(byName.data || []), ...(bySlug.data || [])]) {
    if (!byId.has(c.id)) byId.set(c.id, c)
  }
  let companies = Array.from(byId.values())
    .sort((a, b) => {
      const v = (s: string) => (s === 'verified' ? 2 : s === 'registered' ? 1 : 0)
      return v(b.verification_status || '') - v(a.verification_status || '') || a.name.localeCompare(b.name)
    })
    .slice(0, limit)

  if (location) {
    const locLower = location.toLowerCase()
    companies = companies.filter(
      (c) =>
        (c.city && c.city.toLowerCase().includes(locLower)) ||
        (c.state && c.state.toLowerCase().includes(locLower))
    )
  }

  return NextResponse.json({ companies })
}
