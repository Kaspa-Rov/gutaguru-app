import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isAdmin, ROLE_LABEL, type Role } from '@/lib/roles'
import RoleSelector from './RoleSelector'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Extra role guard — defence in depth for the most sensitive page.
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!callerProfile || !isAdmin(callerProfile.role)) redirect('/')

  // The regular server client carries the user's JWT.
  // The RLS policy "Users read own profile" allows admin+ to read ALL profiles
  // via the is_admin_user() SECURITY DEFINER function (see add-rbac-admin-read.sql).
  // This avoids a hard dependency on SUPABASE_SERVICE_ROLE_KEY for reads.
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, display_name, role, points, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (profilesError) {
    console.error('[admin/users] profiles query error:', profilesError)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-white">Users</h1>
        <p className="text-zinc-400 text-sm mt-1">
          {profiles?.length ?? 0} registered users
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          <span>User</span>
          <span className="text-right">Points</span>
          <span className="text-right">Joined</span>
          <span className="text-right">Role</span>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {profiles?.map((profile) => (
            <div
              key={profile.id}
              className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-3 sm:gap-4 px-4 py-3 items-center hover:bg-zinc-800/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {profile.display_name ?? profile.email}
                </p>
                {profile.display_name && (
                  <p className="text-zinc-500 text-xs truncate">{profile.email}</p>
                )}
              </div>

              <span className="text-amber-400 text-xs font-bold text-right">
                {profile.points.toLocaleString()} pts
              </span>

              <span className="hidden sm:block text-zinc-500 text-xs text-right whitespace-nowrap">
                {new Date(profile.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: '2-digit',
                })}
              </span>

              {/* Role selector — interactive client component */}
              <div className="text-right">
                <RoleSelector
                  userId={profile.id}
                  currentRole={profile.role as Role}
                  isSelf={profile.id === user.id}
                />
              </div>
            </div>
          ))}

          {!profiles?.length && (
            <p className="px-4 py-8 text-zinc-500 text-sm text-center">No users yet.</p>
          )}
        </div>
      </div>

      <p className="text-zinc-600 text-xs">
        Role changes take effect immediately.
        The <span className="text-zinc-400">super_admin</span> role can only be assigned via the Supabase dashboard.
      </p>
    </div>
  )
}
