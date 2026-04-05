import { createSupabaseServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Calendar } from 'lucide-react'
import EventCard from '@/components/EventCard'
import BackButton from '@/components/BackButton'
import { fetchUserEngagement } from '@/lib/events'
import type { Event, Venue } from '@/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getVenueWithEvents(id: string): Promise<{ venue: Venue; events: Event[] } | null> {
  const supabase = await createSupabaseServerClient()

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .single()

  if (venueError || !venue) return null

  const { data: eventsRaw, error: eventsError } = await supabase
    .from('events')
    .select('*, venues (id, name, address, city), ratings (rating)')
    .eq('venue_id', id)
    .gte('date_time', new Date().toISOString())
    .order('date_time', { ascending: true })

  if (eventsError) return { venue, events: [] }

  const events: Event[] = (eventsRaw ?? []).map((e: any) => {
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

  return { venue, events }
}

export default async function VenuePage({ params }: PageProps) {
  const { id } = await params
  const result = await getVenueWithEvents(id)

  if (!result) notFound()

  const { venue, events } = result
  const { upvotedIds, savedIds } = await fetchUserEngagement()

  return (
    <div className="py-4 pb-24">
      {/* Back */}
      <div className="px-4 mb-4">
        <BackButton />
      </div>

      {/* Venue header */}
      <div className="px-4 mb-6">
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0">
              <MapPin size={18} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-white font-black text-xl leading-tight">{venue.name}</h1>
              {venue.address && (
                <p className="text-zinc-400 text-sm mt-1">{venue.address}</p>
              )}
              <p className="text-zinc-500 text-xs mt-0.5">{venue.city}</p>
            </div>
          </div>

          {events.length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800">
              <Calendar size={14} className="text-zinc-500" />
              <span className="text-zinc-400 text-sm">
                {events.length} upcoming event{events.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Events list */}
      <div className="px-4">
        <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-3">
          📅 Upcoming at this venue
        </h2>

        {events.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-4xl">📭</p>
            <p className="text-white font-bold">No upcoming events</p>
            <p className="text-zinc-400 text-sm">Check back soon</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                userUpvoted={upvotedIds.includes(event.id)}
                userSaved={savedIds.includes(event.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
