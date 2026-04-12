import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { canManageContent } from '@/lib/roles'
import EventForm from '@/components/admin/EventForm'

export const dynamic = 'force-dynamic'

export default async function NewEventPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/')

  const db = createAdminClient()
  const { data: venues } = await db
    .from('venues')
    .select('id, name, city')
    .order('city').order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">New Event</h1>
        <p className="text-zinc-400 text-sm mt-1">Fill in the details below to create a new event.</p>
      </div>
      <EventForm
        venues={venues ?? []}
        canSetStatus={canManageContent(profile.role)}
      />
    </div>
  )
}
