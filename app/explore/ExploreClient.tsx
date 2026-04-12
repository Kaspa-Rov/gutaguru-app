'use client'

import { useMemo, useState } from 'react'
import { Search, X, MapPin, Calendar, Archive } from 'lucide-react'
import Link from 'next/link'
import EventCard from '@/components/EventCard'
import EventFeed from '@/components/EventFeed'
import VenueExpandable from '@/components/VenueExpandable'
import { getCategoryEmoji } from '@/lib/utils'
import type { Event } from '@/types'
import type { VenueSearchResult } from '@/lib/events'

const CATEGORIES = ['Music', 'Food', 'Culture', 'Networking', 'Sports', 'Art'] as const
const CITIES     = ['Harare', 'Bulawayo'] as const
const MAX_SELECT = 3

interface Props {
  events: Event[]
  venues: VenueSearchResult[]
  upvotedIds: string[]
  savedIds: string[]
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function toggle(list: string[], value: string, max: number): string[] {
  if (list.includes(value)) return list.filter(v => v !== value)
  return list.length >= max ? list : [...list, value]
}

function matches(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack || !needle) return false
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

// ─── VenueCard — reuses VenueExpandable for expand/collapse ──────────────────

function VenueCard({ venue }: { venue: VenueSearchResult }) {
  const now      = new Date().toISOString()
  const upcoming = venue.events.filter(e => e.date_time >= now).length
  const past     = venue.events.filter(e => e.date_time <  now).length

  return (
    // overflow-hidden keeps VenueExpandable's animated content clipped to the card
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition-colors">

      {/* Always-visible header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin size={16} className="text-amber-400" />
          </div>

          <div className="min-w-0 flex-1">
            <Link
              href={`/venues/${venue.id}`}
              className="text-white font-bold text-sm leading-snug hover:text-amber-400 transition-colors"
            >
              {venue.name}
            </Link>
            {venue.address && (
              <p className="text-zinc-400 text-xs mt-0.5 truncate">{venue.address}</p>
            )}
            <p className="text-zinc-500 text-xs">{venue.city}</p>

            {/* short_description — summary only, no duplication with full_description in expandable */}
            {venue.short_description && (
              <p className="text-zinc-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                {venue.short_description}
              </p>
            )}
          </div>
        </div>

        {/* Event counts */}
        {(upcoming > 0 || past > 0) && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-800">
            {upcoming > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Calendar size={11} className="text-amber-400" />
                <span><span className="text-white font-semibold">{upcoming}</span> upcoming</span>
              </div>
            )}
            {past > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Archive size={11} className="text-zinc-500" />
                <span><span className="text-zinc-300 font-semibold">{past}</span> past</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shared expand/collapse panel — same component as venue detail page */}
      <VenueExpandable
        fullDescription={venue.full_description}
        amenities={venue.amenities}
        paymentMethods={venue.payment_methods}
        label="More details"
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExploreClient({ events, venues, upvotedIds, savedIds }: Props) {
  const [query,      setQuery]      = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [cities,     setCities]     = useState<string[]>([])

  const q            = query.trim()
  const isSearchMode = q !== '' || categories.length > 0 || cities.length > 0

  const upvotedSet = useMemo(() => new Set(upvotedIds), [upvotedIds])
  const savedSet   = useMemo(() => new Set(savedIds),   [savedIds])

  const filteredEvents = useMemo(() => {
    if (!isSearchMode) return events
    return events.filter(e => {
      if (categories.length > 0 && !categories.includes(e.category)) return false
      if (cities.length > 0     && !cities.includes(e.city))         return false
      if (!q) return true
      return (
        matches(e.title,             q) ||
        matches(e.location,          q) ||
        matches(e.venues?.name,      q) ||
        matches(e.short_description, q)
      )
    })
  }, [events, q, categories, cities, isSearchMode])

  const filteredVenues = useMemo(() => {
    if (!q) return []
    return venues.filter(v => {
      if (cities.length > 0 && !cities.includes(v.city)) return false
      return (
        matches(v.name,              q) ||
        matches(v.address,           q) ||
        matches(v.short_description, q) ||
        matches(v.full_description,  q) ||
        v.amenities.some(a => matches(a, q))
      )
    })
  }, [venues, q, cities])

  const clearAll = () => { setQuery(''); setCategories([]); setCities([]) }

  return (
    <div>
      {/* ── Sticky search + filter bar ─────────────────────────────────────── */}
      <div className="sticky top-14 z-40 bg-black/95 backdrop-blur-sm border-b border-zinc-900 px-4 pt-3 pb-2.5 space-y-2.5">

        {/* Search input */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search events, venues, activities…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-8 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category chips — multi-select up to 3 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => {
            const active = categories.includes(cat)
            const atMax  = !active && categories.length >= MAX_SELECT
            return (
              <button
                key={cat}
                disabled={atMax}
                onClick={() => setCategories(toggle(categories, cat, MAX_SELECT))}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  active
                    ? 'bg-amber-400 text-black'
                    : atMax
                    ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <span>{getCategoryEmoji(cat)}</span>
                {cat}
              </button>
            )
          })}
        </div>

        {/* City chips + clear */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {CITIES.map(city => {
              const active = cities.includes(city)
              const atMax  = !active && cities.length >= MAX_SELECT
              return (
                <button
                  key={city}
                  disabled={atMax}
                  onClick={() => setCities(toggle(cities, city, MAX_SELECT))}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    active
                      ? 'bg-white text-black'
                      : atMax
                      ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {city === 'Harare' ? '🏙️' : '🌆'} {city}
                </button>
              )
            })}
          </div>

          {isSearchMode && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-amber-400 transition-colors flex-shrink-0"
            >
              <X size={11} />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}

      {!isSearchMode ? (
        <EventFeed
          initialEvents={events}
          initialUpvotedIds={upvotedIds}
          initialSavedIds={savedIds}
        />
      ) : (
        <div className="px-4 pt-4 pb-24 space-y-8">

          {/* Events */}
          <section>
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-3">
              🎯 Events
              <span className="ml-2 text-zinc-600 normal-case font-normal">
                {filteredEvents.length} result{filteredEvents.length !== 1 ? 's' : ''}
              </span>
            </p>
            {filteredEvents.length > 0 ? (
              <div className="space-y-4">
                {filteredEvents.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    userUpvoted={upvotedSet.has(event.id)}
                    userSaved={savedSet.has(event.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-3xl mb-2">🎪</p>
                <p className="text-zinc-500 text-sm">No events match</p>
              </div>
            )}
          </section>

          {/* Venues — only shown with a text query */}
          {q && (
            <section>
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-3">
                📍 Venues
                <span className="ml-2 text-zinc-600 normal-case font-normal">
                  {filteredVenues.length} result{filteredVenues.length !== 1 ? 's' : ''}
                </span>
              </p>
              {filteredVenues.length > 0 ? (
                <div className="space-y-3">
                  {filteredVenues.map(venue => (
                    <VenueCard key={venue.id} venue={venue} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-zinc-500 text-sm">No venues match</p>
                </div>
              )}
            </section>
          )}

        </div>
      )}
    </div>
  )
}
