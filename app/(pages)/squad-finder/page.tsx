'use client'

import { useCallback, useEffect, useState } from 'react'

type Listing = {
  id: string
  rankBadge: string
  preferredRole: string
  region: string
  message?: string | null
  user: { ign: string; photo?: string | null }
}

export default function SquadFinderPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [form, setForm] = useState({ rankBadge: 'MYTHIC', preferredRole: 'JUNGLE', region: 'Accra', message: '' })

  const load = useCallback(async () => {
    const response = await fetch('/api/squad-finder')
    const data = await response.json()
    setListings(data?.listings || [])
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
    await fetch('/api/squad-finder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    load().catch(() => undefined)
  }

  return (
    <main className="min-h-screen bg-[#08080d] text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black tracking-widest uppercase">Ghana Squad Finder</h1>
        <p className="text-[#777] mt-2">Find teammates by rank, role, and region.</p>

        <div className="mt-6 bg-[#0d0d14] border border-white/10 p-4 grid md:grid-cols-4 gap-2">
          <input value={form.rankBadge} onChange={(event) => setForm((prev) => ({ ...prev, rankBadge: event.target.value }))} placeholder="Rank badge" className="bg-[#09090f] border border-white/10 px-3 py-2 text-sm" />
          <input value={form.preferredRole} onChange={(event) => setForm((prev) => ({ ...prev, preferredRole: event.target.value }))} placeholder="Role" className="bg-[#09090f] border border-white/10 px-3 py-2 text-sm" />
          <input value={form.region} onChange={(event) => setForm((prev) => ({ ...prev, region: event.target.value }))} placeholder="Region" className="bg-[#09090f] border border-white/10 px-3 py-2 text-sm" />
          <button onClick={submit} className="px-3 py-2 text-xs bg-[#e8a000]/10 border border-[#e8a000]/40 text-[#e8a000] uppercase tracking-widest">Join Finder</button>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-3">
          {listings.map((listing) => (
            <article key={listing.id} className="bg-[#0d0d14] border border-white/10 p-4">
              <p className="text-lg font-bold">{listing.user.ign}</p>
              <p className="text-sm text-[#aaa] mt-1">{listing.rankBadge} · {listing.preferredRole} · {listing.region}</p>
              <p className="text-sm text-[#777] mt-2">{listing.message || 'Ready to grind rank with disciplined comms.'}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
