import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isAdmin, type Role } from '@/lib/roles'
import AdminNav from '@/components/AdminNav'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()

  // Layer 1: session check (proxy.ts handles the redirect for unauthenticated
  // users, but we double-check here as the docs recommend defence in depth).
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Layer 2: role check — only admin and super_admin may enter /admin.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name, email')
    .eq('id', user.id)
    .single()

  if (!profile || !isAdmin(profile.role)) {
    // Authenticated but insufficient role — send back to the main app.
    redirect('/')
  }

  const displayName = profile.display_name ?? profile.email ?? 'Admin'

  return (
    // Full-width layout — deliberately overrides the max-w-lg consumer layout
    // from the root layout by using a new stacking context.
    <div className="fixed inset-0 bg-zinc-950 z-[100] overflow-y-auto">
      <AdminNav role={profile.role as Role} displayName={displayName} />
      <main className="max-w-5xl mx-auto px-4 py-6 pb-16">
        {children}
      </main>
    </div>
  )
}
