"use client";

import { useState, useEffect, useCallback } from "react";
import { dashboardFetch } from "../lib/api";
import { Swords } from "lucide-react";

type Tournament = { id: string; name: string; status: string };
type Match = {
  id: string;
  stage: string;
  status: string;
  scoreA: number;
  scoreB: number;
  scheduledTime: string;
  teamA?: { id: string; name: string; tag: string } | null;
  teamB?: { id: string; name: string; tag: string } | null;
  winner?: { id: string; name: string } | null;
};

export default function DashboardMatchesPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingTournaments(true);
      const { data, error: err } = await dashboardFetch<{ tournaments: Tournament[] }>("/api/tournaments?limit=100");
      setLoadingTournaments(false);
      if (err) {
        setError(err);
        setTournaments([]);
        return;
      }
      setTournaments(data?.tournaments ?? []);
      if (data?.tournaments?.length && !selectedTournamentId) {
        setSelectedTournamentId(data.tournaments[0].id);
      }
    })();
  }, []);

  const loadMatches = useCallback(async () => {
    if (!selectedTournamentId) {
      setMatches([]);
      return;
    }
    setLoadingMatches(true);
    const { data, error: err } = await dashboardFetch<Match[]>(
      `/api/tournaments/${selectedTournamentId}/matches`
    );
    setLoadingMatches(false);
    if (err) {
      setError(err);
      setMatches([]);
      return;
    }
    setError(null);
    setMatches(Array.isArray(data) ? data : []);
  }, [selectedTournamentId]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em]">
          Matches
        </h1>
        <p className="mt-1 text-sm text-[#888]">
          View matches by tournament. Enter scores and resolve disputes from tournament detail.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-4">
        <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-2">
          Tournament
        </label>
        <select
          value={selectedTournamentId}
          onChange={(e) => setSelectedTournamentId(e.target.value)}
          className="w-full max-w-md bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
        >
          <option value="">Select tournament</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        {loadingTournaments || loadingMatches ? (
          <div className="p-8 text-center text-[#666]">Loading...</div>
        ) : !selectedTournamentId ? (
          <div className="p-8 text-center text-[#666]">Select a tournament above.</div>
        ) : matches.length === 0 ? (
          <div className="p-8 text-center text-[#666]">No matches for this tournament.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                  <th className="p-3">Stage</th>
                  <th className="p-3">Team A</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Team B</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-[#aaa] text-sm">{m.stage}</td>
                    <td className="p-3 text-white font-semibold">{m.teamA?.name ?? "TBD"}</td>
                    <td className="p-3 text-[#e8a000] font-mono font-bold">
                      {m.scoreA} – {m.scoreB}
                    </td>
                    <td className="p-3 text-white font-semibold">{m.teamB?.name ?? "TBD"}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#e8a000]/20 text-[#e8a000]">
                        {m.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#666] text-sm">
                      {m.scheduledTime ? new Date(m.scheduledTime).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
