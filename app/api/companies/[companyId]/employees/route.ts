import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/supabase/server'

// GET /api/companies/[companyId]/employees — Public roster (featured + employees)
export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  const { companyId } = params
  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Featured workers (sorted by sort_order)
  const { data: featuredRows } = await supabase
    .from('company_featured_workers')
    .select('worker_id, sort_order')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })

  const featuredWorkerIds = (featuredRows || []).map((r) => r.worker_id)

  // Roster-visible positions: show_on_company_page, is_current, worker is_public
  const { data: positions, error } = await supabase
    .from('positions')
    .select(`
      id,
      title,
      rating,
      review_count,
      email_verified,
      hr_verified,
      worker:workers (
        id,
        display_name,
        slug,
        avatar_url,
        overall_rating,
        total_reviews
      )
    `)
    .eq('company_id', companyId)
    .eq('show_on_company_page', true)
    .eq('is_current', true)

  if (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }

  // RLS filters to workers where is_public; dedupe by worker
  const byWorker = new Map<string, { position: any; worker: any }>()
  for (const p of positions || []) {
    const w = p.worker as any
    if (!w?.id) continue
    if (!byWorker.has(w.id)) {
      byWorker.set(w.id, { position: p, worker: w })
    }
  }

  const featured = featuredWorkerIds
    .map((wid) => byWorker.get(wid))
    .filter(Boolean) as { position: any; worker: any }[]

  const restIds = new Set(featuredWorkerIds)
  const employees = Array.from(byWorker.values()).filter((e) => !restIds.has(e.worker.id))

  return NextResponse.json({
    featured,
    employees,
  })
}
