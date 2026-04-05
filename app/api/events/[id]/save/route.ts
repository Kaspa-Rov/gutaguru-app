import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('[save] auth error:', authError?.message ?? 'no session')
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Check for an existing save
  const { data: existing, error: selectError } = await supabase
    .from('saved_events')
    .select('id')
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .maybeSingle()

  if (selectError) {
    console.error('[save] select error:', selectError)
    return NextResponse.json({ error: selectError.message }, { status: 500 })
  }

  if (existing) {
    // ── UNSAVE ─────────────────────────────────────────────────
    const { error: deleteError } = await supabase
      .from('saved_events')
      .delete()
      .eq('id', existing.id)

    if (deleteError) {
      console.error('[save] delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }
    // Counter decremented by DB trigger (sync_save_count)
  } else {
    // ── SAVE ───────────────────────────────────────────────────
    const { error: insertError } = await supabase
      .from('saved_events')
      .insert({ user_id: user.id, event_id: eventId })

    if (insertError) {
      console.error('[save] insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    // Counter incremented by DB trigger (sync_save_count)
  }

  // Return authoritative count
  const { data: event, error: countError } = await supabase
    .from('events')
    .select('saves_count')
    .eq('id', eventId)
    .single()

  if (countError) {
    console.error('[save] count fetch error:', countError)
  }

  return NextResponse.json({
    saved: !existing,
    saves_count: event?.saves_count ?? null,
  })
}
