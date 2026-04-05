import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const city = searchParams.get('city')
  const limit = parseInt(searchParams.get('limit') ?? '50')

  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from('events')
    .select(`*, venues (id, name, address, city)`)
    .gte('date_time', new Date().toISOString())
    .order('upvotes_count', { ascending: false })
    .limit(limit)

  if (category && category !== 'All') {
    query = query.eq('category', category)
  }
  if (city) {
    query = query.eq('city', city)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { title, description, date_time, location, city, category, image_url, ticket_link, venue_id } = body

  if (!title || !date_time || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('pending_events')
    .insert([{
      title, description, date_time, location, city, category,
      image_url, ticket_link, venue_id, submitted_by: user.id, status: 'pending'
    }])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
