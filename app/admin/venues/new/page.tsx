import VenueForm from '@/components/admin/VenueForm'

export const dynamic = 'force-dynamic'

export default function NewVenuePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">New Venue</h1>
        <p className="text-zinc-400 text-sm mt-1">Fill in the details below to create a new venue.</p>
      </div>
      <VenueForm />
    </div>
  )
}
