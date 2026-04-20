import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Bookmark, ThumbsUp, Settings, Zap, ChevronRight, Star, Share2, Gift, LayoutDashboard, PlusCircle, ShieldCheck } from 'lucide-react'
import { isAdmin, isContributor } from '@/lib/roles'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch stats + profile in parallel
  const [
    { count: savedCount },
    { count: upvoteCount },
    { data: pointsRow },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from('saved_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('upvotes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('user_points')
      .select('total')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('role, display_name')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  const role = profile?.role ?? 'subscriber'

  const emailName = user.email?.split('@')[0] ?? 'User'
  const totalPoints = pointsRow?.total ?? 0

  // Determine tier label purely by points — purely internal MVP logic, not shown as a number anywhere
  const tier =
    totalPoints >= 500 ? { label: 'VIP',      color: 'text-purple-400',  ring: 'ring-purple-400'  } :
    totalPoints >= 200 ? { label: 'Insider',   color: 'text-amber-300',   ring: 'ring-amber-300'   } :
    totalPoints >= 50  ? { label: 'Regular',   color: 'text-amber-400',   ring: 'ring-amber-400'   } :
                         { label: 'Explorer',  color: 'text-zinc-400',    ring: 'ring-zinc-600'    }

  return (
    <div className="py-6 px-4 space-y-6 pb-28">

      {/* ── Avatar + name ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <div className={`w-20 h-20 rounded-full bg-amber-400 flex items-center justify-center text-black text-3xl font-black ring-4 ${tier.ring}`}>
          {emailName[0].toUpperCase()}
        </div>
        <div className="text-center">
          <h1 className="text-white font-black text-xl">{emailName}</h1>
          <p className="text-zinc-400 text-sm">{user.email}</p>
          <span className={`text-xs font-bold mt-1 inline-block ${tier.color}`}>
            {tier.label}
          </span>
        </div>
      </div>

      {/* ── Points hero ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent rounded-2xl border border-amber-400/30 p-5">
        {/* Decorative glow */}
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-widest mb-1">
              Your Points
            </p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black text-white tabular-nums">
                {totalPoints.toLocaleString()}
              </span>
              <Zap size={22} className="text-amber-400 mb-2 fill-amber-400" />
            </div>
            <p className="text-zinc-500 text-xs mt-1">
              Earned through shares, upvotes, ratings &amp; more
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 rounded-2xl p-4 text-center border border-zinc-800">
          <div className="flex justify-center mb-2">
            <Bookmark size={20} className="text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{savedCount ?? 0}</p>
          <p className="text-zinc-400 text-xs mt-1">Saved Events</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-4 text-center border border-zinc-800">
          <div className="flex justify-center mb-2">
            <ThumbsUp size={20} className="text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">{upvoteCount ?? 0}</p>
          <p className="text-zinc-400 text-xs mt-1">Interested In</p>
        </div>
      </div>

      {/* ── How to earn points ────────────────────────────────────────────── */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-white font-bold text-sm">How to earn points</p>
        </div>
        <div className="divide-y divide-zinc-800">
          {[
            { icon: Share2, label: 'Share an event',            pts: '+10', color: 'text-green-400'  },
            { icon: Star,   label: 'Rate an event you attended', pts: '+5',  color: 'text-purple-400' },
            { icon: ThumbsUp, label: "Mark yourself as Interested", pts: '+3', color: 'text-amber-400' },
            { icon: Bookmark, label: 'Save an event',           pts: '+2',  color: 'text-blue-400'   },
          ].map(({ icon: Icon, label, pts, color }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Icon size={16} className={color} />
                <span className="text-zinc-300 text-sm">{label}</span>
              </div>
              <span className={`text-sm font-bold ${color}`}>{pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Rewards teaser ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
        <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Gift size={18} className="text-purple-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Rewards · Coming Soon</p>
            <p className="text-zinc-400 text-xs mt-0.5">
              Your points are stacking up. Keep going.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {[
            { emoji: '🎟️', label: 'Discounted tickets to top events'         },
            { emoji: '👑', label: 'VIP access & priority entry'              },
            { emoji: '🎁', label: 'Exclusive experiences for top earners'    },
            { emoji: '🤝', label: 'Referral bonuses when friends join'       },
          ].map(({ emoji, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-base">{emoji}</span>
              <span className="text-zinc-300 text-sm">{label}</span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          Active users will be first to unlock rewards when the programme launches.
        </p>
      </div>

      {/* ── Role-aware CTAs ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        {isAdmin(role) && (
          <Link
            href="/admin"
            className="flex items-center gap-3 bg-amber-400/10 rounded-xl px-4 py-3.5 border border-amber-400/30 hover:border-amber-400/60 transition-colors"
          >
            <ShieldCheck size={18} className="text-amber-400" />
            <span className="text-amber-300 text-sm font-bold flex-1">Admin Dashboard</span>
            <ChevronRight size={16} className="text-amber-500/60" />
          </Link>
        )}

        {isContributor(role) && (
          <Link
            href="/dashboard"
            className="flex items-center gap-3 bg-amber-400/10 rounded-xl px-4 py-3.5 border border-amber-400/30 hover:border-amber-400/60 transition-colors"
          >
            <LayoutDashboard size={18} className="text-amber-400" />
            <span className="text-amber-300 text-sm font-bold flex-1">My Dashboard</span>
            <ChevronRight size={16} className="text-amber-500/60" />
          </Link>
        )}

        <Link
          href="/submit"
          className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3.5 border border-zinc-700 hover:border-amber-400/50 transition-colors"
        >
          <PlusCircle size={18} className="text-green-400" />
          <span className="text-white text-sm font-medium flex-1">Submit an Event</span>
          <ChevronRight size={16} className="text-zinc-600" />
        </Link>
      </div>

      {/* ── Menu ──────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Link
          href="/saved"
          className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3.5 border border-zinc-800 hover:border-zinc-600 transition-colors"
        >
          <Bookmark size={18} className="text-amber-400" />
          <span className="text-white text-sm font-medium flex-1">Saved Events</span>
          <ChevronRight size={16} className="text-zinc-600" />
        </Link>

        <div className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3.5 border border-zinc-800 opacity-50 cursor-not-allowed">
          <Settings size={18} className="text-zinc-400" />
          <span className="text-zinc-400 text-sm font-medium">Settings (coming soon)</span>
        </div>

        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3.5 border border-zinc-800 hover:border-red-500/50 hover:text-red-400 transition-colors text-zinc-300"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </form>
      </div>
    </div>
  )
}
