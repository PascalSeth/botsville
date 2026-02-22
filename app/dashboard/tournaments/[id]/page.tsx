"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { dashboardFetch } from "../../lib/api";

type Tournament = {
  id: string;
  name: string;
  subtitle: string | null;
  status: string;
  format: string;
  date: string;
  location: string;
  isOnline: boolean;
  slots: number;
  season?: { id: string; name: string } | null;
  _count?: { registrations: number; matches: number };
};

export default function TournamentDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error: err } = await dashboardFetch<Tournament>(`/api/tournaments/${id}`);
      setLoading(false);
      if (err) {
        setError(err);
        setTournament(null);
        return;
      }
      setTournament(data ?? null);
    })();
  }, [id]);

  if (!id) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/tournaments" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider">← Tournaments</Link>
        <p className="text-[#666]">Missing tournament ID.</p>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-[#666]">Loading...</div>;
  if (error) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/tournaments" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider">← Tournaments</Link>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      </div>
    );
  }
  if (!tournament) return <div className="p-8 text-[#666]">Tournament not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/dashboard/tournaments" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider">← Tournaments</Link>
        <Link
          href={`/dashboard/matches?tournamentId=${tournament.id}`}
          className="px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800]"
        >
          View matches
        </Link>
      </div>
      <div>
        <h1 className="font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em]">
          {tournament.name}
        </h1>
        {tournament.subtitle && <p className="mt-1 text-[#888]">{tournament.subtitle}</p>}
      </div>
      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Status</p>
          <p className="text-white font-semibold mt-1">{tournament.status}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Format</p>
          <p className="text-white font-semibold mt-1">{tournament.format.replace(/_/g, " ")}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Season</p>
          <p className="text-white font-semibold mt-1">{tournament.season?.name ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Date</p>
          <p className="text-white font-semibold mt-1">{new Date(tournament.date).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Location</p>
          <p className="text-white font-semibold mt-1">{tournament.location} {tournament.isOnline ? "(Online)" : ""}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Slots</p>
          <p className="text-white font-semibold mt-1">{tournament.slots}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Registrations</p>
          <p className="text-white font-semibold mt-1">{tournament._count?.registrations ?? 0}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Matches</p>
          <p className="text-white font-semibold mt-1">{tournament._count?.matches ?? 0}</p>
        </div>
      </div>
    </div>
  );
}
