import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { canManageOwnEvents, canManageContent } from '@/lib/roles'

const LIMITS = { title: 80, short_description: 220, full_description: 1000 }

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profile || !canManageOwnEvents(profile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await request.json()
  const { title, short_description, full_description, date_time, location, city,
          category, image_url, ticket_link, venue_id, status: requestedStatus,
          submitter_type } = body

  // Validate required fields
  if (!title?.trim() || !date_time || !category || !city) {
    return NextResponse.json({ error: 'title, date_time, category and city are required' }, { status: 400 })
  }

  // Enforce character limits
  for (const [field, max] of Object.entries(LIMITS)) {
    const val: string = body[field] ?? ''
    if (val.length > max) {
      return NextResponse.json({ error: `${field} exceeds ${max} characters` }, { status: 400 })
    }
  }

  // Role-based status: editors/admins can publish directly; others go to pending_review
  const defaultStatus = canManageContent(profile.role) ? 'published' : 'pending_review'
  const status = canManageContent(profile.role) ? (requestedStatus ?? defaultStatus) : 'pending_review'

  const db = createAdminClient()
  const { data, error } = await db
    .from('events')
    .insert({
      title: title.trim(),
      short_description: short_description?.trim() || null,
      full_description: full_description?.trim() || null,
      description: short_description?.trim() || null, // keep legacy column in sync
      date_time,
      location: location?.trim() || null,
      city,
      category,
      image_url: image_url?.trim() || null,
      ticket_link: ticket_link?.trim() || null,
      venue_id: venue_id || null,
      submitter_type: submitter_type?.trim() || null,
      created_by: user.id,
      status,
      upvotes_count: 0,
      saves_count: 0,
      share_count: 0,
    })
    .select()
    .single()

  if (error) {
    console.error('[api/admin/events POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
