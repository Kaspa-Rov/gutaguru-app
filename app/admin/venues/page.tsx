import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { MapPin, Pencil, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminVenuesPage() {
  const db = createAdminClient()

  const { data: venues } = await db
    .from('venues')
    .select('id, name, city, address, is_verified, is_claimed')
    .order('city', { ascending: true })
    .order('name', { ascending: true })
    .limit(200)

  const cities = [...new Set(venues?.map((v) => v.city) ?? [])]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Venues</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {venues?.length ?? 0} venues across {cities.length} {cities.length === 1 ? 'city' : 'cities'}
          </p>
        </div>
        <Link
          href="/admin/venues/new"
          className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={15} />
          New Venue
        </Link>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          <span>Venue</span>
          <span className="text-right">City</span>
          <span className="text-right">Edit</span>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {venues?.map((venue) => (
            <div
              key={venue.id}
              className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 items-center hover:bg-zinc-800/40 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm font-medium truncate">{venue.name}</p>
                  {venue.is_verified && (
                    <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-semibold">
                      Verified
                    </span>
                  )}
                  {venue.is_claimed && !venue.is_verified && (
                    <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 font-semibold">
                      Claimed
                    </span>
                  )}
                </div>
                {venue.address && (
                  <p className="text-zinc-500 text-xs mt-0.5 truncate flex items-center gap-1">
                    <MapPin size={10} />
                    {venue.address}
                  </p>
                )}
              </div>
              <span className="text-zinc-400 text-xs text-right">{venue.city}</span>
              <Link
                href={`/admin/venues/${venue.id}/edit`}
                className="text-zinc-500 hover:text-amber-400 transition-colors"
                aria-label="Edit venue"
              >
                <Pencil size={14} />
              </Link>
            </div>
          ))}

          {!venues?.length && (
            <p className="px-4 py-8 text-zinc-500 text-sm text-center">No venues yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
