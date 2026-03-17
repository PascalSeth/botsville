"use client";

import { useState, useEffect, useCallback } from "react";
import { dashboardFetch } from "../lib/api";
import { Loader2, CheckCircle, RefreshCw, BarChart3, Trash2 } from "lucide-react";
import Link from "next/link";

type Tournament = { id: string; name: string; status: string };
type Match = {
  id: string;
  stage: string;
  status: string;
  scoreA: number;
  scoreB: number;
  scheduledTime: string;
  bestOf: number;
  teamA?: { id: string; name: string; tag: string } | null;
  teamB?: { id: string; name: string; tag: string } | null;
  winner?: { id: string; name: string } | null;
  challengeRequest?: { id?: string; status?: string } | null;
};

export default function DashboardMatchesPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMatchId, setResultMatchId] = useState<string | null>(null);
  const [resultWinnerId, setResultWinnerId] = useState("");
  const [resultScoreA, setResultScoreA] = useState(2);
  const [resultScoreB, setResultScoreB] = useState(0);
  const [resultForfeit, setResultForfeit] = useState(false);
  const [submittingResult, setSubmittingResult] = useState(false);
  const [resultSuccess, setResultSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Per-game winners: map game number (1, 2, 3...) to winner team ID
  const [gameWinners, setGameWinners] = useState<Record<number, string>>({});

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const openResultPanel = (m: Match) => {
    if (resultMatchId === m.id) { setResultMatchId(null); return; }
    setResultMatchId(m.id);
    setResultWinnerId(m.teamA?.id ?? "");
    setResultScoreA(2);
    setResultScoreB(0);
    setResultForfeit(false);
    setResultSuccess(null);
    setError(null);
    // Reset per-game winners
    setGameWinners({});
  };

  const submitResult = async (match: Match) => {
    // Calculate scores from game winners if provided
    let finalScoreA = resultScoreA;
    let finalScoreB = resultScoreB;
    let finalWinnerId = resultWinnerId;
    const gameWinnerEntries = Object.entries(gameWinners);
    
    // If per-game winners are specified, calculate scores from them
    if (gameWinnerEntries.length > 0) {
      finalScoreA = gameWinnerEntries.filter(([game, winnerId]) => winnerId === match.teamA?.id).length;
      finalScoreB = gameWinnerEntries.filter(([game, winnerId]) => winnerId === match.teamB?.id).length;
      
      // Determine overall winner based on scores
      if (finalScoreA > finalScoreB) {
        finalWinnerId = match.teamA?.id ?? "";
      } else if (finalScoreB > finalScoreA) {
        finalWinnerId = match.teamB?.id ?? "";
      }
    }
    
    if (!finalWinnerId) { setError("Select a winner"); return; }
    setSubmittingResult(true);
    setError(null);
    setResultSuccess(null);
    
    // Convert gameWinners object to array format
    const gameWinnersArray = gameWinnerEntries.length > 0 
      ? gameWinnerEntries.map(([gameNum, winnerId]) => ({
          gameNumber: parseInt(gameNum),
          winnerTeamId: winnerId,
        }))
      : undefined;
    
    const { data, error: err } = await dashboardFetch<{ message: string }>(
      `/api/matches/${match.id}/result`,
      {
        method: "POST",
        body: JSON.stringify({
          winnerId: finalWinnerId,
          scoreA: finalScoreA,
          scoreB: finalScoreB,
          forfeit: resultForfeit,
          forfeitedTeamId: resultForfeit
            ? (finalWinnerId === match.teamA?.id ? match.teamB?.id : match.teamA?.id)
            : undefined,
          gameWinners: gameWinnersArray,
        }),
      }
    );
    setSubmittingResult(false);
    if (err) { setError(err); return; }
    setResultSuccess(data?.message ?? "Result submitted");
    setResultMatchId(null);
    await loadMatches();
  };

  const handleGameWinnerChange = (gameNumber: number, winnerId: string) => {
    setGameWinners(prev => {
      const updated = { ...prev };
      if (winnerId === "") {
        delete updated[gameNumber];
      } else {
        updated[gameNumber] = winnerId;
      }
      return updated;
    });
  };

  const handleDeleteMatch = async (match: Match) => {
    if (!confirm(`Delete match ${match.id}? This cannot be undone.`)) return;
    setDeletingId(match.id);
    setError(null);
    const { error: err } = await dashboardFetch(`/api/matches/${match.id}`, { method: "DELETE" });
    setDeletingId(null);
    if (err) { setError(err); return; }
    // refresh list
    await loadMatches();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-black text-2xl text-white uppercase tracking-[0.08em]">
            Matches
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            View and manage tournament matches. Enter results to update standings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadMatches()}
          disabled={loadingMatches}
          className="flex items-center gap-2 px-3 py-2 border border-white/10 text-white text-xs font-black uppercase tracking-wider hover:border-[#e8a000]/50 disabled:opacity-50"
        >
          <RefreshCw size={12} className={loadingMatches ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Tournament selector */}
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

      {/* Matches table */}
      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e8a000]">
            Tournament Matches
          </span>
          {selectedTournamentId && (
            <span className="text-[10px] font-black text-[#555] tabular-nums">
              {matches.length} matches
            </span>
          )}
        </div>
        {loadingTournaments || loadingMatches ? (
          <div className="p-8 text-center text-[#666] flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Loading...
          </div>
        ) : !selectedTournamentId ? (
          <div className="p-8 text-center text-[#666]">Select a tournament above.</div>
        ) : matches.length === 0 ? (
          <div className="p-8 text-center text-[#666]">No matches for this tournament.</div>
        ) : (
          <div className="overflow-x-auto">
            {resultSuccess && (
              <div className="m-3 border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 flex items-center gap-2">
                <CheckCircle size={14} /> {resultSuccess}
              </div>
            )}
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                  <th className="p-3">Stage</th>
                  <th className="p-3">Team A</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Team B</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Scheduled</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <>
                    <tr key={m.id} className="border-b border-white/5 hover:bg-white/2">
                      <td className="p-3 text-[#aaa] text-sm">
                        <div className="flex items-center gap-2">
                          <span>{m.stage ?? "—"}</span>
                          {m.challengeRequest?.id && (
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#ffdd57] bg-[#332b00] px-2 py-0.5 rounded">Challenge (friendly)</span>
                          )}
                        </div>
                      </td>
                      <td className={`p-3 font-semibold ${m.winner?.id === m.teamA?.id ? "text-emerald-400" : "text-white"}`}>
                        {m.teamA?.name ?? "TBD"}
                      </td>
                      <td className="p-3 text-[#e8a000] font-mono font-bold">
                        {m.scoreA} – {m.scoreB}
                      </td>
                      <td className={`p-3 font-semibold ${m.winner?.id === m.teamB?.id ? "text-emerald-400" : "text-white"}`}>
                        {m.teamB?.name ?? "TBD"}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          m.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400" :
                          m.status === "LIVE" ? "bg-red-500/20 text-red-400" :
                          "bg-[#e8a000]/20 text-[#e8a000]"
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="p-3 text-[#666] text-sm">
                        {m.scheduledTime ? new Date(m.scheduledTime).toLocaleString() : "—"}
                      </td>
                      <td className="p-3 flex items-center gap-2">
                        <Link
                          href={`/dashboard/matches/${m.id}`}
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-white/20 text-[#aaa] hover:border-[#e8a000] hover:text-[#e8a000] transition-colors flex items-center gap-1"
                        >
                          <BarChart3 size={10} /> KDA
                        </Link>
                        {(m.status === "UPCOMING" || m.status === "LIVE") && (
                          <button
                            type="button"
                            onClick={() => openResultPanel(m)}
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 border transition-colors ${
                              resultMatchId === m.id
                                ? "border-[#e8a000] text-[#e8a000] bg-[#e8a000]/10"
                                : "border-white/20 text-[#aaa] hover:border-[#e8a000] hover:text-[#e8a000]"
                            }`}
                          >
                            {resultMatchId === m.id ? "Cancel" : "Enter Result"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMatch(m)}
                          disabled={deletingId === m.id}
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-white/20 text-[#aaa] hover:border-red-400 hover:text-red-400 transition-colors flex items-center gap-1"
                        >
                          {deletingId === m.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={10} />}
                          Delete
                        </button>
                      </td>
                    </tr>
                    {resultMatchId === m.id && (
                      <tr key={`${m.id}-result`} className="bg-[#0d0d14]">
                        <td colSpan={7} className="p-4">
                          <div className="border border-[#e8a000]/30 rounded p-4 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-[#e8a000] mb-2">
                              Submit Result — {m.stage ?? m.id} (BO{m.bestOf})
                            </p>
                            {m.challengeRequest?.id && (
                              <div className="rounded border border-yellow-600/20 bg-yellow-600/10 px-3 py-2 text-sm text-yellow-200">
                                This match was scheduled from a challenge. It is treated as a friendly — points and standings will not be updated unless you check &quot;Override points&quot; below.
                              </div>
                            )}
                            <div className="flex flex-wrap gap-4 items-end">
                              <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">
                                  Winner
                                </label>
                                <select
                                  value={resultWinnerId}
                                  onChange={(e) => setResultWinnerId(e.target.value)}
                                  className="bg-[#0a0a0f] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                                >
                                  <option value="">— select winner —</option>
                                  {m.teamA && <option value={m.teamA.id}>{m.teamA.name}</option>}
                                  {m.teamB && <option value={m.teamB.id}>{m.teamB.name}</option>}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">
                                  {m.teamA?.name ?? "Team A"} games won
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={m.bestOf}
                                  value={resultScoreA}
                                  onChange={(e) => setResultScoreA(Number(e.target.value))}
                                  className="w-20 bg-[#0a0a0f] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">
                                  {m.teamB?.name ?? "Team B"} games won
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={m.bestOf}
                                  value={resultScoreB}
                                  onChange={(e) => setResultScoreB(Number(e.target.value))}
                                  className="w-20 bg-[#0a0a0f] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                                />
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={resultForfeit}
                                  onChange={(e) => setResultForfeit(e.target.checked)}
                                  className="accent-[#e8a000] w-4 h-4"
                                />
                                <span className="text-[11px] text-[#aaa] uppercase tracking-wider font-bold">
                                  Forfeit (-1 pt to loser)
                                </span>
                              </label>
                              <button
                                type="button"
                                disabled={submittingResult || (!resultWinnerId && Object.keys(gameWinners).length === 0)}
                                onClick={() => submitResult(m)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50"
                              >
                                {submittingResult ? <Loader2 size={12} className="animate-spin" /> : null}
                                Confirm Result
                              </button>
                            </div>
                            {/* Per-game winners section */}
                            {m.bestOf > 1 && (
                              <div className="mt-4 pt-4 border-t border-white/10">
                                <p className="text-[10px] font-black uppercase tracking-wider text-[#666] mb-3">
                                  Per-Game Winners (optional — select winner for each game)
                                </p>
                                <div className="flex flex-wrap gap-3">
                                  {Array.from({ length: m.bestOf }, (_, i) => i + 1).map((gameNum) => (
                                    <div key={gameNum} className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-[#888] w-12">
                                        Game {gameNum}
                                      </span>
                                      <select
                                        value={gameWinners[gameNum] || ""}
                                        onChange={(e) => handleGameWinnerChange(gameNum, e.target.value)}
                                        className="bg-[#0a0a0f] border border-white/10 text-white px-2 py-1 text-xs outline-none focus:border-[#e8a000]/50 w-32"
                                      >
                                        <option value="">— select —</option>
                                        {m.teamA && <option value={m.teamA.id}>{m.teamA.tag || m.teamA.name}</option>}
                                        {m.teamB && <option value={m.teamB.id}>{m.teamB.tag || m.teamB.name}</option>}
                                      </select>
                                    </div>
                                  ))}
                                </div>
                                {Object.keys(gameWinners).length > 0 && (
                                  <p className="mt-2 text-[10px] text-[#888]">
                                    Calculated result: {m.teamA?.tag || "Team A"} {Object.values(gameWinners).filter(w => w === m.teamA?.id).length} - {Object.values(gameWinners).filter(w => w === m.teamB?.id).length} {m.teamB?.tag || "Team B"}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
