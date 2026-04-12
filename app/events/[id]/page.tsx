import { createSupabaseServerClient } from '@/lib/supabase-server'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Calendar, MapPin, ArrowLeft, Ticket, ExternalLink, Clock, Compass } from 'lucide-react'
import { formatEventDate, getCategoryColor, getCategoryEmoji, isEventPast } from '@/lib/utils'
import EventEngagement from '@/components/EventEngagement'
import ExpandableText from '@/components/ExpandableText'
import type { Event } from '@/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getEventWithUserState(id: string) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch event + ratings in parallel with user engagement state
  const [{ data: eventData, error }, upvoteResult, saveResult, userRatingResult] =
    await Promise.all([
      supabase
        .from('events')
        .select('*, venues (id, name, address, city), ratings (rating)')
        .eq('id', id)
        .single(),
      user
        ? supabase
            .from('upvotes')
            .select('id')
            .eq('user_id', user.id)
            .eq('event_id', id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from('saved_events')
            .select('id')
            .eq('user_id', user.id)
            .eq('event_id', id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from('ratings')
            .select('rating')
            .eq('user_id', user.id)
            .eq('event_id', id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

  if (error || !eventData) return null

  const ratings: { rating: number }[] = eventData.ratings ?? []
  const avg = ratings.length
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    : null

  const event: Event = {
    ...eventData,
    average_rating: avg,
    ratings_count: ratings.length,
    ratings: undefined,
    user_has_upvoted: !!upvoteResult.data,
    user_has_saved: !!saveResult.data,
    user_rating: userRatingResult.data?.rating ?? null,
  }

  return event
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params
  const event = await getEventWithUserState(id)

  if (!event) notFound()

  const past = isEventPast(event.date_time)

  return (
    <div className="min-h-screen bg-black">
      {/* Back button — floats over image */}
      <div className="fixed top-14 left-0 right-0 z-40 max-w-lg mx-auto px-4 pt-4 pointer-events-none">
        <Link
          href="/"
          className="pointer-events-auto inline-flex items-center gap-2 bg-black/70 backdrop-blur-sm text-white text-sm font-medium px-3 py-2 rounded-full border border-zinc-700"
        >
          <ArrowLeft size={15} />
          Back
        </Link>
      </div>

      {/* Hero image */}
      <div className="relative h-72 w-full">
        <Image
          src={event.image_url || '/placeholder-event.jpg'}
          alt={event.title}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 500px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${getCategoryColor(event.category)} text-white`}>
            {getCategoryEmoji(event.category)} {event.category}
          </span>
          <span className="text-xs bg-black/60 text-white px-2 py-1 rounded-full">
            {event.city}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-5 pb-36 space-y-5">
        {/* Past event notice */}
        {past && (
          <div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2">
            <Clock size={14} className="text-zinc-500 flex-shrink-0" />
            <p className="text-zinc-400 text-xs">This event has ended. Final stats are shown below.</p>
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-black text-white leading-tight">{event.title}</h1>

        {/* Date & Venue */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <Calendar size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">{formatEventDate(event.date_time)}</p>
              <p className="text-zinc-400 text-xs mt-0.5">
                {new Date(event.date_time).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {(event.venues || event.location) && (
            <div className="flex items-start gap-3 bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <MapPin size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                {event.venues ? (
                  <Link
                    href={`/venues/${event.venues.id}`}
                    className="text-white font-semibold text-sm hover:text-amber-400 transition-colors underline-offset-2 hover:underline"
                  >
                    {event.venues.name}
                  </Link>
                ) : (
                  <p className="text-white font-semibold text-sm">{event.location}</p>
                )}
                {event.venues?.address && (
                  <p className="text-zinc-400 text-xs mt-0.5">{event.venues.address}</p>
                )}
                <p className="text-zinc-400 text-xs">{event.city}</p>
              </div>
            </div>
          )}
        </div>

        {/* Description
            Priority:
              1. short_description → always-visible summary
              2. full_description  → expandable full detail (never duplicated)
              3. description       → legacy fallback shown as static text if the new fields are absent
        */}
        {(() => {
          const summary  = event.short_description ?? null
          const full     = event.full_description  ?? null
          const legacy   = event.description       ?? null

          // New CMS content path
          if (summary || full) {
            return (
              <div>
                <h2 className="text-white font-bold text-sm mb-2">About this Event</h2>
                {summary && (
                  <p className="text-zinc-300 text-sm leading-relaxed">{summary}</p>
                )}
                {full && (
                  <ExpandableText
                    text={full}
                    expandLabel={summary ? 'Read more' : 'About this event'}
                  />
                )}
              </div>
            )
          }
          // Legacy fallback — static text only, no expandable needed
          if (legacy) {
            return (
              <div>
                <h2 className="text-white font-bold text-sm mb-2">About this Event</h2>
                <p className="text-zinc-300 text-sm leading-relaxed">{legacy}</p>
              </div>
            )
          }
          return null
        })()}

        {/* Social engagement — client component handles all interactions */}
        <EventEngagement
          eventId={event.id}
          eventTitle={event.title}
          initialUpvotesCount={event.upvotes_count}
          initialSavesCount={event.saves_count}
          initialShareCount={event.share_count ?? 0}
          initialUserUpvoted={event.user_has_upvoted ?? false}
          initialUserSaved={event.user_has_saved ?? false}
          initialUserRating={event.user_rating ?? null}
          averageRating={event.average_rating ?? null}
          ratingsCount={event.ratings_count ?? null}
          isPast={past}
        />
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-16 left-0 right-0 max-w-lg mx-auto px-4 pb-4 z-40">
        {past ? (
          /* Past-event state block */
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Clock size={15} className="flex-shrink-0 text-zinc-500" />
              <span className="font-semibold text-white">Event Ended</span>
            </div>
            <div className="flex items-center gap-2">
              {event.venues && (
                <Link
                  href={`/venues/${event.venues.id}`}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-xl transition-colors border border-zinc-700"
                >
                  <MapPin size={13} />
                  Venue
                </Link>
              )}
              <Link
                href="/explore"
                className="flex items-center gap-1.5 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-black px-3 py-2 rounded-xl transition-colors"
              >
                <Compass size={13} />
                Similar Events
              </Link>
            </div>
          </div>
        ) : (
          event.ticket_link && (
            <a
              href={event.ticket_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-amber-400 hover:bg-amber-300 text-black font-black py-4 rounded-2xl text-base transition-colors shadow-lg shadow-amber-400/20"
            >
              <Ticket size={18} />
              Get Tickets
              <ExternalLink size={14} />
            </a>
          )
        )}
      </div>
    </div>
  )
}
