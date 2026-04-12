import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { Calendar, MapPin, Inbox, Flag, Users, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const db = createAdminClient()

  const [
    { count: eventCount },
    { count: venueCount },
    { count: submissionCount },
    { count: claimCount },
    { count: userCount },
  ] = await Promise.all([
    db.from('events').select('*', { count: 'exact', head: true }),
    db.from('venues').select('*', { count: 'exact', head: true }),
    db.from('pending_events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('venue_claims').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Live Events',          value: eventCount ?? 0,      icon: Calendar, href: '/admin/events',      color: 'text-amber-400'  },
    { label: 'Venues',               value: venueCount ?? 0,      icon: MapPin,   href: '/admin/venues',      color: 'text-blue-400'   },
    { label: 'Pending Submissions',  value: submissionCount ?? 0, icon: Inbox,    href: '/admin/submissions', color: 'text-purple-400' },
    { label: 'Pending Claims',       value: claimCount ?? 0,      icon: Flag,     href: '/admin/claims',      color: 'text-orange-400' },
    { label: 'Registered Users',     value: userCount ?? 0,       icon: Users,    href: '/admin/users',       color: 'text-green-400'  },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Overview</h1>
        <p className="text-zinc-400 text-sm mt-1">Platform health at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon, href, color }) => (
          <Link
            key={href}
            href={href}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-600 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <Icon size={18} className={color} />
              <ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </div>
            <p className="text-3xl font-black text-white tabular-nums">{value.toLocaleString()}</p>
            <p className="text-zinc-400 text-xs mt-1">{label}</p>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-white font-bold text-sm">Quick Actions</p>
        </div>
        <div className="divide-y divide-zinc-800">
          {[
            { href: '/admin/submissions', label: 'Review pending event submissions', badge: submissionCount ?? 0 },
            { href: '/admin/claims',      label: 'Review pending venue claims',      badge: claimCount ?? 0      },
            { href: '/admin/users',       label: 'Manage user roles',               badge: null                 },
          ].map(({ href, label, badge }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors group"
            >
              <span className="text-zinc-300 text-sm">{label}</span>
              <div className="flex items-center gap-2">
                {badge !== null && badge > 0 && (
                  <span className="bg-amber-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    {badge}
                  </span>
                )}
                <ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
