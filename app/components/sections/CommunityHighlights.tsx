'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  Brain,
  Sparkles,
  Film,
  ChevronRight,
  BarChart3,
  Radio,
  ExternalLink,
  Zap,
  Trophy,
} from 'lucide-react'
import { STORAGE_BUCKETS, supabase } from '@/lib/supabase'

/* ────────────────────────────────────────────────────────── */
/*  Types                                                     */
/* ────────────────────────────────────────────────────────── */
type Trivia = {
  id: string
  title: string
  teaser: string
  images?: string[]
  trueCount?: number
  falseCount?: number
  userChoice?: boolean | null
  totalVotes?: number
}
type ClipPost = { id: string; title?: string | null; content: string; author?: { ign: string; photo?: string | null } }
type Poll = { id: string; question: string }
type Streamer = { id: string; name: string; platform: string; handle?: string; profileUrl: string; imageUrl?: string | null }

/* ────────────────────────────────────────────────────────── */
/*  Data hook                                                 */
/* ────────────────────────────────────────────────────────── */
function useCommunityData() {
  const [trivia, setTrivia] = useState<Trivia | null>(null)
  const [clip, setClip] = useState<ClipPost | null>(null)
  const [polls, setPolls] = useState<Poll[]>([])
  const [streamers, setStreamers] = useState<Streamer[]>([])
  const [triviaImage, setTriviaImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [triviaRes, pollsRes, clipRes, streamersRes] = await Promise.all([
          fetch('/api/trivia/current'),
          fetch('/api/polls'),
          fetch('/api/clips/weekly'),
          fetch('/api/streamers/spotlight'),
        ])

        const [triviaData, pollsData, clipData, streamersData] = await Promise.all([
          triviaRes.json(),
          pollsRes.json(),
          clipRes.json(),
          streamersRes.json(),
        ])

        setTrivia(triviaData?.trivia ?? null)
        setPolls(Array.isArray(pollsData?.polls) ? pollsData.polls.slice(0, 1) : [])
        setClip(clipData?.featured?.post ?? null)
        setStreamers(Array.isArray(streamersData?.streamers) ? streamersData.streamers : [])
      } catch {
        /* silently fail */
      } finally {
        setLoading(false)
      }
    }
    load().catch(() => undefined)
  }, [])

  useEffect(() => {
    let cancelled = false

    const pickTriviaImage = async () => {
      if (!trivia) {
        setTriviaImage(null)
        return
      }

      if (trivia.images?.length) {
        const firstImage = trivia.images[0]
        const url = firstImage.startsWith('http')
          ? firstImage
          : supabase.storage.from(STORAGE_BUCKETS.IMAGES).getPublicUrl(firstImage).data.publicUrl || firstImage
        if (!cancelled) setTriviaImage(url)
        return
      }

      const { data: files, error } = await supabase.storage
        .from(STORAGE_BUCKETS.IMAGES)
        .list('trivia', { limit: 20, sortBy: { column: 'created_at', order: 'desc' } })

      if (!cancelled && !error && files?.length) {
        const path = 'trivia/' + files[0].name
        const { data: urlData } = supabase.storage.from(STORAGE_BUCKETS.IMAGES).getPublicUrl(path)
        setTriviaImage(urlData.publicUrl)
      }
    }

    pickTriviaImage().catch(() => undefined)
    return () => { cancelled = true }
  }, [trivia])

  return { trivia, clip, polls, streamers, loading, triviaImage }
}

/* ────────────────────────────────────────────────────────── */
/*  Section label                                             */
/* ────────────────────────────────────────────────────────── */
const SectionLabel = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-[#e8a000]/10 text-[#e8a000]">
      {icon}
    </div>
    <span className="text-[11px] font-semibold tracking-wide uppercase text-white/40">{text}</span>
  </div>
)

/* ────────────────────────────────────────────────────────── */
/*  Skeleton                                                  */
/* ────────────────────────────────────────────────────────── */
const SkeletonBlock = ({ className = '' }: { className?: string }) => (
  <div className={'animate-pulse rounded-xl bg-white/3 border border-white/6 p-5 ' + className}>
    <div className="flex items-center gap-2 mb-4">
      <div className="w-6 h-6 bg-white/6 rounded-md" />
      <div className="h-3 w-20 bg-white/6 rounded" />
    </div>
    <div className="h-5 w-3/4 bg-white/6 rounded mb-3" />
    <div className="h-3 w-full bg-white/4 rounded mb-2" />
    <div className="h-3 w-2/3 bg-white/4 rounded mb-4" />
    <div className="h-8 w-28 bg-white/6 rounded-lg" />
  </div>
)

/* ────────────────────────────────────────────────────────── */
/*  Trivia card                                               */
/* ────────────────────────────────────────────────────────── */
const TriviaCard = ({ trivia, imageUrl }: { trivia: Trivia | null; imageUrl: string | null }) => {
  const [reveal, setReveal] = useState<string | null>(null)
  const [xp, setXp] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [voteChoice, setVoteChoice] = useState<boolean | null>(null)
  const [voteCounts, setVoteCounts] = useState<{ trueCount: number; falseCount: number }>({ trueCount: 0, falseCount: 0 })
  const [voteLoading, setVoteLoading] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)

  useEffect(() => {
    setVoteChoice(trivia?.userChoice ?? null)
    setVoteCounts({
      trueCount: trivia?.trueCount ?? 0,
      falseCount: trivia?.falseCount ?? 0,
    })
  }, [trivia])

  const onReveal = async () => {
    if (!trivia?.id || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/trivia/' + trivia.id + '/reveal', { method: 'POST' })
      const data = await res.json()
      setReveal(data?.reveal || 'No reveal available.')
      if (typeof data?.xpAwarded === 'number') setXp(data.xpAwarded)
    } catch {
      setReveal('Could not reveal. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const onVote = async (choice: boolean) => {
    if (!trivia?.id || voteLoading || reveal || voteChoice !== null) return
    setVoteLoading(true)
    setVoteError(null)

    try {
      const res = await fetch('/api/trivia/' + trivia.id + '/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      })
      const data = await res.json()

      if (!res.ok) {
        try {
          const parsed = typeof data?.error === 'string' ? JSON.parse(data.error) : null
          if (parsed?.userChoice !== undefined) {
            setVoteChoice(parsed.userChoice)
            setVoteCounts({
              trueCount: parsed.trueCount ?? voteCounts.trueCount,
              falseCount: parsed.falseCount ?? voteCounts.falseCount,
            })
          }
        } catch { /* ignore parse errors */ }
        setVoteError(data?.error ?? 'Unable to record vote.')
      } else {
        const trueCount = typeof data?.trueCount === 'number' ? data.trueCount : voteCounts.trueCount
        const falseCount = typeof data?.falseCount === 'number' ? data.falseCount : voteCounts.falseCount
        const userChoice = typeof data?.userChoice === 'boolean' ? data.userChoice : choice
        setVoteChoice(userChoice)
        setVoteCounts({ trueCount, falseCount })
      }
    } catch {
      setVoteError('Unable to record vote.')
    }

    setVoteLoading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-xl bg-white/2 border border-white/6 p-5 lg:p-6 lg:col-span-2 group hover:border-white/10 transition-colors duration-300 relative overflow-hidden"
    >
      <div className="absolute inset-0">
        {imageUrl ? (
          <Image src={imageUrl} alt="Trivia" fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(232,160,0,0.08),transparent_45%),radial-gradient(circle_at_80%_40%,rgba(59,130,246,0.08),transparent_40%),#0d0d14]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d14]/92 via-[#0d0d14]/85 to-[#0d0d14]/96" />
      </div>

      {/* Subtle corner glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#e8a000]/4 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <SectionLabel icon={<Brain size={13} />} text="Daily Trivia" />

        <h3 className="text-white font-bold text-lg leading-snug mb-2">
          {trivia?.title || 'No active trivia yet'}
        </h3>

        <AnimatePresence mode="wait">
          {reveal ? (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <p className="text-emerald-400/90 text-sm leading-relaxed">{reveal}</p>
              {xp !== null && xp > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1 mt-2 text-[#e8a000] text-xs font-semibold bg-[#e8a000]/10 px-2 py-0.5 rounded-full"
                >
                  <Zap size={11} />
                  +{xp} XP earned!
                </motion.span>
              )}
            </motion.div>
          ) : (
            <motion.p
              key="teaser"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-white/40 text-sm leading-relaxed mb-4"
            >
              {trivia?.teaser || 'Check back soon for Ghana hero trivia.'}
            </motion.p>
          )}
        </AnimatePresence>

        {!reveal && trivia && (
          <button
            onClick={onReveal}
            disabled={loading}
            className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase px-4 py-2 rounded-lg bg-[#e8a000]/15 border border-[#e8a000]/25 text-[#e8a000] hover:bg-[#e8a000]/25 hover:border-[#e8a000]/40 transition-all duration-200 disabled:opacity-50"
          >
            <Sparkles size={12} />
            {loading ? 'Revealing...' : 'Reveal Answer (+XP)'}
          </button>
        )}

        {trivia && (
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onVote(true)}
                disabled={voteLoading || !!reveal || voteChoice !== null}
                className={'flex items-center justify-between rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ' +
                  (voteChoice === true
                    ? 'border-emerald-400 bg-emerald-500/15 text-white'
                    : 'border-white/10 bg-white/3 text-zinc-200 hover:border-white/20')}
              >
                <span>True</span>
                <span className="text-emerald-300 text-xs">{voteCounts.trueCount.toLocaleString()}</span>
              </button>
              <button
                onClick={() => onVote(false)}
                disabled={voteLoading || !!reveal || voteChoice !== null}
                className={'flex items-center justify-between rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ' +
                  (voteChoice === false
                    ? 'border-red-400 bg-red-500/15 text-white'
                    : 'border-white/10 bg-white/3 text-zinc-200 hover:border-white/20')}
              >
                <span>False</span>
                <span className="text-red-300 text-xs">{voteCounts.falseCount.toLocaleString()}</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">{(voteCounts.trueCount + voteCounts.falseCount).toLocaleString()} votes so far.</p>
            {voteError && <p className="text-[11px] text-red-300">{voteError}</p>}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ────────────────────────────────────────────────────────── */
/*  Clip of the week                                          */
/* ────────────────────────────────────────────────────────── */
const ClipCard = ({ clip }: { clip: ClipPost | null }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
    className="rounded-xl bg-white/2 border border-white/6 p-5 lg:p-6 group hover:border-white/10 transition-colors duration-300 relative overflow-hidden"
  >
    <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-purple-500/4 rounded-full blur-3xl pointer-events-none" />

    <SectionLabel icon={<Film size={13} />} text="Clip of the Week" />

    {clip ? (
      <>
        <h3 className="text-white font-bold text-base leading-snug mb-1.5">
          {clip.title || 'Untitled Clip'}
        </h3>
        {clip.author?.ign && (
          <p className="text-white/30 text-xs mb-2">by {clip.author.ign}</p>
        )}
        <p className="text-white/40 text-sm leading-relaxed line-clamp-3 mb-4">
          {clip.content}
        </p>
      </>
    ) : (
      <>
        <h3 className="text-white/30 font-bold text-base leading-snug mb-2">
          No weekly clip yet
        </h3>
        <p className="text-white/20 text-sm leading-relaxed mb-4">
          Upload your savage clip and get upvotes from the community.
        </p>
      </>
    )}

    <Link
      href="/community"
      className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-white/30 hover:text-[#e8a000] transition-colors duration-200"
    >
      View Community
      <ChevronRight size={13} />
    </Link>
  </motion.div>
)

/* ────────────────────────────────────────────────────────── */
/*  Poll + Streamers                                          */
/* ────────────────────────────────────────────────────────── */
const PollStreamersCard = ({ polls, streamers }: { polls: Poll[]; streamers: Streamer[] }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
    className="rounded-xl bg-white/2 border border-white/6 p-5 lg:p-6 group hover:border-white/10 transition-colors duration-300 relative overflow-hidden flex flex-col"
  >
    <div className="absolute -top-12 -left-12 w-24 h-24 bg-blue-500/4 rounded-full blur-3xl pointer-events-none" />

    {/* Poll section */}
    <div className="mb-4">
      <SectionLabel icon={<BarChart3 size={13} />} text="Quick Poll" />
      <p className="text-white font-medium text-sm leading-snug mb-3">
        {polls[0]?.question || 'No active poll right now.'}
      </p>
      {polls[0] && (
        <Link
          href="/polls"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/8 text-white/50 hover:text-white hover:bg-white/8 hover:border-white/15 transition-all duration-200"
        >
          <Trophy size={11} />
          Vote Now
        </Link>
      )}
    </div>

    {/* Divider */}
    <div className="border-t border-white/6 my-1" />

    {/* Streamers */}
    <div className="mt-3 flex-1">
      <SectionLabel icon={<Radio size={13} />} text="Live Streamers" />
      {streamers.length > 0 ? (
        <div className="space-y-2">
          {streamers.slice(0, 3).map((s) => (
            <a
              key={s.id}
              href={s.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-2 group/streamer py-1.5 -mx-1 px-1 rounded-md hover:bg-white/3 transition-colors duration-150"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white/6 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/50 uppercase shrink-0">
                  {s.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-white/70 text-xs font-medium truncate group-hover/streamer:text-white transition-colors">
                    {s.name}
                  </p>
                  <p className="text-white/25 text-[10px]">{s.platform}</p>
                </div>
              </div>
              <ExternalLink size={11} className="text-white/15 group-hover/streamer:text-white/40 shrink-0 transition-colors" />
            </a>
          ))}
        </div>
      ) : (
        <p className="text-white/20 text-xs">No spotlighted streamers this week.</p>
      )}
    </div>
  </motion.div>
)

/* ────────────────────────────────────────────────────────── */
/*  Main Export                                               */
/* ────────────────────────────────────────────────────────── */
export function CommunityHighlights() {
  const { trivia, clip, polls, streamers, loading, triviaImage } = useCommunityData()

  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-40px' })

  return (
    <section ref={sectionRef} className="relative bg-[#0a0a0f] overflow-hidden">
      {/* ── Animated background effects ── */}

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Pulsing gradient orbs — CSS animations */}
      <div
        className="absolute -top-20 left-1/3 w-80 h-80 rounded-full blur-[120px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(232,160,0,0.07), transparent 70%)',
          animation: 'pulse-orb-community 7s ease-in-out infinite',
          willChange: 'transform, opacity',
        }}
      />
      <div
        className="absolute -bottom-20 right-1/4 w-72 h-72 rounded-full blur-[100px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.06), transparent 70%)',
          animation: 'pulse-orb-community-alt 9s ease-in-out 3s infinite',
          willChange: 'transform, opacity',
        }}
      />
      <div
        className="absolute top-1/2 -left-10 w-60 h-60 rounded-full blur-[100px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.05), transparent 70%)',
          animation: 'pulse-orb-community-sm 8s ease-in-out 5s infinite',
          willChange: 'transform, opacity',
        }}
      />

      {/* Floating particles — CSS animations */}
      {[...Array(8)].map((_, i) => (
        <div
          key={'ch-p-' + i}
          className="absolute w-px h-px rounded-full bg-[#e8a000]/30 pointer-events-none"
          style={{
            left: (10 + ((i * 41) % 80)) + '%',
            top: (10 + ((i * 29) % 80)) + '%',
            '--dx': ((i % 2) === 0 ? '8px' : '-8px'),
            '--dy': `${-(20 + (i % 3) * 12)}px`,
            '--s': String(1 + (i % 3) * 0.4),
            animation: `float-particle-xy ${5 + (i % 4) * 1.5}s ease-in-out ${i * 0.9}s infinite`,
            willChange: 'transform, opacity',
          } as React.CSSProperties}
        />
      ))}

      {/* Animated top accent line — CSS animation */}
      <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
        <div
          className="h-full w-1/4 bg-linear-to-r from-transparent via-purple-500/30 to-transparent"
          style={{ animation: 'accent-slide-wide 12s linear infinite', willChange: 'transform' }}
        />
      </div>

      {/* Top separator */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/4 to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        {/* Section header */}
        <motion.div
          className="flex items-center justify-between mb-6 lg:mb-8"
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div>
            <h2 className="text-white font-extrabold text-lg sm:text-xl tracking-tight">
              Community
            </h2>
            <p className="text-white/30 text-sm mt-0.5">Trivia, clips, polls & more</p>
          </div>
          <Link
            href="/community"
            className="flex items-center gap-1 text-white/30 hover:text-[#e8a000] text-xs font-medium tracking-wide transition-colors duration-200"
          >
            Explore
            <ChevronRight size={14} />
          </Link>
        </motion.div>

        {/* Cards grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skeleton" className="grid grid-cols-1 lg:grid-cols-4 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SkeletonBlock className="lg:col-span-2" />
              <SkeletonBlock />
              <SkeletonBlock />
            </motion.div>
          ) : (
            <motion.div
              key="cards"
              className="grid grid-cols-1 lg:grid-cols-4 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <TriviaCard trivia={trivia} imageUrl={triviaImage} />
              <ClipCard clip={clip} />
              <PollStreamersCard polls={polls} streamers={streamers} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom animated accent line — CSS animation */}
      <div className="absolute bottom-0 left-0 right-0 h-px overflow-hidden">
        <div
          className="h-full w-1/5 bg-linear-to-r from-transparent via-[#e8a000]/25 to-transparent"
          style={{ animation: 'accent-slide-wide-reverse 14s linear infinite', willChange: 'transform' }}
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/4 to-transparent" />
    </section>
  )
}
