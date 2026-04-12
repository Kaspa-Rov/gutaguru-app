import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isAdmin } from '@/lib/roles'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id: claimId } = await params

  // Auth + role check
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !isAdmin(profile.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { action } = await request.json()
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
  }

  const db = createAdminClient()

  // Fetch the claim
  const { data: claim } = await db
    .from('venue_claims')
    .select('id, venue_id, claimant_user_id, status')
    .eq('id', claimId)
    .single()

  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
  if (claim.status !== 'pending') {
    return NextResponse.json({ error: 'Claim has already been reviewed' }, { status: 409 })
  }

  const now = new Date().toISOString()

  if (action === 'approve') {
    // 1. Mark this claim as approved
    // 2. Reject all other pending claims for the same venue (atomicity via service role)
    // 3. Update the venue: set owner, mark claimed + verified
    // 4. Promote the claimant to venue_manager role if they are currently below it
    const [claimUpdate, venueUpdate, roleUpdate] = await Promise.all([
      db
        .from('venue_claims')
        .update({ status: 'approved', reviewed_at: now, reviewed_by: user.id })
        .eq('id', claimId),
      db
        .from('venues')
        .update({
          owner_user_id: claim.claimant_user_id,
          is_claimed:    true,
          is_verified:   true,
        })
        .eq('id', claim.venue_id),
      // Only promote if role is below venue_manager
      db.rpc('promote_to_venue_manager_if_below', {
        target_user_id: claim.claimant_user_id,
      }),
    ])

    // Reject other pending claims for same venue
    await db
      .from('venue_claims')
      .update({ status: 'rejected', reviewed_at: now, reviewed_by: user.id })
      .eq('venue_id', claim.venue_id)
      .eq('status', 'pending')
      .neq('id', claimId)

    if (claimUpdate.error) {
      console.error('[admin/claims PATCH approve] claim update:', claimUpdate.error)
      return NextResponse.json({ error: claimUpdate.error.message }, { status: 500 })
    }
    if (venueUpdate.error) {
      console.error('[admin/claims PATCH approve] venue update:', venueUpdate.error)
      return NextResponse.json({ error: venueUpdate.error.message }, { status: 500 })
    }
    // Role promotion error is non-fatal — log but continue
    if (roleUpdate.error) {
      console.warn('[admin/claims PATCH approve] role promotion:', roleUpdate.error)
    }

    return NextResponse.json({ ok: true, action: 'approved' })
  }

  // Reject path
  const { error } = await db
    .from('venue_claims')
    .update({ status: 'rejected', reviewed_at: now, reviewed_by: user.id })
    .eq('id', claimId)

  if (error) {
    console.error('[admin/claims PATCH reject]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, action: 'rejected' })
}
