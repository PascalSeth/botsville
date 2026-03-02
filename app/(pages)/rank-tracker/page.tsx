'use client'

import { useCallback, useEffect, useState } from 'react'

type Snapshot = { id: string; rankBadge: string; stars: number; recordedAt: string }
type Goal = { id: string; currentRank: string; targetRank: string; matchesPlayed: number; snapshots: Snapshot[] }

export default function RankTrackerPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [currentRank, setCurrentRank] = useState('EPIC')
  const [targetRank, setTargetRank] = useState('MYTHIC')
  const [snapshotRank, setSnapshotRank] = useState('EPIC')

  const load = useCallback(async () => {
    const response = await fetch('/api/rank-tracker/goals')
    const data = await response.json()
    setGoals(data?.goals || [])
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

  const createGoal = async () => {
    await fetch('/api/rank-tracker/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentRank, targetRank }),
    })
    load().catch(() => undefined)
  }

  const addSnapshot = async (goalId: string) => {
    await fetch(`/api/rank-tracker/goals/${goalId}/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankBadge: snapshotRank }),
    })
    load().catch(() => undefined)
  }

  const activeGoal = goals[0]

  return (
    <main className="min-h-screen bg-[#08080d] text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black tracking-widest uppercase">Rank Grind Tracker</h1>
        <p className="text-[#777] mt-2">Track current rank, target rank, matches, and progress snapshots.</p>

        <div className="mt-6 bg-[#0d0d14] border border-white/10 p-4 grid sm:grid-cols-3 gap-2">
          <input value={currentRank} onChange={(event) => setCurrentRank(event.target.value)} className="bg-[#09090f] border border-white/10 px-3 py-2 text-sm" placeholder="Current rank" />
          <input value={targetRank} onChange={(event) => setTargetRank(event.target.value)} className="bg-[#09090f] border border-white/10 px-3 py-2 text-sm" placeholder="Target rank" />
          <button onClick={createGoal} className="px-3 py-2 text-xs uppercase tracking-widest bg-[#e8a000]/10 border border-[#e8a000]/40 text-[#e8a000]">Set Goal</button>
        </div>

        {activeGoal && (
          <section className="mt-6 bg-[#0d0d14] border border-white/10 p-4">
            <p className="font-bold">Active Goal: {activeGoal.currentRank} → {activeGoal.targetRank}</p>
            <p className="text-sm text-[#888] mt-1">Matches Played: {activeGoal.matchesPlayed}</p>

            <div className="mt-4 flex gap-2">
              <input value={snapshotRank} onChange={(event) => setSnapshotRank(event.target.value)} className="bg-[#09090f] border border-white/10 px-3 py-2 text-sm" placeholder="Snapshot rank" />
              <button onClick={() => addSnapshot(activeGoal.id)} className="px-3 py-2 text-xs uppercase tracking-widest bg-[#e8a000]/10 border border-[#e8a000]/40 text-[#e8a000]">Add Snapshot</button>
            </div>

            <div className="mt-4 space-y-2">
              {activeGoal.snapshots.map((snapshot) => (
                <div key={snapshot.id} className="text-sm border border-white/5 p-2">
                  {new Date(snapshot.recordedAt).toLocaleDateString()} · {snapshot.rankBadge} · stars {snapshot.stars}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
