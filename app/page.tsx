import EventFeed from '@/components/EventFeed'
import { fetchEvents, fetchUserEngagement } from '@/lib/events'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [events, { upvotedIds, savedIds }] = await Promise.all([
    fetchEvents({ limit: 50, orderBy: 'upvotes_count' }),
    fetchUserEngagement(),
  ])

  return (
    <div>
      <div className="px-4 pt-3 pb-1">
        <h1 className="text-white font-black text-xl leading-tight">
          🔥 This Weekend in Harare
        </h1>
        <p className="text-zinc-500 text-xs mt-0.5">Harare · Bulawayo · Nationwide</p>
      </div>

      <EventFeed
        initialEvents={events}
        initialUpvotedIds={upvotedIds}
        initialSavedIds={savedIds}
      />
    </div>
  )
}
