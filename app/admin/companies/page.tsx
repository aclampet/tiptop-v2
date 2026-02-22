import { createAdminClient } from '@/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string }
}) {
  const admin = await createAdminClient()
  const status = searchParams.status || 'all'
  const page = parseInt(searchParams.page || '1')
  const limit = 50
  const offset = (page - 1) * limit

  // Build query
  let query = admin
    .from('companies')
    .select('*', { count: 'exact' })

  if (status !== 'all') {
    query = query.eq('verification_status', status)
  }

  const { data: companies, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Get position counts for each company
  const companiesWithStats = await Promise.all(
    (companies || []).map(async (company) => {
      const { data: positions } = await admin
        .from('positions')
        .select('id, rating, review_count')
        .eq('company_id', company.id)

      const positionCount = positions?.length || 0
      const totalReviews = positions?.reduce((sum, p) => sum + p.review_count, 0) || 0
      const avgRating = totalReviews > 0
        ? positions!.reduce((sum, p) => sum + (p.rating * p.review_count), 0) / totalReviews
        : 0

      return {
        ...company,
        position_count: positionCount,
        review_count: totalReviews,
        average_rating: Math.round(avgRating * 100) / 100,
      }
    })
  )

  const totalPages = Math.ceil((count || 0) / limit)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-600 mb-2">Companies</h1>
          <p className="text-soft-500">Manage and verify companies</p>
        </div>
        <Link
          href="/admin/companies/new"
          className="bg-navy-600 hover:bg-navy-500 text-white px-6 py-3 rounded-lg font-semibold transition-all"
        >
          + Add Verified Company
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <FilterTab href="/admin/companies" label="All" active={status === 'all'} />
        <FilterTab href="/admin/companies?status=verified" label="Verified" active={status === 'verified'} />
        <FilterTab href="/admin/companies?status=registered" label="Registered" active={status === 'registered'} />
        <FilterTab href="/admin/companies?status=unverified" label="Unverified" active={status === 'unverified'} />
      </div>

      {/* Companies List */}
      {companiesWithStats.length > 0 ? (
        <div className="bg-white border border-soft-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-soft-200">
                <th className="text-left px-6 py-4 text-sm font-semibold text-soft-500">Company</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-soft-500">Location</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-soft-500">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-soft-500">Stats</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-soft-500">Domain</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-soft-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companiesWithStats.map((company) => (
                <tr key={company.id} className="border-b border-soft-200 hover:bg-white transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-navy-600 font-medium">{company.name}</p>
                      {company.industry && (
                        <p className="text-xs text-soft-400">{company.industry}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-soft-500">
                      {company.city && company.state ? (
                        <>{company.city}, {company.state}</>
                      ) : (
                        <span className="text-soft-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={company.verification_status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-soft-500 space-y-1">
                      <div>{company.position_count} positions</div>
                      <div className="flex items-center gap-2 text-xs text-soft-400">
                        <span>⭐ {company.average_rating > 0 ? company.average_rating.toFixed(1) : '—'}</span>
                        <span>•</span>
                        <span>{company.review_count} reviews</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {company.email_domain ? (
                      <code className="text-xs text-navy-500 bg-navy-500/10 px-2 py-1 rounded">
                        {company.email_domain}
                      </code>
                    ) : (
                      <span className="text-xs text-soft-400">No domain</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/companies/${company.id}`}
                      className="text-sm text-navy-500 hover:text-navy-400 transition-colors"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-soft-200 rounded-xl">
          <div className="text-6xl mb-6">🏢</div>
          <p className="text-soft-500">No companies found</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/companies?status=${status}&page=${p}`}
              className={`px-4 py-2 rounded-lg transition-colors ${
                p === page
                  ? 'bg-navy-600 text-white'
                  : 'bg-white text-soft-500 hover:bg-soft-100'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-navy-600 text-white'
          : 'bg-white text-soft-500 hover:bg-soft-100'
      }`}
    >
      {label}
    </Link>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    verified: 'bg-green-500/10 text-green-400 border-green-500/20',
    registered: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    unverified: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }

  const labels = {
    verified: '✓ Verified',
    registered: 'Registered',
    unverified: 'Unverified',
  }

  return (
    <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${styles[status as keyof typeof styles]}`}>
      {labels[status as keyof typeof labels]}
    </span>
  )
}
