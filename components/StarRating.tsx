'use client'

import { useState } from 'react'
import { Star, AlertCircle } from 'lucide-react'

interface StarRatingProps {
  eventId: string
  initialRating?: number | null
  averageRating?: number | null
  ratingsCount?: number | null
  onRated?: (rating: number, newAverage: number) => void
}

export default function StarRating({
  eventId,
  initialRating,
  averageRating,
  ratingsCount,
  onRated,
}: StarRatingProps) {
  const [userRating, setUserRating] = useState<number | null>(initialRating ?? null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [average, setAverage] = useState(averageRating ?? null)
  const [count, setCount] = useState(ratingsCount ?? 0)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(!!initialRating)
  const [error, setError] = useState<string | null>(null)

  const displayRating = hovered ?? userRating ?? 0

  const handleRate = async (rating: number) => {
    if (loading) return
    setLoading(true)
    setError(null)

    // Optimistic
    const previousRating = userRating
    setUserRating(rating)
    setSubmitted(true)

    try {
      const res = await fetch(`/api/events/${eventId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Revert
        setUserRating(previousRating)
        setSubmitted(!!previousRating)
        if (res.status === 401) {
          setError('Sign in to rate this event')
        } else {
          setError(data.error ?? 'Could not save your rating. Please try again.')
        }
        return
      }

      // Sync from API response
      setAverage(data.average)
      setCount(data.count)
      setUserRating(data.rating)
      onRated?.(data.rating, data.average)
    } catch {
      setUserRating(previousRating)
      setSubmitted(!!previousRating)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* Stars */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= displayRating
          return (
            <button
              key={star}
              type="button"
              disabled={loading}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleRate(star)}
              className="transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            >
              <Star
                size={24}
                className={`transition-colors ${
                  filled
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-zinc-600 hover:text-amber-300'
                }`}
              />
            </button>
          )
        })}

        {submitted && userRating && (
          <span className="ml-2 text-xs text-amber-400 font-medium">
            {loading ? 'Saving…' : `Your rating: ${userRating}/5`}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5 text-red-400">
          <AlertCircle size={13} />
          <span className="text-xs">{error}</span>
        </div>
      )}

      {/* Average display */}
      {average !== null && count > 0 && (
        <p className="text-zinc-400 text-xs">
          <span className="text-white font-semibold">{average.toFixed(1)}</span>
          {' '}avg · {count} {count === 1 ? 'rating' : 'ratings'}
        </p>
      )}

      {!submitted && !error && (
        <p className="text-zinc-500 text-xs">Tap a star to rate this event</p>
      )}
    </div>
  )
}
