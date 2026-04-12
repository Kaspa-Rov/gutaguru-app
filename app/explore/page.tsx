import { fetchEvents, fetchUserEngagement, fetchVenuesForSearch, type VenueSearchResult } from '@/lib/events'
import ExploreClient from './ExploreClient'

export const dynamic = 'force-dynamic'

export default async function ExplorePage() {
  const [events, { upvotedIds, savedIds }, venues] = await Promise.all([
    fetchEvents({ limit: 100, orderBy: 'date_time' }),
    fetchUserEngagement(),
    fetchVenuesForSearch(),
  ])

  return (
    <div>
      <div className="px-4 pt-4 pb-1">
        <h1 className="text-white font-black text-xl leading-tight">Explore</h1>
        <p className="text-zinc-500 text-xs mt-0.5">Events & venues across Zimbabwe</p>
      </div>
      <ExploreClient
        events={events}
        venues={venues}
        upvotedIds={upvotedIds}
        savedIds={savedIds}
      />
    </div>
  )
}
