'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors"
    >
      <ArrowLeft size={15} />
      Back
    </button>
  )
}
