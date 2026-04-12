'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Inbox,
  Flag,
  Users,
  ArrowLeft,
} from 'lucide-react'
import { ROLE_LABEL, type Role } from '@/lib/roles'

const NAV_ITEMS = [
  { href: '/admin',             label: 'Overview',    icon: LayoutDashboard },
  { href: '/admin/events',      label: 'Events',      icon: Calendar        },
  { href: '/admin/venues',      label: 'Venues',      icon: MapPin          },
  { href: '/admin/submissions', label: 'Submissions', icon: Inbox           },
  { href: '/admin/claims',      label: 'Claims',      icon: Flag            },
  { href: '/admin/users',       label: 'Users',       icon: Users           },
]

interface AdminNavProps {
  role: Role
  displayName: string
}

export default function AdminNav({ role, displayName }: AdminNavProps) {
  const pathname = usePathname()

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
      {/* Top bar */}
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1 text-zinc-500 hover:text-white transition-colors flex-shrink-0"
            aria-label="Back to app"
          >
            <ArrowLeft size={14} />
          </Link>
          <span className="text-zinc-700">|</span>
          <span className="font-black text-white text-sm tracking-tight">
            Guta<span className="text-amber-400">Guru</span>
            <span className="text-zinc-500 font-normal ml-1.5">Admin</span>
          </span>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-white text-xs font-semibold leading-none">{displayName}</p>
          <p className="text-amber-400 text-[10px] mt-0.5">{ROLE_LABEL[role]}</p>
        </div>
      </div>

      {/* Tab navigation — horizontally scrollable on mobile */}
      <div className="max-w-5xl mx-auto overflow-x-auto scrollbar-hide">
        <nav className="flex px-4 gap-0.5 min-w-max">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-zinc-400 hover:text-white hover:border-zinc-600'
                }`}
              >
                <Icon size={13} />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
