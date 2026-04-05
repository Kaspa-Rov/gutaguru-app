import { createSupabaseServerClient } from '@/lib/supabase-server'
import LeaderboardRow from '@/components/LeaderboardRow'
import EventCard from '@/components/EventCard'
import { computeScore } from '@/lib/utils'
import { fetchUserEngagement } from '@/lib/events'
import type { Event, RankedEvent } from '@/types'

export const dynamic = 'force-dynamic'

// ─── Data fetching ────────────────────────────────────────────────────────────

function toRanked(events: Event[]): RankedEvent[] {
  return events
    .map((e) => ({ ...e, score: computeScore(e.upvotes_count, e.saves_count, e.share_count ?? 0) }))
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

async function getLeaderboardData() {
  const supabase = await createSupabaseServerClient()
  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // "This Week's Hottest" — events in the next 7 days, sorted by score
  const { data: weekRaw } = await supabase
    .from('events')
    .select('*, venues (id, name, address, city), ratings (rating)')
    .gte('date_time', now.toISOString())
    .lte('date_time', in7Days.toISOString())
    .order('upvotes_count', { ascending: false })
    .limit(20)

  // "Rising" — events in the next 30 days with mid-range engagement
  // (score ≥ 5 but not yet established — catching up fast)
  const { data: risingRaw } = await supabase
    .from('events')
    .select('*, venues (id, name, address, city), ratings (rating)')
    .gte('date_time', now.toISOString())
    .order('upvotes_count', { ascending: false })
    .limit(50)

  const mapRatings = (data: any[]): Event[] =>
    (data ?? []).map((e) => {
      const ratings = e.ratings ?? []
      return {
        ...e,
        average_rating: ratings.length
          ? ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length
          : null,
        ratings_count: ratings.length,
        ratings: undefined,
      }
    })

  const weekEvents = toRanked(mapRatings(weekRaw ?? []))

  // Rising: score in range 5–49, not already in top 3 of week
  const topIds = new Set(weekEvents.slice(0, 3).map((e) => e.id))
  const risingEvents = toRanked(
    mapRatings(risingRaw ?? []).filter(
      (e) => {
        const score = computeScore(e.upvotes_count, e.saves_count, e.share_count ?? 0)
        return score >= 5 && score < 50 && !topIds.has(e.id)
      }
    )
  ).slice(0, 10)

  return { weekEvents, risingEvents }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LeaderboardPage() {
  const [{ weekEvents, risingEvents }, { upvotedIds, savedIds }] = await Promise.all([
    getLeaderboardData(),
    fetchUserEngagement(),
  ])

  const weekMaxScore = weekEvents[0]?.score ?? 1
  const risingMaxScore = risingEvents[0]?.score ?? 1

  // Hero: the #1 event this week as a full EventCard
  const heroEvent = weekEvents[0]

  return (
    <div className="py-4 pb-24 space-y-8">
      {/* Page header */}
      <div className="px-4">
        <h1 className="text-white font-black text-2xl leading-tight">Leaderboard</h1>
        <p className="text-zinc-400 text-xs mt-1">Zimbabwe&apos;s hottest events · updated live</p>
      </div>

      {/* ── 🔥 This Week's Hottest ─────────────────────────────────────────── */}
      <section className="px-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🔥</span>
          <div>
            <h2 className="text-white font-black text-lg leading-tight">This Week&apos;s Hottest</h2>
            <p className="text-zinc-500 text-xs">Events in the next 7 days · ranked by score</p>
          </div>
        </div>

        {weekEvents.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-8">No events this week yet.</p>
        ) : (
          <div className="space-y-3">
            {/* #1 event gets a full hero card */}
            {heroEvent && (
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🥇</span>
                  <span className="text-amber-400 font-black text-sm">#1 This Week</span>
                </div>
                <EventCard
                  event={heroEvent}
                  userUpvoted={upvotedIds.includes(heroEvent.id)}
                  userSaved={savedIds.includes(heroEvent.id)}
                  rank={1}
                />
              </div>
            )}

            {/* #2 onward as compact rows */}
            {weekEvents.slice(1).map((event) => (
              <LeaderboardRow key={event.id} event={event} maxScore={weekMaxScore} />
            ))}
          </div>
        )}
      </section>

      {/* ── 🚀 Rising Events ───────────────────────────────────────────────── */}
      <section className="px-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🚀</span>
          <div>
            <h2 className="text-white font-black text-lg leading-tight">Rising Events</h2>
            <p className="text-zinc-500 text-xs">Building momentum fast</p>
          </div>
        </div>

        {risingEvents.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-8">
            No rising events right now — check back soon.
          </p>
        ) : (
          <div className="space-y-3">
            {risingEvents.map((event) => (
              <LeaderboardRow key={event.id} event={event} maxScore={risingMaxScore} />
            ))}
          </div>
        )}
      </section>

      {/* Footer note */}
      <p className="px-4 text-center text-zinc-600 text-xs">
        Rankings update as people interact with events
      </p>
    </div>
  )
}
