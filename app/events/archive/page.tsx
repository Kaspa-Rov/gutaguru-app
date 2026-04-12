import { fetchPastEvents } from '@/lib/events'
import ArchiveList from './ArchiveList'

export const dynamic = 'force-dynamic'

export default async function ArchivePage() {
  const events = await fetchPastEvents({ limit: 100 })

  return (
    <div>
      <div className="px-4 pt-3 pb-1">
        <h1 className="text-white font-black text-xl leading-tight">
          Archive
        </h1>
        <p className="text-zinc-500 text-xs mt-0.5">
          {events.length} past event{events.length !== 1 ? 's' : ''} · final stats only
        </p>
      </div>

      <ArchiveList events={events} />
    </div>
  )
}
