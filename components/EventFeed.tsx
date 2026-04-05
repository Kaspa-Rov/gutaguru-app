'use client'

import { useState, useEffect, useCallback } from 'react'
import EventCard from './EventCard'
import CategoryFilter from './CategoryFilter'
import type { Event } from '@/types'

const CITIES = ['All', 'Harare', 'Bulawayo']

interface EventFeedProps {
  initialEvents: Event[]
  initialUpvotedIds?: string[]
  initialSavedIds?: string[]
}

export default function EventFeed({
  initialEvents,
  initialUpvotedIds = [],
  initialSavedIds = [],
}: EventFeedProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [category, setCategory] = useState('All')
  const [city, setCity] = useState('All')

  // Track user engagement state as sets for O(1) lookup
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(
    () => new Set(initialUpvotedIds)
  )
  const [savedIds, setSavedIds] = useState<Set<string>>(
    () => new Set(initialSavedIds)
  )

  // Derived filtered list
  const filtered = events.filter((e) => {
    const catMatch = category === 'All' || e.category === category
    const cityMatch = city === 'All' || e.city === city
    return catMatch && cityMatch
  })

  const now = new Date()

  const thisWeekend = filtered.filter((e) => {
    const d = new Date(e.date_time)
    const day = d.getDay()
    const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return (day === 5 || day === 6 || day === 0) && diffDays >= 0 && diffDays <= 7
  })

  const trending = filtered.filter(
    (e) => e.upvotes_count >= 20 && !thisWeekend.find((w) => w.id === e.id)
  )

  const shownIds = new Set([
    ...thisWeekend.map((e) => e.id),
    ...trending.map((e) => e.id),
  ])
  const remaining = filtered.filter(
    (e) => !shownIds.has(e.id) && new Date(e.date_time) >= now
  )

  const handleUpvote = useCallback(async (eventId: string) => {
    const wasUpvoted = upvotedIds.has(eventId)

    // Optimistic toggle
    setUpvotedIds((prev) => {
      const next = new Set(prev)
      wasUpvoted ? next.delete(eventId) : next.add(eventId)
      return next
    })
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, upvotes_count: wasUpvoted ? e.upvotes_count - 1 : e.upvotes_count + 1 }
          : e
      )
    )

    try {
      const res = await fetch(`/api/events/${eventId}/upvote`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        // Revert
        setUpvotedIds((prev) => {
          const next = new Set(prev)
          wasUpvoted ? next.add(eventId) : next.delete(eventId)
          return next
        })
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? { ...e, upvotes_count: wasUpvoted ? e.upvotes_count + 1 : e.upvotes_count - 1 }
              : e
          )
        )
        console.warn('[feed upvote] failed:', data.error)
        return
      }

      // Sync authoritative count from DB
      if (data.upvotes_count !== null && data.upvotes_count !== undefined) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId ? { ...e, upvotes_count: data.upvotes_count } : e
          )
        )
      }
      setUpvotedIds((prev) => {
        const next = new Set(prev)
        data.upvoted ? next.add(eventId) : next.delete(eventId)
        return next
      })
    } catch (err) {
      // Network failure — revert
      setUpvotedIds((prev) => {
        const next = new Set(prev)
        wasUpvoted ? next.add(eventId) : next.delete(eventId)
        return next
      })
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, upvotes_count: wasUpvoted ? e.upvotes_count + 1 : e.upvotes_count - 1 }
            : e
        )
      )
      console.error('[feed upvote] network error:', err)
    }
  }, [upvotedIds])

  const handleSave = useCallback(async (eventId: string) => {
    const wasSaved = savedIds.has(eventId)

    // Optimistic toggle
    setSavedIds((prev) => {
      const next = new Set(prev)
      wasSaved ? next.delete(eventId) : next.add(eventId)
      return next
    })
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, saves_count: wasSaved ? e.saves_count - 1 : e.saves_count + 1 }
          : e
      )
    )

    try {
      const res = await fetch(`/api/events/${eventId}/save`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setSavedIds((prev) => {
          const next = new Set(prev)
          wasSaved ? next.add(eventId) : next.delete(eventId)
          return next
        })
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? { ...e, saves_count: wasSaved ? e.saves_count + 1 : e.saves_count - 1 }
              : e
          )
        )
        console.warn('[feed save] failed:', data.error)
        return
      }

      if (data.saves_count !== null && data.saves_count !== undefined) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId ? { ...e, saves_count: data.saves_count } : e
          )
        )
      }
      setSavedIds((prev) => {
        const next = new Set(prev)
        data.saved ? next.add(eventId) : next.delete(eventId)
        return next
      })
    } catch (err) {
      setSavedIds((prev) => {
        const next = new Set(prev)
        wasSaved ? next.add(eventId) : next.delete(eventId)
        return next
      })
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, saves_count: wasSaved ? e.saves_count + 1 : e.saves_count - 1 }
            : e
        )
      )
      console.error('[feed save] network error:', err)
    }
  }, [savedIds])

  const renderCards = (list: Event[]) =>
    list.map((event) => (
      <EventCard
        key={event.id}
        event={event}
        userUpvoted={upvotedIds.has(event.id)}
        userSaved={savedIds.has(event.id)}
        onUpvote={handleUpvote}
        onSave={handleSave}
      />
    ))

  return (
    <div className="pb-20">
      {/* Sticky filter bar */}
      <div className="sticky top-14 z-40 bg-black/95 backdrop-blur-sm border-b border-zinc-900">
        {/* Category filter */}
        <div className="pt-2">
          <CategoryFilter selected={category} onChange={setCategory} />
        </div>
        {/* City filter */}
        <div className="flex gap-2 px-4 py-2">
          {CITIES.map((c) => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
                city === c
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {c === 'All' ? '🇿🇼 All Cities' : c === 'Harare' ? '🏙️ Harare' : '🌆 Bulawayo'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5 mt-4">
        {/* This Weekend */}
        {thisWeekend.length > 0 && (
          <section className="px-4">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-3">
              📅 This Weekend
            </p>
            <div className="space-y-4">{renderCards(thisWeekend)}</div>
          </section>
        )}

        {/* Trending */}
        {trending.length > 0 && (
          <section className="px-4">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-3">
              🔥 Trending
            </p>
            <div className="space-y-4">{renderCards(trending)}</div>
          </section>
        )}

        {/* Remaining */}
        {remaining.length > 0 && (
          <section className="px-4">
            {(thisWeekend.length > 0 || trending.length > 0) && (
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-3">
                🎯 {category === 'All' ? 'More Events' : `${category} Events`}
              </p>
            )}
            <div className="space-y-4">{renderCards(remaining)}</div>
          </section>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
            <p className="text-4xl mb-3">🎪</p>
            <p className="text-sm">No events found</p>
          </div>
        )}
      </div>
    </div>
  )
}
