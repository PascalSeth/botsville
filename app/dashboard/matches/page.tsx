"use client";

import { useRoleGuard } from "../lib/useRole";
import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { dashboardFetch } from "../lib/api";
import {
  Loader2,
  CheckCircle,
  RefreshCw,
  BarChart3,
  Trash2,
  Zap,
  Clock,
  Edit2,
  RotateCcw,
  Radio,
  Trophy,
  Flame,
  Check,
  Search,
  Swords,
  ShieldAlert,
  Plus,
  Minus,
} from "lucide-react";
import Link from "next/link";
import { BracketVisualization } from "@/app/components/sections/BracketVisualization";

type Tournament = { id: string; name: string; status: string };
type Match = {
  id: string;
  stage: string;
  status: string;
  scoreA: number;
  scoreB: number;
  scheduledTime: string;
  bestOf: number;
  statsFinalized?: boolean;
  streamUrl?: string | null;
  teamA?: { id: string; name: string; tag: string } | null;
  teamB?: { id: string; name: string; tag: string } | null;
  winner?: { id: string; name: string } | null;
  challengeRequest?: { id?: string; status?: string } | null;
  gameResults?: { gameNumber: number; winnerTeamId: string }[];
  performances?: Array<{ id: string; gameNumber: number; kills: number; deaths: number; assists: number }>;
};

const TOURNAMENT_STATUS_ORDER: Record<string, number> = {
  ONGOING: 0,
  OPEN: 1,
  CLOSED: 2,
  UPCOMING: 3,
  COMPLETED: 4,
  CANCELLED: 5,
};

export default function DashboardMatchesPage() {
  const { role } = useRoleGuard(["TOURNAMENT_ADMIN", "REFEREE", "COMMENTATOR", "STREAMER"]);
  const canScore = ["SUPER_ADMIN", "TOURNAMENT_ADMIN", "REFEREE", "COMMENTATOR"].includes(role ?? "");
  const canStream = ["SUPER_ADMIN", "TOURNAMENT_ADMIN", "STREAMER"].includes(role ?? "");
  const canAdmin = ["SUPER_ADMIN", "TOURNAMENT_ADMIN"].includes(role ?? "");

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTION" | "LIVE" | "UPCOMING" | "COMPLETED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Result Entry Panel State
  const [resultMatchId, setResultMatchId] = useState<string | null>(null);
  const [resultWinnerId, setResultWinnerId] = useState("");
  const [resultScoreA, setResultScoreA] = useState(0);
  const [resultScoreB, setResultScoreB] = useState(0);
  const [resultForfeit, setResultForfeit] = useState(false);
  const [forfeitedTeamId, setForfeitedTeamId] = useState<string>("");
  const [submittingResult, setSubmittingResult] = useState(false);
  const [resultSuccess, setResultSuccess] = useState<string | null>(null);
  const [lastSubmittedMatchId, setLastSubmittedMatchId] = useState<string | null>(null);
  const [gameWinners, setGameWinners] = useState<Record<number, string>>({});
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  // Bracket visualization
  const [bracketMatches, setBracketMatches] = useState<Match[]>([]);
  const [loadingBracket, setLoadingBracket] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "bracket">("table");

  // Metadata edit (time/date)
  const [editingMetadataId, setEditingMetadataId] = useState<string | null>(null);
  const [editScheduledTime, setEditScheduledTime] = useState("");
  const [updatingMetadata, setUpdatingMetadata] = useState(false);

  // Stream panel
  const [streamMatchId, setStreamMatchId] = useState<string | null>(null);
  const [streamUrlInput, setStreamUrlInput] = useState("");
  const [updatingStream, setUpdatingStream] = useState(false);

  // Actions
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcSuccess, setRecalcSuccess] = useState<string | null>(null);

  // ── Load & Sort Tournaments with Ongoing Priority ─────────────
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

      const rawList = data?.tournaments ?? [];
      const sorted = [...rawList].sort((a, b) => {
        const orderA = TOURNAMENT_STATUS_ORDER[a.status] ?? 99;
        const orderB = TOURNAMENT_STATUS_ORDER[b.status] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });

      setTournaments(sorted);

      if (sorted.length > 0 && !selectedTournamentId) {
        const ongoing = sorted.find((t) => t.status === "ONGOING") || sorted[0];
        setSelectedTournamentId(ongoing.id);
      }
    })();
  }, [selectedTournamentId]);

  const loadBracketData = useCallback(async (tournamentId: string) => {
    setLoadingBracket(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await dashboardFetch<any[]>(
      `/api/brackets/matches?tournamentId=${tournamentId}`
    );
    setLoadingBracket(false);
    if (!err && data) {
      setBracketMatches(Array.isArray(data) ? data : []);
    }
  }, []);

  const loadMatches = useCallback(async () => {
    if (!selectedTournamentId) {
      setMatches([]);
      setBracketMatches([]);
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
      setBracketMatches([]);
      return;
    }
    setError(null);
    const matchesArray = Array.isArray(data) ? data : [];
    setMatches(matchesArray);
    await loadBracketData(selectedTournamentId);
  }, [selectedTournamentId, loadBracketData]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const ongoingTournaments = useMemo(
    () => tournaments.filter((t) => t.status === "ONGOING"),
    [tournaments]
  );

  const currentTournament = useMemo(
    () => tournaments.find((t) => t.id === selectedTournamentId),
    [tournaments, selectedTournamentId]
  );

  // ── Open Fast Result Panel ────────────────────────────────────
  const openResultPanel = (m: Match) => {
    if (resultMatchId === m.id) {
      setResultMatchId(null);
      setEditingMatchId(null);
      return;
    }
    setResultMatchId(m.id);
    setLastSubmittedMatchId(null);

    const isAlreadyDone = m.status === "COMPLETED" || m.status === "FORFEITED";
    const targetWins = Math.ceil((m.bestOf || 1) / 2);

    if (isAlreadyDone) {
      setEditingMatchId(m.id);
      const winId = m.winner?.id ?? m.teamA?.id ?? "";
      const sA = m.scoreA ?? (winId === m.teamA?.id ? targetWins : 0);
      const sB = m.scoreB ?? (winId === m.teamB?.id ? targetWins : 0);

      setResultWinnerId(winId);
      setResultScoreA(sA);
      setResultScoreB(sB);
      setResultForfeit(m.status === "FORFEITED");
      setForfeitedTeamId(winId === m.teamA?.id ? m.teamB?.id ?? "" : m.teamA?.id ?? "");

      // Load per-game winners if available
      const winners: Record<number, string> = {};
      if (m.gameResults && m.gameResults.length > 0) {
        m.gameResults.forEach((gr) => {
          winners[gr.gameNumber] = gr.winnerTeamId;
        });
      } else {
        // Build sequential fallback from existing scores
        let cA = 0;
        let cB = 0;
        const total = sA + sB;
        for (let i = 1; i <= total; i++) {
          if (cA < sA) {
            winners[i] = m.teamA?.id ?? "";
            cA++;
          } else {
            winners[i] = m.teamB?.id ?? "";
            cB++;
          }
        }
      }
      setGameWinners(winners);
    } else {
      // New result: default to Team A sweep
      setEditingMatchId(null);
      setResultWinnerId(m.teamA?.id ?? "");
      setResultScoreA(targetWins);
      setResultScoreB(0);
      setResultForfeit(false);
      setForfeitedTeamId("");

      const initialGames: Record<number, string> = {};
      if (m.teamA?.id) {
        for (let i = 1; i <= targetWins; i++) {
          initialGames[i] = m.teamA.id;
        }
      }
      setGameWinners(initialGames);
    }

    setResultSuccess(null);
    setError(null);
    setEditingMetadataId(null);
    setStreamMatchId(null);
  };

  // ── Select Direct Winner (e.g. Clicking Team A or Team B) ─────
  const selectWinnerDirect = (match: Match, winnerId: string) => {
    const targetWins = Math.ceil((match.bestOf || 1) / 2);
    setResultWinnerId(winnerId);
    setResultForfeit(false);
    setForfeitedTeamId("");

    const isTeamA = winnerId === match.teamA?.id;
    const newScoreA = isTeamA ? targetWins : 0;
    const newScoreB = isTeamA ? 0 : targetWins;

    setResultScoreA(newScoreA);
    setResultScoreB(newScoreB);

    // Auto-populate game winners
    const games: Record<number, string> = {};
    for (let i = 1; i <= targetWins; i++) {
      games[i] = winnerId;
    }
    setGameWinners(games);
  };

  // ── 1-Tap Quick Score Preset Application ──────────────────────
  const applyQuickPreset = (match: Match, scoreA: number, scoreB: number, winnerId: string) => {
    setResultScoreA(scoreA);
    setResultScoreB(scoreB);
    setResultWinnerId(winnerId);
    setResultForfeit(false);
    setForfeitedTeamId("");

    const games: Record<number, string> = {};
    const loserId = winnerId === match.teamA?.id ? match.teamB?.id : match.teamA?.id;
    let countA = 0;
    let countB = 0;
    const totalPlayed = scoreA + scoreB;

    for (let i = 1; i <= totalPlayed; i++) {
      if (i === totalPlayed) {
        // Last game is always the match-deciding game for the winner
        games[i] = winnerId;
      } else if (winnerId === match.teamA?.id) {
        if (countB < scoreB) {
          games[i] = loserId ?? "";
          countB++;
        } else {
          games[i] = winnerId;
          countA++;
        }
      } else {
        if (countA < scoreA) {
          games[i] = loserId ?? "";
          countA++;
        } else {
          games[i] = winnerId;
          countB++;
        }
      }
    }
    setGameWinners(games);
  };

  // ── Adjust Score with + / - ───────────────────────────────────
  const adjustScore = (match: Match, team: "A" | "B", delta: number) => {
    const targetWins = Math.ceil((match.bestOf || 1) / 2);
    let newA = resultScoreA;
    let newB = resultScoreB;

    if (team === "A") {
      newA = Math.max(0, Math.min(match.bestOf, resultScoreA + delta));
    } else {
      newB = Math.max(0, Math.min(match.bestOf, resultScoreB + delta));
    }

    setResultScoreA(newA);
    setResultScoreB(newB);

    if (newA >= targetWins && newA > newB) {
      setResultWinnerId(match.teamA?.id ?? "");
    } else if (newB >= targetWins && newB > newA) {
      setResultWinnerId(match.teamB?.id ?? "");
    } else if (newA > newB) {
      setResultWinnerId(match.teamA?.id ?? "");
    } else if (newB > newA) {
      setResultWinnerId(match.teamB?.id ?? "");
    }

    // Build games
    const games: Record<number, string> = {};
    for (let i = 1; i <= newA; i++) {
      games[i] = match.teamA?.id ?? "";
    }
    for (let i = 1; i <= newB; i++) {
      games[newA + i] = match.teamB?.id ?? "";
    }
    setGameWinners(games);
  };

  // ── 1-Click Game Winner Toggle ─────────────────────────────────
  const handleGameWinnerPick = (match: Match, gameNum: number, teamId: string) => {
    setGameWinners((prev) => {
      const next = { ...prev, [gameNum]: teamId };
      const targetWins = Math.ceil((match.bestOf || 1) / 2);

      const countA = Object.values(next).filter((id) => id === match.teamA?.id).length;
      const countB = Object.values(next).filter((id) => id === match.teamB?.id).length;

      setResultScoreA(countA);
      setResultScoreB(countB);

      if (countA >= targetWins) {
        setResultWinnerId(match.teamA?.id ?? "");
      } else if (countB >= targetWins) {
        setResultWinnerId(match.teamB?.id ?? "");
      } else if (countA > countB) {
        setResultWinnerId(match.teamA?.id ?? "");
      } else if (countB > countA) {
        setResultWinnerId(match.teamB?.id ?? "");
      }

      return next;
    });
  };

  // ── 1-Click Forfeit Toggle ────────────────────────────────────
  const handleForfeitToggle = (match: Match, forfeitingTeamId: string) => {
    const isNowForfeit = !resultForfeit || forfeitedTeamId !== forfeitingTeamId;
    if (isNowForfeit) {
      setResultForfeit(true);
      setForfeitedTeamId(forfeitingTeamId);
      const winningTeamId = forfeitingTeamId === match.teamA?.id ? match.teamB?.id : match.teamA?.id;
      if (winningTeamId) {
        setResultWinnerId(winningTeamId);
        const targetWins = Math.ceil((match.bestOf || 1) / 2);
        if (winningTeamId === match.teamA?.id) {
          setResultScoreA(targetWins);
          setResultScoreB(0);
          setGameWinners({ 1: winningTeamId, 2: winningTeamId });
        } else {
          setResultScoreA(0);
          setResultScoreB(targetWins);
          setGameWinners({ 1: winningTeamId, 2: winningTeamId });
        }
      }
    } else {
      setResultForfeit(false);
      setForfeitedTeamId("");
    }
  };

  // ── Submit Result ─────────────────────────────────────────────
  const submitResult = async (match: Match) => {
    const targetWins = Math.ceil((match.bestOf || 1) / 2);
    let finalScoreA = resultScoreA;
    let finalScoreB = resultScoreB;
    let finalWinnerId = resultWinnerId;

    // Safety checks against draws in elimination/series matches
    if (finalScoreA === finalScoreB && !resultForfeit) {
      setError(
        `A Best of ${match.bestOf || 1} match cannot end in a draw (${finalScoreA}–${finalScoreB}). Please pick a winning score (e.g. ${targetWins}–0 or ${targetWins}–1).`
      );
      return;
    }

    if (!finalWinnerId) {
      if (finalScoreA > finalScoreB) {
        finalWinnerId = match.teamA?.id ?? "";
      } else if (finalScoreB > finalScoreA) {
        finalWinnerId = match.teamB?.id ?? "";
      } else {
        setError("Please select a winning team.");
        return;
      }
    }

    // Ensure winner matches higher score
    if (finalScoreA > finalScoreB && finalWinnerId !== match.teamA?.id) {
      finalWinnerId = match.teamA?.id ?? finalWinnerId;
    } else if (finalScoreB > finalScoreA && finalWinnerId !== match.teamB?.id) {
      finalWinnerId = match.teamB?.id ?? finalWinnerId;
    }

    setSubmittingResult(true);
    setError(null);
    setResultSuccess(null);

    // Build game results array matching the score
    const gameWinnersArray: { gameNumber: number; winnerTeamId: string }[] = [];
    const totalGames = finalScoreA + finalScoreB;
    const loserId = finalWinnerId === match.teamA?.id ? match.teamB?.id : match.teamA?.id;

    for (let g = 1; g <= totalGames; g++) {
      if (gameWinners[g]) {
        gameWinnersArray.push({ gameNumber: g, winnerTeamId: gameWinners[g] });
      } else if (g === totalGames) {
        gameWinnersArray.push({ gameNumber: g, winnerTeamId: finalWinnerId });
      } else if (finalWinnerId === match.teamA?.id && g <= finalScoreA) {
        gameWinnersArray.push({ gameNumber: g, winnerTeamId: finalWinnerId });
      } else if (loserId) {
        gameWinnersArray.push({ gameNumber: g, winnerTeamId: loserId });
      } else {
        gameWinnersArray.push({ gameNumber: g, winnerTeamId: finalWinnerId });
      }
    }

    const isEditing = editingMatchId === match.id;
    const method = isEditing ? "PUT" : "POST";

    const { data, error: err } = await dashboardFetch<{ message: string }>(
      `/api/matches/${match.id}/result`,
      {
        method,
        body: JSON.stringify({
          winnerId: finalWinnerId,
          scoreA: Number(finalScoreA),
          scoreB: Number(finalScoreB),
          forfeit: resultForfeit,
          forfeitedTeamId: resultForfeit
            ? (forfeitedTeamId || (finalWinnerId === match.teamA?.id ? match.teamB?.id : match.teamA?.id))
            : undefined,
          gameWinners: gameWinnersArray.length > 0 ? gameWinnersArray : undefined,
        }),
      }
    );

    setSubmittingResult(false);
    if (err) {
      setError(err);
      return;
    }

    setLastSubmittedMatchId(match.id);
    setResultSuccess(data?.message ?? (isEditing ? "Match result updated" : "Match result confirmed"));
    setResultMatchId(null);
    setEditingMatchId(null);
    await loadMatches();
  };

  // ── Match Scheduling Edit ─────────────────────────────────────
  const openMetadataPanel = (m: Match) => {
    if (editingMetadataId === m.id) {
      setEditingMetadataId(null);
      return;
    }
    setEditingMetadataId(m.id);
    setResultMatchId(null);
    setStreamMatchId(null);

    if (m.scheduledTime) {
      const date = new Date(m.scheduledTime);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      setEditScheduledTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setEditScheduledTime("");
    }
    setError(null);
    setResultSuccess(null);
  };

  const submitMetadataUpdate = async (matchId: string) => {
    if (!editScheduledTime) {
      setError("Please select a valid date and time");
      return;
    }
    setUpdatingMetadata(true);
    setError(null);
    setResultSuccess(null);

    const { data, error: err } = await dashboardFetch<{ message: string }>(`/api/matches/${matchId}`, {
      method: "PUT",
      body: JSON.stringify({
        scheduledTime: new Date(editScheduledTime).toISOString(),
      }),
    });

    setUpdatingMetadata(false);
    if (err) {
      setError(err);
      return;
    }

    setResultSuccess(data?.message ?? "Schedule updated");
    setEditingMetadataId(null);
    await loadMatches();
  };

  // ── Stream Panel ──────────────────────────────────────────────
  const openStreamPanel = (m: Match) => {
    if (streamMatchId === m.id) {
      setStreamMatchId(null);
      return;
    }
    setStreamMatchId(m.id);
    setStreamUrlInput(m.streamUrl ?? "");
    setResultMatchId(null);
    setEditingMetadataId(null);
    setError(null);
    setResultSuccess(null);
  };

  const submitStreamUpdate = async (matchId: string, status?: "LIVE" | "UPCOMING") => {
    setUpdatingStream(true);
    setError(null);
    setResultSuccess(null);

    const { data, error: err } = await dashboardFetch<{ message: string }>(
      `/api/matches/${matchId}/stream`,
      {
        method: "PATCH",
        body: JSON.stringify({
          streamUrl: streamUrlInput.trim() || null,
          ...(status ? { status } : {}),
        }),
      }
    );

    setUpdatingStream(false);
    if (err) {
      setError(err);
      return;
    }

    setResultSuccess(data?.message ?? "Stream updated");
    setStreamMatchId(null);
    await loadMatches();
  };

  const recalculateGroupStandings = async () => {
    if (!selectedTournamentId) return;
    if (!confirm("Rebuild standings from completed matches?")) return;
    setRecalculating(true);
    setRecalcSuccess(null);
    setError(null);
    const { data, error: err } = await dashboardFetch<{ message: string }>(
      `/api/tournaments/${selectedTournamentId}/recalculate-group-standings`,
      { method: "POST" }
    );
    setRecalculating(false);
    if (err) {
      setError(err);
      return;
    }
    setRecalcSuccess(data?.message ?? "Standings recalculated");
  };

  const handleDeleteMatch = async (match: Match) => {
    if (!confirm(`Delete match ${match.id}?`)) return;
    setDeletingId(match.id);
    setError(null);
    const { error: err } = await dashboardFetch(`/api/matches/${match.id}`, { method: "DELETE" });
    setDeletingId(null);
    if (err) {
      setError(err);
      return;
    }
    await loadMatches();
  };

  // ── Filtered Matches List ─────────────────────────────────────
  const filteredMatches = useMemo(() => {
    let list = matches;

    if (statusFilter === "ACTION") {
      list = list.filter((m) => m.status === "LIVE" || m.status === "UPCOMING");
    } else if (statusFilter === "LIVE") {
      list = list.filter((m) => m.status === "LIVE");
    } else if (statusFilter === "UPCOMING") {
      list = list.filter((m) => m.status === "UPCOMING");
    } else if (statusFilter === "COMPLETED") {
      list = list.filter((m) => m.status === "COMPLETED" || m.status === "FORFEITED");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.stage?.toLowerCase().includes(q) ||
          m.teamA?.name?.toLowerCase().includes(q) ||
          m.teamA?.tag?.toLowerCase().includes(q) ||
          m.teamB?.name?.toLowerCase().includes(q) ||
          m.teamB?.tag?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [matches, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    const live = matches.filter((m) => m.status === "LIVE").length;
    const upcoming = matches.filter((m) => m.status === "UPCOMING").length;
    const completed = matches.filter((m) => m.status === "COMPLETED" || m.status === "FORFEITED").length;
    return {
      all: matches.length,
      action: live + upcoming,
      live,
      upcoming,
      completed,
    };
  }, [matches]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-zinc-300">
      {/* ── Compact Header ── */}
      <div className="flex items-center justify-between gap-3 pb-1 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-[#e8a000] animate-pulse" />
          <h1 className="font-black text-lg sm:text-xl text-white uppercase tracking-tight">
            Match Operations
          </h1>
          <span className="text-white/20 text-xs hidden sm:inline">|</span>
          <p className="text-[11px] text-zinc-400 hidden sm:inline">
            Score logging, stream links &amp; tournament standings
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadMatches()}
          disabled={loadingMatches}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 text-white text-[11px] font-bold uppercase tracking-wider hover:border-[#e8a000]/40 hover:bg-white/5 transition-all disabled:opacity-50"
        >
          <RefreshCw size={11} className={loadingMatches ? "animate-spin text-[#e8a000]" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 flex items-center gap-2">
          <ShieldAlert size={14} className="text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {resultSuccess && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <CheckCircle size={14} className="text-emerald-400 shrink-0" />
            <span className="font-bold">{resultSuccess}</span>
          </div>
          {lastSubmittedMatchId && (
            <Link
              href={`/dashboard/matches/${lastSubmittedMatchId}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500 text-black font-black text-[10px] uppercase tracking-wider hover:bg-emerald-400 transition-all shrink-0"
            >
              <BarChart3 size={10} />
              <span>Enter KDA &amp; MVP →</span>
            </Link>
          )}
        </div>
      )}

      {/* ── Sleek Tournament Switcher Toolbar ── */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        {/* Left: Ongoing Quick Pills + Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
          {ongoingTournaments.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Live
              </span>
              {ongoingTournaments.map((t) => {
                const isSelected = t.id === selectedTournamentId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTournamentId(t.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                      isSelected
                        ? "bg-emerald-500 text-black shadow-sm"
                        : "bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10"
                    }`}
                  >
                    <Flame size={11} className={isSelected ? "text-black" : "text-emerald-400"} />
                    <span className="truncate max-w-[130px]">{t.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tournament Dropdown */}
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="flex-1 min-w-0 max-w-sm bg-[#0d0d14] border border-white/10 text-white px-2.5 py-1 rounded-lg text-xs font-bold outline-none focus:border-[#e8a000]/60 transition-colors truncate"
          >
            <option value="">— Select Tournament —</option>
            {tournaments.map((t) => {
              const statusTag =
                t.status === "ONGOING"
                  ? "🔥 ONGOING"
                  : t.status === "OPEN"
                  ? "🟢 OPEN"
                  : t.status === "UPCOMING"
                  ? "⏳ UPCOMING"
                  : "✅ COMPLETED";
              return (
                <option key={t.id} value={t.id}>
                  {statusTag} · {t.name}
                </option>
              );
            })}
          </select>
        </div>

        {/* Right: View Toggles & Recalc */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 rounded font-black uppercase tracking-wider transition-all ${
                viewMode === "table" ? "bg-[#e8a000] text-black shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("bracket")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-black uppercase tracking-wider transition-all ${
                viewMode === "bracket" ? "bg-[#e8a000] text-black shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Zap size={10} />
              <span>Bracket</span>
            </button>
          </div>

          {selectedTournamentId && canAdmin && (
            <button
              type="button"
              onClick={recalculateGroupStandings}
              disabled={recalculating}
              title="Rebuild standings from completed matches"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-500/30 text-blue-400 text-[11px] font-black uppercase tracking-wider hover:bg-blue-500/10 hover:border-blue-400 disabled:opacity-50 transition-all"
            >
              {recalculating ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
              <span className="hidden sm:inline">Recalc</span>
            </button>
          )}
        </div>
      </div>

      {/* Recalculation Alert */}
      {recalcSuccess && (
        <div className="border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-300 flex items-center gap-2 rounded-lg">
          <CheckCircle size={13} /> {recalcSuccess}
        </div>
      )}

      {/* ── Bracket Visualization Mode ── */}
      {viewMode === "bracket" && selectedTournamentId && (
        <div className="rounded-xl border border-white/10 bg-[#0a0a0f] p-4 overflow-x-auto">
          <BracketVisualization
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            matches={bracketMatches as any}
            tournamentName={currentTournament?.name ?? "Tournament"}
            isLoading={loadingBracket}
          />
        </div>
      )}

      {/* ── Matches Board / Table Mode ── */}
      {viewMode === "table" && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0f] overflow-hidden shadow-md">
          {/* Sub-toolbar: Filter Pills & Search */}
          <div className="px-3 py-2 border-b border-white/[0.06] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[#0d0d14]/40">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  statusFilter === "ALL" ? "bg-white text-black" : "bg-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                All ({counts.all})
              </button>

              <button
                onClick={() => setStatusFilter("ACTION")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  statusFilter === "ACTION"
                    ? "bg-[#e8a000] text-black"
                    : "bg-white/5 text-[#e8a000] hover:bg-white/10 border border-[#e8a000]/20"
                }`}
              >
                <Flame size={10} />
                <span>Action Needed ({counts.action})</span>
              </button>

              {counts.live > 0 && (
                <button
                  onClick={() => setStatusFilter("LIVE")}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    statusFilter === "LIVE" ? "bg-red-500 text-white" : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
                  <span>Live ({counts.live})</span>
                </button>
              )}

              <button
                onClick={() => setStatusFilter("COMPLETED")}
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  statusFilter === "COMPLETED" ? "bg-emerald-500 text-black" : "bg-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                Done ({counts.completed})
              </button>
            </div>

            {/* Compact Search Box */}
            <div className="relative w-full sm:w-52">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter team / stage..."
                className="w-full bg-[#08080c] border border-white/10 text-white pl-7 pr-2.5 py-1 rounded-lg text-[11px] outline-none focus:border-[#e8a000]/60 placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Table */}
          {loadingTournaments || loadingMatches ? (
            <div className="p-8 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin text-[#e8a000]" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Loading Fixtures...</span>
            </div>
          ) : !selectedTournamentId ? (
            <div className="p-8 text-center text-zinc-500 text-xs">Select a tournament above to manage matches.</div>
          ) : filteredMatches.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">No matches found for this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[9px] font-black uppercase tracking-wider text-zinc-500 bg-[#0d0d14]/30">
                    <th className="py-2.5 px-3">Stage / Format</th>
                    <th className="py-2.5 px-3">Team A</th>
                    <th className="py-2.5 px-3 text-center">Score</th>
                    <th className="py-2.5 px-3">Team B</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredMatches.map((m) => {
                    const isPanelOpen = resultMatchId === m.id;
                    const isUpcomingOrLive = m.status === "UPCOMING" || m.status === "LIVE";
                    const targetWins = Math.ceil((m.bestOf || 1) / 2);

                    return (
                      <Fragment key={m.id}>
                        {/* Match Row */}
                        <tr
                          className={`hover:bg-white/[0.02] transition-colors ${
                            isPanelOpen ? "bg-[#e8a000]/[0.04]" : ""
                          }`}
                        >
                          {/* Stage */}
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-xs uppercase truncate max-w-[130px]">
                                {m.stage ?? "Match"}
                              </span>
                              <span className="text-[9px] font-mono text-[#e8a000]/80">
                                BO{m.bestOf || 1}
                              </span>
                            </div>
                          </td>

                          {/* Team A */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-bold text-xs truncate max-w-[110px] ${
                                  m.winner?.id === m.teamA?.id ? "text-emerald-400 font-black" : "text-white"
                                }`}
                              >
                                {m.teamA?.name ?? "TBD"}
                              </span>
                              {m.winner?.id === m.teamA?.id && (
                                <Trophy size={10} className="text-amber-400 shrink-0" />
                              )}
                            </div>
                          </td>

                          {/* Score */}
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`font-mono font-black text-xs px-2 py-0.5 rounded ${
                                m.status === "COMPLETED"
                                  ? "bg-white/5 text-[#e8a000] border border-white/10"
                                  : "text-zinc-600 font-bold"
                              }`}
                            >
                              {m.scoreA} – {m.scoreB}
                            </span>
                          </td>

                          {/* Team B */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-bold text-xs truncate max-w-[110px] ${
                                  m.winner?.id === m.teamB?.id ? "text-emerald-400 font-black" : "text-white"
                                }`}
                              >
                                {m.teamB?.name ?? "TBD"}
                              </span>
                              {m.winner?.id === m.teamB?.id && (
                                <Trophy size={10} className="text-amber-400 shrink-0" />
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                  m.status === "COMPLETED"
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : m.status === "LIVE"
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                                    : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                }`}
                              >
                                {m.status}
                              </span>

                              {(m.status === "COMPLETED" || m.status === "FORFEITED") &&
                                m.performances &&
                                m.performances.length > 0 && (
                                  <span
                                    className={`px-1 py-0.5 rounded text-[8px] font-mono font-bold ${
                                      m.statsFinalized ? "bg-emerald-500/20 text-emerald-300" : "bg-cyan-500/20 text-cyan-400"
                                    }`}
                                  >
                                    {m.statsFinalized ? "KDA ✓" : "KDA"}
                                  </span>
                                )}
                            </div>
                          </td>

                          {/* Schedule */}
                          <td className="py-2.5 px-3 text-zinc-400 font-mono text-[10px]">
                            {m.scheduledTime ? (
                              <span>
                                {new Date(m.scheduledTime).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canScore && (
                                <button
                                  type="button"
                                  onClick={() => openResultPanel(m)}
                                  className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                                    isPanelOpen
                                      ? "bg-[#e8a000] text-black shadow-sm"
                                      : isUpcomingOrLive
                                      ? "bg-[#e8a000] hover:bg-[#ffb800] text-black font-black"
                                      : "bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10"
                                  }`}
                                >
                                  {isPanelOpen ? "Close" : isUpcomingOrLive ? "Score" : "Edit"}
                                </button>
                              )}

                              {canScore && (
                                <Link
                                  href={`/dashboard/matches/${m.id}`}
                                  className="px-1.5 py-1 rounded border border-white/10 text-zinc-400 hover:border-[#e8a000] hover:text-[#e8a000] text-[10px] font-bold uppercase transition-colors"
                                  title="Enter Player KDA stats"
                                >
                                  <BarChart3 size={10} />
                                </Link>
                              )}

                              {canStream && isUpcomingOrLive && (
                                <button
                                  type="button"
                                  onClick={() => openStreamPanel(m)}
                                  className={`px-1.5 py-1 rounded border text-[10px] font-bold transition-colors ${
                                    streamMatchId === m.id
                                      ? "border-red-400 text-red-400 bg-red-500/10"
                                      : m.streamUrl
                                      ? "border-red-500/40 text-red-400"
                                      : "border-white/10 text-zinc-400 hover:border-red-400 hover:text-red-400"
                                  }`}
                                  title="Stream link"
                                >
                                  <Radio size={10} />
                                </button>
                              )}

                              {canScore && (
                                <button
                                  type="button"
                                  onClick={() => openMetadataPanel(m)}
                                  className="px-1.5 py-1 rounded border border-white/10 text-zinc-400 hover:border-white/30 hover:text-white text-[10px] transition-colors"
                                  title="Reschedule"
                                >
                                  <Edit2 size={10} />
                                </button>
                              )}

                              {canAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMatch(m)}
                                  disabled={deletingId === m.id}
                                  className="px-1.5 py-1 rounded border border-white/10 text-zinc-500 hover:border-red-400 hover:text-red-400 text-[10px] transition-colors"
                                  title="Delete"
                                >
                                  {deletingId === m.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* ── COMPACT RESULT ENTRY PANEL ── */}
                        {isPanelOpen && (
                          <tr className="bg-[#090a10] border-y border-[#e8a000]/30">
                            <td colSpan={7} className="p-3 sm:p-4">
                              <div className="max-w-3xl mx-auto rounded-xl bg-[#06070a] border border-white/10 p-3.5 space-y-3.5 shadow-xl">
                                
                                {/* Info Line */}
                                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-white/[0.06]">
                                  <div className="flex items-center gap-1.5">
                                    <Swords size={12} className="text-[#e8a000]" />
                                    <span className="font-bold text-white uppercase">
                                      {editingMatchId === m.id ? "Edit Series Score" : "Log Result"} — {m.stage ?? "Match"}
                                    </span>
                                    <span className="text-[#e8a000] font-mono font-bold">
                                      (Best of {m.bestOf || 1})
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500">First to {targetWins} wins</span>
                                </div>

                                {/* Step 1: Winner & Scores Face-Off with Stepper */}
                                <div className="grid grid-cols-2 gap-2">
                                  {/* Team A Card */}
                                  <div
                                    className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-all ${
                                      resultWinnerId === m.teamA?.id
                                        ? "bg-emerald-500/15 border-emerald-500/60 shadow-sm"
                                        : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04]"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => selectWinnerDirect(m, m.teamA?.id ?? "")}
                                      className="flex items-center gap-2 min-w-0 text-left cursor-pointer flex-1"
                                    >
                                      <div
                                        className={`w-7 h-7 rounded-md flex items-center justify-center font-black text-[10px] border shrink-0 ${
                                          resultWinnerId === m.teamA?.id
                                            ? "bg-emerald-500 text-black border-emerald-400"
                                            : "bg-zinc-800 text-zinc-300 border-white/10"
                                        }`}
                                      >
                                        {m.teamA?.tag || "A"}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-xs text-white truncate max-w-[100px]">
                                          {m.teamA?.name ?? "Team A"}
                                        </p>
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase">
                                          {resultWinnerId === m.teamA?.id ? "👑 Winner" : "Click to win"}
                                        </p>
                                      </div>
                                    </button>

                                    {/* Score Counter Stepper */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => adjustScore(m, "A", -1)}
                                        className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center text-xs"
                                        title="Decrease score"
                                      >
                                        <Minus size={10} />
                                      </button>
                                      <span className="font-mono font-black text-lg text-white w-6 text-center">
                                        {resultScoreA}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => adjustScore(m, "A", 1)}
                                        className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center text-xs"
                                        title="Increase score"
                                      >
                                        <Plus size={10} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Team B Card */}
                                  <div
                                    className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-all ${
                                      resultWinnerId === m.teamB?.id
                                        ? "bg-emerald-500/15 border-emerald-500/60 shadow-sm"
                                        : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04]"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => selectWinnerDirect(m, m.teamB?.id ?? "")}
                                      className="flex items-center gap-2 min-w-0 text-left cursor-pointer flex-1"
                                    >
                                      <div
                                        className={`w-7 h-7 rounded-md flex items-center justify-center font-black text-[10px] border shrink-0 ${
                                          resultWinnerId === m.teamB?.id
                                            ? "bg-emerald-500 text-black border-emerald-400"
                                            : "bg-zinc-800 text-zinc-300 border-white/10"
                                        }`}
                                      >
                                        {m.teamB?.tag || "B"}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-xs text-white truncate max-w-[100px]">
                                          {m.teamB?.name ?? "Team B"}
                                        </p>
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase">
                                          {resultWinnerId === m.teamB?.id ? "👑 Winner" : "Click to win"}
                                        </p>
                                      </div>
                                    </button>

                                    {/* Score Counter Stepper */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => adjustScore(m, "B", -1)}
                                        className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center text-xs"
                                        title="Decrease score"
                                      >
                                        <Minus size={10} />
                                      </button>
                                      <span className="font-mono font-black text-lg text-white w-6 text-center">
                                        {resultScoreB}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => adjustScore(m, "B", 1)}
                                        className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center text-xs"
                                        title="Increase score"
                                      >
                                        <Plus size={10} />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Step 2: 1-Tap Presets */}
                                <div>
                                  <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block mb-1.5">
                                    Quick Presets:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {m.bestOf === 1 ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => applyQuickPreset(m, 1, 0, m.teamA?.id ?? "")}
                                          className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                                            resultScoreA === 1 && resultScoreB === 0 && resultWinnerId === m.teamA?.id
                                              ? "bg-[#e8a000] text-black"
                                              : "bg-white/5 text-zinc-300 hover:bg-white/10"
                                          }`}
                                        >
                                          {m.teamA?.tag || "A"} 1–0
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => applyQuickPreset(m, 0, 1, m.teamB?.id ?? "")}
                                          className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                                            resultScoreA === 0 && resultScoreB === 1 && resultWinnerId === m.teamB?.id
                                              ? "bg-[#e8a000] text-black"
                                              : "bg-white/5 text-zinc-300 hover:bg-white/10"
                                          }`}
                                        >
                                          {m.teamB?.tag || "B"} 1–0
                                        </button>
                                      </>
                                    ) : m.bestOf === 3 ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => applyQuickPreset(m, 2, 0, m.teamA?.id ?? "")}
                                          className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                                            resultScoreA === 2 && resultScoreB === 0 && resultWinnerId === m.teamA?.id
                                              ? "bg-[#e8a000] text-black"
                                              : "bg-white/5 text-zinc-300 hover:bg-white/10"
                                          }`}
                                        >
                                          {m.teamA?.tag || "A"} 2–0 Sweep
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => applyQuickPreset(m, 2, 1, m.teamA?.id ?? "")}
                                          className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                                            resultScoreA === 2 && resultScoreB === 1 && resultWinnerId === m.teamA?.id
                                              ? "bg-[#e8a000] text-black"
                                              : "bg-white/5 text-zinc-300 hover:bg-white/10"
                                          }`}
                                        >
                                          {m.teamA?.tag || "A"} 2–1
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => applyQuickPreset(m, 1, 2, m.teamB?.id ?? "")}
                                          className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                                            resultScoreA === 1 && resultScoreB === 2 && resultWinnerId === m.teamB?.id
                                              ? "bg-[#e8a000] text-black"
                                              : "bg-white/5 text-zinc-300 hover:bg-white/10"
                                          }`}
                                        >
                                          {m.teamB?.tag || "B"} 2–1
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => applyQuickPreset(m, 0, 2, m.teamB?.id ?? "")}
                                          className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                                            resultScoreA === 0 && resultScoreB === 2 && resultWinnerId === m.teamB?.id
                                              ? "bg-[#e8a000] text-black"
                                              : "bg-white/5 text-zinc-300 hover:bg-white/10"
                                          }`}
                                        >
                                          {m.teamB?.tag || "B"} 2–0 Sweep
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => applyQuickPreset(m, targetWins, 0, m.teamA?.id ?? "")}
                                          className="px-2.5 py-1 rounded-md bg-white/5 text-zinc-300 text-[10px] font-bold hover:bg-white/10"
                                        >
                                          {m.teamA?.tag} Wins {targetWins}–0
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => applyQuickPreset(m, 0, targetWins, m.teamB?.id ?? "")}
                                          className="px-2.5 py-1 rounded-md bg-white/5 text-zinc-300 text-[10px] font-bold hover:bg-white/10"
                                        >
                                          {m.teamB?.tag} Wins {targetWins}–0
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Step 3: Game Toggles */}
                                {m.bestOf > 1 && (
                                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                                    <span className="text-zinc-500 font-bold uppercase shrink-0">Games:</span>
                                    {Array.from({ length: m.bestOf }, (_, idx) => idx + 1).map((gameNum) => {
                                      const currentGameWinner = gameWinners[gameNum];
                                      return (
                                        <div key={gameNum} className="flex items-center bg-black/40 rounded p-1 border border-white/5 shrink-0 gap-1">
                                          <span className="font-mono text-zinc-400 text-[9px] px-1">G{gameNum}</span>
                                          <button
                                            type="button"
                                            onClick={() => handleGameWinnerPick(m, gameNum, m.teamA?.id ?? "")}
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                                              currentGameWinner === m.teamA?.id
                                                ? "bg-emerald-500 text-black font-black"
                                                : "bg-white/5 text-zinc-400 hover:text-white"
                                            }`}
                                          >
                                            {m.teamA?.tag || "A"}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleGameWinnerPick(m, gameNum, m.teamB?.id ?? "")}
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                                              currentGameWinner === m.teamB?.id
                                                ? "bg-emerald-500 text-black font-black"
                                                : "bg-white/5 text-zinc-400 hover:text-white"
                                            }`}
                                          >
                                            {m.teamB?.tag || "B"}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Step 4: Forfeit & Submit Action */}
                                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
                                  {/* Forfeit Toggle */}
                                  <div className="flex items-center gap-1.5 text-[10px]">
                                    <span className="text-zinc-500">Forfeit:</span>
                                    {m.teamA && (
                                      <button
                                        type="button"
                                        onClick={() => handleForfeitToggle(m, m.teamA?.id ?? "")}
                                        className={`px-2 py-0.5 rounded text-[9px] transition-all ${
                                          resultForfeit && forfeitedTeamId === m.teamA.id
                                            ? "bg-red-500 text-white font-black"
                                            : "bg-white/5 text-zinc-400 hover:text-red-300"
                                        }`}
                                      >
                                        {m.teamA.tag} DQ
                                      </button>
                                    )}
                                    {m.teamB && (
                                      <button
                                        type="button"
                                        onClick={() => handleForfeitToggle(m, m.teamB?.id ?? "")}
                                        className={`px-2 py-0.5 rounded text-[9px] transition-all ${
                                          resultForfeit && forfeitedTeamId === m.teamB.id
                                            ? "bg-red-500 text-white font-black"
                                            : "bg-white/5 text-zinc-400 hover:text-red-300"
                                        }`}
                                      >
                                        {m.teamB.tag} DQ
                                      </button>
                                    )}
                                  </div>

                                  {/* Buttons */}
                                  <div className="flex items-center gap-1.5 ml-auto">
                                    <button
                                      type="button"
                                      onClick={() => setResultMatchId(null)}
                                      className="px-3 py-1 rounded-lg bg-white/5 text-zinc-400 hover:text-white text-[11px] font-bold uppercase transition-all"
                                    >
                                      Cancel
                                    </button>

                                    <button
                                      type="button"
                                      disabled={submittingResult || !resultWinnerId}
                                      onClick={() => submitResult(m)}
                                      className="flex items-center gap-1.5 px-4 py-1 rounded-lg bg-[#e8a000] hover:bg-[#ffb800] text-black text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-40 shadow-sm"
                                    >
                                      {submittingResult ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                      <span>Confirm</span>
                                    </button>
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Stream Controls Drawer */}
                        {streamMatchId === m.id && (
                          <tr className="bg-[#090a10]">
                            <td colSpan={7} className="p-3">
                              <div className="max-w-md mx-auto rounded-lg bg-[#06070a] border border-red-500/30 p-3 space-y-2 text-xs">
                                <p className="font-bold text-red-400 text-[11px] flex items-center gap-1.5">
                                  <Radio size={12} /> Stream Controls — {m.stage ?? m.id}
                                </p>
                                <input
                                  type="url"
                                  value={streamUrlInput}
                                  onChange={(e) => setStreamUrlInput(e.target.value)}
                                  placeholder="https://youtube.com/live/..."
                                  className="w-full bg-[#0d0d14] border border-white/10 text-white px-2.5 py-1 rounded-lg text-xs outline-none focus:border-red-400/60"
                                />
                                <div className="flex items-center gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    disabled={updatingStream}
                                    onClick={() => submitStreamUpdate(m.id)}
                                    className="px-2.5 py-1 rounded-lg border border-white/20 text-white text-[10px] font-bold uppercase hover:border-[#e8a000]"
                                  >
                                    Save
                                  </button>
                                  {m.status === "UPCOMING" ? (
                                    <button
                                      type="button"
                                      disabled={updatingStream}
                                      onClick={() => submitStreamUpdate(m.id, "LIVE")}
                                      className="px-3 py-1 rounded-lg bg-red-500 text-white text-[10px] font-black uppercase tracking-wider"
                                    >
                                      Go Live
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={updatingStream}
                                      onClick={() => submitStreamUpdate(m.id, "UPCOMING")}
                                      className="px-3 py-1 rounded-lg bg-white/10 text-white text-[10px] font-bold uppercase"
                                    >
                                      End Live
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Schedule Edit Drawer */}
                        {editingMetadataId === m.id && (
                          <tr className="bg-[#090a10]">
                            <td colSpan={7} className="p-3">
                              <div className="max-w-xs mx-auto rounded-lg bg-[#06070a] border border-white/10 p-3 space-y-2 text-xs">
                                <p className="font-bold text-[#e8a000] text-[11px]">Reschedule Match</p>
                                <input
                                  type="datetime-local"
                                  value={editScheduledTime}
                                  onChange={(e) => setEditScheduledTime(e.target.value)}
                                  className="w-full bg-[#0d0d14] border border-white/10 text-white px-2.5 py-1 rounded-lg text-xs outline-none focus:border-[#e8a000]"
                                />
                                <div className="flex items-center gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    disabled={updatingMetadata}
                                    onClick={() => submitMetadataUpdate(m.id)}
                                    className="px-3 py-1 rounded-lg bg-[#e8a000] text-black text-[10px] font-black uppercase"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingMetadataId(null)}
                                    className="px-2 py-1 text-zinc-400 text-[10px]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
