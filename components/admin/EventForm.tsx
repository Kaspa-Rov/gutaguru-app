'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Category, Event, EventStatus, Venue } from '@/types'

const CITIES    = ['Harare', 'Bulawayo']
const CATEGORIES = ['Music', 'Food', 'Culture', 'Networking', 'Sports', 'Art'] as const
const STATUSES: { value: EventStatus; label: string }[] = [
  { value: 'published',     label: 'Published'     },
  { value: 'pending_review',label: 'Pending Review' },
  { value: 'draft',         label: 'Draft'          },
  { value: 'rejected',      label: 'Rejected'       },
]

interface EventFormProps {
  event?: Event
  venues: Pick<Venue, 'id' | 'name' | 'city'>[]
  canSetStatus: boolean   // true for editor+
}

function CharCount({ value, max }: { value: string; max: number }) {
  const remaining = max - value.length
  return (
    <span className={`text-xs tabular-nums ${remaining < 20 ? 'text-amber-400' : 'text-zinc-500'}`}>
      {remaining}
    </span>
  )
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-zinc-600 text-xs mt-1">{hint}</p>}
    </div>
  )
}

const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors'
const textareaCls = inputCls + ' resize-none'

// Convert a DB datetime string to the value format for <input type="datetime-local">
function toDatetimeLocal(str?: string | null): string {
  if (!str) return ''
  try { return new Date(str).toISOString().slice(0, 16) } catch { return '' }
}

export default function EventForm({ event, venues, canSetStatus }: EventFormProps) {
  const router = useRouter()
  const isEdit = !!event?.id

  const [title,            setTitle]            = useState(event?.title ?? '')
  const [shortDesc,        setShortDesc]        = useState(event?.short_description ?? '')
  const [fullDesc,         setFullDesc]         = useState(event?.full_description ?? '')
  const [dateTime,         setDateTime]         = useState(toDatetimeLocal(event?.date_time))
  const [location,         setLocation]         = useState(event?.location ?? '')
  const [city,             setCity]             = useState(event?.city ?? 'Harare')
  const [category,         setCategory]         = useState<Category>(event?.category ?? 'Music')
  const [imageUrl,         setImageUrl]         = useState(event?.image_url ?? '')
  const [ticketLink,       setTicketLink]       = useState(event?.ticket_link ?? '')
  const [venueId,          setVenueId]          = useState(event?.venue_id ?? '')
  const [status,           setStatus]           = useState<EventStatus>(event?.status ?? 'published')

  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload = {
      title, short_description: shortDesc, full_description: fullDesc,
      date_time: dateTime, location, city, category, image_url: imageUrl,
      ticket_link: ticketLink, venue_id: venueId || null,
      ...(canSetStatus ? { status } : {}),
    }

    const url    = isEdit ? `/api/admin/events/${event.id}` : '/api/admin/events'
    const method = isEdit ? 'PATCH' : 'POST'

    try {
      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
      router.push('/admin/events')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!isEdit) return
    if (!confirm('Permanently delete this event? This cannot be undone.')) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); setError(d.error); return }
      router.push('/admin/events')
      router.refresh()
    } catch { setError('Delete failed.') }
    finally { setSubmitting(false) }
  }

  // Group venues by city for the dropdown
  const venuesByCity = venues.reduce<Record<string, typeof venues>>((acc, v) => {
    acc[v.city] = [...(acc[v.city] ?? []), v]
    return acc
  }, {})

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <Field label="Title" required>
        <div className="relative">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={80}
            required
            placeholder="Event title"
            className={inputCls}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CharCount value={title} max={80} />
          </div>
        </div>
      </Field>

      {/* Short description */}
      <Field label="Short Description" hint="Shown on event cards and previews.">
        <div className="relative">
          <textarea
            value={shortDesc}
            onChange={e => setShortDesc(e.target.value)}
            maxLength={220}
            rows={2}
            placeholder="One-line hook for the event…"
            className={textareaCls}
          />
          <div className="absolute right-3 bottom-2">
            <CharCount value={shortDesc} max={220} />
          </div>
        </div>
      </Field>

      {/* Full description */}
      <Field label="Full Description" hint="Shown on the event detail page.">
        <div className="relative">
          <textarea
            value={fullDesc}
            onChange={e => setFullDesc(e.target.value)}
            maxLength={1000}
            rows={5}
            placeholder="Everything attendees need to know…"
            className={textareaCls}
          />
          <div className="absolute right-3 bottom-2">
            <CharCount value={fullDesc} max={1000} />
          </div>
        </div>
      </Field>

      {/* Date + City row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Date & Time" required>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={e => setDateTime(e.target.value)}
            required
            className={inputCls}
          />
        </Field>

        <Field label="City" required>
          <select value={city} onChange={e => setCity(e.target.value)} className={inputCls}>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      {/* Category + Status row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Category" required>
          <select value={category} onChange={e => setCategory(e.target.value as Category)} className={inputCls}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        {canSetStatus && (
          <Field label="Status">
            <select value={status} onChange={e => setStatus(e.target.value as EventStatus)} className={inputCls}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        )}
      </div>

      {/* Venue */}
      <Field label="Venue" hint="Link this event to an existing venue. Create the venue first if needed.">
        <select value={venueId} onChange={e => setVenueId(e.target.value)} className={inputCls}>
          <option value="">— No venue —</option>
          {Object.entries(venuesByCity).map(([c, vs]) => (
            <optgroup key={c} label={c}>
              {vs.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </optgroup>
          ))}
        </select>
      </Field>

      {/* Location */}
      <Field label="Location / Address" hint="Free-text address or map pin description.">
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="e.g. Corner Samora Machel Ave & Julius Nyerere Way"
          className={inputCls}
        />
      </Field>

      {/* Image URL */}
      <Field label="Cover Image URL" hint="Paste a direct image URL (Unsplash, Cloudinary, etc.).">
        <input
          type="url"
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
          placeholder="https://images.unsplash.com/…"
          className={inputCls}
        />
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Preview"
            className="mt-2 rounded-xl h-32 w-full object-cover border border-zinc-700"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
      </Field>

      {/* Ticket link */}
      <Field label="Ticket Link">
        <input
          type="url"
          value={ticketLink}
          onChange={e => setTicketLink(e.target.value)}
          placeholder="https://…"
          className={inputCls}
        />
      </Field>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-amber-400 hover:bg-amber-300 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Event'}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors text-sm"
        >
          Cancel
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl transition-colors text-sm border border-red-500/20"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
