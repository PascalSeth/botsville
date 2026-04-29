'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
  Brain,
  Film,
  ChevronRight,
  BarChart3,
  Radio,
  ExternalLink,
  Trophy,
  Check,
  X,
  Sparkles,
  Zap,
  Flame,
  PlayCircle,
  Crosshair
} from 'lucide-react'
import { STORAGE_BUCKETS, supabase } from '@/lib/supabase'

/* ────────────────────────────────────────────────────────── */
/*  Types                                                     */
/* ────────────────────────────────────────────────────────── */
type TriviaFact = {
  id: string
  title: string
  teaser: string
  choices: string[]
  heroSlug?: string | null
  images?: string[]
  category?: string
  totalAttempts?: number
  correctCount?: number
  hasAnswered?: boolean
  userAnswer?: string | null
  isCorrect?: boolean | null
  xpAwarded?: number | null
  correctAnswer?: string | null
  reveal?: string | null
}

type TriviaState = {
  trivias: TriviaFact[]
  currentIndex: number
  userTotalXp: number
  todayXp: number
  dailyAnswered: number
  dailyLimit: number
  countdown: number | null
  allCompletedToday: boolean
}

type ClipPost = { id: string; title?: string | null; content: string; author?: { ign: string; photo?: string | null } }
type Poll = { id: string; question: string }
type Streamer = { id: string; name: string; platform: string; handle?: string; profileUrl: string; imageUrl?: string | null }

// Category config for styling
const TRIVIA_CATEGORY_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  GUESS_THE_HERO: { emoji: '🧠', label: 'Guess Hero', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/50' },
  HARDEST_HEROES: { emoji: '⚔️', label: 'Hard Heroes', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/50' },
  FUNNY_FACTS: { emoji: '😂', label: 'Funny', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/50' },
  OG_HEROES: { emoji: '👑', label: 'OG Heroes', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/50' },
  POWER_ULTIMATE: { emoji: '🔥', label: 'Ultimate', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/50' },
  LORE: { emoji: '🐉', label: 'Lore', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/50' },
  SKIN: { emoji: '🎯', label: 'Skin', color: 'text-pink-400', bg: 'bg-pink-500/20 border-pink-500/50' },
  EMOJI_GUESS: { emoji: '🧩', label: 'Emoji', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/50' },
  GENERAL: { emoji: '💡', label: 'General', color: 'text-zinc-400', bg: 'bg-zinc-500/20 border-zinc-500/50' },
}

const ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F']

/* ────────────────────────────────────────────────────────── */
/*  Data hook (Unchanged Logic)                               */
/* ────────────────────────────────────────────────────────── */
function useCommunityData() {
  const { data: session } = useSession()
  const [triviaState, setTriviaState] = useState<TriviaState>({
    trivias: [],
    currentIndex: 0,
    userTotalXp: 0,
    todayXp: 0,
    dailyAnswered: 0,
    dailyLimit: 5,
    countdown: null,
    allCompletedToday: false,
  })
  const [clip, setClip] = useState<ClipPost | null>(null)
  const [polls, setPolls] = useState<Poll[]>([])
  const [streamers, setStreamers] = useState<Streamer[]>([])
  const [triviaImage, setTriviaImage] = useState<string | null>(null)
  const [heroesWithImages, setHeroesWithImages] = useState<{imageUrl: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [triviaError, setTriviaError] = useState<string | null>(null)
  const [triviaAnswerLoading, setTriviaAnswerLoading] = useState(false)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [triviaRes, pollsRes, clipRes, streamersRes, heroesRes] = await Promise.all([
          fetch('/api/trivia/current'),
          fetch('/api/polls'),
          fetch('/api/clips/weekly'),
          fetch('/api/streamers/spotlight'),
          fetch('/api/heroes/catalog'),
        ])

        const [triviaData, pollsData, clipData, streamersData, heroesData] = await Promise.all([
          triviaRes.json(),
          pollsRes.json(),
          clipRes.json(),
          streamersRes.json(),
          heroesRes.json(),
        ])

        const trivias = (triviaData?.trivias ?? []) as TriviaFact[]
        setTriviaState(prev => ({
          ...prev,
          trivias,
          currentIndex: 0,
          userTotalXp: triviaData?.userTotalXp ?? 0,
          todayXp: triviaData?.todayXp ?? 0,
          dailyAnswered: triviaData?.dailyAnswered ?? 0,
          dailyLimit: triviaData?.dailyLimit ?? 5,
          allCompletedToday: triviaData?.allCompletedToday ?? false,
        }))
        setPolls(Array.isArray(pollsData?.polls) ? pollsData.polls.slice(0, 1) : [])
        setClip(clipData?.featured?.post ?? null)
        setStreamers(Array.isArray(streamersData?.streamers) ? streamersData.streamers : [])
        setHeroesWithImages(Array.isArray(heroesData?.heroes) ? heroesData.heroes : [])
      } catch {
        // fail silently
      } finally {
        setLoading(false)
      }
    }
    load().catch(() => undefined)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const currentTrivia = triviaState.trivias[triviaState.currentIndex]

    const pickTriviaImage = async () => {
      if (!currentTrivia || heroesWithImages.length === 0) {
        if (!cancelled) setTriviaImage(null)
        return
      }

      const randomIndex = Math.floor(Math.random() * heroesWithImages.length)
      if (!cancelled) {
        setTriviaImage(heroesWithImages[randomIndex].imageUrl)
      }
    }

    pickTriviaImage().catch(() => undefined)
    return () => { cancelled = true }
  }, [triviaState.trivias, triviaState.currentIndex, heroesWithImages])

  const handleTriviaAnswer = async (answer: string) => {
    if (!session) {
      toast.error('You must log in to play trivia', { duration: 3000 })
      return
    }
    const currentTrivia = triviaState.trivias[triviaState.currentIndex]
    if (!currentTrivia?.id || triviaAnswerLoading || currentTrivia.hasAnswered) return
    setTriviaAnswerLoading(true)
    setTriviaError(null)

    try {
      const res = await fetch('/api/trivia/' + currentTrivia.id + '/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      })
      const data = await res.json()

      if (!res.ok) {
        try {
          const parsed = typeof data?.error === 'string' ? JSON.parse(data.error) : null
          if (parsed?.userAnswer) {
            setTriviaState(prev => {
              const updated = [...prev.trivias]
              updated[prev.currentIndex] = {
                ...updated[prev.currentIndex],
                hasAnswered: true,
                userAnswer: parsed.userAnswer,
                isCorrect: parsed.isCorrect,
                correctAnswer: parsed.correctAnswer,
                xpAwarded: parsed.xpAwarded,
                reveal: parsed.reveal,
                totalAttempts: parsed.totalAttempts ?? updated[prev.currentIndex].totalAttempts,
                correctCount: parsed.correctCount ?? updated[prev.currentIndex].correctCount,
              }
              return {
                ...prev,
                trivias: updated,
                userTotalXp: prev.userTotalXp + (parsed.xpAwarded ?? 0),
                todayXp: prev.todayXp + (parsed.xpAwarded ?? 0),
                dailyAnswered: prev.dailyAnswered + 1,
              }
            })
            startCountdown()
          } else {
            setTriviaError(parsed?.message || data?.error || 'Unable to submit answer.')
          }
        } catch {
          setTriviaError(data?.error ?? 'Unable to submit answer.')
        }
      } else {
        setTriviaState(prev => {
          const updated = [...prev.trivias]
          updated[prev.currentIndex] = {
            ...updated[prev.currentIndex],
            hasAnswered: true,
            userAnswer: data.userAnswer,
            isCorrect: data.isCorrect,
            correctAnswer: data.correctAnswer,
            xpAwarded: data.xpAwarded,
            reveal: data.reveal,
            totalAttempts: data.totalAttempts ?? (updated[prev.currentIndex].totalAttempts ?? 0) + 1,
            correctCount: data.correctCount ?? (data.isCorrect ? (updated[prev.currentIndex].correctCount ?? 0) + 1 : updated[prev.currentIndex].correctCount),
          }
          return {
            ...prev,
            trivias: updated,
            userTotalXp: prev.userTotalXp + (data.xpAwarded ?? 0),
            todayXp: prev.todayXp + (data.xpAwarded ?? 0),
            dailyAnswered: prev.dailyAnswered + 1,
          }
        })
        startCountdown()
      }
    } catch {
      setTriviaError('Unable to submit answer.')
    }

    setTriviaAnswerLoading(false)
  }

  const startCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setTriviaState(prev => ({ ...prev, countdown: 10 }))
    countdownRef.current = setInterval(() => {
      setTriviaState(prev => {
        if (prev.countdown === null || prev.countdown <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          const nextIndex = prev.currentIndex + 1
          if (nextIndex < prev.trivias.length) {
            return { ...prev, countdown: null, currentIndex: nextIndex }
          }
          return { ...prev, countdown: null }
        }
        return { ...prev, countdown: prev.countdown - 1 }
      })
    }, 1000)
  }

  const skipToNextTrivia = () => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setTriviaState(prev => {
      const nextIndex = prev.currentIndex + 1
      if (nextIndex < prev.trivias.length) {
        return { ...prev, countdown: null, currentIndex: nextIndex }
      }
      return { ...prev, countdown: null }
    })
  }

  return {
    triviaState,
    clip,
    polls,
    streamers,
    loading,
    triviaImage,
    triviaError,
    triviaAnswerLoading,
    handleTriviaAnswer,
    skipToNextTrivia,
  }
}

/* ────────────────────────────────────────────────────────── */
/*  Skeleton & Helpers                                        */
/* ────────────────────────────────────────────────────────── */
const SkeletonBlock = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-3xl bg-white/5 border border-white/10 p-8 ${className}`}>
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 bg-white/10 rounded-xl" />
      <div className="h-4 w-32 bg-white/10 rounded" />
    </div>
    <div className="h-8 w-3/4 bg-white/10 rounded mb-4" />
    <div className="h-4 w-full bg-white/5 rounded mb-3" />
    <div className="h-4 w-2/3 bg-white/5 rounded mb-8" />
    <div className="grid grid-cols-2 gap-4">
      <div className="h-16 bg-white/10 rounded-2xl" />
      <div className="h-16 bg-white/10 rounded-2xl" />
    </div>
  </div>
)

/* ────────────────────────────────────────────────────────── */
/*  CINEMATIC TRIVIA STAGE (Left Column)                      */
/* ────────────────────────────────────────────────────────── */
const TriviaCinematicStage = ({
  triviaState,
  imageUrl,
  onAnswer,
  onSkip,
  error,
  answerLoading,
}: {
  triviaState: TriviaState
  imageUrl: string | null
  onAnswer: (answer: string) => void
  onSkip: () => void
  error: string | null
  answerLoading: boolean
}) => {
  const trivia = triviaState.trivias[triviaState.currentIndex] ?? null
  const { currentIndex, dailyLimit, todayXp, dailyAnswered, countdown } = triviaState
  const totalTrivias = triviaState.trivias.length

  const categoryKey = trivia?.category ?? 'GENERAL'
  const categoryConfig = TRIVIA_CATEGORY_CONFIG[categoryKey] ?? TRIVIA_CATEGORY_CONFIG.GENERAL
  const isEmojiGuess = categoryKey === 'EMOJI_GUESS'

  const hasAnswered = trivia?.hasAnswered ?? false
  const userAnswer = trivia?.userAnswer ?? null
  const isCorrect = trivia?.isCorrect ?? null
  const correctAnswer = trivia?.correctAnswer ?? null
  const xpAwarded = trivia?.xpAwarded ?? null
  const reveal = trivia?.reveal ?? null
  const choices = trivia?.choices ?? []

  const stats = { totalAttempts: trivia?.totalAttempts ?? 0, correctCount: trivia?.correctCount ?? 0 }
  const successRate = stats.totalAttempts > 0 ? Math.round((stats.correctCount / stats.totalAttempts) * 100) : 0
  const allCompleted = totalTrivias === 0 || (currentIndex >= totalTrivias && !countdown)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="col-span-12 lg:col-span-7 relative rounded-[2rem] overflow-hidden shadow-2xl group border border-white/10 flex flex-col min-h-[550px] bg-[#050508]"
    >
      {/* Immersive Background */}
      <div className="absolute inset-0 z-0">
        {imageUrl ? (
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: 1.1 }}
            transition={{ duration: 30, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
            className="w-full h-full"
          >
            <Image src={imageUrl} alt="Trivia Background" fill className="object-cover opacity-40 mix-blend-screen" />
          </motion.div>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,160,0,0.2),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.15),transparent_50%)]" />
        )}
        {/* Dark Vignette & Scanline Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-[#050508] via-[#050508]/80 to-transparent" />
        <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
      </div>

      {/* Giant Background Number */}
      {trivia && !allCompleted && (
        <div className="absolute -right-8 top-10 text-[250px] font-black text-white/[0.03] leading-none pointer-events-none select-none z-0">
          0{currentIndex + 1}
        </div>
      )}

      {/* HUD Header */}
      <div className="relative z-10 flex items-start justify-between p-6 lg:p-10 pb-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_0_30px_rgba(232,160,0,0.15)]">
              <Crosshair size={24} className="text-[#e8a000]" />
            </div>
            <div>
              <h2 className="text-white font-black uppercase tracking-[0.2em] text-sm">Daily Mission</h2>
              <p className="text-[#e8a000] font-bold text-xs mt-0.5 tracking-wider">+{todayXp} XP EARNED</p>
            </div>
          </div>
          {/* Futuristic Stage Indicators */}
          <div className="flex gap-1.5 mt-3">
            {Array.from({ length: dailyLimit }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-700 ease-out ${i < dailyAnswered
                    ? 'w-8 bg-[#e8a000] shadow-[0_0_10px_#e8a000]'
                    : i === currentIndex && !allCompleted
                      ? 'w-8 bg-white/50 animate-pulse'
                      : 'w-3 bg-white/10'
                  }`}
              />
            ))}
          </div>
        </div>

        {trivia && !allCompleted && (
          <div className={`px-4 py-2 rounded-xl border backdrop-blur-md flex items-center gap-2 ${categoryConfig.bg}`}>
            <span className="text-lg">{categoryConfig.emoji}</span>
            <span className={`text-xs font-black tracking-widest uppercase ${categoryConfig.color}`}>
              {categoryConfig.label}
            </span>
          </div>
        )}
      </div>

      {/* Main Mission Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-end p-6 lg:p-10 pt-10">
        <AnimatePresence mode="wait">
          {allCompleted ? (
            /* MISSION COMPLETE STATE */
            <motion.div
              key="completed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full text-center py-10 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(232,160,0,0.2),transparent_70%)]" />
              <div className="relative z-10">
                <Trophy size={48} className="mx-auto text-[#e8a000] drop-shadow-[0_0_20px_rgba(232,160,0,0.5)] mb-4" />
                <h3 className="text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase mb-2">Mission <br />Accomplished</h3>
                <p className="text-white/50 text-sm lg:text-base mb-8 max-w-sm mx-auto">All intelligence gathered. Return tomorrow for new coordinates.</p>

                <div className="inline-flex flex-col items-center justify-center p-6 rounded-2xl bg-[#0a0a0f] border border-white/10 shadow-2xl">
                  <span className="text-xs uppercase font-bold text-white/40 tracking-[0.2em] mb-2">Total XP Secured</span>
                  <span className="text-5xl font-black text-transparent bg-clip-text bg-linear-to-b from-[#e8a000] to-orange-500">
                    +{todayXp}
                  </span>
                </div>
              </div>
            </motion.div>
          ) : trivia ? (
            <motion.div
              key={trivia.id}
              initial={{ opacity: 0, filter: 'blur(10px)', x: 30 }}
              animate={{ opacity: 1, filter: 'blur(0px)', x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-8 w-full max-w-2xl"
            >
              {/* Question Text */}
              <div className="relative">
                <div className="absolute -left-6 top-2 bottom-2 w-1 bg-white/10 rounded-full" />
                <div className="absolute -left-6 top-2 h-1/3 w-1 bg-[#e8a000] rounded-full shadow-[0_0_10px_#e8a000]" />

                {isEmojiGuess ? (
                  <h3 className="text-5xl lg:text-6xl tracking-widest drop-shadow-2xl">{trivia.teaser}</h3>
                ) : (
                  <>
                    {trivia.title && <h3 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight mb-3 drop-shadow-lg">{trivia.title}</h3>}
                    <p className="text-white/70 text-base lg:text-lg leading-relaxed font-medium">{trivia.teaser}</p>
                  </>
                )}
                {error && <p className="text-sm text-red-400 mt-4 font-bold tracking-wide flex items-center gap-2"><X size={16} /> {error}</p>}
              </div>

              {/* Interaction Area */}
              {!hasAnswered ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                  {choices.map((choice, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onAnswer(choice)}
                      disabled={answerLoading}
                      className="group relative flex items-center p-4 lg:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden transition-all hover:bg-white/10 hover:border-[#e8a000]/50 hover:shadow-[0_0_30px_rgba(232,160,0,0.15)] disabled:opacity-50 text-left"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-[#e8a000] transition-colors" />
                      <div className="w-8 h-8 shrink-0 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center mr-4 font-black text-xs text-white/40 group-hover:text-[#e8a000] group-hover:border-[#e8a000]/30 transition-all">
                        {ALPHABET[idx]}
                      </div>
                      <span className="text-sm lg:text-base font-bold text-white/80 group-hover:text-white transition-colors">{choice}</span>
                    </motion.button>
                  ))}
                </div>
              ) : (
                /* Cinematic Results State */
                <div className="space-y-6">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className={`relative overflow-hidden rounded-3xl p-6 lg:p-8 border flex flex-col justify-center shadow-2xl ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
                      }`}
                  >
                    <div className={`absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_100%_0%,${isCorrect ? '#10b981' : '#ef4444'},transparent_60%)]`} />

                    <div className="relative z-10 flex items-start gap-5">
                      <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-2xl ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                        {isCorrect ? <Flame size={28} className="animate-pulse" /> : <X size={28} strokeWidth={3} />}
                      </div>
                      <div>
                        <h4 className={`text-2xl lg:text-3xl font-black tracking-tighter uppercase mb-1 ${isCorrect ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}>
                          {isCorrect ? 'Target Hit!' : 'Target Missed!'}
                        </h4>
                        <p className="text-white/70 font-medium text-sm lg:text-base">
                          {isCorrect ? (
                            <span className="flex items-center gap-1.5">You secured <strong className="text-emerald-300">+{xpAwarded} XP</strong></span>
                          ) : (
                            <span>The correct intel was <strong className="text-white">{correctAnswer}</strong></span>
                          )}
                        </p>
                      </div>
                    </div>

                    {reveal && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6 pt-5 border-t border-white/10 flex gap-3">
                        <Sparkles size={18} className="text-white/40 shrink-0" />
                        <p className="text-white/60 text-sm leading-relaxed">{reveal}</p>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* High-tech Action Bar */}
                  {countdown !== null && currentIndex < totalTrivias - 1 && (
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                      <div className="flex items-center gap-4">
                        <div className="relative w-10 h-10 flex items-center justify-center">
                          <svg className="absolute inset-0 w-10 h-10 -rotate-90">
                            <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="3" fill="none" className="text-white/10" />
                            <circle
                              cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="3" fill="none"
                              strokeDasharray={113} strokeDashoffset={113 - (countdown / 10) * 113}
                              className="text-[#e8a000] transition-all duration-1000 ease-linear"
                            />
                          </svg>
                          <span className="text-xs font-black text-white absolute">{countdown}</span>
                        </div>
                        <span className="text-xs font-bold text-white/50 uppercase tracking-[0.2em]">Next Sequence</span>
                      </div>
                      <button
                        onClick={onSkip}
                        className="group flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl transition-all active:scale-95"
                      >
                        Override <ChevronRight size={16} className="text-[#e8a000] group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full py-20 text-center">
              <Brain size={48} className="text-white/10 mb-4" />
              <p className="text-white/40 text-lg font-bold tracking-wide uppercase">No Active Missions</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ────────────────────────────────────────────────────────── */
/*  MISSION CONTROL WIDGETS (Right Column)                    */
/* ────────────────────────────────────────────────────────── */
const MissionControlSidebar = ({ clip, polls, streamers }: { clip: ClipPost | null, polls: Poll[], streamers: Streamer[] }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
    className="col-span-12 lg:col-span-5 flex flex-col gap-4 lg:gap-6"
  >
    {/* Top Widget: Featured Clip (Media Player Vibe) */}
    <div className="relative rounded-[2rem] bg-white/5 border border-white/10 p-6 lg:p-8 overflow-hidden group hover:bg-white/[0.07] transition-all flex flex-col min-h-[250px]">
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px] pointer-events-none" />

      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Film size={18} />
          </div>
          <span className="text-xs font-black tracking-[0.2em] uppercase text-white/50">Top intel clip</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Rec</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center">
        {clip ? (
          <>
            <h3 className="text-xl font-black text-white tracking-tight leading-tight mb-2 group-hover:text-purple-300 transition-colors">
              {clip.title || 'Classified Footage'}
            </h3>
            {clip.author?.ign && <p className="text-xs text-white/40 font-bold uppercase tracking-widest mb-4">By {clip.author.ign}</p>}
            <p className="text-sm text-white/60 leading-relaxed line-clamp-2">{clip.content}</p>
          </>
        ) : (
          <div className="text-center py-4">
            <PlayCircle size={32} className="mx-auto text-white/20 mb-3" />
            <h3 className="text-white/40 font-bold text-base">No Broadcasts</h3>
          </div>
        )}
      </div>

      <Link
        href="/community"
        className="mt-6 flex items-center justify-between w-full p-4 rounded-xl bg-black/40 border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/10 transition-all text-xs font-bold text-white uppercase tracking-widest relative z-10"
      >
        Access Database <ChevronRight size={16} className="text-purple-400" />
      </Link>
    </div>

    {/* Bottom Widget: Live Hub (Streamers & Polls) */}
    <div className="relative rounded-[2rem] bg-white/5 border border-white/10 p-6 lg:p-8 flex-1 flex flex-col overflow-hidden group hover:bg-white/[0.07] transition-all">
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none" />

      {/* Poll Section */}
      <div className="relative z-10 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
            <BarChart3 size={18} />
          </div>
          <span className="text-xs font-black tracking-[0.2em] uppercase text-white/50">Active Directive</span>
        </div>
        <p className="text-base font-bold text-white/90 leading-snug mb-5">
          {polls[0]?.question || 'Awaiting new community directives.'}
        </p>
        {polls[0] && (
          <Link
            href="/polls"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] px-5 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:text-white hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all"
          >
            Submit Vote
          </Link>
        )}
      </div>

      <div className="w-full h-px bg-linear-to-r from-transparent via-white/10 to-transparent mb-6" />

      {/* Streamers Section */}
      <div className="relative z-10 flex-1">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Radio size={18} />
            </div>
            <span className="text-xs font-black tracking-[0.2em] uppercase text-white/50">Live Operatives</span>
          </div>
        </div>

        {streamers.length > 0 ? (
          <div className="space-y-3">
            {streamers.slice(0, 3).map((s) => (
              <a
                key={s.id}
                href={s.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-black/40 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group/streamer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-sm font-black text-white/80 uppercase shadow-inner group-hover/streamer:border-emerald-500/50 group-hover/streamer:text-emerald-400 transition-all">
                    {s.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate group-hover/streamer:text-emerald-300 transition-colors">
                      {s.name}
                    </p>
                    <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase mt-0.5">{s.platform}</p>
                  </div>
                </div>
                <ExternalLink size={16} className="text-white/20 group-hover/streamer:text-emerald-400 shrink-0 transition-colors" />
              </a>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-center">
            <p className="text-white/30 text-xs font-bold uppercase tracking-wider">No operatives currently deployed.</p>
          </div>
        )}
      </div>
    </div>
  </motion.div>
)

/* ────────────────────────────────────────────────────────── */
/*  Main Component Export                                     */
/* ────────────────────────────────────────────────────────── */
export function CommunityHighlights() {
  const {
    triviaState,
    clip,
    polls,
    streamers,
    loading,
    triviaImage,
    triviaError,
    triviaAnswerLoading,
    handleTriviaAnswer,
    skipToNextTrivia,
  } = useCommunityData()

  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section ref={sectionRef} className="relative bg-[#020203] overflow-hidden py-16 lg:py-24">
      {/* ── Environment Design (Background) ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Deep ambient glows */}
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-[#e8a000]/5 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[120px] mix-blend-screen" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '64px 64px' }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Epic Section Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-[#e8a000]" />
              <span className="text-[#e8a000] text-xs font-black tracking-[0.3em] uppercase">Comms Link Active</span>
            </div>
            <h2 className="text-white font-black text-4xl sm:text-5xl lg:text-6xl tracking-tighter uppercase">
              Community <span className="text-transparent bg-clip-text bg-linear-to-r from-white/40 to-white/10">Hub</span>
            </h2>
          </div>
          <Link
            href="/community"
            className="group flex items-center gap-3 text-white bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95"
          >
            <span className="text-xs font-black uppercase tracking-[0.2em]">Enter Hub</span>
            <div className="w-8 h-8 rounded-full bg-[#e8a000]/20 flex items-center justify-center group-hover:bg-[#e8a000] group-hover:text-black transition-colors">
              <ChevronRight size={16} />
            </div>
          </Link>
        </motion.div>

        {/* Bento Box Asymmetrical Grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skeleton" className="grid grid-cols-12 gap-4 lg:gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SkeletonBlock className="col-span-12 lg:col-span-7 min-h-[550px]" />
              <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 lg:gap-6">
                <SkeletonBlock className="flex-1" />
                <SkeletonBlock className="flex-1" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              className="grid grid-cols-12 gap-4 lg:gap-6"
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <TriviaCinematicStage
                triviaState={triviaState}
                imageUrl={triviaImage}
                onAnswer={handleTriviaAnswer}
                onSkip={skipToNextTrivia}
                error={triviaError}
                answerLoading={triviaAnswerLoading}
              />
              <MissionControlSidebar clip={clip} polls={polls} streamers={streamers} />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  )
}