import EventFeed from '@/components/EventFeed'
import { fetchEvents, fetchUserEngagement } from '@/lib/events'

export const dynamic = 'force-dynamic'

export default async function ExplorePage() {
  const [events, { upvotedIds, savedIds }] = await Promise.all([
    fetchEvents({ limit: 100, orderBy: 'date_time' }),
    fetchUserEngagement(),
  ])

  return (
    <div className="py-4 space-y-4">
      <div className="px-4">
        <h1 className="text-white font-black text-2xl">Explore</h1>
        <p className="text-zinc-400 text-sm mt-1">All upcoming events in Zimbabwe</p>
      </div>
      <EventFeed
        initialEvents={events}
        initialUpvotedIds={upvotedIds}
        initialSavedIds={savedIds}
      />
    </div>
  )
}
