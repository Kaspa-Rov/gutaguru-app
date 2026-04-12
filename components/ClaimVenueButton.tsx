'use client'

import { useState } from 'react'
import { ShieldCheck, X, AlertCircle, CheckCircle, Building2 } from 'lucide-react'

type ClaimState = 'none' | 'pending' | 'approved' | 'rejected'

interface Props {
  venueId:    string
  venueName:  string
  isVerified: boolean
  isClaimed:  boolean
  /** Current user's existing claim for this venue, if any */
  userClaimState: ClaimState
  /** null = user not logged in */
  userId: string | null
}

const MAX_LEN = 1000

export default function ClaimVenueButton({
  venueId,
  venueName,
  isVerified,
  isClaimed,
  userClaimState,
  userId,
}: Props) {
  const [open,        setOpen]        = useState(false)
  const [note,        setNote]        = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [submitted,   setSubmitted]   = useState(userClaimState === 'pending')

  // ── Badges ──────────────────────────────────────────────────────────────────

  if (isVerified) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
        <ShieldCheck size={13} />
        Verified Venue
      </div>
    )
  }

  if (isClaimed) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full">
        <Building2 size={13} />
        Claimed
      </div>
    )
  }

  // ── Claim already submitted ──────────────────────────────────────────────────

  if (submitted || userClaimState === 'pending') {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-full">
        <CheckCircle size={13} className="text-amber-400" />
        Claim submitted · under review
      </div>
    )
  }

  if (userClaimState === 'rejected') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full">
        <AlertCircle size={13} />
        Claim rejected · contact support
      </div>
    )
  }

  // ── Not logged in ────────────────────────────────────────────────────────────

  if (!userId) {
    return (
      <a
        href="/auth/login"
        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 rounded-full transition-colors"
      >
        <Building2 size={13} />
        Claim this venue
      </a>
    )
  }

  // ── Submit handler ───────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!note.trim()) { setError('Please describe your evidence'); return }
    setSubmitting(true)
    setError(null)
    try {
      const res  = await fetch(`/api/venues/${venueId}/claim`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ evidence_note: note }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
      setSubmitted(true)
      setOpen(false)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Trigger button + modal ───────────────────────────────────────────────────

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 active:scale-95 border border-zinc-700 px-3 py-1.5 rounded-full transition-all"
      >
        <Building2 size={13} />
        Claim this venue
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          {/* Sheet */}
          <div className="w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-700 overflow-hidden shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <p className="text-white font-bold text-sm">Claim this venue</p>
                <p className="text-zinc-500 text-xs mt-0.5 truncate">{venueName}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              <p className="text-zinc-400 text-sm leading-relaxed">
                Tell us how you can verify your ownership or management of{' '}
                <span className="text-white font-semibold">{venueName}</span>.
                Our team reviews all claims manually.
              </p>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                    Evidence <span className="text-red-400">*</span>
                  </label>
                  <span className={`text-xs tabular-nums ${note.length > MAX_LEN - 50 ? 'text-amber-400' : 'text-zinc-600'}`}>
                    {MAX_LEN - note.length}
                  </span>
                </div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  maxLength={MAX_LEN}
                  rows={5}
                  placeholder={
                    'e.g. "I am the manager of this venue. Our business registration number is ZW123456. ' +
                    'You can verify via our Google Business listing at…"'
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-400 transition-colors resize-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5">
                  <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-xs">{error}</p>
                </div>
              )}

              <p className="text-zinc-600 text-xs">
                A Gutaguru admin will review your claim. You'll gain venue management access on approval.
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !note.trim()}
                className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black text-sm font-bold rounded-xl transition-colors active:scale-[0.98]"
              >
                {submitting ? 'Submitting…' : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
