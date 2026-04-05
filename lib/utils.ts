import { clsx, type ClassValue } from 'clsx'
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatEventDate(dateString: string): string {
  const date = parseISO(dateString)

  if (isToday(date)) {
    return `Tonight ${format(date, 'h:mm a')}`
  }
  if (isTomorrow(date)) {
    return `Tomorrow ${format(date, 'h:mm a')}`
  }
  if (isThisWeek(date)) {
    return format(date, "EEE h:mm a")
  }
  return format(date, 'MMM d, h:mm a')
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Music: 'bg-purple-500',
    Food: 'bg-orange-500',
    Culture: 'bg-blue-500',
    Networking: 'bg-green-500',
    Sports: 'bg-red-500',
    Art: 'bg-pink-500',
  }
  return colors[category] ?? 'bg-gray-500'
}

/**
 * Leaderboard scoring weights.
 * Shares rank highest because each one is a distribution event that
 * brings new users to the platform — rewarding virality over passive interest.
 * Upvotes signal strong attendance intent; saves are a softer planning signal.
 *
 * Tune these values here; all leaderboard logic reads from this object.
 */
export const SCORE_WEIGHTS = {
  upvote: 3,
  save:   2,
  share:  4,
} as const

export function computeScore(upvotes: number, saves: number, shares = 0): number {
  return upvotes * SCORE_WEIGHTS.upvote
    + saves   * SCORE_WEIGHTS.save
    + shares  * SCORE_WEIGHTS.share
}

export function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    Music: '🎵',
    Food: '🍽️',
    Culture: '🎭',
    Networking: '🤝',
    Sports: '⚽',
    Art: '🎨',
  }
  return emojis[category] ?? '🎉'
}
