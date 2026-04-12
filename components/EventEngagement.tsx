'use client'

import { useState } from 'react'
import { ThumbsUp, Bookmark, AlertCircle, Share2 } from 'lucide-react'
import StarRating from './StarRating'
import ShareButton from './ShareButton'

interface EventEngagementProps {
  eventId: string
  eventTitle: string
  initialUpvotesCount: number
  initialSavesCount: number
  initialShareCount?: number
  initialUserUpvoted: boolean
  initialUserSaved: boolean
  initialUserRating: number | null
  averageRating: number | null
  ratingsCount: number | null
  /** When true: suppress interactive actions, show final stats only. Ratings still allowed. */
  isPast?: boolean
}

export default function EventEngagement({
  eventId,
  eventTitle,
  initialUpvotesCount,
  initialSavesCount,
  initialShareCount = 0,
  initialUserUpvoted,
  initialUserSaved,
  initialUserRating,
  averageRating,
  ratingsCount,
  isPast = false,
}: EventEngagementProps) {
  const [upvoted, setUpvoted] = useState(initialUserUpvoted)
  const [upvotesCount, setUpvotesCount] = useState(initialUpvotesCount)
  const [saved, setSaved] = useState(initialUserSaved)
  const [savesCount, setSavesCount] = useState(initialSavesCount)
  const [upvoteLoading, setUpvoteLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showError = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(null), 4000)
  }

  const handleUpvote = async () => {
    if (upvoteLoading) return
    setUpvoteLoading(true)
    setError(null)

    const wasUpvoted = upvoted

    // Optimistic update
    setUpvoted(!wasUpvoted)
    setUpvotesCount((c) => (wasUpvoted ? c - 1 : c + 1))

    try {
      const res = await fetch(`/api/events/${eventId}/upvote`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        // Revert optimistic update
        setUpvoted(wasUpvoted)
        setUpvotesCount((c) => (wasUpvoted ? c + 1 : c - 1))
        if (res.status === 401) {
          showError('Sign in to mark yourself as interested')
        } else {
          showError(data.error ?? 'Something went wrong. Please try again.')
        }
        return
      }

      // Sync authoritative count from DB (the trigger may have updated it)
      if (data.upvotes_count !== null && data.upvotes_count !== undefined) {
        setUpvotesCount(data.upvotes_count)
      }
      setUpvoted(data.upvoted)
    } catch {
      setUpvoted(wasUpvoted)
      setUpvotesCount((c) => (wasUpvoted ? c + 1 : c - 1))
      showError('Network error. Please try again.')
    } finally {
      setUpvoteLoading(false)
    }
  }

  const handleSave = async () => {
    if (saveLoading) return
    setSaveLoading(true)
    setError(null)

    const wasSaved = saved

    // Optimistic update
    setSaved(!wasSaved)
    setSavesCount((c) => (wasSaved ? c - 1 : c + 1))

    try {
      const res = await fetch(`/api/events/${eventId}/save`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setSaved(wasSaved)
        setSavesCount((c) => (wasSaved ? c + 1 : c - 1))
        if (res.status === 401) {
          showError('Sign in to save events')
        } else {
          showError(data.error ?? 'Something went wrong. Please try again.')
        }
        return
      }

      if (data.saves_count !== null && data.saves_count !== undefined) {
        setSavesCount(data.saves_count)
      }
      setSaved(data.saved)
    } catch {
      setSaved(wasSaved)
      setSavesCount((c) => (wasSaved ? c + 1 : c - 1))
      showError('Network error. Please try again.')
    } finally {
      setSaveLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Error banner — only relevant for live events */}
      {error && !isPast && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Final stats row — always visible */}
      <div className="flex items-center gap-5 text-sm">
        <span className="text-zinc-400">
          <span className="font-bold text-white">{upvotesCount}</span>{' '}
          {upvotesCount === 1 ? 'person' : 'people'} interested
        </span>
        <span className="text-zinc-400">
          <span className="font-bold text-white">{savesCount}</span>{' '}
          {savesCount === 1 ? 'save' : 'saves'}
        </span>
        {initialShareCount > 0 && (
          <span className="flex items-center gap-1 text-zinc-400">
            <Share2 size={13} />
            <span className="font-bold text-white">{initialShareCount}</span>
          </span>
        )}
      </div>

      {/* Action buttons — live events only */}
      {!isPast && (
        <div className="flex gap-3">
          <button
            onClick={handleUpvote}
            disabled={upvoteLoading}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 ${
              upvoted
                ? 'bg-amber-400 text-black'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white'
            }`}
          >
            <ThumbsUp size={16} className={upvoted ? 'fill-black' : ''} />
            {upvoteLoading ? 'Saving…' : upvoted ? 'Interested!' : 'Interested'}
          </button>

          <button
            onClick={handleSave}
            disabled={saveLoading}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 ${
              saved
                ? 'bg-blue-500 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white'
            }`}
          >
            <Bookmark size={16} className={saved ? 'fill-white' : ''} />
            {saveLoading ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </button>

          <ShareButton eventId={eventId} eventTitle={eventTitle} className="flex-1" />
        </div>
      )}

      {/* Star rating — always enabled (post-event reviews are valuable) */}
      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <p className="text-white font-semibold text-sm mb-3">
          {isPast ? 'Rate this event' : 'Rate this event'}
        </p>
        <StarRating
          eventId={eventId}
          initialRating={initialUserRating}
          averageRating={averageRating}
          ratingsCount={ratingsCount}
        />
      </div>
    </div>
  )
}
