'use client'

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
    load().catch(() => undefined)
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
