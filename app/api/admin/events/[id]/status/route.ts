import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { canManageContent } from '@/lib/roles'

type Params = { params: Promise<{ id: string }> }

const VALID_STATUSES = ['draft', 'pending_review', 'published', 'rejected'] as const

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !canManageContent(profile.role)) {
    return NextResponse.json({ error: 'Editor access required' }, { status: 403 })
  }

  const { status } = await request.json()
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  const db = createAdminClient()
  const { data, error } = await db
    .from('events')
    .update({ status })
    .eq('id', id)
    .select('id, status')
    .single()

  if (error) {
    console.error('[api/admin/events status PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
