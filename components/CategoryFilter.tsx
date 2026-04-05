'use client'

import { getCategoryEmoji } from '@/lib/utils'

const CATEGORIES = ['All', 'Music', 'Food', 'Culture', 'Networking', 'Sports', 'Art']

interface CategoryFilterProps {
  selected: string
  onChange: (category: string) => void
}

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-4">
      {CATEGORIES.map((cat) => {
        const isActive = selected === cat
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              isActive
                ? 'bg-amber-400 text-black'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {cat !== 'All' && <span>{getCategoryEmoji(cat)}</span>}
            <span>{cat}</span>
          </button>
        )
      })}
    </div>
  )
}
