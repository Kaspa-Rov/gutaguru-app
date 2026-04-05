import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('[rate] auth error:', authError?.message ?? 'no session')
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const rating = Number(body.rating)

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: 'Rating must be an integer between 1 and 5' },
      { status: 400 }
    )
  }

  // Upsert — guaranteed one rating per user per event.
  // Supabase upsert with onConflict issues an INSERT ... ON CONFLICT ... DO UPDATE,
  // which requires both the INSERT and UPDATE RLS policies to pass.
  const { error: upsertError } = await supabase
    .from('ratings')
    .upsert(
      { user_id: user.id, event_id: eventId, rating },
      { onConflict: 'user_id,event_id' }
    )

  if (upsertError) {
    console.error('[rate] upsert error:', upsertError)
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  // Compute fresh average from all ratings for this event
  const { data: allRatings, error: avgError } = await supabase
    .from('ratings')
    .select('rating')
    .eq('event_id', eventId)

  if (avgError) {
    console.error('[rate] avg fetch error:', avgError)
  }

  const count = allRatings?.length ?? 1
  const average =
    allRatings && allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
      : rating

  return NextResponse.json({ rating, average, count })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ userRating: null })
  }

  const { data, error } = await supabase
    .from('ratings')
    .select('rating')
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .maybeSingle()  // maybeSingle() won't error on 0 rows, unlike .single()

  if (error) {
    console.error('[rate GET] error:', error)
  }

  return NextResponse.json({ userRating: data?.rating ?? null })
}
