import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { canManageContent } from '@/lib/roles'
import EventForm from '@/components/admin/EventForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SubmitEventPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/submit')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? 'subscriber'

  const db = createAdminClient()
  const { data: venues } = await db
    .from('venues')
    .select('id, name, city')
    .order('name', { ascending: true })

  return (
    <div className="py-6 px-4 pb-28 max-w-lg mx-auto space-y-5">
      <div>
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-zinc-500 hover:text-white text-xs mb-4 transition-colors"
        >
          <ChevronLeft size={14} /> Back to profile
        </Link>
        <h1 className="text-2xl font-black text-white">Submit an Event</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Your submission will be reviewed before it goes live.
        </p>
      </div>

      <EventForm
        venues={venues ?? []}
        canSetStatus={canManageContent(role)}
        isAdminView={false}
      />
    </div>
  )
}
