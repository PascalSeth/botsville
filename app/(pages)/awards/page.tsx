"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
  Trophy, Shield, Sword, Zap, Crosshair, HeartHandshake,
  Vote, CheckCircle2, Loader2, ChevronDown, Star, Users,
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
  { key: "EXP",       label: "EXP Lane",  award: "King of EXP Lane",   icon: Shield,       color: "#e8a000", hex: "e8a000" },
  { key: "JUNGLE",    label: "Jungle",    award: "King of the Jungle",  icon: Sword,        color: "#cc3333", hex: "cc3333" },
  { key: "MID",       label: "Mid Lane",  award: "Mage of the Season",  icon: Zap,          color: "#9b59b6", hex: "9b59b6" },
  { key: "GOLD",      label: "Gold Lane", award: "Marksman of Season",  icon: Crosshair,    color: "#27ae60", hex: "27ae60" },
  { key: "ROAM",      label: "Roam",      award: "Best Roamer",         icon: HeartHandshake, color: "#16a085", hex: "16a085" },
]

const roleOf = (key: string) => ROLES.find((r) => r.key === key) ?? ROLES[0]

// ─── Nominee Card ────────────────────────────────────────────
function NomineeCard({
  nominee,
  roleColor,
  onVote,
  disabled,
  isPending,
}: {
  nominee: Nominee
  roleColor: string
  onVote: (id: string) => void
  disabled: boolean
  isPending: boolean
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`relative flex flex-col bg-[#0e0e16] border transition-all duration-200 overflow-hidden
        ${nominee.votedByMe
          ? "border-[" + roleColor + "]/60 shadow-[0_0_12px_0_" + roleColor + "22]"
          : "border-white/[0.06] hover:border-white/[0.14]"
        }`}
    >
      {/* Voted accent bar */}
      {nominee.votedByMe && (
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: roleColor }} />
      )}

      {/* Portrait */}
      <div className="relative w-full aspect-3/4 overflow-hidden bg-[#111]">
        {nominee.photo ? (
          <Image
            src={nominee.photo}
            alt={nominee.ign}
            fill
            className="object-cover object-top grayscale-20 group-hover:grayscale-0 transition-all duration-400"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Users size={40} className="text-[#333]" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-[#0e0e16] via-[#0e0e16]/20 to-transparent" />

        {/* Team badge */}
        {nominee.team && (
          <div
            className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 text-[9px] font-black tracking-widest uppercase"
            style={{ background: `#${nominee.team.color?.replace("#", "") ?? "1a1a24"}22`, border: `1px solid #${nominee.team.color?.replace("#", "") ?? "444"}44`, color: nominee.team.color ?? "#888" }}
          >
            {nominee.team.logo && (
              <Image src={nominee.team.logo} alt={nominee.team.tag} width={12} height={12} className="object-contain" />
            )}
            {nominee.team.tag}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 px-3 pt-2 pb-3">
        <div>
          <p className="text-white font-black text-[13px] uppercase tracking-wide leading-tight line-clamp-1">{nominee.ign}</p>
          {nominee.realName && <p className="text-[#555] text-[9px] tracking-wide">{nominee.realName}</p>}
          {nominee.signatureHero && (
            <p className="text-[10px] mt-0.5" style={{ color: roleColor }}>
              <Star size={8} className="inline mr-1 mb-px" />
              {nominee.signatureHero}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-1 text-center mt-0.5">
          {[
            { label: "KDA",    value: nominee.kda > 0 ? nominee.kda.toFixed(1) : "—" },
            { label: "Win%",   value: nominee.winRate > 0 ? `${Math.round(nominee.winRate)}%` : "—" },
            { label: "MVP",    value: nominee.mvpCount > 0 ? `×${nominee.mvpCount}` : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0a0a10] px-1 py-1">
              <p className="text-white font-black text-[11px] tabular-nums leading-none">{value}</p>
              <p className="text-[#444] text-[8px] tracking-widest uppercase">{label}</p>
            </div>
          ))}
        </div>

        {/* Vote count + button */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <Vote size={12} style={{ color: roleColor }} className="opacity-70" />
            <span className="text-[#777] text-[10px] font-black tabular-nums">{nominee.votes.toLocaleString()}</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => onVote(nominee.id)}
            disabled={disabled || isPending}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black tracking-widest uppercase transition-all duration-150
              ${nominee.votedByMe
                ? "bg-[" + roleColor + "]/15 border border-[" + roleColor + "]/50 text-[" + roleColor + "]"
                : "bg-white/[0.04] border border-white/[0.08] text-[#aaa] hover:bg-white/[0.08] hover:border-white/20 hover:text-white"
              }
              disabled:opacity-40 disabled:cursor-not-allowed`}
            style={nominee.votedByMe ? {
              background: `${roleColor}18`,
              borderColor: `${roleColor}55`,
              color: roleColor,
            } : undefined}
          >
            {isPending ? (
              <Loader2 size={10} className="animate-spin" />
            ) : nominee.votedByMe ? (
              <CheckCircle2 size={10} />
            ) : (
              <Vote size={10} />
            )}
            {nominee.votedByMe ? "Voted" : "Vote"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Role Tab ─────────────────────────────────────────────────
function RoleTab({
  roleMeta,
  active,
  onClick,
  leaderVotes,
}: {
  roleMeta: typeof ROLES[0]
  active: boolean
  onClick: () => void
  leaderVotes: number
}) {
  const Icon = roleMeta.icon
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-black tracking-widest uppercase transition-all duration-150 border-b-2 whitespace-nowrap
        ${active
          ? "border-current text-white bg-white/5"
          : "border-transparent text-[#555] hover:text-[#999] hover:bg-white/3"
        }`}
      style={active ? { color: roleMeta.color, borderColor: roleMeta.color } : undefined}
    >
      <Icon size={13} />
      {roleMeta.label}
      {leaderVotes > 0 && (
        <span
          className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[8px] font-black rounded-sm"
          style={{ background: `${roleMeta.color}22`, color: roleMeta.color }}
        >
          {leaderVotes}
        </span>
      )}
    </motion.button>
  )
}

// ─── Main Page ────────────────────────────────────────────────
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
        // Revert on error
        await load()
        toast.error(e instanceof Error ? e.message : "Vote failed")
      } finally {
        setVotingId(null)
      }
    })
  }, [session, season, activeRole, userVotes, load])

  const nominees = grouped[activeRole] ?? []
  const roleMeta = roleOf(activeRole)
  const leadingNominee = nominees[0]

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* ── Hero header ─────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/6">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${roleMeta.color}, transparent)`,
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={16} style={{ color: roleMeta.color }} />
                <span
                  className="text-[10px] font-black tracking-[0.3em] uppercase"
                  style={{ color: roleMeta.color }}
                >
                  Community Vote
                </span>
              </div>
              <h1 className="text-white font-black text-3xl sm:text-4xl uppercase tracking-tight leading-none">
                Best Role Awards
              </h1>
              {season && (
                <p className="text-[#555] text-sm mt-2 font-mono tracking-wide">
                  {season.name}
                  {season.status === "ACTIVE" && (
                    <span className="ml-2 text-[#e8a000] text-[10px] font-black tracking-widest uppercase">
                      · Voting open
                    </span>
                  )}
                  {season.status !== "ACTIVE" && (
                    <span className="ml-2 text-[#555] text-[10px] font-black tracking-widest uppercase">
                      · Voting closed
                    </span>
                  )}
                </p>
              )}
              {!season && (
                <p className="text-[#444] text-[10px] mt-2 font-mono tracking-widest uppercase">
                  No active season · View only
                </p>
              )}
            </div>

            {!session && (
              <p className="text-[#555] text-xs border border-white/8 px-4 py-2 bg-white/2">
                Sign in to cast your votes
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Role Tabs ────────────────────────────────────────── */}
      <div className="border-b border-white/6 bg-[#0a0a14] sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto scrollbar-none">
            {ROLES.map((r) => {
              const nominees = grouped[r.key] ?? []
              const top = nominees[0]
              return (
                <RoleTab
                  key={r.key}
                  roleMeta={r}
                  active={activeRole === r.key}
                  onClick={() => setActiveRole(r.key)}
                  leaderVotes={top?.votes ?? 0}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Error banner — replaced by toasts */}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin text-[#e8a000]" />
            <p className="text-[#444] text-sm font-mono">Loading nominees…</p>
          </div>
        )}

        {!loading && nominees.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 border border-white/5 bg-[#0a0a12]">
            <Trophy size={40} className="text-[#222]" />
            <p className="text-[#555] text-sm font-mono">No nominees for this role yet</p>
            <p className="text-[#333] text-xs">Players will appear here once they are registered to a team</p>
          </div>
        )}

        {!loading && nominees.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRole}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Role header */}
              <div className="flex items-center gap-3 mb-6">
                {(() => {
                  const Icon = roleMeta.icon
                  return (
                    <div
                      className="w-8 h-8 flex items-center justify-center"
                      style={{ background: `${roleMeta.color}18`, border: `1px solid ${roleMeta.color}33` }}
                    >
                      <Icon size={16} style={{ color: roleMeta.color }} />
                    </div>
                  )
                })()}
                <div>
                  <h2
                    className="text-[11px] font-black tracking-[0.3em] uppercase"
                    style={{ color: roleMeta.color }}
                  >
                    {roleMeta.award}
                  </h2>
                  <p className="text-[#555] text-[10px] tracking-wide">
                    {nominees.length} nominee{nominees.length !== 1 ? "s" : ""} · {nominees.reduce((s, n) => s + n.votes, 0).toLocaleString()} total votes
                  </p>
                </div>

                {/* Current leader badge */}
                {leadingNominee && leadingNominee.votes > 0 && (
                  <div
                    className="ml-auto flex items-center gap-2 px-3 py-1.5 text-[9px] font-black tracking-widest uppercase"
                    style={{ background: `${roleMeta.color}12`, border: `1px solid ${roleMeta.color}30`, color: roleMeta.color }}
                  >
                    <Trophy size={10} />
                    Leading: {leadingNominee.ign}
                    <span className="text-white/50">·</span>
                    {leadingNominee.votes.toLocaleString()} votes
                  </div>
                )}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {nominees.map((n) => (
                  <NomineeCard
                    key={n.id}
                    nominee={n}
                    roleColor={roleMeta.color}
                    onVote={castVote}
                    disabled={season?.status !== "ACTIVE"}
                    isPending={isPending && votingId === n.id}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Voting rules */}
        {!loading && (
          <details className="mt-10 group border border-white/5 bg-[#0a0a12]">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none text-[#555] hover:text-[#888] text-xs font-black tracking-widest uppercase">
              <span>Voting Rules</span>
              <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
            </summary>
            <div className="px-4 pb-4 text-[#555] text-xs space-y-2 leading-relaxed">
              <p>• One vote per role per account per season — vote wisely.</p>
              <p>• You can change or remove your vote at any time while voting is open.</p>
              <p>• Voting closes at the end of the active season.</p>
              <p>• The player with the most votes in each role receives the Best Role Award.</p>
              <p>• Results are finalised and announced by admins at season end.</p>
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
