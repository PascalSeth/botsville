'use client'

import { useEffect, useState } from 'react'

type HeroData = {
  hero: string
  meta?: { winRate: number; banRate: number; pickRate: number; tier: string } | null
  topPlayers: Array<{ id: string; ign: string; winRate: number; role: string }>
  builds: Array<{ id: string; title: string; description?: string | null; createdBy: { ign: string } }>
  comments: Array<{ id: string; content: string; user: { ign: string } }>
}

export default function HeroMainPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('')
  const [data, setData] = useState<HeroData | null>(null)
  const [buildTitle, setBuildTitle] = useState('')
  const [comment, setComment] = useState('')

  const load = async (heroSlug: string) => {
    const response = await fetch(`/api/heroes/${heroSlug}`)
    const payload = await response.json()
    setData(payload)
  }

  useEffect(() => {
    params.then((value) => {
      setSlug(value.slug)
      load(value.slug).catch(() => undefined)
    })
  }, [params])

  const submitBuild = async () => {
    if (!buildTitle || !slug) return
    await fetch(`/api/heroes/${slug}/builds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: buildTitle }),
    })
    setBuildTitle('')
    load(slug).catch(() => undefined)
  }

  const submitComment = async () => {
    if (!comment || !slug) return
    await fetch(`/api/heroes/${slug}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: comment }),
    })
    setComment('')
    load(slug).catch(() => undefined)
  }

  return (
    <main className="min-h-screen bg-[#08080d] text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black tracking-widest uppercase">{slug || 'Hero'} Main Page</h1>
        <p className="text-[#777] mt-2">Community builds, top Ghana players, local stats, and comments.</p>

        <section className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#0d0d14] border border-white/10 p-3"><p className="text-xs text-[#777]">Win Rate</p><p className="font-bold">{data?.meta?.winRate?.toFixed?.(1) || '0.0'}%</p></div>
          <div className="bg-[#0d0d14] border border-white/10 p-3"><p className="text-xs text-[#777]">Ban Rate</p><p className="font-bold">{data?.meta?.banRate?.toFixed?.(1) || '0.0'}%</p></div>
          <div className="bg-[#0d0d14] border border-white/10 p-3"><p className="text-xs text-[#777]">Pick Rate</p><p className="font-bold">{data?.meta?.pickRate?.toFixed?.(1) || '0.0'}%</p></div>
          <div className="bg-[#0d0d14] border border-white/10 p-3"><p className="text-xs text-[#777]">Tier</p><p className="font-bold">{data?.meta?.tier || 'N/A'}</p></div>
        </section>

        <section className="mt-6 grid lg:grid-cols-2 gap-4">
          <div className="bg-[#0d0d14] border border-white/10 p-4">
            <h2 className="font-bold">Top Ghana Players</h2>
            <div className="mt-3 space-y-2">
              {data?.topPlayers?.map((player) => (
                <div key={player.id} className="text-sm border border-white/5 p-2">{player.ign} · {player.role} · {player.winRate.toFixed(1)}%</div>
              ))}
            </div>
          </div>

          <div className="bg-[#0d0d14] border border-white/10 p-4">
            <h2 className="font-bold">Community Builds</h2>
            <div className="mt-2 flex gap-2">
              <input value={buildTitle} onChange={(event) => setBuildTitle(event.target.value)} placeholder="Build title" className="flex-1 bg-[#09090f] border border-white/10 px-3 py-2 text-sm" />
              <button onClick={submitBuild} className="px-3 py-2 text-xs bg-[#e8a000]/10 border border-[#e8a000]/40 text-[#e8a000]">Add</button>
            </div>
            <div className="mt-3 space-y-2">
              {data?.builds?.map((build) => (
                <div key={build.id} className="text-sm border border-white/5 p-2">{build.title} · @{build.createdBy.ign}</div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 bg-[#0d0d14] border border-white/10 p-4">
          <h2 className="font-bold">Comments</h2>
          <div className="mt-2 flex gap-2">
            <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Drop your hero take" className="flex-1 bg-[#09090f] border border-white/10 px-3 py-2 text-sm" />
            <button onClick={submitComment} className="px-3 py-2 text-xs bg-[#e8a000]/10 border border-[#e8a000]/40 text-[#e8a000]">Send</button>
          </div>
          <div className="mt-3 space-y-2">
            {data?.comments?.map((item) => (
              <div key={item.id} className="text-sm border border-white/5 p-2">@{item.user.ign}: {item.content}</div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
