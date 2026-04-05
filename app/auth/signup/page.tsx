'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-black text-white mb-2">You&apos;re in!</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Check your email to confirm your account, then sign in.
        </p>
        <Link
          href="/auth/login"
          className="bg-amber-400 text-black font-black px-6 py-3 rounded-2xl"
        >
          Go to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col px-6 pt-8 pb-20">
      <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-10">
        <ArrowLeft size={16} />
        Back
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">
          Join<br /><span className="text-amber-400">GutaGuru</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-2">
          Discover Zimbabwe&apos;s best events
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
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
            placeholder="Password (min 6 characters)"
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

        <div className="relative">
          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-400 transition-colors"
          />
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
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-zinc-400 text-sm mt-6">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-amber-400 font-semibold hover:text-amber-300">
          Sign In
        </Link>
      </p>
    </div>
  )
}
