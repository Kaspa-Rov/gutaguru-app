import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Calendar, Archive } from 'lucide-react'
import EventCard from '@/components/EventCard'
import BackButton from '@/components/BackButton'
import VenueExpandable from '@/components/VenueExpandable'
import ClaimVenueButton from '@/components/ClaimVenueButton'
import { fetchUserEngagement } from '@/lib/events'
import type { Event, Venue } from '@/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

type ClaimState = 'none' | 'pending' | 'approved' | 'rejected'

async function getPageData(id: string): Promise<{
  venue: Venue
  events: Event[]
  pastCount: number
  userId: string | null
  userClaimState: ClaimState
} | null> {
  const supabase = await createSupabaseServerClient()
  const db       = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date().toISOString()

  const [
    { data: venue, error: venueError },
    { data: eventsRaw,  error: eventsError },
    { count: pastCount },
  ] = await Promise.all([
    // Service-role client so we always see the venue regardless of RLS status
    db.from('venues').select('*').eq('id', id).single(),
    supabase
      .from('events')
      .select('*, venues (id, name, address, city), ratings (rating)')
      .eq('venue_id', id)
      .gte('date_time', now)
      .order('date_time', { ascending: true }),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', id)
      .lt('date_time', now),
  ])

  if (venueError || !venue) return null

  const events: Event[] = (eventsError ? [] : eventsRaw ?? []).map((e: any) => {
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

  // Fetch the current user's claim status for this venue (if logged in)
  let userClaimState: ClaimState = 'none'
  if (user) {
    const { data: claim } = await db
      .from('venue_claims')
      .select('status')
      .eq('venue_id', id)
      .eq('claimant_user_id', user.id)
      .maybeSingle()
    if (claim) userClaimState = claim.status as ClaimState
  }

  return { venue, events, pastCount: pastCount ?? 0, userId: user?.id ?? null, userClaimState }
}

export default async function VenuePage({ params }: PageProps) {
  const { id } = await params
  const data = await getPageData(id)

  if (!data) notFound()

  const { venue, events, pastCount, userId, userClaimState } = data
  const { upvotedIds, savedIds } = await fetchUserEngagement()

  return (
    <div className="py-4 pb-24">
      {/* Back */}
      <div className="px-4 mb-4">
        <BackButton />
      </div>

      {/* Venue header card */}
      <div className="px-4 mb-4">
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0">
              <MapPin size={18} className="text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-white font-black text-xl leading-tight">{venue.name}</h1>
              {venue.address && (
                <p className="text-zinc-400 text-sm mt-1">{venue.address}</p>
              )}
              <p className="text-zinc-500 text-xs mt-0.5">{venue.city}</p>

              {/* Claim / verified badge row */}
              <div className="mt-3">
                <ClaimVenueButton
                  venueId={venue.id}
                  venueName={venue.name}
                  isVerified={venue.is_verified ?? false}
                  isClaimed={venue.is_claimed ?? false}
                  userClaimState={userClaimState}
                  userId={userId}
                />
              </div>

              {/* Short description */}
              {venue.short_description && (
                <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
                  {venue.short_description}
                </p>
              )}
            </div>
          </div>

          {/* Event counts */}
          {(events.length > 0 || pastCount > 0) && (
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
              {events.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Calendar size={14} className="text-amber-400" />
                  <span className="text-zinc-400">
                    <span className="text-white font-semibold">{events.length}</span>{' '}
                    upcoming event{events.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {pastCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Archive size={14} className="text-zinc-500" />
                  <span className="text-zinc-500">
                    <span className="text-zinc-400 font-semibold">{pastCount}</span> past
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expandable venue details */}
      {(venue.full_description || venue.amenities?.length || venue.payment_methods?.length) && (
        <div className="px-4 mb-6">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            <VenueExpandable
              fullDescription={venue.full_description}
              amenities={venue.amenities}
              paymentMethods={venue.payment_methods}
            />
          </div>
        </div>
      )}

      {/* Upcoming events */}
      <div className="px-4">
        <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-3">
          📅 Upcoming at this venue
        </h2>

        {events.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-4xl">📭</p>
            <p className="text-white font-bold">No upcoming events</p>
            <p className="text-zinc-400 text-sm">Check back soon</p>
            {pastCount > 0 && (
              <Link
                href="/events/archive"
                className="inline-block mt-2 text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors"
              >
                Browse {pastCount} past event{pastCount !== 1 ? 's' : ''} in archive →
              </Link>
            )}
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
