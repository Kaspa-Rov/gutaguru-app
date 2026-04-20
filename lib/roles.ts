/** All roles, from lowest to highest privilege. */
export const ROLES = [
  'subscriber',
  'contributor',
  'venue_manager',
  'organiser',
  'editor',
  'admin',
  'super_admin',
] as const

export type Role = (typeof ROLES)[number]

/** Numeric rank — higher number = more privilege. */
const ROLE_RANK: Record<Role, number> = {
  subscriber:    0,
  contributor:   1,
  venue_manager: 2,
  organiser:     3,
  editor:        4,
  admin:         5,
  super_admin:   6,
}

/**
 * Returns true if `userRole` meets the minimum `requiredRole`.
 * Use this everywhere — never compare role strings directly.
 */
export function hasRole(userRole: string, requiredRole: Role): boolean {
  return (ROLE_RANK[userRole as Role] ?? -1) >= ROLE_RANK[requiredRole]
}

/** Can access /admin dashboard. */
export function isAdmin(role: string): boolean {
  return hasRole(role, 'admin')
}

/** Can create/edit any event or venue. */
export function canManageContent(role: string): boolean {
  return hasRole(role, 'editor')
}

/** Can create/edit their own events. */
export function canManageOwnEvents(role: string): boolean {
  return hasRole(role, 'organiser')
}

/** Can edit their claimed venues. */
export function canManageVenues(role: string): boolean {
  return hasRole(role, 'venue_manager')
}

/**
 * External contributor — can access /dashboard.
 * Covers contributor, venue_manager, organiser, editor.
 * Deliberately excludes admin+ (they use /admin instead).
 */
export function isContributor(role: string): boolean {
  return hasRole(role, 'contributor') && !isAdmin(role)
}

/** Human-readable display labels. */
export const ROLE_LABEL: Record<Role, string> = {
  super_admin:   'Super Admin',
  admin:         'Admin',
  editor:        'Editor',
  organiser:     'Organiser',
  venue_manager: 'Venue Manager',
  contributor:   'Contributor',
  subscriber:    'Subscriber',
}

/**
 * Roles an admin is allowed to assign.
 * super_admin is excluded to prevent privilege escalation via the UI.
 * Only another super_admin can promote to super_admin (via SQL or Supabase dashboard).
 */
export const ASSIGNABLE_ROLES: Role[] = [
  'subscriber',
  'contributor',
  'venue_manager',
  'organiser',
  'editor',
  'admin',
]
