import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase = await createSupabaseServerClient()

  // Auth is optional — guests can share too (user_id will be null)
  const { data: { user } } = await supabase.auth.getUser()

  const { error: insertError } = await supabase
    .from('shares')
    .insert({ event_id: eventId, user_id: user?.id ?? null })

  if (insertError) {
    console.error('[share] insert error:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Return authoritative count
  const { data: event, error: countError } = await supabase
    .from('events')
    .select('share_count')
    .eq('id', eventId)
    .single()

  if (countError) {
    console.error('[share] count fetch error:', countError)
  }

  return NextResponse.json({ share_count: event?.share_count ?? null })
}
