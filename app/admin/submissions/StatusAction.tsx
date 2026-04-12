'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  eventId: string
  targetStatus: 'published' | 'rejected'
  label: string
  variant: 'approve' | 'reject'
}

export default function StatusAction({ eventId, targetStatus, label, variant }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const cls = variant === 'approve'
    ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20'
    : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ${cls}`}
    >
      {loading ? '…' : label}
    </button>
  )
}
