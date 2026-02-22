import { createAdminClient } from '@/supabase/server'
import Link from 'next/link'
import { formatRating } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminWorkersPage() {
  const admin = createAdminClient()

  const { data: workers } = await admin
    .from('workers')
    .select(`
      *,
      positions (id, title, is_active, company:companies(name))
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-600 mb-2">Workers</h1>
          <p className="text-soft-500">{workers?.length || 0} registered workers</p>
        </div>
      </div>

      <div className="bg-white border border-soft-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-soft-200">
              <th className="text-left text-sm font-medium text-soft-500 px-6 py-4">Name</th>
              <th className="text-left text-sm font-medium text-soft-500 px-6 py-4">Positions</th>
              <th className="text-left text-sm font-medium text-soft-500 px-6 py-4">Rating</th>
              <th className="text-left text-sm font-medium text-soft-500 px-6 py-4">Reviews</th>
              <th className="text-left text-sm font-medium text-soft-500 px-6 py-4">Joined</th>
              <th className="text-left text-sm font-medium text-soft-500 px-6 py-4">Profile</th>
            </tr>
          </thead>
          <tbody>
            {workers?.map((worker: any) => (
              <tr key={worker.id} className="border-b border-soft-200 last:border-0">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-navy-600 font-medium">{worker.display_name}</p>
                    <p className="text-xs text-soft-400">/{worker.slug}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-navy-600">{worker.positions?.length || 0}</span>
                  <span className="text-soft-400 text-sm ml-1">
                    ({worker.positions?.filter((p: any) => p.is_active).length || 0} active)
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-navy-600">
                    {worker.overall_rating > 0 ? `⭐ ${formatRating(worker.overall_rating)}` : '—'}
                  </span>
                </td>
                <td className="px-6 py-4 text-navy-600">{worker.total_reviews}</td>
                <td className="px-6 py-4 text-soft-500 text-sm">
                  {new Date(worker.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  {worker.is_public && (
                    <Link
                      href={`/worker/${worker.slug}`}
                      className="text-navy-500 hover:text-navy-400 text-sm transition-colors"
                    >
                      View →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!workers || workers.length === 0) && (
          <div className="text-center py-12">
            <p className="text-soft-500">No workers registered yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
