import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { canManageContent, isAdmin } from '@/lib/roles'

const LIMITS = { title: 80, short_description: 220, full_description: 1000 }

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

  // Fetch the existing event to check ownership
  const { data: existing } = await db
    .from('events').select('created_by, status').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  // Editors+ can edit any event; creators can only edit their own non-published events
  const isOwner = existing.created_by === user.id
  const canEdit = canManageContent(profile.role) || (isOwner && existing.status !== 'published')
  if (!canEdit) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

  const body = await request.json()

  for (const [field, max] of Object.entries(LIMITS)) {
    const val: string = body[field] ?? ''
    if (val.length > max) {
      return NextResponse.json({ error: `${field} exceeds ${max} characters` }, { status: 400 })
    }
  }

  // Only editors+ can change status
  const updates: Record<string, unknown> = {}
  const fields = ['title', 'short_description', 'full_description', 'date_time',
                  'location', 'city', 'category', 'image_url', 'ticket_link', 'venue_id']

  for (const f of fields) {
    if (f in body) updates[f] = body[f] === '' ? null : body[f]
  }
  if (body.title) updates.description = body.short_description?.trim() || null // sync legacy
  if ('status' in body && canManageContent(profile.role)) updates.status = body.status

  const { data, error } = await db
    .from('events').update(updates).eq('id', id).select().single()

  if (error) {
    console.error('[api/admin/events PATCH]', error)
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
  const { error } = await db.from('events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
