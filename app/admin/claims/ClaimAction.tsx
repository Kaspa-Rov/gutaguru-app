'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'

interface Props {
  claimId: string
}

export default function ClaimAction({ claimId }: Props) {
  const router  = useRouter()
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)
  const [err,  setErr]  = useState<string | null>(null)

  const act = async (action: 'approve' | 'reject') => {
    setBusy(action)
    setErr(null)
    try {
      const res  = await fetch(`/api/admin/claims/${claimId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Something went wrong'); return }
      setDone(data.action)
      router.refresh()
    } catch {
      setErr('Network error')
    } finally {
      setBusy(null)
    }
  }

  if (done === 'approved') {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-green-400">
        <CheckCircle size={13} /> Approved
      </span>
    )
  }
  if (done === 'rejected') {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
        <XCircle size={13} /> Rejected
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => act('approve')}
          disabled={busy !== null}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 transition-colors disabled:opacity-50"
        >
          <CheckCircle size={12} />
          {busy === 'approve' ? '…' : 'Approve'}
        </button>
        <button
          onClick={() => act('reject')}
          disabled={busy !== null}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors disabled:opacity-50"
        >
          <XCircle size={12} />
          {busy === 'reject' ? '…' : 'Reject'}
        </button>
      </div>
      {err && <p className="text-red-400 text-[10px]">{err}</p>}
    </div>
  )
}
