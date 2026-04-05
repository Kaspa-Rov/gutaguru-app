'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ThumbsUp, Bookmark, Star, MapPin, TrendingUp, Zap } from 'lucide-react'
import { formatEventDate, getCategoryColor, getCategoryEmoji } from '@/lib/utils'
import ShareButton from './ShareButton'
import type { Event } from '@/types'

interface EventCardProps {
  event: Event
  userUpvoted?: boolean
  userSaved?: boolean
  onUpvote?: (id: string) => void
  onSave?: (id: string) => void
  /** Pass rank=1 to show the "#1 This Week" gold badge */
  rank?: number
}

function Badge({ label, type }: { label: string; type: 'number-one' | 'trending' | 'rising' }) {
  const styles = {
    'number-one': 'bg-amber-400 text-black ring-2 ring-amber-300',
    trending:     'bg-amber-400 text-black',
    rising:       'bg-purple-500 text-white',
  }
  const icons = {
    'number-one': '🥇',
    trending:     <TrendingUp size={10} />,
    rising:       <Zap size={10} />,
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${styles[type]}`}>
      {type === 'number-one' ? (
        <span>{icons['number-one']}</span>
      ) : (
        icons[type]
      )}
      {label}
    </span>
  )
}

export default function EventCard({
  event,
  userUpvoted,
  userSaved,
  onUpvote,
  onSave,
  rank,
}: EventCardProps) {
  const isTrending = event.upvotes_count >= 20
  const isRising = event.upvotes_count >= 5 && event.upvotes_count < 20
  const isNumberOne = rank === 1

  const interestedLabel =
    event.upvotes_count === 0
      ? 'Be the first!'
      : event.upvotes_count === 1
      ? '1 person interested'
      : `${event.upvotes_count} people interested`

  return (
    <article className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all duration-200 active:scale-[0.99]">
      {/* Image */}
      <Link href={`/events/${event.id}`}>
        <div className="relative h-52 w-full overflow-hidden">
          <Image
            src={event.image_url || '/placeholder-event.jpg'}
            alt={event.title}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            sizes="(max-width: 768px) 100vw, 500px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          {/* Top-left: trend badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {isNumberOne && <Badge label="#1 This Week" type="number-one" />}
            {isTrending && !isNumberOne && <Badge label="Trending" type="trending" />}
            {isRising && !isTrending && !isNumberOne && <Badge label="Rising" type="rising" />}
          </div>

          {/* Top-right: category */}
          <div className="absolute top-3 right-3">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getCategoryColor(event.category)} text-white`}>
              {getCategoryEmoji(event.category)} {event.category}
            </span>
          </div>

          {/* Bottom-left: date */}
          <div className="absolute bottom-3 left-3">
            <span className="text-white font-semibold text-sm drop-shadow">
              {formatEventDate(event.date_time)}
            </span>
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link href={`/events/${event.id}`}>
          <h3 className="text-white font-bold text-base leading-tight mb-1 line-clamp-2 hover:text-amber-400 transition-colors">
            {event.title}
          </h3>
        </Link>

        {/* Venue + city */}
        <div className="flex items-center gap-1 text-zinc-400 text-xs mb-3">
          <MapPin size={11} className="flex-shrink-0" />
          <span className="truncate">
            {event.venues ? event.venues.name : event.location}
          </span>
          <span className="text-zinc-600 mx-0.5">·</span>
          <span className="flex-shrink-0 text-zinc-500">{event.city}</span>
        </div>

        {/* Engagement bar */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            {/* Upvote */}
            <button
              onClick={() => onUpvote?.(event.id)}
              className={`flex items-center gap-1.5 transition-colors group ${
                userUpvoted
                  ? 'text-amber-400'
                  : 'text-zinc-400 hover:text-amber-400'
              }`}
              aria-label="Interested"
            >
              <ThumbsUp
                size={15}
                className={`group-hover:scale-110 transition-transform ${userUpvoted ? 'fill-amber-400' : ''}`}
              />
              <span className="text-xs font-medium">{event.upvotes_count}</span>
            </button>

            {/* Save */}
            <button
              onClick={() => onSave?.(event.id)}
              className={`flex items-center gap-1.5 transition-colors group ${
                userSaved
                  ? 'text-blue-400'
                  : 'text-zinc-400 hover:text-blue-400'
              }`}
              aria-label="Save"
            >
              <Bookmark
                size={15}
                className={`group-hover:scale-110 transition-transform ${userSaved ? 'fill-blue-400' : ''}`}
              />
              <span className="text-xs font-medium">{event.saves_count}</span>
            </button>

            {/* Rating */}
            {event.average_rating && (
              <div className="flex items-center gap-1 text-zinc-400">
                <Star size={13} className="fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium">{event.average_rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Right side: share + tickets/social proof */}
          <div className="flex items-center gap-2">
            <ShareButton eventId={event.id} eventTitle={event.title} compact />

            {event.ticket_link ? (
              <a
                href={event.ticket_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black px-3 py-1 rounded-full transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Tickets
              </a>
            ) : (
              <span className="text-xs text-zinc-500">{interestedLabel}</span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
