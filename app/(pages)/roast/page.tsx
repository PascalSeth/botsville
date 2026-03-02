'use client'

import { useCallback, useEffect, useState } from 'react'

type Post = { id: string; content: string; author: { ign: string }; reactionScore: number }

export default function RoastPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [content, setContent] = useState('')

  const load = useCallback(async () => {
    const response = await fetch('/api/community/posts?type=ROAST')
    const data = await response.json()
    setPosts(data?.posts || [])
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

  const submit = async () => {
    if (!content) return
    await fetch('/api/community/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ROAST', content }),
    })
    setContent('')
    load().catch(() => undefined)
  }

  return (
    <main className="min-h-screen bg-[#08080d] text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black tracking-widest uppercase">Roast Section</h1>
        <p className="text-[#777] mt-2">Post your stats. Let Ghana judge. Keep it playful — reports are monitored.</p>

        <div className="mt-6 bg-[#0d0d14] border border-white/10 p-4">
          <textarea value={content} onChange={(event) => setContent(event.target.value)} className="w-full min-h-24 bg-[#09090f] border border-white/10 px-3 py-2 text-sm" placeholder="Drop your ranked stats and ask for roast..." />
          <button onClick={submit} className="mt-3 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] bg-[#e8a000]/10 border border-[#e8a000]/40 text-[#e8a000]">Post Roast</button>
        </div>

        <div className="mt-6 space-y-3">
          {posts.map((post) => (
            <article key={post.id} className="bg-[#0d0d14] border border-white/10 p-4">
              <p className="text-sm">{post.content}</p>
              <p className="text-xs text-[#777] mt-2">@{post.author.ign} · score {post.reactionScore}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
