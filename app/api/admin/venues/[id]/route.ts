import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { canManageContent, isAdmin } from '@/lib/roles'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

  const db = createAdminClient()
  const { data: existing } = await db
    .from('venues').select('owner_user_id').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Venue not found' }, { status: 404 })

  // Editor+ can edit any venue; venue owner can edit their claimed venue
  const isOwner = existing.owner_user_id === user.id
  if (!canManageContent(profile.role) && !isOwner) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await request.json()
  if ((body.short_description ?? '').length > 220) {
    return NextResponse.json({ error: 'short_description exceeds 220 characters' }, { status: 400 })
  }
  if ((body.full_description ?? '').length > 1000) {
    return NextResponse.json({ error: 'full_description exceeds 1000 characters' }, { status: 400 })
  }

  const allowed = ['name', 'short_description', 'full_description', 'address', 'city',
                   'cover_image_url', 'amenities', 'payment_methods']
  // Admins can also update ownership/verification fields
  if (isAdmin(profile.role)) allowed.push('owner_user_id', 'is_claimed', 'is_verified')

  const updates: Record<string, unknown> = {}
  for (const f of allowed) {
    if (f in body) updates[f] = body[f] === '' ? null : body[f]
  }

  const { data, error } = await db
    .from('venues').update(updates).eq('id', id).select().single()

  if (error) {
    console.error('[api/admin/venues PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !isAdmin(profile.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const db = createAdminClient()
  const { error } = await db.from('venues').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
