"use client";

import React, { useState, useEffect, useCallback, use, useRef } from "react";
import { dashboardFetch } from "../../lib/api";
import Link from "next/link";
import Image from "next/image";
import {
  Loader2,
  CheckCircle,
  ArrowLeft,
  Trophy,
  Star,
  Users,
  RefreshCw,
  Crown,
  Swords,
  Shield,
  Target,
  AlertCircle,
  Search,
  ChevronDown,
  ArrowLeftRight,
} from "lucide-react";

type Player = {
  id: string;
  ign: string;
  role: string;
  photo: string | null;
  isSubstitute: boolean;
  user?: { photo: string | null };
};

type Team = {
  id: string;
  name: string;
  tag: string;
  logo: string | null;
  players?: Player[];
};

type Performance = {
  id: string;
  gameNumber: number;
  playerId: string;
  hero: string;
  kills: number;
  deaths: number;
  assists: number;
  isMvp: boolean;
  side: string;
  won: boolean;
  player?: { id: string; ign: string; role: string };
};

type Match = {
  id: string;
  stage: string;
  status: string;
  scoreA: number;
  scoreB: number;
  scheduledTime: string;
  bestOf: number;
  teamA: Team | null;
  teamB: Team | null;
  winner?: Team | null;
  gameResults?: { id: string; gameNumber: number; winnerTeamId: string }[];
  performances: Performance[];
  tournament?: { id: string; name: string; seasonId?: string };
  challengeRequest?: { id?: string; status?: string; challengerTeam?: { id?: string; name?: string }; challengedTeam?: { id?: string; name?: string } } | null;
};

type PerformanceInput = {
  playerId: string;
  playerName: string;
  teamId: string;
  hero: string;
  kills: number;
  deaths: number;
  assists: number;
  isMvp: boolean;
};

type HeroCatalogItem = {
  id: string;
  key: string;
  name: string;
  imageUrl: string | null;
};

const ROLE_ORDER = ["JUNGLER", "MID_LANER", "GOLD_LANER", "EXP_LANER", "ROAMER"];
const ROLE_LABELS: Record<string, string> = {
  JUNGLER: "JG",
  MID_LANER: "MID",
  GOLD_LANER: "GOLD",
  EXP_LANER: "EXP",
  ROAMER: "ROAM",
};

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: matchId } = use(params);
  const [match, setMatch] = useState<Match | null>(null);
  const [teamAPlayers, setTeamAPlayers] = useState<Player[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<Player[]>([]);
  const [heroes, setHeroes] = useState<HeroCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Performance entry state
  const [selectedGame, setSelectedGame] = useState<number>(1);
  const [gamePerformances, setGamePerformances] = useState<Record<number, PerformanceInput[]>>({});
  const [gameWinner, setGameWinner] = useState<Record<number, string>>({});
  const [submittingPerf, setSubmittingPerf] = useState(false);
  const [finalizingStats, setFinalizingStats] = useState(false);
  
  // Refs for tab flow navigation
  const performanceRefs = useRef<Record<string, { kills: React.RefObject<HTMLInputElement>; deaths: React.RefObject<HTMLInputElement>; assists: React.RefObject<HTMLInputElement> }>>({});

  const loadMatch = useCallback(async () => {
    setLoading(true);
    
    // Load heroes catalog
    const { data: heroData } = await dashboardFetch<{ heroes: HeroCatalogItem[] }>("/api/admin/heroes");
    if (heroData?.heroes) {
      setHeroes(heroData.heroes);
    }
    
    const { data, error: err } = await dashboardFetch<Match>(`/api/matches/${matchId}`);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    setMatch(data ?? null);

    // Load team rosters
    if (data?.teamA?.id) {
      const { data: playersA } = await dashboardFetch<Player[]>(`/api/teams/${data.teamA.id}/players`);
      if (playersA) {
        const sorted = [...(playersA || [])].sort((a, b) => {
          if (a.isSubstitute !== b.isSubstitute) return a.isSubstitute ? 1 : -1;
          return ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
        });
        setTeamAPlayers(sorted);
      }
    }
    if (data?.teamB?.id) {
      const { data: playersB } = await dashboardFetch<Player[]>(`/api/teams/${data.teamB.id}/players`);
      if (playersB) {
        const sorted = [...(playersB || [])].sort((a, b) => {
          if (a.isSubstitute !== b.isSubstitute) return a.isSubstitute ? 1 : -1;
          return ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
        });
        setTeamBPlayers(sorted);
      }
    }

    // Initialize performance state from existing data
    if (data?.performances?.length) {
      const perfByGame: Record<number, PerformanceInput[]> = {};
      const winnerByGame: Record<number, string> = {};
      
      for (const p of data.performances) {
        if (!perfByGame[p.gameNumber]) perfByGame[p.gameNumber] = [];
        perfByGame[p.gameNumber].push({
          playerId: p.playerId,
          playerName: p.player?.ign || "Unknown",
          teamId: p.side === "A" ? data.teamA?.id || "" : data.teamB?.id || "",
          hero: p.hero,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          isMvp: p.isMvp,
        });
        if (p.won && !winnerByGame[p.gameNumber]) {
          winnerByGame[p.gameNumber] = p.side === "A" ? data.teamA?.id || "" : data.teamB?.id || "";
        }
      }
      setGamePerformances(perfByGame);
      
      // Merge gameResults from match data with winnerByGame from performances
      const mergedWinners = { ...winnerByGame };
      if (data?.gameResults) {
        for (const gr of data.gameResults) {
          if (!mergedWinners[gr.gameNumber]) {
            mergedWinners[gr.gameNumber] = gr.winnerTeamId;
          }
        }
      }
      setGameWinner(mergedWinners);
    } else {
      // No performances yet - use gameResults from match data if available
      if (data?.gameResults && data.gameResults.length > 0) {
        const winnersFromResults: Record<number, string> = {};
        for (const gr of data.gameResults) {
          winnersFromResults[gr.gameNumber] = gr.winnerTeamId;
        }
        setGameWinner(winnersFromResults);
      }
    }

    setLoading(false);
  }, [matchId]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  // Initialize empty performances for a game
  const initGamePerformance = (gameNum: number) => {
    if (gamePerformances[gameNum]?.length) return; // Already has data
    
    const perfs: PerformanceInput[] = [];
    // Add Team A starting players
    for (const p of teamAPlayers.filter((x) => !x.isSubstitute).slice(0, 5)) {
      perfs.push({
        playerId: p.id,
        playerName: p.ign,
        teamId: match?.teamA?.id || "",
        hero: "",
        kills: 0,
        deaths: 0,
        assists: 0,
        isMvp: false,
      });
    }
    // Add Team B starting players
    for (const p of teamBPlayers.filter((x) => !x.isSubstitute).slice(0, 5)) {
      perfs.push({
        playerId: p.id,
        playerName: p.ign,
        teamId: match?.teamB?.id || "",
        hero: "",
        kills: 0,
        deaths: 0,
        assists: 0,
        isMvp: false,
      });
    }
    setGamePerformances((prev) => ({ ...prev, [gameNum]: perfs }));
  };

  useEffect(() => {
    if (teamAPlayers.length && teamBPlayers.length) {
      initGamePerformance(selectedGame);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamAPlayers, teamBPlayers, selectedGame]);

  const updatePerformance = (gameNum: number, playerId: string, field: keyof PerformanceInput, value: unknown) => {
    setGamePerformances((prev) => ({
      ...prev,
      [gameNum]: prev[gameNum]?.map((p) =>
        p.playerId === playerId ? { ...p, [field]: value } : p
      ) || [],
    }));
  };

  const setMvp = (gameNum: number, playerId: string) => {
    setGamePerformances((prev) => ({
      ...prev,
      [gameNum]: prev[gameNum]?.map((p) => ({
        ...p,
        isMvp: p.playerId === playerId,
      })) || [],
    }));
  };

  const replacePlayer = (gameNum: number, oldPlayerId: string, newPlayerId: string, newPlayerName: string) => {
    setGamePerformances((prev) => ({
      ...prev,
      [gameNum]: prev[gameNum]?.map((p) =>
        p.playerId === oldPlayerId
          ? { ...p, playerId: newPlayerId, playerName: newPlayerName, hero: "", kills: 0, deaths: 0, assists: 0, isMvp: false }
          : p
      ) || [],
    }));
  };

  const handleTabFromAssists = (gameNum: number, currentPlayerId: string) => {
    // Find current player index in current game
    const perfs = gamePerformances[gameNum] || [];
    const currentIndex = perfs.findIndex((p) => p.playerId === currentPlayerId);
    
    if (currentIndex >= 0 && currentIndex < perfs.length - 1) {
      // Move to next player's kills field
      const nextPlayerId = perfs[currentIndex + 1].playerId;
      const refKey = `${gameNum}-${nextPlayerId}`;
      setTimeout(() => {
        performanceRefs.current[refKey]?.kills?.current?.focus();
      }, 0);
    }
  };

  const getOrCreateRefs = (playerId: string, gameNum: number) => {
    const refKey = `${gameNum}-${playerId}`;
    if (!performanceRefs.current[refKey]) {
      performanceRefs.current[refKey] = {
        kills: { current: null } as unknown as React.RefObject<HTMLInputElement>,
        deaths: { current: null } as unknown as React.RefObject<HTMLInputElement>,
        assists: { current: null } as unknown as React.RefObject<HTMLInputElement>,
      };
    }
    return performanceRefs.current[refKey];
  };

  const submitGamePerformance = async (gameNum: number) => {
    if (!match) return;
    const perfs = gamePerformances[gameNum];
    const winner = gameWinner[gameNum];
    
    if (!perfs?.length) {
      setError("No performance data to submit");
      return;
    }
    if (!winner) {
      setError("Please select game winner first");
      return;
    }
    
    // Validate all have heroes
    const missing = perfs.filter((p) => !p.hero.trim());
    if (missing.length) {
      setError(`Please enter hero for: ${missing.map((p) => p.playerName).join(", ")}`);
      return;
    }

    setSubmittingPerf(true);
    setError(null);
    setSuccess(null);

    const formattedPerfs = perfs.map((p) => ({
      gameNumber: gameNum,
      playerId: p.playerId,
      hero: p.hero,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      isMvp: p.isMvp,
      side: p.teamId === match.teamA?.id ? "A" : "B",
      won: p.teamId === winner,
    }));

    const { error: err } = await dashboardFetch(`/api/matches/${matchId}/performance`, {
      method: "POST",
      body: JSON.stringify({ performances: formattedPerfs }),
    });

    setSubmittingPerf(false);

    if (err) {
      setError(err);
      return;
    }

    setSuccess(`Game ${gameNum} performance recorded successfully!`);
    await loadMatch();
  };

  const clearGamePerformance = (gameNum: number) => {
    // Remove server-saved performances for this game (if any) then reset the performance inputs to fresh starters-only defaults
    (async () => {
      try {
        // attempt server deletion; ignore errors (may not be permitted for non-referees)
        await dashboardFetch(`/api/matches/${matchId}/performance`, {
          method: 'DELETE',
          body: JSON.stringify({ gameNumber: gameNum }),
        });
      } catch {
        // ignore
      }
    })();

    // Reset the performance inputs for a game to fresh starters-only defaults
    const perfs: PerformanceInput[] = [];
    for (const p of teamAPlayers.filter((x) => !x.isSubstitute).slice(0, 5)) {
      perfs.push({
        playerId: p.id,
        playerName: p.ign,
        teamId: match?.teamA?.id || "",
        hero: "",
        kills: 0,
        deaths: 0,
        assists: 0,
        isMvp: false,
      });
    }
    for (const p of teamBPlayers.filter((x) => !x.isSubstitute).slice(0, 5)) {
      perfs.push({
        playerId: p.id,
        playerName: p.ign,
        teamId: match?.teamB?.id || "",
        hero: "",
        kills: 0,
        deaths: 0,
        assists: 0,
        isMvp: false,
      });
    }

    setGamePerformances((prev) => ({ ...prev, [gameNum]: perfs }));
    setGameWinner((prev) => {
      const copy = { ...prev } as Record<number, string>;
      delete copy[gameNum];
      return copy;
    });
    setError(null);
    setSuccess(null);
  };

  const finalizeMatch = async () => {
    if (!match) return;
    
    setFinalizingStats(true);
    setError(null);
    setSuccess(null);

    const { data, error: err } = await dashboardFetch<{ message: string }>(
      `/api/matches/${matchId}/finalize`,
      { method: "POST" }
    );

    setFinalizingStats(false);

    if (err) {
      setError(err);
      return;
    }

    setSuccess(data?.message || "Match finalized! Player stats and leaderboards updated.");
    await loadMatch();
  };

  const totalGames = match?.bestOf || 3;
  const isCompleted = match?.status === "COMPLETED" || match?.status === "FORFEITED";
  const selectedGameWinnerId = gameWinner[selectedGame] || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#666]">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-8 text-center">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <p className="text-white text-lg">Match not found</p>
        <Link href="/dashboard/matches" className="text-[#e8a000] hover:underline mt-4 inline-block">
          ← Back to Matches
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/matches"
            className="text-[10px] font-black uppercase tracking-wider text-[#666] hover:text-[#e8a000] flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={12} /> Back to Matches
          </Link>
          <h1 className="font-black text-2xl text-white uppercase tracking-[0.08em]">
            Match Performance
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            {match.stage} • {match.tournament?.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadMatch()}
          className="flex items-center gap-2 px-3 py-2 border border-white/10 text-white text-xs font-black uppercase tracking-wider hover:border-[#e8a000]/50"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {match.challengeRequest?.id && (
        <div className="rounded-lg border border-yellow-600/20 bg-yellow-600/10 px-4 py-3 text-sm text-yellow-200">
          This match was scheduled from a challenge and is considered a friendly — points and standings will not be updated unless an admin selects &quot;Override points&quot; when submitting the result.
        </div>
      )}

      {/* Match Overview Card */}
      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-6">
        <div className="flex items-center justify-between">
          {/* Team A */}
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-16 h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              {match.teamA?.logo ? (
                <Image src={match.teamA.logo} alt={match.teamA.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/40 font-bold">
                  {match.teamA?.tag?.slice(0, 3) || "TBA"}
                </div>
              )}
              {match.winner?.id === match.teamA?.id && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                  <Crown size={12} className="text-white" />
                </div>
              )}
              {selectedGameWinnerId === match.teamA?.id && (
                <div className="absolute top-0 right-0 translate-x-1 -translate-y-1 w-6 h-6 bg-[#4a90d9] rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                  G{selectedGame}
                </div>
              )}
            </div>
            <div>
              <p className={`font-bold text-xl ${match.winner?.id === match.teamA?.id ? "text-emerald-400" : "text-white"}`}>
                {match.teamA?.name || "TBD"}
              </p>
              <p className="text-white/40 text-xs">{match.teamA?.tag}</p>
            </div>
          </div>

          {/* Score */}
          <div className="text-center px-8">
            <div className="flex items-center gap-4">
              <span className={`text-4xl font-black tabular-nums ${match.winner?.id === match.teamA?.id ? "text-emerald-400" : "text-white/50"}`}>
                {match.scoreA}
              </span>
              <span className="text-white/20 text-2xl">-</span>
              <span className={`text-4xl font-black tabular-nums ${match.winner?.id === match.teamB?.id ? "text-emerald-400" : "text-white/50"}`}>
                {match.scoreB}
              </span>
            </div>
            <span className={`text-sm font-bold uppercase tracking-wider ${
              isCompleted ? "text-emerald-400" : match.status === "LIVE" ? "text-red-400" : "text-[#e8a000]"
            }`}>
              {match.status}
            </span>
          </div>

          {/* Team B */}
          <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="text-right">
              <p className={`font-bold text-xl ${match.winner?.id === match.teamB?.id ? "text-emerald-400" : "text-white"}`}>
                {match.teamB?.name || "TBD"}
              </p>
              <p className="text-white/40 text-xs">{match.teamB?.tag}</p>
            </div>
            <div className="relative w-16 h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              {match.teamB?.logo ? (
                <Image src={match.teamB.logo} alt={match.teamB.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/40 font-bold">
                  {match.teamB?.tag?.slice(0, 3) || "TBA"}
                </div>
              )}
              {match.winner?.id === match.teamB?.id && (
                <div className="absolute -top-1 -left-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                  <Crown size={12} className="text-white" />
                </div>
              )}
              {selectedGameWinnerId === match.teamB?.id && (
                <div className="absolute top-0 left-0 -translate-x-1 -translate-y-1 w-6 h-6 bg-[#4a90d9] rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                  G{selectedGame}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Game Tabs */}
      <div className="flex gap-2">
        {Array.from({ length: totalGames }, (_, i) => i + 1).map((gameNum) => {
          const hasPerf = gamePerformances[gameNum]?.some((p) => p.hero);
          const gw = gameWinner[gameNum];
          return (
            <button
              key={gameNum}
              onClick={() => {
                setSelectedGame(gameNum);
                initGamePerformance(gameNum);
              }}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-wider border transition-all ${
                selectedGame === gameNum
                  ? "bg-[#e8a000] text-black border-[#e8a000]"
                  : hasPerf
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "bg-white/5 text-white/60 border-white/10 hover:border-[#e8a000]/50"
              }`}
            >
              Game {gameNum}
              {hasPerf && <CheckCircle size={12} className="inline ml-1" />}
              {gw && <span className="inline-block ml-2 w-3 h-3 bg-emerald-400 rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* Performance Entry */}
      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-sm font-black uppercase tracking-widest text-[#e8a000]">
            Game {selectedGame} Performance
          </span>
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666]">
              Game Winner:
            </label>
            <select
              value={gameWinner[selectedGame] || ""}
              onChange={async (e) => {
                const winnerId = e.target.value;
                setGameWinner((prev) => ({ ...prev, [selectedGame]: winnerId }));
                try {
                  const { error: err } = await dashboardFetch(`/api/matches/${matchId}/game-winner`, {
                    method: 'POST',
                    body: JSON.stringify({ gameNumber: selectedGame, winnerId }),
                  });
                  if (err) setError(err);
                } catch (err) {
                  console.error('Failed to persist game winner', err);
                }
              }}
              className="bg-[#0d0d14] border border-white/10 text-white px-3 py-1.5 text-sm outline-none focus:border-[#e8a000]/50"
            >
              <option value="">Select Winner</option>
              {match.teamA && <option value={match.teamA.id}>{match.teamA.name}</option>}
              {match.teamB && <option value={match.teamB.id}>{match.teamB.name}</option>}
            </select>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Team A Players */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Shield size={12} className="text-blue-400" />
              </div>
              <span className="text-sm font-bold text-blue-400">{match.teamA?.name} (Blue Side)</span>
            </div>
            <div className="grid gap-2">
              {gamePerformances[selectedGame]
                ?.filter((p) => p.teamId === match?.teamA?.id)
                .map((perf) => {
                  const currentLineupIds = gamePerformances[selectedGame]
                    ?.filter((p) => p.teamId === match?.teamA?.id)
                    .map((p) => p.playerId) || [];
                  return (
                    <PerformanceRow
                      key={perf.playerId}
                      perf={perf}
                      heroes={heroes}
                      teamPlayers={teamAPlayers}
                      currentLineupIds={currentLineupIds}
                      isTeamMvp={perf.isMvp}
                      roleLabel={ROLE_LABELS[teamAPlayers.find((x) => x.id === perf.playerId)?.role || ""] || ""}
                      onUpdate={(field, value) => updatePerformance(selectedGame, perf.playerId, field, value)}
                      onSetMvp={() => setMvp(selectedGame, perf.playerId)}
                      onReplace={(newId, newName) => replacePlayer(selectedGame, perf.playerId, newId, newName)}
                      inputRefs={getOrCreateRefs(perf.playerId, selectedGame)}
                      onTabFromAssists={() => handleTabFromAssists(selectedGame, perf.playerId)}
                    />
                  );
                })}
            </div>
          </div>

          {/* Team B Players */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <Swords size={12} className="text-red-400" />
              </div>
              <span className="text-sm font-bold text-red-400">{match.teamB?.name} (Red Side)</span>
            </div>
            <div className="grid gap-2">
              {gamePerformances[selectedGame]
                ?.filter((p) => p.teamId === match?.teamB?.id)
                .map((perf) => {
                  const currentLineupIds = gamePerformances[selectedGame]
                    ?.filter((p) => p.teamId === match?.teamB?.id)
                    .map((p) => p.playerId) || [];
                  return (
                    <PerformanceRow
                      key={perf.playerId}
                      perf={perf}
                      heroes={heroes}
                      teamPlayers={teamBPlayers}
                      currentLineupIds={currentLineupIds}
                      isTeamMvp={perf.isMvp}
                      roleLabel={ROLE_LABELS[teamBPlayers.find((x) => x.id === perf.playerId)?.role || ""] || ""}
                      onUpdate={(field, value) => updatePerformance(selectedGame, perf.playerId, field, value)}
                      onSetMvp={() => setMvp(selectedGame, perf.playerId)}
                      onReplace={(newId, newName) => replacePlayer(selectedGame, perf.playerId, newId, newName)}
                      inputRefs={getOrCreateRefs(perf.playerId, selectedGame)}
                      onTabFromAssists={() => handleTabFromAssists(selectedGame, perf.playerId)}
                    />
                  );
                })}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-white/10 flex justify-end gap-3">
          <button
            type="button"
            disabled={submittingPerf || !gameWinner[selectedGame]}
            onClick={() => submitGamePerformance(selectedGame)}
            className="flex items-center gap-2 px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50"
          >
            {submittingPerf ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
            Save Game {selectedGame}
          </button>
          <button
            type="button"
            onClick={() => clearGamePerformance(selectedGame)}
            disabled={submittingPerf}
            className="flex items-center gap-2 px-3 py-2 border border-white/10 text-white text-xs font-black uppercase tracking-wider hover:border-[#e8a000]/40 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Finalize Section */}
      {isCompleted && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg text-emerald-400 flex items-center gap-2">
                <Trophy size={20} /> Finalize Match Statistics
              </h3>
              <p className="text-white/60 text-sm mt-1">
                Update player KDA, win rates, MVP counts, and recalculate all leaderboards.
              </p>
              <ul className="mt-3 text-sm text-white/50 space-y-1">
                <li className="flex items-center gap-2">
                  <Target size={14} className="text-[#e8a000]" /> Player KDA stats from all games
                </li>
                <li className="flex items-center gap-2">
                  <Star size={14} className="text-[#e8a000]" /> MVP counts and rankings
                </li>
                <li className="flex items-center gap-2">
                  <Users size={14} className="text-[#e8a000]" /> Team standings and leaderboards
                </li>
              </ul>
            </div>
            <button
              type="button"
              disabled={finalizingStats}
              onClick={finalizeMatch}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white text-sm font-black uppercase tracking-wider hover:bg-emerald-400 disabled:opacity-50"
            >
              {finalizingStats ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />}
              Finalize & Update Leaderboards
            </button>
          </div>
        </div>
      )}

      {/* Existing Performance Summary */}
      {match.performances?.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <span className="text-sm font-black uppercase tracking-widest text-white/70">
              Recorded Performance Summary
            </span>
          </div>
          <div className="p-4">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-wider text-[#666] border-b border-white/10">
                  <th className="pb-2">Game</th>
                  <th className="pb-2">Player</th>
                  <th className="pb-2">Hero</th>
                  <th className="pb-2 text-center">K</th>
                  <th className="pb-2 text-center">D</th>
                  <th className="pb-2 text-center">A</th>
                  <th className="pb-2 text-center">KDA</th>
                  <th className="pb-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {match.performances.map((p) => {
                  const ASSIST_WEIGHT_UI = 0.5;
                  const kdaVal = (p.kills + ASSIST_WEIGHT_UI * p.assists) / Math.max(1, p.deaths);
                  const kda = kdaVal.toFixed(2);
                  return (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/2">
                      <td className="py-2 text-white/60 text-sm">G{p.gameNumber}</td>
                      <td className="py-2">
                        <span className="text-white font-semibold text-sm">
                          {p.player?.ign || "Unknown"}
                        </span>
                        {p.isMvp && (
                          <span className="ml-2 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded">
                            MVP
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-white/70 text-sm">{p.hero}</td>
                      <td className="py-2 text-center text-emerald-400 font-mono text-sm">{p.kills}</td>
                      <td className="py-2 text-center text-red-400 font-mono text-sm">{p.deaths}</td>
                      <td className="py-2 text-center text-[#e8a000] font-mono text-sm">{p.assists}</td>
                      <td className="py-2 text-center text-white font-mono text-sm">{kda}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          p.won ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                        }`}>
                          {p.won ? "WIN" : "LOSS"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Hero Search Select Component
function HeroSearchSelect({
  value,
  heroes,
  onChange,
}: {
  value: string;
  heroes: HeroCatalogItem[];
  onChange: (hero: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = heroes.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedHero = heroes.find((h) => h.name === value);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".hero-select-container")) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative hero-select-container">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setSearch("");
        }}
        className="w-full bg-[#0a0a0f] border border-white/10 text-white px-3 py-1.5 text-sm outline-none focus:border-[#e8a000]/50 flex items-center justify-between gap-2"
      >
        <span className={selectedHero ? "text-white" : "text-white/40"}>
          {selectedHero?.name || "Select hero"}
        </span>
        <ChevronDown size={14} className={`text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0d0d14] border border-white/10 rounded shadow-xl max-h-64 overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search heroes..."
                className="w-full bg-[#0a0a0f] border border-white/10 text-white pl-8 pr-3 py-1.5 text-sm outline-none focus:border-[#e8a000]/50"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-white/40 text-sm">No heroes found</div>
            ) : (
              filtered.map((hero) => (
                <button
                  key={hero.id}
                  type="button"
                  onClick={() => {
                    onChange(hero.name);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 flex items-center gap-2 ${
                    hero.name === value ? "bg-[#e8a000]/10 text-[#e8a000]" : "text-white"
                  }`}
                >
                  {hero.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Performance Row Component
function PerformanceRow({
  perf,
  heroes,
  isTeamMvp,
  roleLabel,
  onUpdate,
  onSetMvp,
  teamPlayers,
  currentLineupIds,
  onReplace,
  inputRefs,
  onTabFromAssists,
}: {
  perf: PerformanceInput;
  heroes: HeroCatalogItem[];
  isTeamMvp: boolean;
  roleLabel: string;
  onUpdate: (field: keyof PerformanceInput, value: unknown) => void;
  onSetMvp: () => void;
  teamPlayers: Player[];
  currentLineupIds: string[];
  onReplace: (newPlayerId: string, newPlayerName: string) => void;
  inputRefs?: { kills: React.RefObject<HTMLInputElement>; deaths: React.RefObject<HTMLInputElement>; assists: React.RefObject<HTMLInputElement> };
  onTabFromAssists?: () => void;
}) {
  const [showSwap, setShowSwap] = useState(false);
  
  // Get available substitutes (players not currently in lineup)
  const availableSubs = teamPlayers.filter(
    (p) => !currentLineupIds.includes(p.id)
  );

  return (
    <div className="flex items-center gap-3 bg-white/2 rounded-lg p-3 border border-white/5">
      {/* Player Info with Swap */}
      <div className="w-40 flex items-center gap-2 relative">
        <span className="text-[10px] font-bold text-[#e8a000] bg-[#e8a000]/10 px-1.5 py-0.5 rounded">
          {roleLabel}
        </span>
        <span className="text-white font-semibold text-sm truncate flex-1">{perf.playerName}</span>
        
        {/* Swap Button */}
        {availableSubs.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSwap(!showSwap)}
            className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-cyan-400 transition-colors"
            title="Substitute player"
          >
            <ArrowLeftRight size={14} />
          </button>
        )}
        
        {/* Swap Dropdown */}
        {showSwap && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl min-w-40">
            <div className="text-[10px] font-bold text-white/40 px-3 py-1.5 border-b border-white/10">
              Select Substitute
            </div>
            {availableSubs.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  onReplace(sub.id, sub.ign);
                  setShowSwap(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors"
              >
                {sub.ign}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hero */}
      <div className="flex-1 min-w-36">
        <HeroSearchSelect
          value={perf.hero}
          heroes={heroes}
          onChange={(hero) => onUpdate("hero", hero)}
        />
      </div>

      {/* KDA Inputs */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          {/** Kills */}
          <div className="flex flex-col items-center">
            <label className="text-[8px] font-bold text-emerald-400 mb-0.5">K</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdate("kills", Math.max(0, perf.kills - 1))}
                className="w-6 h-6 bg-white/5 text-white/60 rounded border border-white/5 flex items-center justify-center"
                title="Decrement kills"
              >
                −
              </button>
              <input
                ref={inputRefs?.kills}
                type="number"
                min={0}
                value={perf.kills}
                onChange={(e) => onUpdate("kills", parseInt(e.target.value) || 0)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") onUpdate("kills", perf.kills + 1);
                  if (e.key === "ArrowDown") onUpdate("kills", Math.max(0, perf.kills - 1));
                  if (e.key === "Tab" && !e.shiftKey) {
                    e.preventDefault();
                    inputRefs?.deaths?.current?.focus();
                  }
                }}
                className="w-12 bg-[#0a0a0f] border border-emerald-500/30 text-emerald-400 px-2 py-1 text-sm text-center outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => onUpdate("kills", perf.kills + 1)}
                className="w-6 h-6 bg-white/5 text-white/60 rounded border border-white/5 flex items-center justify-center"
                title="Increment kills"
              >
                +
              </button>
            </div>
          </div>

          {/** Deaths */}
          <div className="flex flex-col items-center">
            <label className="text-[8px] font-bold text-red-400 mb-0.5">D</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdate("deaths", Math.max(0, perf.deaths - 1))}
                className="w-6 h-6 bg-white/5 text-white/60 rounded border border-white/5 flex items-center justify-center"
                title="Decrement deaths"
              >
                −
              </button>
              <input
                ref={inputRefs?.deaths}
                type="number"
                min={0}
                value={perf.deaths}
                onChange={(e) => onUpdate("deaths", parseInt(e.target.value) || 0)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") onUpdate("deaths", perf.deaths + 1);
                  if (e.key === "ArrowDown") onUpdate("deaths", Math.max(0, perf.deaths - 1));
                  if (e.key === "Tab" && !e.shiftKey) {
                    e.preventDefault();
                    inputRefs?.assists?.current?.focus();
                  }
                }}
                className="w-12 bg-[#0a0a0f] border border-red-500/30 text-red-400 px-2 py-1 text-sm text-center outline-none focus:border-red-500"
              />
              <button
                type="button"
                onClick={() => onUpdate("deaths", perf.deaths + 1)}
                className="w-6 h-6 bg-white/5 text-white/60 rounded border border-white/5 flex items-center justify-center"
                title="Increment deaths"
              >
                +
              </button>
            </div>
          </div>

          {/** Assists */}
          <div className="flex flex-col items-center">
            <label className="text-[8px] font-bold text-[#e8a000] mb-0.5">A</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdate("assists", Math.max(0, perf.assists - 1))}
                className="w-6 h-6 bg-white/5 text-white/60 rounded border border-white/5 flex items-center justify-center"
                title="Decrement assists"
              >
                −
              </button>
              <input
                ref={inputRefs?.assists}
                type="number"
                min={0}
                value={perf.assists}
                onChange={(e) => onUpdate("assists", parseInt(e.target.value) || 0)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") onUpdate("assists", perf.assists + 1);
                  if (e.key === "ArrowDown") onUpdate("assists", Math.max(0, perf.assists - 1));
                  if ((e.key === "Tab" || e.key === "Enter") && !e.shiftKey) {
                    e.preventDefault();
                    onTabFromAssists?.();
                  }
                }}
                className="w-12 bg-[#0a0a0f] border border-[#e8a000]/30 text-[#e8a000] px-2 py-1 text-sm text-center outline-none focus:border-[#e8a000]"
              />
              <button
                type="button"
                onClick={() => onUpdate("assists", perf.assists + 1)}
                className="w-6 h-6 bg-white/5 text-white/60 rounded border border-white/5 flex items-center justify-center"
                title="Increment assists"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MVP Button */}
      <button
        type="button"
        onClick={onSetMvp}
        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all ${
          isTeamMvp
            ? "bg-amber-500 text-black border-amber-500"
            : "bg-white/5 text-white/40 border-white/10 hover:border-amber-500/50 hover:text-amber-400"
        }`}
      >
        <Crown size={12} />
        MVP
      </button>
    </div>
  );
}
