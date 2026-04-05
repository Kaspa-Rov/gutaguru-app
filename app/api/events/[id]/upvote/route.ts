import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase = await createSupabaseServerClient()

  // Verify session — getUser() validates the JWT server-side
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('[upvote] auth error:', authError?.message ?? 'no session')
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Check for an existing upvote
  const { data: existing, error: selectError } = await supabase
    .from('upvotes')
    .select('id')
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .maybeSingle()

  if (selectError) {
    console.error('[upvote] select error:', selectError)
    return NextResponse.json({ error: selectError.message }, { status: 500 })
  }

  if (existing) {
    // ── REMOVE upvote ──────────────────────────────────────────
    const { error: deleteError } = await supabase
      .from('upvotes')
      .delete()
      .eq('id', existing.id)

    if (deleteError) {
      console.error('[upvote] delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }
    // Counter is decremented automatically by the DB trigger (sync_upvote_count)
  } else {
    // ── ADD upvote ─────────────────────────────────────────────
    const { error: insertError } = await supabase
      .from('upvotes')
      .insert({ user_id: user.id, event_id: eventId })

    if (insertError) {
      console.error('[upvote] insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    // Counter is incremented automatically by the DB trigger (sync_upvote_count)
  }

  // Return the authoritative count from the DB so the client can sync
  const { data: event, error: countError } = await supabase
    .from('events')
    .select('upvotes_count')
    .eq('id', eventId)
    .single()

  if (countError) {
    console.error('[upvote] count fetch error:', countError)
  }

  return NextResponse.json({
    upvoted: !existing,
    upvotes_count: event?.upvotes_count ?? null,
  })
}
