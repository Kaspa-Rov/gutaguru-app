'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Trophy, Archive, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',               icon: Home,    label: 'Home'    },
  { href: '/explore',        icon: Compass, label: 'Explore' },
  { href: '/leaderboard',    icon: Trophy,  label: 'Top'     },
  { href: '/events/archive', icon: Archive, label: 'Archive' },
  { href: '/profile',        icon: User,    label: 'Profile' },
]

export default function BottomNav() {
  const pathname = usePathname()

  // Admin has its own navigation — hide the consumer bottom nav there
  if (pathname.startsWith('/admin')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-t border-zinc-800 safe-area-pb">
      <div className="max-w-lg mx-auto flex items-center justify-around h-14">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors ${
                isActive ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[9px] font-medium tracking-wide">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
