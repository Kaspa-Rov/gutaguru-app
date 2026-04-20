import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { canManageVenues } from '@/lib/roles'
import { formatEventDate, getCategoryEmoji } from '@/lib/utils'
import Link from 'next/link'
import { Calendar, MapPin, Clock, CheckCircle, XCircle, Inbox, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG = {
  published:     { label: 'Published',     color: 'text-green-400',  bg: 'bg-green-400/10',  icon: CheckCircle },
  pending_review:{ label: 'Under Review',  color: 'text-amber-400',  bg: 'bg-amber-400/10',  icon: Clock       },
  draft:         { label: 'Draft',         color: 'text-zinc-400',   bg: 'bg-zinc-700/40',   icon: Calendar    },
  rejected:      { label: 'Rejected',      color: 'text-red-400',    bg: 'bg-red-400/10',    icon: XCircle     },
} as const

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  // user is guaranteed non-null by layout
  const userId = user!.id

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', userId).single()
  const role = profile?.role ?? 'contributor'

  const db = createAdminClient()

  // Fetch all data in parallel
  const [
    { data: myEvents },
    { data: myClaims },
    { data: myVenues },
  ] = await Promise.all([
    db
      .from('events')
      .select('id, title, category, city, date_time, status, submitter_type, created_at')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(50),

    db
      .from('venue_claims')
      .select('id, status, submitted_at, evidence_note, venues(id, name, city)')
      .eq('claimant_user_id', userId)
      .order('submitted_at', { ascending: false }),

    canManageVenues(role)
      ? db
          .from('venues')
          .select('id, name, city, is_verified, is_claimed')
          .eq('owner_user_id', userId)
      : Promise.resolve({ data: [] }),
  ])

  const hasContent = (myEvents?.length ?? 0) + (myClaims?.length ?? 0) + (myVenues?.length ?? 0) > 0

  if (!hasContent) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-16 text-center">
        <Inbox size={32} className="text-zinc-600 mx-auto mb-3" />
        <p className="text-white font-bold text-sm">Nothing here yet</p>
        <p className="text-zinc-500 text-xs mt-1">Submit your first event to get started.</p>
        <Link
          href="/submit"
          className="inline-block mt-4 bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
        >
          Submit Event
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* My Owned Venues (venue_manager with approved claim) */}
      {(myVenues?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <MapPin size={15} className="text-blue-400" /> My Venues
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden">
            {myVenues!.map(venue => (
              <Link
                key={venue.id}
                href={`/venues/${venue.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors group"
              >
                <div>
                  <p className="text-white text-sm font-medium">{venue.name}</p>
                  <p className="text-zinc-500 text-xs">{venue.city}</p>
                </div>
                <div className="flex items-center gap-2">
                  {venue.is_verified && (
                    <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Verified</span>
                  )}
                  <ExternalLink size={13} className="text-zinc-600 group-hover:text-zinc-400" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* My Submitted Events */}
      {(myEvents?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <Calendar size={15} className="text-amber-400" /> My Submitted Events
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden">
            {myEvents!.map(event => {
              const cfg = STATUS_CONFIG[event.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft
              const StatusIcon = cfg.icon
              return (
                <div key={event.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{getCategoryEmoji(event.category)}</span>
                        <p className="text-white text-sm font-medium truncate">{event.title}</p>
                      </div>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {event.city} · {formatEventDate(event.date_time)}
                        {event.submitter_type && ` · ${event.submitter_type}`}
                      </p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.color} ${cfg.bg}`}>
                      <StatusIcon size={11} />
                      {cfg.label}
                    </span>
                  </div>
                  {event.status === 'published' && (
                    <Link
                      href={`/events/${event.id}`}
                      className="text-xs text-amber-400/70 hover:text-amber-400 mt-1 inline-block"
                    >
                      View event →
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* My Venue Claims */}
      {(myClaims?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <MapPin size={15} className="text-orange-400" /> My Venue Claims
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden">
            {myClaims!.map(claim => {
              const venue = claim.venues as unknown as { id: string; name: string; city: string } | null
              const statusColor =
                claim.status === 'approved' ? 'text-green-400 bg-green-400/10' :
                claim.status === 'rejected' ? 'text-red-400 bg-red-400/10'    :
                                              'text-amber-400 bg-amber-400/10'
              const statusLabel =
                claim.status === 'approved' ? 'Approved' :
                claim.status === 'rejected' ? 'Rejected' :
                                              'Under Review'
              return (
                <div key={claim.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">
                        {venue?.name ?? 'Unknown venue'}
                      </p>
                      <p className="text-zinc-500 text-xs">{venue?.city}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  {claim.status === 'rejected' && (
                    <p className="text-zinc-600 text-xs mt-1">Contact support if you believe this is an error.</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

    </div>
  )
}
