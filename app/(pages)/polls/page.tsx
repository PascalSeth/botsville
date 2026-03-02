"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, ThumbsUp, Loader2, RefreshCw } from "lucide-react"

type PollOption = { id: string; text: string; voteCount: number }
type Poll = { id: string; question: string; options: PollOption[] }

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [votingId, setVotingId] = useState<string | null>(null)
  const [choiceMap, setChoiceMap] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/polls")
      const data = await response.json()
      setPolls(data?.polls || [])
    } catch {
      setPolls([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const run = async () => {
      await load()
      if (!mounted) return
    }
    run().catch(() => undefined)
    return () => {
      mounted = false
    }
  }, [load])

  const vote = async (pollId: string, optionId: string) => {
    if (votingId) return
    setVotingId(`${pollId}:${optionId}`)
    setChoiceMap((prev) => ({ ...prev, [pollId]: optionId }))

    // Optimistic update so the UI feels instant
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id !== pollId) return poll
        return {
          ...poll,
          options: poll.options.map((opt) =>
            opt.id === optionId ? { ...opt, voteCount: opt.voteCount + 1 } : opt,
          ),
        }
      }),
    )

    try {
      await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      })
      load().catch(() => undefined)
    } catch {
      // Revert on error
      setPolls((prev) =>
        prev.map((poll) => {
          if (poll.id !== pollId) return poll
          return {
            ...poll,
            options: poll.options.map((opt) =>
              opt.id === optionId ? { ...opt, voteCount: Math.max(0, opt.voteCount - 1) } : opt,
            ),
          }
        }),
      )
    }

    setVotingId(null)
  }

  return (
    <main className="min-h-screen bg-[#08080d] text-white px-4 sm:px-8 pb-14">
      <div className="relative max-w-4xl mx-auto pt-10">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/8 bg-linear-to-br from-[#11111b] via-[#0b0b13] to-[#0d0d18] px-5 sm:px-8 py-6 sm:py-8 shadow-[0_12px_60px_rgba(0,0,0,0.35)]"
        >
          <div className="absolute inset-0 opacity-50" aria-hidden>
            <div className="absolute -left-16 -top-10 w-52 h-52 rounded-full bg-[#e8a000]/15 blur-3xl" />
            <div className="absolute -right-24 bottom-0 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />
          </div>

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#e8a000]/15 border border-[#e8a000]/25 text-[#e8a000]">
              <Sparkles size={22} />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Pulse Check: Polls</h1>
              <p className="text-sm text-zinc-400 mt-1">Cast your vote, see what the community thinks, and watch results animate live.</p>
            </div>
            <button
              onClick={() => load()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border border-white/10 bg-white/5 hover:border-[#e8a000]/40 hover:text-[#e8a000] transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </motion.div>

        <div className="mt-8 space-y-5">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3"
              >
                <div className="h-4 w-2/3 bg-white/10 rounded animate-pulse" />
                <div className="space-y-2">
                  {[1, 2, 3].map((k) => (
                    <div key={k} className="h-10 bg-white/5 rounded-lg animate-pulse" />
                  ))}
                </div>
              </motion.div>
            ))
          ) : polls.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center"
            >
              <p className="text-lg font-semibold">No polls yet.</p>
              <p className="text-sm text-zinc-500 mt-1">Check back soon or request a topic in the community feed.</p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {polls.map((poll) => {
                const totalVotes = poll.options.reduce((sum, o) => sum + o.voteCount, 0)

                return (
                  <motion.article
                    key={poll.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-[#0f0f17] via-[#0b0b12] to-[#0e0e15] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
                  >
                    <div className="absolute inset-0 opacity-30" aria-hidden>
                      <div className="absolute -left-10 top-1/3 w-40 h-40 bg-[#e8a000]/10 blur-3xl" />
                      <div className="absolute right-0 bottom-0 w-44 h-44 bg-purple-500/10 blur-3xl" />
                    </div>

                    <div className="relative">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#e8a000]">
                          <ThumbsUp size={16} />
                        </div>
                        <div className="flex-1">
                          <h2 className="text-lg font-bold leading-tight text-white">{poll.question}</h2>
                          <p className="text-xs text-zinc-500 mt-1">{totalVotes.toLocaleString()} votes</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {poll.options.map((option) => {
                          const selected = choiceMap[poll.id] === option.id
                          const percent = totalVotes ? Math.round((option.voteCount / totalVotes) * 100) : 0
                          const isVoting = votingId?.startsWith(poll.id)
                          const isActiveVote = votingId === `${poll.id}:${option.id}`

                          return (
                            <button
                              key={option.id}
                              onClick={() => vote(poll.id, option.id)}
                              disabled={isVoting}
                              className="relative w-full overflow-hidden rounded-xl border border-white/8 bg-white/3 px-3 py-3 text-left transition-all hover:border-[#e8a000]/40 focus:outline-none"
                            >
                              <div
                                className="absolute inset-0 bg-gradient-to-r from-[#e8a000]/12 via-[#e8a000]/8 to-transparent"
                                style={{ width: `${Math.max(percent, 6)}%` }}
                              />
                              <div className="relative flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-white">{option.text}</span>
                                  {selected && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e8a000]/20 text-[#e8a000] border border-[#e8a000]/30">Your pick</span>}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-300">
                                  <span className="font-semibold text-white">{percent}%</span>
                                  <span className="text-zinc-500">{option.voteCount.toLocaleString()}</span>
                                  {isActiveVote && <Loader2 size={14} className="animate-spin text-[#e8a000]" />}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </motion.article>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </main>
  )
}
