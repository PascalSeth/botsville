'use client'

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react'

type Template = { id: string; name: string; imageUrl: string }
type Meme = { id: string; imageUrl: string; caption?: string | null; user: { ign: string } }

export default function MemesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [memes, setMemes] = useState<Meme[]>([])
  const [caption, setCaption] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [templateId, setTemplateId] = useState('')

  const load = async () => {
    const [templatesRes, memesRes] = await Promise.all([fetch('/api/memes/templates'), fetch('/api/memes')])
    const templatesData = await templatesRes.json()
    const memesData = await memesRes.json()
    setTemplates(templatesData?.templates || [])
    setMemes(memesData?.memes || [])
  }

  useEffect(() => {
    const t = setTimeout(() => {
      load().catch(() => undefined)
    }, 0)
    return () => clearTimeout(t)
  }, [])

  const submit = async () => {
    if (!imageUrl) return
    await fetch('/api/memes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: templateId || null, caption, imageUrl }),
    })
    setCaption('')
    setImageUrl('')
    load().catch(() => undefined)
  }

  const COMING_SOON = true

  if (COMING_SOON) {
    return (
      <main className="min-h-screen bg-[#08080d] text-white p-4 sm:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border border-[#e8a000]/30 bg-[#0d0d14] p-6 sm:p-8">
            <p className="text-[10px] font-black tracking-[0.24em] uppercase text-[#e8a000]">Meme Forge</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-black uppercase tracking-[0.08em]">Meme Generator: Coming Soon</h1>
            <p className="mt-3 text-sm text-[#a1a1aa] max-w-2xl">
              We are crafting a new meme battle station with templates, creator tools, and competitive community drops.
            </p>

            <div className="mt-6 grid sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-[#10101a] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#666] font-black">Forge Level</p>
                <p className="text-xl font-black mt-1">Level 8</p>
                <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-[84%] bg-[#e8a000]" />
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#10101a] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#666] font-black">Challenges Ready</p>
                <p className="text-xl font-black mt-1">12</p>
                <p className="text-xs text-[#888] mt-1">Daily and weekly meme quests</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#10101a] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#666] font-black">Reward Pool</p>
                <p className="text-xl font-black mt-1">Community Badges</p>
                <p className="text-xs text-[#888] mt-1">Earn rank + spotlight</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-[#10101a] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#e8a000] font-black">Build Progress</p>
              <ul className="mt-2 space-y-2 text-sm text-[#d4d4d8]">
                <li>✅ Template selector ready</li>
                <li>✅ Meme feed ready</li>
                <li>⏳ Editor experience upgrade</li>
                <li>⏳ Meme battle events integration</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#08080d] text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black tracking-widest uppercase">Meme Generator</h1>
        <p className="text-[#777] mt-2">Create and post MLBB Ghana memes with hero templates.</p>

        <div className="mt-6 bg-[#0d0d14] border border-white/10 p-4 grid md:grid-cols-4 gap-2">
          <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="bg-[#09090f] border border-white/10 px-3 py-2 text-sm">
            <option value="">Template (optional)</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
          <input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Caption" className="bg-[#09090f] border border-white/10 px-3 py-2 text-sm" />
          <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Generated meme image URL" className="bg-[#09090f] border border-white/10 px-3 py-2 text-sm" />
          <button onClick={submit} className="px-3 py-2 text-xs uppercase tracking-widest bg-[#e8a000]/10 border border-[#e8a000]/40 text-[#e8a000]">Post Meme</button>
        </div>

        <div className="mt-6 grid md:grid-cols-3 gap-3">
          {memes.map((meme) => (
            <article key={meme.id} className="bg-[#0d0d14] border border-white/10 p-3">
              <img src={meme.imageUrl} alt="meme" className="w-full h-40 object-cover border border-white/10" />
              <p className="text-xs text-[#888] mt-2">@{meme.user.ign}</p>
              <p className="text-sm mt-1">{meme.caption || 'No caption'}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
