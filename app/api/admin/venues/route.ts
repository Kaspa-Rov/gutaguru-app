import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { canManageContent } from '@/lib/roles'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !canManageContent(profile.role)) {
    return NextResponse.json({ error: 'Editor access required' }, { status: 403 })
  }

  const body = await request.json()
  const { name, short_description, full_description, address, city,
          cover_image_url, amenities, payment_methods } = body

  if (!name?.trim() || !city) {
    return NextResponse.json({ error: 'name and city are required' }, { status: 400 })
  }
  if ((short_description ?? '').length > 220) {
    return NextResponse.json({ error: 'short_description exceeds 220 characters' }, { status: 400 })
  }
  if ((full_description ?? '').length > 1000) {
    return NextResponse.json({ error: 'full_description exceeds 1000 characters' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data, error } = await db
    .from('venues')
    .insert({
      name: name.trim(),
      short_description: short_description?.trim() || null,
      full_description: full_description?.trim() || null,
      address: address?.trim() || null,
      city,
      cover_image_url: cover_image_url?.trim() || null,
      amenities: amenities ?? [],
      payment_methods: payment_methods ?? [],
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[api/admin/venues POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
