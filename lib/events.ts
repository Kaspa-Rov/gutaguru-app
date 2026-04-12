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

export interface VenueSearchResult {
  id: string
  name: string
  city: string
  address: string | null
  short_description: string | null
  full_description: string | null
  amenities: string[]
  payment_methods: string[]
  /** All events at this venue — used to compute upcoming/past counts client-side */
  events: { id: string; date_time: string }[]
}

/** Fetch all venues with the fields needed for client-side search and venue cards */
export async function fetchVenuesForSearch(): Promise<VenueSearchResult[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('venues')
    .select('id, name, city, address, short_description, full_description, amenities, payment_methods, events(id, date_time)')
    .order('name')
  return (data ?? []) as any
}

/** Fetch past events (date_time strictly before now), most recent first */
export async function fetchPastEvents(options: {
  limit?: number
} = {}): Promise<Event[]> {
  const { limit = 100 } = options
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('events')
    .select('*, venues (id, name, address, city), ratings (rating)')
    .lt('date_time', new Date().toISOString())
    .order('date_time', { ascending: false })
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
