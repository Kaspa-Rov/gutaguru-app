'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Hard redirect — ensures the browser sends the newly-set session cookie
    // on the very next request. router.push() + router.refresh() can race;
    // window.location.href guarantees a fresh HTTP request with all cookies.
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-black flex flex-col px-6 pt-8 pb-20">
      <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-10">
        <ArrowLeft size={16} />
        Back
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">
          Welcome<br />back to <span className="text-amber-400">GutaGuru</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-2">Sign in to your account</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="relative">
          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-400 transition-colors"
          />
        </div>

        <div className="relative">
          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-11 pr-12 py-3.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-400 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-black py-4 rounded-2xl text-base transition-colors mt-2"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-zinc-400 text-sm mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" className="text-amber-400 font-semibold hover:text-amber-300">
          Sign Up
        </Link>
      </p>
    </div>
  )
}
