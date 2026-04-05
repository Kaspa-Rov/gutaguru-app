'use client'

import { useState } from 'react'
import { Share2, Check, Copy } from 'lucide-react'

interface ShareButtonProps {
  eventId: string
  eventTitle: string
  /** Additional class names for the button wrapper */
  className?: string
  /** Compact icon-only mode (for EventCard engagement bar) */
  compact?: boolean
}

export default function ShareButton({ eventId, eventTitle, className = '', compact = false }: ShareButtonProps) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const getUrl = () => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://gutaguru.com'
    return `${base}/events/${eventId}`
  }

  const recordShare = async () => {
    try {
      await fetch(`/api/events/${eventId}/share`, { method: 'POST' })
    } catch {
      // Non-critical — share already happened, just silently fail the DB write
    }
  }

  const handleShare = async () => {
    const url = getUrl()

    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: `Check out "${eventTitle}" on Gutaguru`,
          url,
        })
        // Web Share API only resolves after the user actually shares
        await recordShare()
        setStatus('success')
        setTimeout(() => setStatus('idle'), 2500)
      } catch (err: any) {
        // User cancelled the share sheet — don't count it or show error
        if (err?.name !== 'AbortError') {
          setStatus('error')
          setTimeout(() => setStatus('idle'), 2500)
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url)
        await recordShare()
        setStatus('success')
        setTimeout(() => setStatus('idle'), 2500)
      } catch {
        setStatus('error')
        setTimeout(() => setStatus('idle'), 2500)
      }
    }
  }

  if (compact) {
    return (
      <button
        onClick={handleShare}
        aria-label="Share event"
        className={`flex items-center gap-1.5 transition-colors group ${
          status === 'success'
            ? 'text-green-400'
            : status === 'error'
            ? 'text-red-400'
            : 'text-zinc-400 hover:text-white'
        } ${className}`}
      >
        {status === 'success' ? (
          <Check size={15} />
        ) : (
          <Share2 size={15} className="group-hover:scale-110 transition-transform" />
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleShare}
      className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
        status === 'success'
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : status === 'error'
          ? 'bg-red-500/10 text-red-400'
          : 'bg-zinc-800 hover:bg-zinc-700 text-white'
      } ${className}`}
    >
      {status === 'success' ? (
        <>
          <Check size={16} />
          {navigator?.share ? 'Shared!' : 'Link Copied!'}
        </>
      ) : (
        <>
          {status === 'error' ? <Copy size={16} /> : <Share2 size={16} />}
          {status === 'error' ? 'Copy failed' : 'Share'}
        </>
      )}
    </button>
  )
}
