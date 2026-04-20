import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isContributor, ROLE_LABEL, type Role } from '@/lib/roles'
import Link from 'next/link'
import { LayoutDashboard, PlusCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name, email')
    .eq('id', user.id)
    .single()

  // Only external contributors may access /dashboard; admins use /admin
  if (!profile || !isContributor(profile.role)) redirect('/')

  const displayName = profile.display_name ?? profile.email ?? 'Contributor'
  const roleLabel   = ROLE_LABEL[profile.role as Role] ?? profile.role

  return (
    <div className="py-6 px-4 space-y-6 pb-28 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <LayoutDashboard size={20} className="text-amber-400" />
            My Dashboard
          </h1>
          <p className="text-zinc-500 text-xs mt-0.5">
            {displayName} · <span className="text-amber-400/80">{roleLabel}</span>
          </p>
        </div>
        <Link
          href="/submit"
          className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold px-3 py-2 rounded-xl transition-colors"
        >
          <PlusCircle size={14} />
          Submit Event
        </Link>
      </div>

      {children}
    </div>
  )
}
