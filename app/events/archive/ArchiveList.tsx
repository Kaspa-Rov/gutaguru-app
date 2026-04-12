'use client'

import { useState } from 'react'
import EventCard from '@/components/EventCard'
import CategoryFilter from '@/components/CategoryFilter'
import type { Event } from '@/types'

const CITIES = ['All', 'Harare', 'Bulawayo']

export default function ArchiveList({ events }: { events: Event[] }) {
  const [category, setCategory] = useState('All')
  const [city, setCity]         = useState('All')

  const filtered = events.filter((e) => {
    const catMatch  = category === 'All' || e.category === category
    const cityMatch = city === 'All' || e.city === city
    return catMatch && cityMatch
  })

  return (
    <div className="pb-20">
      {/* Sticky filter bar — same structure as EventFeed */}
      <div className="sticky top-14 z-40 bg-black/95 backdrop-blur-sm border-b border-zinc-900">
        <div className="pt-2">
          <CategoryFilter selected={category} onChange={setCategory} />
        </div>
        <div className="flex gap-2 px-4 py-2">
          {CITIES.map((c) => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
                city === c ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {c === 'All' ? '🇿🇼 All Cities' : c === 'Harare' ? '🏙️ Harare' : '🌆 Bulawayo'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="px-4 mt-4 space-y-4">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} readOnly />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-sm">No past events found</p>
        </div>
      )}
    </div>
  )
}
