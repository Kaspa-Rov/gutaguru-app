'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
  /** The text to reveal on expand */
  text: string
  /** Label on the expand trigger. Defaults to "Read more" */
  expandLabel?: string
}

/**
 * Renders hidden text that smoothly reveals on click.
 * Place after an always-visible preview (e.g. short_description).
 * Never renders if text is empty.
 */
export default function ExpandableText({ text, expandLabel = 'Read more' }: Props) {
  const [open, setOpen] = useState(false)

  if (!text.trim()) return null

  return (
    <div>
      {/* Smooth height animation via grid-rows trick */}
      <div
        className={`grid transition-all duration-500 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          {/* top padding gives the text breathing room as it slides in */}
          <div className="pt-3 pb-1">
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">{text}</p>
          </div>
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 active:scale-95 text-sm font-semibold transition-all duration-150 mt-2 group"
      >
        <span>{open ? 'Show less' : expandLabel}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-300 ${open ? '-rotate-180' : 'group-hover:translate-y-0.5'}`}
        />
      </button>
    </div>
  )
}
