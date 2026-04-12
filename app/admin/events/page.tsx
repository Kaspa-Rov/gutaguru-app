import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { formatEventDate, getCategoryEmoji } from '@/lib/utils'
import { ExternalLink, Pencil, Plus } from 'lucide-react'
import type { EventStatus } from '@/types'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  published:      'bg-green-500/10 text-green-400 border-green-500/20',
  pending_review: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  draft:          'bg-zinc-700/40  text-zinc-400  border-zinc-600/40',
  rejected:       'bg-red-500/10   text-red-400   border-red-500/20',
}

const STATUS_LABEL: Record<string, string> = {
  published: 'Published', pending_review: 'Pending', draft: 'Draft', rejected: 'Rejected',
}

type SearchParams = { status?: string }

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { status: filterStatus } = await searchParams
  const db = createAdminClient()

  let query = db
    .from('events')
    .select('id, title, category, city, date_time, status, upvotes_count, venues(name)')
    .order('date_time', { ascending: false })
    .limit(200)

  if (filterStatus && filterStatus !== 'all') {
    query = query.eq('status', filterStatus as EventStatus)
  }

  const { data: events } = await query

  // Count by status for filter tabs
  const { data: allEvents } = await db.from('events').select('status')
  const counts = (allEvents ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.status ?? 'draft'] = (acc[e.status ?? 'draft'] ?? 0) + 1
    return acc
  }, {})
  const total = allEvents?.length ?? 0

  const tabs = [
    { key: 'all',           label: 'All',      count: total },
    { key: 'published',     label: 'Published', count: counts.published ?? 0 },
    { key: 'pending_review',label: 'Pending',  count: counts.pending_review ?? 0 },
    { key: 'draft',         label: 'Draft',    count: counts.draft ?? 0 },
    { key: 'rejected',      label: 'Rejected', count: counts.rejected ?? 0 },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Events</h1>
          <p className="text-zinc-400 text-sm mt-1">{events?.length ?? 0} shown</p>
        </div>
        <Link
          href="/admin/events/new"
          className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={15} />
          New Event
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const active = (!filterStatus || filterStatus === 'all')
            ? tab.key === 'all'
            : tab.key === filterStatus
          return (
            <Link
              key={tab.key}
              href={tab.key === 'all' ? '/admin/events' : `/admin/events?status=${tab.key}`}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                active
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-zinc-600' : 'bg-zinc-800'}`}>
                {tab.count}
              </span>
            </Link>
          )
        })}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          <span>Event</span>
          <span className="text-right">Status</span>
          <span className="text-right">Date</span>
          <span className="text-right">Edit</span>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {events?.map((event) => (
            <div
              key={event.id}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-zinc-800/40 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs">{getCategoryEmoji(event.category)}</span>
                  <Link
                    href={`/events/${event.id}`}
                    target="_blank"
                    className="text-white text-sm font-medium truncate hover:text-amber-400 transition-colors flex items-center gap-1"
                  >
                    {event.title}
                    <ExternalLink size={10} className="flex-shrink-0 text-zinc-600" />
                  </Link>
                </div>
                {event.venues && (
                  <p className="text-zinc-500 text-xs mt-0.5 truncate">{(event.venues as any).name}</p>
                )}
              </div>

              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                STATUS_STYLES[event.status ?? 'draft'] ?? STATUS_STYLES.draft
              }`}>
                {STATUS_LABEL[event.status ?? 'draft']}
              </span>

              <span className="text-zinc-400 text-xs text-right whitespace-nowrap">
                {formatEventDate(event.date_time)}
              </span>

              <Link
                href={`/admin/events/${event.id}/edit`}
                className="text-zinc-500 hover:text-amber-400 transition-colors"
                aria-label="Edit event"
              >
                <Pencil size={14} />
              </Link>
            </div>
          ))}

          {!events?.length && (
            <p className="px-4 py-8 text-zinc-500 text-sm text-center">No events found.</p>
          )}
        </div>
      </div>
    </div>
  )
}
