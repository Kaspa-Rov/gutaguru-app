import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { canManageContent } from '@/lib/roles'
import EventForm from '@/components/admin/EventForm'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function EditEventPage({ params }: Props) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/')

  const db = createAdminClient()
  const [{ data: event }, { data: venues }] = await Promise.all([
    db.from('events')
      .select('id, title, short_description, full_description, date_time, location, city, category, image_url, ticket_link, venue_id, status, created_by')
      .eq('id', id)
      .single(),
    db.from('venues').select('id, name, city').order('city').order('name'),
  ])

  if (!event) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Edit Event</h1>
        <p className="text-zinc-400 text-sm mt-1 truncate">{event.title}</p>
      </div>
      <EventForm
        event={event as any}
        venues={venues ?? []}
        canSetStatus={canManageContent(profile.role)}
      />
    </div>
  )
}
