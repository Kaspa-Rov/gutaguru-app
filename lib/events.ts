import { createSupabaseServerClient } from './supabase-server'
import type { Event } from '@/types'

function computeAverageRating(ratings: { rating: number }[]): number | null {
  if (!ratings.length) return null
  return ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
}

/** Fetch upcoming events with venue + avg rating */
export async function fetchEvents(options: {
  limit?: number
  orderBy?: 'upvotes_count' | 'date_time'
}): Promise<Event[]> {
  const { limit = 50, orderBy = 'upvotes_count' } = options
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('events')
    .select('*, venues (id, name, address, city), ratings (rating)')
    .gte('date_time', new Date().toISOString())
    .order(orderBy, { ascending: orderBy === 'date_time' })
    .limit(limit)

  if (error || !data) return []

  return data.map((event: any) => ({
    ...event,
    average_rating: computeAverageRating(event.ratings ?? []),
    ratings_count: (event.ratings ?? []).length,
    ratings: undefined,
  }))
}

/** Fetch the current user's upvoted and saved event IDs (empty arrays if not logged in) */
export async function fetchUserEngagement(): Promise<{
  upvotedIds: string[]
  savedIds: string[]
}> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { upvotedIds: [], savedIds: [] }

  const [{ data: upvotes }, { data: saves }] = await Promise.all([
    supabase.from('upvotes').select('event_id').eq('user_id', user.id),
    supabase.from('saved_events').select('event_id').eq('user_id', user.id),
  ])

  return {
    upvotedIds: (upvotes ?? []).map((r: any) => r.event_id),
    savedIds: (saves ?? []).map((r: any) => r.event_id),
  }
}
