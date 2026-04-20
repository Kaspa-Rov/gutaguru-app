export type Category = 'Music' | 'Food' | 'Culture' | 'Networking' | 'Sports' | 'Art'

export type EventStatus = 'draft' | 'pending_review' | 'published' | 'rejected'

export interface Venue {
  id: string
  name: string
  address: string
  city: string
  // CMS fields (nullable — added via add-cms.sql)
  short_description?: string | null
  full_description?: string | null
  cover_image_url?: string | null
  amenities?: string[]
  payment_methods?: string[]
  created_by?: string | null
  owner_user_id?: string | null
  is_claimed?: boolean
  is_verified?: boolean
  created_at?: string
}

export interface Event {
  id: string
  title: string
  description: string
  // CMS fields
  short_description?: string | null
  full_description?: string | null
  status?: EventStatus
  created_by?: string | null
  // Core fields
  date_time: string
  location: string
  city: string
  category: Category
  image_url: string
  ticket_link: string | null
  venue_id: string | null
  upvotes_count: number
  saves_count: number
  share_count: number
  submitter_type?: string | null
  created_at?: string
  // Relations
  venues?: Venue | null
  average_rating?: number | null
  ratings_count?: number | null
  // Viewer-specific state (populated server-side when user is logged in)
  user_has_upvoted?: boolean
  user_has_saved?: boolean
  user_rating?: number | null
}

export interface UserEngagementState {
  upvotedIds: Set<string>
  savedIds: Set<string>
}

/** Event enriched with computed leaderboard score and rank */
export interface RankedEvent extends Event {
  score: number
  rank: number
}

export interface User {
  id: string
  email: string
}

export interface Upvote {
  id: string
  user_id: string
  event_id: string
}

export interface SavedEvent {
  id: string
  user_id: string
  event_id: string
}

export interface Rating {
  id: string
  user_id: string
  event_id: string
  rating: number
}

export interface PendingEvent extends Omit<Event, 'id' | 'upvotes_count' | 'saves_count' | 'status'> {
  id: string
  submitted_by: string
  status: 'pending' | 'approved' | 'rejected'
}
