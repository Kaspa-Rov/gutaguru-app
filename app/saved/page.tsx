import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EventCard from '@/components/EventCard'
import type { Event } from '@/types'

export const dynamic = 'force-dynamic'

async function getSavedEvents(): Promise<{ events: Event[]; savedIds: string[] }> {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { events: [], savedIds: [] }

  const { data, error } = await supabase
    .from('saved_events')
    .select(`
      event_id,
      events (
        *,
        venues (id, name, address, city),
        ratings (rating)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return { events: [], savedIds: [] }

  const events: Event[] = data
    .map((row: any) => {
      const e = row.events
      if (!e) return null
      const ratings = e.ratings ?? []
      return {
        ...e,
        average_rating: ratings.length
          ? ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length
          : null,
        ratings_count: ratings.length,
        ratings: undefined,
        user_has_saved: true,
      }
    })
    .filter(Boolean) as Event[]

  const savedIds = events.map((e) => e.id)

  return { events, savedIds }
}

export default async function SavedPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { events, savedIds } = await getSavedEvents()

  return (
    <div className="py-4 px-4 space-y-4">
      <div>
        <h1 className="text-white font-black text-2xl">Saved Events</h1>
        <p className="text-zinc-400 text-sm mt-1">
          {events.length === 0
            ? "Events you've bookmarked"
            : `${events.length} event${events.length === 1 ? '' : 's'} saved`}
        </p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <p className="text-5xl">🔖</p>
          <p className="text-white font-bold">No saved events yet</p>
          <p className="text-zinc-400 text-sm">Tap the bookmark icon on any event to save it</p>
          <Link
            href="/"
            className="inline-block mt-4 bg-amber-400 text-black font-bold px-5 py-2.5 rounded-2xl text-sm"
          >
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              userSaved={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}
