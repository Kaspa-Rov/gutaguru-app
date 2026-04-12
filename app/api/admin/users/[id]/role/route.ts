import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isAdmin, ASSIGNABLE_ROLES, type Role } from '@/lib/roles'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params

  // 1. Verify the caller is authenticated and is an admin
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!callerProfile || !isAdmin(callerProfile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // 2. Validate the requested role
  const body = await request.json()
  const newRole: Role = body.role

  if (!ASSIGNABLE_ROLES.includes(newRole)) {
    return NextResponse.json(
      { error: `Invalid role. Assignable roles: ${ASSIGNABLE_ROLES.join(', ')}` },
      { status: 400 }
    )
  }

  // 3. Prevent self role-change (accidental lockout prevention)
  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 })
  }

  // 4. Fetch the target user's current role to prevent downgrading a super_admin
  const db = createAdminClient()
  const { data: targetProfile } = await db
    .from('profiles')
    .select('role')
    .eq('id', targetUserId)
    .single()

  if (!targetProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (targetProfile.role === 'super_admin') {
    return NextResponse.json(
      { error: 'super_admin role can only be changed via the Supabase dashboard' },
      { status: 403 }
    )
  }

  // 5. Apply the role change via the service-role client (bypasses RLS)
  const { error: updateError } = await db
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)

  if (updateError) {
    console.error('[admin/role] update error:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, role: newRole })
}
