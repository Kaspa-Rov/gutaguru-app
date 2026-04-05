'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Search, MapPin, User, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Check initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
    })

    // Stay in sync with auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <nav className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-zinc-800">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-xl font-black text-white tracking-tight">
            Guta<span className="text-amber-400">Guru</span>
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        </Link>

        {/* Location pill */}
        <button className="flex items-center gap-1 text-zinc-400 text-xs">
          <MapPin size={12} />
          <span>Harare</span>
        </button>

        {/* Right icons */}
        <div className="flex items-center gap-3">
          <button className="text-zinc-400 hover:text-white transition-colors" aria-label="Search">
            <Search size={18} />
          </button>

          {isLoggedIn ? (
            <Link
              href="/profile"
              className="text-amber-400 hover:text-amber-300 transition-colors"
              aria-label="Profile"
            >
              <User size={18} />
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="text-zinc-400 hover:text-white transition-colors"
              aria-label="Sign in"
            >
              <LogIn size={18} />
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
