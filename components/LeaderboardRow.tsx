import Link from 'next/link'
import Image from 'next/image'
import { ThumbsUp, Bookmark, Star } from 'lucide-react'
import { formatEventDate, getCategoryColor } from '@/lib/utils'
import type { RankedEvent } from '@/types'

interface LeaderboardRowProps {
  event: RankedEvent
  maxScore: number
}

const MEDALS: Record<number, { emoji: string; color: string }> = {
  1: { emoji: '🥇', color: 'text-amber-400' },
  2: { emoji: '🥈', color: 'text-zinc-300' },
  3: { emoji: '🥉', color: 'text-orange-400' },
}

export default function LeaderboardRow({ event, maxScore }: LeaderboardRowProps) {
  const medal = MEDALS[event.rank]
  const scoreWidth = maxScore > 0 ? Math.round((event.score / maxScore) * 100) : 0
  const isTop = event.rank === 1

  return (
    <Link
      href={`/events/${event.id}`}
      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-[0.99] ${
        isTop
          ? 'bg-amber-400/10 border-amber-400/30 hover:border-amber-400/60'
          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
      }`}
    >
      {/* Rank */}
      <div className="w-8 flex-shrink-0 text-center">
        {medal ? (
          <span className={`text-xl leading-none ${medal.color}`}>{medal.emoji}</span>
        ) : (
          <span className="text-sm font-black text-zinc-500">#{event.rank}</span>
        )}
      </div>

      {/* Thumbnail */}
      <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
        <Image
          src={event.image_url || '/placeholder-event.jpg'}
          alt={event.title}
          fill
          className="object-cover"
          sizes="56px"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-bold text-sm leading-tight line-clamp-1 ${isTop ? 'text-amber-400' : 'text-white'}`}>
            {event.title}
          </p>
          {isTop && (
            <span className="flex-shrink-0 text-[10px] font-black bg-amber-400 text-black px-1.5 py-0.5 rounded-full">
              #1
            </span>
          )}
        </div>

        <p className="text-zinc-500 text-xs mt-0.5 truncate">
          {formatEventDate(event.date_time)}
          {event.venues && ` · ${event.venues.name}`}
        </p>

        {/* Score bar */}
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isTop ? 'bg-amber-400' : 'bg-zinc-500'}`}
              style={{ width: `${scoreWidth}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-zinc-500 flex-shrink-0">
            {event.score}pts
          </span>
        </div>
      </div>

      {/* Micro stats */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0 text-zinc-400">
        <span className="flex items-center gap-0.5 text-[10px]">
          <ThumbsUp size={9} className={isTop ? 'text-amber-400' : ''} />
          {event.upvotes_count}
        </span>
        <span className="flex items-center gap-0.5 text-[10px]">
          <Bookmark size={9} className={isTop ? 'text-amber-400' : ''} />
          {event.saves_count}
        </span>
        {event.average_rating && (
          <span className="flex items-center gap-0.5 text-[10px]">
            <Star size={9} className="fill-amber-400 text-amber-400" />
            {event.average_rating.toFixed(1)}
          </span>
        )}
      </div>
    </Link>
  )
}
