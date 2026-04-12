import { createAdminClient } from '@/lib/supabase-admin'
import { format } from 'date-fns'
import { ShieldCheck, Building2 } from 'lucide-react'
import ClaimAction from './ClaimAction'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-400/10 text-amber-400 border-amber-400/20',
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10  text-red-400  border-red-500/20',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  approved: <ShieldCheck size={11} />,
  pending:  <Building2  size={11} />,
}

export default async function AdminClaimsPage() {
  const db = createAdminClient()

  const { data: claims } = await db
    .from('venue_claims')
    .select('id, status, evidence_note, submitted_at, reviewed_at, venue_id, claimant_user_id, reviewed_by')
    .order('submitted_at', { ascending: false })
    .limit(200)

  if (!claims?.length) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-black text-white">Claims</h1>
          <p className="text-zinc-400 text-sm mt-1">Venue ownership requests</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-zinc-400 text-sm font-medium">No venue claims yet</p>
          <p className="text-zinc-600 text-xs mt-1">
            Claims appear here when users request ownership of a venue.
          </p>
        </div>
      </div>
    )
  }

  // Resolve names/emails in parallel
  const venueIds  = [...new Set(claims.map(c => c.venue_id))]
  const userIds   = [...new Set([
    ...claims.map(c => c.claimant_user_id),
    ...claims.map(c => c.reviewed_by).filter(Boolean),
  ])]

  const [{ data: venues }, { data: profiles }] = await Promise.all([
    db.from('venues').select('id, name, city, is_verified').in('id', venueIds),
    db.from('profiles').select('id, email, display_name').in('id', userIds),
  ])

  const venueMap   = Object.fromEntries((venues   ?? []).map(v => [v.id, v]))
  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  const pending  = claims.filter(c => c.status === 'pending')
  const reviewed = claims.filter(c => c.status !== 'pending')

  const renderName = (id: string | null) => {
    if (!id) return '—'
    const p = profileMap[id]
    return p ? (p.display_name ?? p.email ?? id.slice(0, 8)) : id.slice(0, 8)
  }

  const renderSection = (title: string, items: typeof claims) => {
    if (!items.length) return null
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <p className="text-white font-bold text-sm">{title}</p>
          <span className="text-zinc-500 text-xs">{items.length}</span>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {items.map(claim => {
            const venue = venueMap[claim.venue_id]
            return (
              <div key={claim.id} className="px-4 py-4 hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-start justify-between gap-4">

                  {/* Left: claim details */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-semibold truncate">
                        {venue?.name ?? 'Unknown Venue'}
                      </p>
                      {venue?.is_verified && (
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-semibold">
                          Verified
                        </span>
                      )}
                    </div>

                    <p className="text-zinc-500 text-xs">
                      {venue?.city}{venue?.city && ' · '}
                      Claimant: <span className="text-zinc-300">{renderName(claim.claimant_user_id)}</span>
                    </p>

                    {claim.evidence_note && (
                      <div className="bg-zinc-800/60 rounded-lg px-3 py-2 mt-2">
                        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">Evidence</p>
                        <p className="text-zinc-300 text-xs leading-relaxed line-clamp-4">
                          {claim.evidence_note}
                        </p>
                      </div>
                    )}

                    <p className="text-zinc-600 text-[10px]">
                      Submitted {claim.submitted_at ? format(new Date(claim.submitted_at), 'MMM d, yyyy') : '—'}
                      {claim.reviewed_at && (
                        <> · Reviewed {format(new Date(claim.reviewed_at), 'MMM d, yyyy')} by {renderName(claim.reviewed_by)}</>
                      )}
                    </p>
                  </div>

                  {/* Right: status badge or action buttons */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    {claim.status === 'pending' ? (
                      <ClaimAction claimId={claim.id} />
                    ) : (
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[claim.status]}`}>
                        {STATUS_ICON[claim.status]}
                        {claim.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Claims</h1>
        <p className="text-zinc-400 text-sm mt-1">
          {pending.length} pending · {reviewed.length} reviewed
        </p>
      </div>

      {renderSection('Pending Review', pending)}
      {renderSection('Reviewed',       reviewed)}
    </div>
  )
}
