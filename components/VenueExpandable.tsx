'use client'

import { useState } from 'react'
import { ChevronDown, Wifi, CreditCard } from 'lucide-react'

interface Props {
  fullDescription?: string | null
  amenities?: string[]
  paymentMethods?: string[]
  /** Trigger button label. Defaults to "More about this venue" */
  label?: string
}

/**
 * Reusable expand/collapse panel for venue details.
 * Has NO outer card wrapper — the parent owns the container styling.
 * A border-t on the trigger button acts as the natural separator.
 * Renders nothing if there is no content.
 */
export default function VenueExpandable({
  fullDescription,
  amenities = [],
  paymentMethods = [],
  label = 'More about this venue',
}: Props) {
  const [open, setOpen] = useState(false)

  const hasDesc     = !!fullDescription?.trim()
  const hasAmenities = amenities.length > 0
  const hasPayments  = paymentMethods.length > 0

  if (!hasDesc && !hasAmenities && !hasPayments) return null

  return (
    <div>
      {/* Trigger — border-t provides visual separation from card header above */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 border-t border-zinc-800 group transition-colors hover:bg-zinc-800/40 active:bg-zinc-800/60"
      >
        <span className="text-sm font-semibold text-zinc-400 group-hover:text-white transition-colors">
          {open ? 'Show less' : label}
        </span>
        <ChevronDown
          size={15}
          className={`text-amber-400 flex-shrink-0 transition-transform duration-300 ${
            open ? '-rotate-180' : 'group-hover:translate-y-0.5'
          }`}
        />
      </button>

      {/* Animated body */}
      <div
        className={`grid transition-all duration-500 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 space-y-5">

            {hasDesc && (
              <div className="pt-1">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">About</p>
                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                  {fullDescription}
                </p>
              </div>
            )}

            {hasAmenities && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Wifi size={11} className="text-zinc-500" />
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Amenities</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {amenities.map(a => (
                    <span
                      key={a}
                      className="text-xs px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-700"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {hasPayments && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <CreditCard size={11} className="text-zinc-500" />
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Accepted payments</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {paymentMethods.map(p => (
                    <span
                      key={p}
                      className="text-xs px-2.5 py-1 bg-amber-400/10 text-amber-300 rounded-lg border border-amber-400/20"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
