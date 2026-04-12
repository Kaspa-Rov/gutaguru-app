import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { formatEventDate, getCategoryEmoji } from '@/lib/utils'
import { Pencil } from 'lucide-react'
import StatusAction from './StatusAction'

export const dynamic = 'force-dynamic'

export default async function AdminSubmissionsPage() {
  const db = createAdminClient()

  // Submissions are events with status = 'pending_review'
  const { data: pending } = await db
    .from('events')
    .select('id, title, category, city, date_time, status, created_by')
    .eq('status', 'pending_review')
    .order('date_time', { ascending: true })
    .limit(100)

  // Recent rejections for reference
  const { data: rejected } = await db
    .from('events')
    .select('id, title, category, city, date_time, status, created_by')
    .eq('status', 'rejected')
    .order('date_time', { ascending: false })
    .limit(50)

  const allIds = [...new Set([
    ...(pending ?? []).map(e => e.created_by),
    ...(rejected ?? []).map(e => e.created_by),
  ].filter(Boolean))]

  const { data: profiles } = allIds.length
    ? await db.from('profiles').select('id, email, display_name').in('id', allIds)
    : { data: [] }

  const nameMap = Object.fromEntries(
    (profiles ?? []).map(p => [p.id, p.display_name ?? p.email ?? 'Unknown'])
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Submissions</h1>
        <p className="text-zinc-400 text-sm mt-1">
          {pending?.length ?? 0} pending review · {rejected?.length ?? 0} recently rejected
        </p>
      </div>

      {(pending?.length ?? 0) > 0 && (
        <Section title="Pending Review" items={pending!} nameMap={nameMap} showActions />
      )}

      {(rejected?.length ?? 0) > 0 && (
        <Section title="Recently Rejected" items={rejected!} nameMap={nameMap} />
      )}

      {!pending?.length && !rejected?.length && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-12 text-center">
          <p className="text-zinc-400 text-sm">No submissions yet.</p>
        </div>
      )}
    </div>
  )
}

function Section({
  title, items, nameMap, showActions = false,
}: {
  title: string
  items: { id: string; title: string; category: string; city: string; date_time: string; status: string; created_by?: string | null }[]
  nameMap: Record<string, string>
  showActions?: boolean
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <p className="text-white font-bold text-sm">{title}</p>
        <span className="text-zinc-500 text-xs">{items.length}</span>
      </div>
      <div className="divide-y divide-zinc-800/60">
        {items.map((event) => (
          <div key={event.id} className="px-4 py-3 hover:bg-zinc-800/40 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs">{getCategoryEmoji(event.category)}</span>
                  <p className="text-white text-sm font-medium truncate">{event.title}</p>
                </div>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {event.city} · {formatEventDate(event.date_time)}
                  {event.created_by && ` · ${nameMap[event.created_by] ?? 'Unknown'}`}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {showActions && (
                  <>
                    <StatusAction eventId={event.id} targetStatus="published" label="Approve" variant="approve" />
                    <StatusAction eventId={event.id} targetStatus="rejected" label="Reject" variant="reject" />
                  </>
                )}
                <Link
                  href={`/admin/events/${event.id}/edit`}
                  className="text-zinc-500 hover:text-amber-400 transition-colors p-1"
                  aria-label="Edit event"
                >
                  <Pencil size={13} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
