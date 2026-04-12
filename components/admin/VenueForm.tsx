'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Venue } from '@/types'

const CITIES = ['Harare', 'Bulawayo']

const AMENITY_SUGGESTIONS = [
  'Wi-Fi', 'Parking', 'VIP Section', 'Outdoor Seating',
  'Dance Floor', 'Bar', 'Live Music', 'Air Conditioning', 'Security',
]
const PAYMENT_SUGGESTIONS = [
  'Cash', 'Visa/Mastercard', 'EcoCash', 'OneMoney', 'InnBucks',
]

interface VenueFormProps {
  venue?: Venue
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

function TagInput({
  tags, setTags, suggestions, placeholder,
}: {
  tags: string[]
  setTags: (tags: string[]) => void
  suggestions: string[]
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  const addTag = (val: string) => {
    const trimmed = val.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setInput('')
  }

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag))

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const unusedSuggestions = suggestions.filter(s => !tags.includes(s))

  return (
    <div className="space-y-2">
      <div className="min-h-[44px] flex flex-wrap gap-1.5 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 focus-within:border-amber-400 transition-colors">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 bg-zinc-700 text-white text-xs px-2 py-1 rounded-lg">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="text-zinc-400 hover:text-white leading-none">&times;</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input.trim()) addTag(input) }}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-24 bg-transparent text-white text-sm placeholder-zinc-500 outline-none"
        />
      </div>
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unusedSuggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setTags([...tags, s])}
              className="text-xs px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function VenueForm({ venue }: VenueFormProps) {
  const router = useRouter()
  const isEdit = !!venue?.id

  const [name,         setName]         = useState(venue?.name ?? '')
  const [shortDesc,    setShortDesc]    = useState(venue?.short_description ?? '')
  const [fullDesc,     setFullDesc]     = useState(venue?.full_description ?? '')
  const [address,      setAddress]      = useState(venue?.address ?? '')
  const [city,         setCity]         = useState(venue?.city ?? 'Harare')
  const [coverUrl,     setCoverUrl]     = useState(venue?.cover_image_url ?? '')
  const [amenities,    setAmenities]    = useState<string[]>(venue?.amenities ?? [])
  const [payments,     setPayments]     = useState<string[]>(venue?.payment_methods ?? [])

  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload = {
      name, short_description: shortDesc, full_description: fullDesc,
      address, city, cover_image_url: coverUrl,
      amenities, payment_methods: payments,
    }

    const url    = isEdit ? `/api/admin/venues/${venue.id}` : '/api/admin/venues'
    const method = isEdit ? 'PATCH' : 'POST'

    try {
      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
      router.push('/admin/venues')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!isEdit) return
    if (!confirm('Permanently delete this venue? This cannot be undone.')) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/venues/${venue.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); setError(d.error); return }
      router.push('/admin/venues')
      router.refresh()
    } catch { setError('Delete failed.') }
    finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Name */}
      <Field label="Venue Name" required>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          placeholder="e.g. Harare International Conference Centre"
          className={inputCls}
        />
      </Field>

      {/* Short description */}
      <Field label="Short Description" hint="Shown on venue cards and previews.">
        <div className="relative">
          <textarea
            value={shortDesc}
            onChange={e => setShortDesc(e.target.value)}
            maxLength={220}
            rows={2}
            placeholder="One-line hook for the venue…"
            className={textareaCls}
          />
          <div className="absolute right-3 bottom-2">
            <CharCount value={shortDesc} max={220} />
          </div>
        </div>
      </Field>

      {/* Full description */}
      <Field label="Full Description" hint="Shown on the venue detail page.">
        <div className="relative">
          <textarea
            value={fullDesc}
            onChange={e => setFullDesc(e.target.value)}
            maxLength={1000}
            rows={5}
            placeholder="Everything guests need to know about this venue…"
            className={textareaCls}
          />
          <div className="absolute right-3 bottom-2">
            <CharCount value={fullDesc} max={1000} />
          </div>
        </div>
      </Field>

      {/* Address + City row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Address">
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="e.g. Corner Samora Machel Ave & Jason Moyo"
            className={inputCls}
          />
        </Field>

        <Field label="City" required>
          <select value={city} onChange={e => setCity(e.target.value)} className={inputCls}>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      {/* Cover image URL */}
      <Field label="Cover Image URL" hint="Paste a direct image URL (Unsplash, Cloudinary, etc.).">
        <input
          type="url"
          value={coverUrl}
          onChange={e => setCoverUrl(e.target.value)}
          placeholder="https://images.unsplash.com/…"
          className={inputCls}
        />
        {coverUrl && (
          <img
            src={coverUrl}
            alt="Preview"
            className="mt-2 rounded-xl h-32 w-full object-cover border border-zinc-700"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
      </Field>

      {/* Amenities */}
      <Field label="Amenities" hint="Type and press Enter, or click a suggestion to add.">
        <TagInput
          tags={amenities}
          setTags={setAmenities}
          suggestions={AMENITY_SUGGESTIONS}
          placeholder="e.g. Wi-Fi, Parking…"
        />
      </Field>

      {/* Payment methods */}
      <Field label="Payment Methods" hint="Accepted payment options at this venue.">
        <TagInput
          tags={payments}
          setTags={setPayments}
          suggestions={PAYMENT_SUGGESTIONS}
          placeholder="e.g. Cash, EcoCash…"
        />
      </Field>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-amber-400 hover:bg-amber-300 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Venue'}
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
