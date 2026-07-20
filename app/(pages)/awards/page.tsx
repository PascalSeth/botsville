"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
  Trophy, Shield, Sword, Zap, Crosshair, HeartHandshake,
  Vote, CheckCircle2, Loader2, ChevronDown, Star, Users,
  Sparkles, Flame, Medal, ArrowRight, Info
} from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

// ─── Types ───────────────────────────────────────────────────
type Team = { id: string; name: string; tag: string; logo?: string; color?: string }

type Nominee = {
  id: string
  ign: string
  realName?: string
  role: string
  signatureHero?: string
  photo?: string
  kda: number
  winRate: number
  mvpCount: number
  matchesPlayed: number
  team: Team
  votes: number
  votedByMe: boolean
}

type Season = { id: string; name: string; status: string }
type Grouped = Record<string, Nominee[]>

// ─── Role Metadata ───────────────────────────────────────────
const ROLES = [
  { key: "EXP",       label: "EXP Lane",  award: "KING OF EXP LANE",   icon: Shield,       color: "#e8a000", bgGlow: "rgba(232, 160, 0, 0.15)" },
  { key: "JUNGLE",    label: "Jungle",    award: "KING OF THE JUNGLE",  icon: Sword,        color: "#ef4444", bgGlow: "rgba(239, 68, 68, 0.15)" },
  { key: "MID",       label: "Mid Lane",  award: "MAGE OF THE SEASON",  icon: Zap,          color: "#a855f7", bgGlow: "rgba(168, 85, 247, 0.15)" },
  { key: "GOLD",      label: "Gold Lane", award: "MARKSMAN OF SEASON",  icon: Crosshair,    color: "#10b981", bgGlow: "rgba(16, 185, 129, 0.15)" },
  { key: "ROAM",      label: "Roam",      award: "BEST ROAMER",         icon: HeartHandshake, color: "#06b6d4", bgGlow: "rgba(6, 182, 212, 0.15)" },
]

const roleOf = (key: string) => ROLES.find((r) => r.key === key) ?? ROLES[0]

// ─── Sleek Nominee Card ──────────────────────────────────────
function NomineeCard({
  nominee,
  rank,
  roleColor,
  totalVotes,
  onVote,
  disabled,
  isPending,
}: {
  nominee: Nominee
  rank: number
  roleColor: string
  totalVotes: number
  onVote: (id: string) => void
  disabled: boolean
  isPending: boolean
}) {
  const votePct = totalVotes > 0 ? Math.round((nominee.votes / totalVotes) * 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className={`relative flex flex-col bg-gradient-to-b from-[#11111a] to-[#0a0a0f] border rounded-2xl overflow-hidden transition-all duration-300 shadow-xl group
        ${nominee.votedByMe
          ? "border-amber-400/60 shadow-[0_0_20px_rgba(232,160,0,0.15)]"
          : "border-white/10 hover:border-white/20"
        }`}
    >
      {/* Voted Top Glow Bar */}
      {nominee.votedByMe && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 z-20" />
      )}

      {/* Rank Badge Header */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
        <span 
          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black font-mono shadow-lg border backdrop-blur-md ${
            rank === 1
              ? "bg-amber-500 text-black border-amber-300"
              : rank === 2
              ? "bg-slate-300 text-black border-white"
              : rank === 3
              ? "bg-amber-800 text-amber-200 border-amber-600"
              : "bg-black/70 text-zinc-400 border-white/10"
          }`}
        >
          {rank === 1 ? "👑" : `#${rank}`}
        </span>

        {nominee.team && (
          <span className="px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-wider text-zinc-300">
            {nominee.team.name}
          </span>
        )}
      </div>

      {/* Portrait */}
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-[#0a0a10]">
        {nominee.photo ? (
          <Image
            src={nominee.photo}
            alt={nominee.ign}
            fill
            className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d14]">
            <Users size={44} style={{ color: roleColor, opacity: 0.2 }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />

        {/* Live Vote Badge - Top Right */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/10">
          <Trophy size={11} style={{ color: roleColor }} />
          <span className="text-white text-xs font-black tabular-nums">{nominee.votes}</span>
        </div>

        {/* Signature Hero Overlay */}
        {nominee.signatureHero && (
          <div className="absolute bottom-2 left-3 right-3 z-10">
            <span 
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md border"
              style={{ background: `${roleColor}20`, borderColor: `${roleColor}40`, color: roleColor }}
            >
              ⚔️ {nominee.signatureHero}
            </span>
          </div>
        )}
      </div>

      {/* Info Body */}
      <div className="flex flex-col flex-1 p-4 space-y-3">
        <div>
          <h3 className="text-white font-black text-lg uppercase tracking-tight line-clamp-1 group-hover:text-amber-400 transition-colors">
            {nominee.ign}
          </h3>
          {nominee.realName && (
            <p className="text-zinc-500 text-[10px] font-medium tracking-wide">{nominee.realName}</p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-black/40 border border-white/5 text-center">
          <div>
            <p className="text-white font-black text-xs tabular-nums">{nominee.kda > 0 ? nominee.kda.toFixed(1) : "—"}</p>
            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">KDA</p>
          </div>
          <div>
            <p className="text-white font-black text-xs tabular-nums">{nominee.winRate > 0 ? `${Math.round(nominee.winRate)}%` : "—"}</p>
            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Win Rate</p>
          </div>
          <div>
            <p className="text-white font-black text-xs tabular-nums">{nominee.mvpCount > 0 ? `×${nominee.mvpCount}` : "—"}</p>
            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">MVP</p>
          </div>
        </div>

        {/* Vote Share Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[9px] font-mono">
            <span className="text-zinc-400 uppercase">Vote Share</span>
            <span style={{ color: roleColor }} className="font-bold">{votePct}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden border border-white/5">
            <div 
              className="h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.max(5, votePct)}%`, background: roleColor }} 
            />
          </div>
        </div>

        {/* Vote Button */}
        <div className="pt-1 mt-auto">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onVote(nominee.id)}
            disabled={disabled || isPending}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-md ${
              nominee.votedByMe
                ? "bg-amber-400 text-black border border-amber-300 hover:bg-amber-300"
                : "bg-white/5 border border-white/10 hover:bg-white/10 text-white"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : nominee.votedByMe ? (
              <CheckCircle2 size={14} fill="black" className="text-amber-400" />
            ) : (
              <Vote size={14} style={{ color: roleColor }} />
            )}
            <span>{nominee.votedByMe ? "You Voted 👑" : "Vote Nominee"}</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Page Component ──────────────────────────────────────
export default function AwardsPage() {
  const { data: session } = useSession()
  const [season, setSeason] = useState<Season | null>(null)
  const [grouped, setGrouped] = useState<Grouped>({})
  const [userVotes, setUserVotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [activeRole, setActiveRole] = useState("EXP")
  const [isPending, startTransition] = useTransition()
  const [votingId, setVotingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/awards/nominees")
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? "Failed to load nominees")
        return
      }
      const d = await res.json()
      setSeason(d.season ?? null)
      setGrouped(d.grouped ?? {})
      setUserVotes(d.userVotes ?? {})
    } catch {
      toast.error("Failed to load nominees")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    load().then(() => { if (!mounted) return }).catch(() => undefined)
    return () => { mounted = false }
  }, [load])

  const castVote = useCallback((playerId: string) => {
    if (!session) {
      toast.error("Sign in to vote", {
        description: "You need an account to cast votes for Best Role Awards.",
        action: { label: "Sign in", onClick: () => window.location.href = "/login" },
        duration: 5000,
      })
      return
    }
    if (!season || season.status !== "ACTIVE") {
      toast.warning("Voting is closed", {
        description: season ? `${season.name} is not currently active.` : "No active season right now.",
      })
      return
    }

    const role = activeRole
    const currentVote = userVotes[role]
    const isToggle = currentVote === playerId

    // Optimistic update
    setUserVotes((prev) => {
      const next = { ...prev }
      if (isToggle) delete next[role]
      else next[role] = playerId
      return next
    })
    setGrouped((prev) => {
      const next = { ...prev }
      const list = (next[role] ?? []).map((n) => {
        let votes = n.votes
        if (n.id === currentVote && !isToggle) votes = Math.max(0, votes - 1)
        if (n.id === playerId) votes = isToggle ? Math.max(0, votes - 1) : votes + 1
        return { ...n, votes, votedByMe: !isToggle && n.id === playerId }
      }).sort((a, b) => b.votes - a.votes)
      next[role] = list
      return next
    })

    setVotingId(playerId)
    startTransition(async () => {
      try {
        const res = await fetch("/api/awards/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, role, seasonId: season.id }),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error ?? "Vote failed")
        }
        toast.success(isToggle ? "Vote removed" : "Vote cast!", { duration: 2000 })
      } catch (e: unknown) {
        await load()
        toast.error(e instanceof Error ? e.message : "Vote failed")
      } finally {
        setVotingId(null)
      }
    })
  }, [session, season, activeRole, userVotes, load])

  const nominees = grouped[activeRole] ?? []
  const roleMeta = roleOf(activeRole)
  const totalRoleVotes = nominees.reduce((sum, n) => sum + n.votes, 0)
  const leadingNominee = nominees[0]

  return (
    <div className="min-h-screen bg-[#07070c] text-white pt-24 lg:pt-32 pb-20">
      {/* Background Decor Lights */}
      <div 
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] pointer-events-none opacity-20 blur-[130px] transition-all duration-700" 
        style={{ background: roleMeta.color }}
      />

      {/* ── Hero Banner ────────────────────────────────────────── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 p-8 rounded-3xl bg-gradient-to-r from-[#12121c] via-[#0d0d15] to-[#07070c] border border-white/10 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Light */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-[#e8a000]/10 to-transparent pointer-events-none" />

          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#e8a000]/15 border border-[#e8a000]/30 text-[#e8a000] text-[10px] font-black uppercase tracking-widest">
                <Sparkles size={12} /> Esports Hall of Fame
              </span>
              {season && (
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-mono font-bold uppercase">
                  {season.name}
                </span>
              )}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-white">
              Best Role <span className="text-amber-400">Awards</span>
            </h1>

            <p className="text-zinc-400 text-xs sm:text-sm max-w-xl leading-relaxed">
              Vote for your favorite MLBB Ghana players. Recognising the top performing EXP laners, Junglers, Mids, Marksmen, and Roamers.
            </p>
          </div>

          {/* Right Status Card */}
          <div className="flex flex-col items-start md:items-end gap-3 z-10">
            {season?.status === "ACTIVE" ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Voting Open</span>
              </div>
            ) : (
              <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 text-xs font-black uppercase tracking-wider">
                Voting Closed
              </div>
            )}

            {!session && (
              <a 
                href="/login" 
                className="px-4 py-2 rounded-xl bg-[#e8a000] hover:bg-[#ffb800] text-black text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg"
              >
                <span>Sign In to Vote</span>
                <ArrowRight size={14} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky Role Navigation Bar ────────────────────────── */}
      <div className="sticky top-20 z-40 bg-[#07070c]/90 backdrop-blur-xl border-y border-white/10 mb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 overflow-x-auto py-3 scrollbar-hide">
            {ROLES.map((r) => {
              const active = activeRole === r.key
              const Icon = r.icon
              const count = (grouped[r.key] ?? []).length
              return (
                <button
                  key={r.key}
                  onClick={() => setActiveRole(r.key)}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 relative shrink-0 ${
                    active
                      ? "text-black shadow-xl"
                      : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5"
                  }`}
                  style={{ background: active ? r.color : undefined }}
                >
                  <Icon size={16} className={active ? "text-black" : "text-zinc-400"} />
                  <span>{r.label}</span>
                  <span 
                    className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                      active ? "bg-black/20 text-black" : "bg-white/10 text-zinc-400"
                    }`}
                  >
                    {count}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="activeAwardsTab"
                      className="absolute inset-0 rounded-2xl border-2 border-white/40 pointer-events-none"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Role Content Section ──────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 z-10 relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
            <Loader2 size={36} className="animate-spin text-amber-400" />
            <p className="text-xs font-mono font-black uppercase tracking-widest text-zinc-500">Loading Nominees & Votes...</p>
          </div>
        ) : nominees.length === 0 ? (
          <div className="p-16 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center text-center space-y-3">
            <Trophy size={48} className="text-zinc-700" />
            <h3 className="text-lg font-black uppercase text-zinc-400">No Nominees Registered Yet</h3>
            <p className="text-xs text-zinc-600 max-w-sm">
              Registered players for this role will appear here as soon as nominees are finalized by tournament admins.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRole}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-10"
            >
              {/* Role Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center border"
                    style={{ background: `${roleMeta.color}20`, borderColor: `${roleMeta.color}40` }}
                  >
                    <roleMeta.icon size={20} style={{ color: roleMeta.color }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-wide text-white" style={{ color: roleMeta.color }}>
                      {roleMeta.award}
                    </h2>
                    <p className="text-xs text-zinc-400 font-medium">
                      {nominees.length} Contenders · {totalRoleVotes.toLocaleString()} Total Votes Cast
                    </p>
                  </div>
                </div>

                {leadingNominee && (
                  <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-black/60 border border-white/10">
                    <span className="text-amber-400 font-bold text-xs">👑 #1 Leader:</span>
                    <span className="text-white font-black uppercase text-xs">{leadingNominee.ign}</span>
                    <span className="text-zinc-500 font-mono text-xs">({leadingNominee.votes} pts)</span>
                  </div>
                )}
              </div>

              {/* Nominees Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {nominees.map((nominee, idx) => (
                  <NomineeCard
                    key={nominee.id}
                    nominee={nominee}
                    rank={idx + 1}
                    roleColor={roleMeta.color}
                    totalVotes={totalRoleVotes}
                    onVote={castVote}
                    disabled={season?.status !== "ACTIVE"}
                    isPending={isPending && votingId === nominee.id}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Voting Rules Accordion */}
        {!loading && (
          <details className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden">
            <summary className="flex items-center justify-between px-6 py-4 cursor-pointer select-none text-xs font-black tracking-widest uppercase text-zinc-300 hover:text-white">
              <span className="flex items-center gap-2">
                <Info size={16} className="text-amber-400" /> Voting Guidelines & Rules
              </span>
              <ChevronDown size={16} className="group-open:rotate-180 transition-transform text-zinc-400" />
            </summary>
            <div className="px-6 pb-6 pt-2 border-t border-white/5 space-y-2.5 text-xs text-zinc-400 leading-relaxed font-medium">
              <p>• <strong>1 Vote Per Role</strong>: Each authenticated player account receives 1 vote per role per active season.</p>
              <p>• <strong>Change Vote Anytime</strong>: You can toggle or change your choice anytime before voting closes.</p>
              <p>• <strong>Season Conclusion</strong>: At the end of the active season, votes are audited and winners receive official awards.</p>
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
