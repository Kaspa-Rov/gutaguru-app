'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Link2, X } from 'lucide-react'
import type { Category, Event, EventStatus, Venue } from '@/types'

const CITIES    = ['Harare', 'Bulawayo']
const CATEGORIES = ['Music', 'Food', 'Culture', 'Networking', 'Sports', 'Art'] as const
const STATUSES: { value: EventStatus; label: string }[] = [
  { value: 'published',     label: 'Published'     },
  { value: 'pending_review',label: 'Pending Review' },
  { value: 'draft',         label: 'Draft'          },
  { value: 'rejected',      label: 'Rejected'       },
]
const SUBMITTER_TYPES = ['Event Organiser', 'Venue Manager', 'Contributor / Supporter'] as const

interface EventFormProps {
  event?: Event
  venues: Pick<Venue, 'id' | 'name' | 'city'>[]
  canSetStatus: boolean   // true for editor+
  /** When false: hides admin-only controls, shows submitter type, redirects to /dashboard on save */
  isAdminView?: boolean
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

export default function EventForm({ event, venues, canSetStatus, isAdminView = true }: EventFormProps) {
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
  const [submitterType,    setSubmitterType]    = useState(event?.submitter_type ?? SUBMITTER_TYPES[0])

  // Image input mode: 'url' (paste) or 'upload' (device file)
  const [imageMode,    setImageMode]    = useState<'url' | 'upload'>('url')
  const [uploading,    setUploading]    = useState(false)
  const [uploadError,  setUploadError]  = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      ...(!isAdminView ? { submitter_type: submitterType } : {}),
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
      router.push(isAdminView ? '/admin/events' : '/dashboard')
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res  = await fetch('/api/admin/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setUploadError(data.error ?? 'Upload failed'); return }
      setImageUrl(data.url)
    } catch {
      setUploadError('Network error. Please try again.')
    } finally {
      setUploading(false)
      // Reset so the same file can be re-selected after clearing
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
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

      {/* Category + Status / Submitter type row */}
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

        {!isAdminView && (
          <Field label="Submitting as" hint="Helps us review your submission appropriately.">
            <select value={submitterType} onChange={e => setSubmitterType(e.target.value)} className={inputCls}>
              {SUBMITTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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

      {/* Cover Image — toggle between upload and URL paste */}
      <Field label="Cover Image">
        {/* Mode toggle */}
        <div className="flex rounded-xl overflow-hidden border border-zinc-700 mb-2 w-fit">
          <button
            type="button"
            onClick={() => { setImageMode('upload'); setUploadError(null) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${imageMode === 'upload' ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
          >
            <Upload size={12} /> Upload
          </button>
          <button
            type="button"
            onClick={() => { setImageMode('url'); setUploadError(null) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${imageMode === 'url' ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
          >
            <Link2 size={12} /> Paste URL
          </button>
        </div>

        {imageMode === 'url' ? (
          <input
            type="url"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="https://images.unsplash.com/…"
            className={inputCls}
          />
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
              id="event-image-upload"
            />
            <label
              htmlFor="event-image-upload"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-amber-400 hover:text-white'}`}
            >
              <Upload size={14} />
              {uploading ? 'Uploading…' : 'Choose image'}
            </label>
            <span className="text-zinc-600 text-xs">JPEG, PNG, WebP, GIF · max 5 MB</span>
          </div>
        )}

        {uploadError && (
          <p className="text-red-400 text-xs mt-1">{uploadError}</p>
        )}

        {/* Preview + clear — shown for both modes once a URL is set */}
        {imageUrl && (
          <div className="relative mt-2">
            <img
              src={imageUrl}
              alt="Preview"
              className="rounded-xl h-32 w-full object-cover border border-zinc-700"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <button
              type="button"
              onClick={() => setImageUrl('')}
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Remove image"
            >
              <X size={12} />
            </button>
          </div>
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

        {isEdit && isAdminView && (
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
