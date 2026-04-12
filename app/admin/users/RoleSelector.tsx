'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ASSIGNABLE_ROLES, ROLE_LABEL, type Role } from '@/lib/roles'

interface RoleSelectorProps {
  userId: string
  currentRole: Role
  isSelf: boolean
}

export default function RoleSelector({ userId, currentRole, isSelf }: RoleSelectorProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as Role
    if (newRole === currentRole) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to update role')
        e.target.value = currentRole // reset select
        return
      }

      router.refresh()
    } catch {
      setError('Network error')
      e.target.value = currentRole
    } finally {
      setLoading(false)
    }
  }

  // Prevent admins from changing their own role (prevents accidental lockout)
  if (isSelf) {
    return (
      <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-lg">
        {ROLE_LABEL[currentRole]}
      </span>
    )
  }

  // super_admin roles are displayed but cannot be changed via the UI
  if (currentRole === 'super_admin') {
    return (
      <span className="text-xs text-purple-400 font-semibold">
        {ROLE_LABEL[currentRole]}
      </span>
    )
  }

  return (
    <div>
      <select
        defaultValue={currentRole}
        onChange={handleChange}
        disabled={loading}
        className="text-xs bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400 disabled:opacity-50 cursor-pointer"
      >
        {ASSIGNABLE_ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABEL[role]}
          </option>
        ))}
      </select>
      {error && <p className="text-red-400 text-[10px] mt-1 text-right">{error}</p>}
    </div>
  )
}
