import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id: venueId } = await params

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const db = createAdminClient()

  // Verify venue exists and is not already claimed
  const { data: venue } = await db
    .from('venues')
    .select('id, is_claimed, owner_user_id')
    .eq('id', venueId)
    .single()

  if (!venue) return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
  if (venue.is_claimed) {
    return NextResponse.json({ error: 'This venue has already been claimed' }, { status: 409 })
  }

  // Check this user hasn't already submitted a claim for this venue
  const { data: existingClaim } = await db
    .from('venue_claims')
    .select('id, status')
    .eq('venue_id', venueId)
    .eq('claimant_user_id', user.id)
    .maybeSingle()

  if (existingClaim) {
    const msg =
      existingClaim.status === 'pending'
        ? 'You already have a pending claim for this venue'
        : existingClaim.status === 'approved'
        ? 'Your claim for this venue was already approved'
        : 'Your previous claim was rejected. Contact support if you believe this is an error.'
    return NextResponse.json({ error: msg }, { status: 409 })
  }

  const body = await request.json()
  const evidence_note = (body.evidence_note ?? '').trim()
  if (!evidence_note) {
    return NextResponse.json({ error: 'Please provide evidence that you own this venue' }, { status: 400 })
  }
  if (evidence_note.length > 1000) {
    return NextResponse.json({ error: 'Evidence note must be under 1000 characters' }, { status: 400 })
  }

  const { data, error } = await db
    .from('venue_claims')
    .insert({
      venue_id:         venueId,
      claimant_user_id: user.id,
      evidence_note,
      status:           'pending',
    })
    .select('id, status, submitted_at')
    .single()

  if (error) {
    // Partial-unique-index violation = another pending claim already exists
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Another claim for this venue is already under review' },
        { status: 409 }
      )
    }
    console.error('[api/venues/claim POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
