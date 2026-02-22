"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dashboardFetch } from "../../lib/api";
import { Loader2 } from "lucide-react";

type Season = { id: string; name: string; status: string };

const FORMATS = ["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "ROUND_ROBIN", "SWISS_PLAYOFFS"];

export default function NewTournamentPage() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState("");
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [format, setFormat] = useState("SINGLE_ELIMINATION");
  const [location, setLocation] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [date, setDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [slots, setSlots] = useState(16);
  const [prizePool, setPrizePool] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error: err } = await dashboardFetch<Season[]>("/api/seasons");
      setLoadingSeasons(false);
      if (!err && Array.isArray(data)) {
        setSeasons(data);
        if (data.length) setSeasonId(data[0].id);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonId || !name || !format || !location || !date || !registrationDeadline || slots < 2) {
      setError("Fill required fields.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { data, error: err } = await dashboardFetch<{ tournament?: { id: string } }>("/api/tournaments", {
      method: "POST",
      body: JSON.stringify({
        seasonId,
        name,
        subtitle: subtitle || undefined,
        format,
        location,
        isOnline,
        date: new Date(date).toISOString(),
        registrationDeadline: new Date(registrationDeadline).toISOString(),
        slots,
        prizePool: prizePool || undefined,
      }),
    });
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    const id = (data as { tournament?: { id: string } })?.tournament?.id;
    if (id) router.push(`/dashboard/tournaments?id=${id}`);
    else router.push("/dashboard/tournaments");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/tournaments" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider">
          ← Tournaments
        </Link>
        <h1 className="font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em]">
          New tournament
        </h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-6 max-w-2xl space-y-4">
        {loadingSeasons ? (
          <p className="text-[#666]">Loading seasons...</p>
        ) : (
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Season *</label>
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              required
            >
              <option value="">Select season</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            required
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Subtitle</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Format *</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            >
              {FORMATS.map((f) => (
                <option key={f} value={f}>{f.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Slots *</label>
            <input
              type="number"
              min={2}
              value={slots}
              onChange={(e) => setSlots(parseInt(e.target.value, 10) || 2)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Location *</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Accra"
            className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            required
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isOnline"
            checked={isOnline}
            onChange={(e) => setIsOnline(e.target.checked)}
            className="accent-[#e8a000]"
          />
          <label htmlFor="isOnline" className="text-sm text-[#aaa]">Online</label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Start date *</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Registration deadline *</label>
            <input
              type="datetime-local"
              value={registrationDeadline}
              onChange={(e) => setRegistrationDeadline(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              required
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Prize pool (display)</label>
          <input
            type="text"
            value={prizePool}
            onChange={(e) => setPrizePool(e.target.value)}
            placeholder="e.g. 5,000 GHS"
            className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || loadingSeasons}
            className="px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            Create tournament
          </button>
          <Link
            href="/dashboard/tournaments"
            className="px-4 py-2 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider hover:bg-white/5"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
