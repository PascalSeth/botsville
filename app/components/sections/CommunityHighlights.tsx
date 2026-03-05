'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
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
  // User answer state (set after answering)
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
  GUESS_THE_HERO: { emoji: '🧠', label: 'Guess Hero', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  HARDEST_HEROES: { emoji: '⚔️', label: 'Hard Heroes', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  FUNNY_FACTS: { emoji: '😂', label: 'Funny', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  OG_HEROES: { emoji: '👑', label: 'OG Heroes', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  POWER_ULTIMATE: { emoji: '🔥', label: 'Ultimate', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  LORE: { emoji: '🐉', label: 'Lore', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  SKIN: { emoji: '🎯', label: 'Skin', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/30' },
  EMOJI_GUESS: { emoji: '🧩', label: 'Emoji', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  GENERAL: { emoji: '💡', label: 'General', color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30' },
}

/* ────────────────────────────────────────────────────────── */
/*  Data hook                                                 */
/* ────────────────────────────────────────────────────────── */
function useCommunityData() {
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
  const [loading, setLoading] = useState(true)
  const [triviaError, setTriviaError] = useState<string | null>(null)
  const [triviaAnswerLoading, setTriviaAnswerLoading] = useState(false)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

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
      } catch {
        /* silently fail */
      } finally {
        setLoading(false)
      }
    }
    load().catch(() => undefined)

    // Cleanup countdown on unmount
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  // Pick trivia image based on current trivia
  useEffect(() => {
    let cancelled = false
    const currentTrivia = triviaState.trivias[triviaState.currentIndex]

    const pickTriviaImage = async () => {
      if (!currentTrivia) {
        setTriviaImage(null)
        return
      }

      if (currentTrivia.images?.length) {
        const firstImage = currentTrivia.images[0]
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
  }, [triviaState.trivias, triviaState.currentIndex])

  // Handle trivia answer
  const handleTriviaAnswer = async (answer: string) => {
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

  // Start 10 second countdown then advance
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

  // Skip countdown
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
const TriviaCard = ({
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { currentIndex, dailyLimit, userTotalXp, todayXp, dailyAnswered, countdown } = triviaState
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

  const stats = {
    totalAttempts: trivia?.totalAttempts ?? 0,
    correctCount: trivia?.correctCount ?? 0,
  }
  const successRate = stats.totalAttempts > 0 ? Math.round((stats.correctCount / stats.totalAttempts) * 100) : 0
  const allCompleted = totalTrivias === 0 || (currentIndex >= totalTrivias && !countdown)

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

      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#e8a000]/4 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header with XP */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#e8a000]/15 border border-[#e8a000]/30 text-[#e8a000]">
              <Brain size={14} />
            </div>
            <div>
              <span className="text-[10px] font-semibold tracking-wide uppercase text-[#e8a000]">Daily Quiz</span>
              <p className="text-[10px] text-zinc-500">{currentIndex + 1}/{dailyLimit} • +{todayXp} XP today</p>
            </div>
          </div>
          {trivia && !allCompleted && (
            <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-1 rounded-full border ${categoryConfig.bg} ${categoryConfig.color}`}>
              {categoryConfig.emoji} {categoryConfig.label}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full bg-[#e8a000]"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((dailyAnswered / dailyLimit) * 100, 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <AnimatePresence mode="wait">
          {allCompleted ? (
            /* All done state */
            <motion.div
              key="completed"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-4 space-y-3"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Check size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">All Done for Today!</p>
                <p className="text-zinc-500 text-[11px] mt-1">Completed {dailyAnswered} quiz{dailyAnswered !== 1 ? 'zes' : ''}</p>
              </div>
              <div className="bg-[#e8a000]/10 border border-[#e8a000]/30 rounded-lg px-3 py-2 inline-block">
                <p className="text-[10px] text-zinc-400">XP Earned Today</p>
                <p className="text-[#e8a000] font-black text-lg">+{todayXp} XP</p>
              </div>
            </motion.div>
          ) : trivia ? (
            <motion.div key={trivia.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Question */}
              {isEmojiGuess ? (
                <div className="text-center py-2 mb-3">
                  <p className="text-2xl leading-relaxed tracking-wider">{trivia.teaser}</p>
                  <p className="text-zinc-500 text-[10px] mt-1">Guess the hero!</p>
                </div>
              ) : (
                <>
                  {trivia.title && <h3 className="text-white font-bold text-base leading-snug mb-1">{trivia.title}</h3>}
                  <p className="text-white/50 text-sm leading-relaxed mb-3">{trivia.teaser}</p>
                </>
              )}

              {error && <p className="text-[11px] text-red-300 mb-2">{error}</p>}

              {!hasAnswered ? (
                /* Choice buttons */
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {choices.map((choice, idx) => (
                      <button
                        key={idx}
                        onClick={() => onAnswer(choice)}
                        disabled={answerLoading}
                        className="flex items-center justify-center rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-[11px] font-semibold text-zinc-200 transition-all hover:border-[#e8a000]/40 hover:bg-[#e8a000]/10 hover:text-white disabled:opacity-50 active:scale-95"
                      >
                        {answerLoading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-3 h-3 border-2 border-zinc-500 border-t-white rounded-full"
                          />
                        ) : (
                          choice
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-600 text-center mt-2">
                    {stats.totalAttempts > 0 ? `${stats.totalAttempts} attempts • ${successRate}% success` : 'Be the first!'}
                  </p>
                </>
              ) : (
                /* Result */
                <>
                  <div className={`rounded-lg border p-3 mb-3 ${isCorrect ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {isCorrect ? (
                        <>
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <Check size={12} className="text-emerald-400" />
                          </div>
                          <span className="text-emerald-400 font-bold text-sm">Correct! +{xpAwarded} XP</span>
                        </>
                      ) : (
                        <>
                          <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                            <X size={12} className="text-red-400" />
                          </div>
                          <span className="text-red-400 font-bold text-sm">Wrong!</span>
                        </>
                      )}
                    </div>
                    <p className="text-zinc-400 text-[10px]">
                      Your answer: <span className={isCorrect ? 'text-emerald-300' : 'text-red-300'}>{userAnswer}</span>
                    </p>
                    {!isCorrect && correctAnswer && (
                      <p className="text-zinc-400 text-[10px]">
                        Correct: <span className="text-emerald-300">{correctAnswer}</span>
                      </p>
                    )}
                  </div>

                  {/* Choices with indicators */}
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {choices.map((choice, idx) => {
                      const isUserChoice = choice === userAnswer
                      const isRightAnswer = choice === correctAnswer
                      let btnClass = 'border-white/5 bg-white/2 text-zinc-500'
                      if (isRightAnswer) btnClass = 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      else if (isUserChoice && !isCorrect) btnClass = 'border-red-500/40 bg-red-500/15 text-red-300'
                      return (
                        <div key={idx} className={`flex items-center justify-center rounded-lg border px-2 py-1.5 text-[10px] font-semibold ${btnClass}`}>
                          {choice}
                          {isRightAnswer && <Check size={10} className="ml-1 text-emerald-400" />}
                          {isUserChoice && !isCorrect && <X size={10} className="ml-1 text-red-400" />}
                        </div>
                      )
                    })}
                  </div>

                  {/* Reveal */}
                  {reveal && (
                    <div className={`rounded-lg border p-2.5 mb-3 ${categoryConfig.bg}`}>
                      <p className="text-white text-[11px] leading-relaxed">{reveal}</p>
                    </div>
                  )}

                  {/* Countdown */}
                  {countdown !== null && currentIndex < totalTrivias - 1 && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="relative w-7 h-7">
                          <svg className="w-7 h-7 -rotate-90">
                            <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2" fill="none" className="text-white/10" />
                            <circle
                              cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2" fill="none"
                              strokeDasharray={75} strokeDashoffset={75 - (countdown / 10) * 75}
                              className="text-[#e8a000] transition-all duration-1000"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">{countdown}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">Next in {countdown}s</span>
                      </div>
                      <button
                        onClick={onSkip}
                        className="text-[9px] font-bold uppercase tracking-wider text-[#e8a000] hover:text-white transition-colors flex items-center gap-0.5"
                      >
                        Skip <ChevronRight size={12} />
                      </button>
                    </div>
                  )}

                  {countdown !== null && currentIndex >= totalTrivias - 1 && (
                    <p className="text-[10px] text-zinc-500 text-center pt-2 border-t border-white/10">Last one! Come back tomorrow.</p>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-zinc-500 text-sm">
              No active trivia. Check back soon!
            </motion.p>
          )}
        </AnimatePresence>
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
              <TriviaCard
                triviaState={triviaState}
                imageUrl={triviaImage}
                onAnswer={handleTriviaAnswer}
                onSkip={skipToNextTrivia}
                error={triviaError}
                answerLoading={triviaAnswerLoading}
              />
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
