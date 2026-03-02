'use client'

import { useEffect, useState } from 'react'

type Streamer = {
  id: string
  name: string
  platform: string
  handle: string
  profileUrl: string
  imageUrl?: string | null
}

export default function StreamersPage() {
  const [streamers, setStreamers] = useState<Streamer[]>([])

  useEffect(() => {
    fetch('/api/streamers/spotlight')
      .then((response) => response.json())
      .then((data) => setStreamers(data?.streamers || []))
      .catch(() => undefined)
  }, [])

  return (
    <main className="min-h-screen bg-[#08080d] text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black tracking-widest uppercase">Ghana Streamer Spotlight</h1>
        <p className="text-[#777] mt-2">Weekly featured creators from the MLBB Ghana community.</p>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {streamers.map((streamer) => (
            <article key={streamer.id} className="bg-[#0d0d14] border border-white/10 p-4">
              <p className="text-lg font-bold">{streamer.name}</p>
              <p className="text-sm text-[#888] mt-1">{streamer.platform} · {streamer.handle}</p>
              <a href={streamer.profileUrl} target="_blank" rel="noreferrer" className="inline-block mt-3 text-xs text-[#e8a000] uppercase tracking-[0.2em]">
                Open Profile →
              </a>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
