import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import VenueForm from '@/components/admin/VenueForm'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function EditVenuePage({ params }: Props) {
  const { id } = await params
  const db = createAdminClient()

  const { data: venue } = await db
    .from('venues')
    .select('id, name, short_description, full_description, address, city, cover_image_url, amenities, payment_methods, owner_user_id, is_claimed, is_verified')
    .eq('id', id)
    .single()

  if (!venue) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Edit Venue</h1>
        <p className="text-zinc-400 text-sm mt-1 truncate">{venue.name}</p>
      </div>
      <VenueForm venue={venue as any} />
    </div>
  )
}
