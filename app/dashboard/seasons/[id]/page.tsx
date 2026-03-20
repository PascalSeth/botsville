"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { dashboardFetch } from "../../lib/api";
import {
  Calendar, ChevronLeft, Loader2, Plus, Trophy, Zap,
  RefreshCw, CheckCircle, AlertTriangle,
} from "lucide-react";
import { TournamentAwardsDashboard } from "@/app/components/sections/TournamentAwardsDashboard";

// ── Types ────────────────────────────────────────────────────

type Season = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
};

type TeamOption = {
  id: string;
  name: string;
  tag: string;
  status: string;
};

type Tournament = {
  id: string;
  name: string;
  phase: string | null;
  status: string;
  format: string;
  _count?: { matches: number; registrations: number };
};

type Standing = {
  id: string;
  rank: number;
  previousRank: number | null;
  wins: number;
  losses: number;
  forfeits: number;
  points: number;
  streak: string | null;
  tier: string;
  team: { id: string; name: string; tag: string; logo: string | null; color: string | null };
};

type SeasonAwards = {
  seasonId: string;
  seasonName: string;
  championTeam: { id: string; name: string; tag: string; logo: string | null } | null;
  runnerUpTeam: { id: string; name: string; tag: string; logo: string | null } | null;
  thirdPlaceTeam: { id: string; name: string; tag: string; logo: string | null } | null;
  seasonMvp: { id: string; ign: string; photo: string | null; role: string; team: { id: string; name: string; tag: string; logo: string | null } } | null;
  bestOffender: { id: string; ign: string; photo: string | null; role: string; team: { id: string; name: string; tag: string; logo: string | null } } | null;
  bestDefender: { id: string; ign: string; photo: string | null; role: string; team: { id: string; name: string; tag: string; logo: string | null } } | null;
  awardedAt: string;
};

type TournamentMvp = {
  id: string;
  playerId: string;
  playerIgn: string;
  playerPhoto: string | null;
  playerRole: string;
  teamId: string;
  teamName: string;
  teamTag: string;
  teamLogo: string | null;
  mvpCount: number;
  totalKills: number;
  totalAssists: number;
  totalDeaths: number;
  winRate: number;
  ranking: number;
};


// ── Helpers ──────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-500/20 text-emerald-400",
  COMPLETED: "bg-[#555]/20 text-[#888]",
  UPCOMING: "bg-[#e8a000]/20 text-[#e8a000]",
  OPEN: "bg-blue-500/20 text-blue-400",
  ONGOING: "bg-purple-500/20 text-purple-400",
  CANCELLED: "bg-red-500/20 text-red-400",
  LEAGUE: "bg-[#e8a000]/20 text-[#e8a000]",
  PLAYOFFS: "bg-purple-500/20 text-purple-400",
};

function RankDelta({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null || previous === 0) return <span className="text-[#555]">—</span>;
  const delta = previous - current; // positive = moved up
  if (delta === 0) return <span className="text-[#555]">—</span>;
  if (delta > 0) return <span className="text-emerald-400 text-[10px]">▲{delta}</span>;
  return <span className="text-red-400 text-[10px]">▼{Math.abs(delta)}</span>;
}

// ── Main Component ───────────────────────────────────────────

export default function SeasonDetailPage() {
  const { id: seasonId } = useParams<{ id: string }>();

  const [season, setSeason] = useState<Season | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [allTeams, setAllTeams] = useState<TeamOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // League init form
  const [showLeagueForm, setShowLeagueForm] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [leagueStartDate, setLeagueStartDate] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [initializingLeague, setInitializingLeague] = useState(false);

  // Playoffs init form
  const [showPlayoffsForm, setShowPlayoffsForm] = useState(false);
  const [playoffsStartDate, setPlayoffsStartDate] = useState("");
  const [initializingPlayoffs, setInitializingPlayoffs] = useState(false);
  // Awards dashboard
  const [seasonAwards, setSeasonAwards] = useState<SeasonAwards | null>(null);
  const [tournamentMvps, setTournamentMvps] = useState<TournamentMvp[]>([]);
  const [loadingAwards, setLoadingAwards] = useState(false);

  const hasLeague = tournaments.some((t) => t.phase === "LEAGUE");
  const hasPlayoffs = tournaments.some((t) => t.phase === "PLAYOFFS");

  const loadTournamentMvps = useCallback(async (sId: string) => {
    setLoadingAwards(true);
    const { data, error: err } = await dashboardFetch<{ mvps: TournamentMvp[] }>(
      `/api/seasons/${sId}/mvps`
    );
    setLoadingAwards(false);
    if (!err && data) {
      setTournamentMvps(data.mvps ?? (Array.isArray(data) ? data : []));
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [seasonRes, tourneysRes, standingsRes, teamsRes, awardsRes] = await Promise.all([
      dashboardFetch<Season>(`/api/seasons/${seasonId}`),
      dashboardFetch<{ tournaments: Tournament[] }>(`/api/tournaments?seasonId=${seasonId}&limit=20`),
      dashboardFetch<{ cumulative: Standing[] }>(`/api/seasons/${seasonId}/standings`),
      dashboardFetch<{ teams: TeamOption[] }>("/api/teams?status=ACTIVE&limit=100"),
      dashboardFetch<{ data: SeasonAwards | null }>(`/api/seasons/${seasonId}/awards`),
    ]);
    setLoading(false);

    if (seasonRes.error) { setError(seasonRes.error); return; }
    setSeason(seasonRes.data ?? null);
    setTournaments(tourneysRes.data?.tournaments ?? []);
    setStandings(standingsRes.data?.cumulative ?? []);
    setAllTeams(
      Array.isArray(teamsRes.data)
        ? (teamsRes.data as unknown as TeamOption[])
        : (teamsRes.data?.teams ?? [])
    );
    
    // Load awards
    if (awardsRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSeasonAwards((awardsRes.data as any).data || (awardsRes.data as any) || null);
    }
    
    // Load tournament MVPs
    if (seasonId) {
      void loadTournamentMvps(seasonId);
    }
  }, [seasonId, loadTournamentMvps]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);

    return () => clearTimeout(timer);
  }, [load]);

  // ── Initialize League ──────────────────────────────────────
  const initLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTeamIds.length < 2) {
      setError("Select at least 2 teams"); return;
    }
    setInitializingLeague(true);
    setError(null);
    setSuccess(null);

    const { data, error: err } = await dashboardFetch<{ message: string; rounds: number; totalMatches: number }>(
      `/api/seasons/${seasonId}/initialize-league`,
      {
        method: "POST",
        body: JSON.stringify({
          teamIds: selectedTeamIds,
          leagueStartDate: leagueStartDate || undefined,
          leagueName: leagueName || undefined,
        }),
      }
    );

    setInitializingLeague(false);
    if (err) { setError(err); return; }
    setSuccess(data?.message ?? "League initialized");
    setShowLeagueForm(false);
    await load();
  };

  // ── Initialize Playoffs ────────────────────────────────────
  const initPlayoffs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playoffsStartDate) { setError("Set a start date for playoffs"); return; }
    setInitializingPlayoffs(true);
    setError(null);
    setSuccess(null);

    const { data, error: err } = await dashboardFetch<{ message: string }>(
      `/api/seasons/${seasonId}/initialize-playoffs`,
      {
        method: "POST",
        body: JSON.stringify({ playoffsStartDate: new Date(playoffsStartDate).toISOString() }),
      }
    );

    setInitializingPlayoffs(false);
    if (err) { setError(err); return; }
    setSuccess(data?.message ?? "Playoffs created");
    setShowPlayoffsForm(false);
    await load();
  };

  // ── Team multi-select toggle ─────────────────────────────
  const toggleTeam = (id: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#666]">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (!season) {
    return (
      <div className="text-center text-[#666] py-16">
        Season not found.{" "}
        <Link href="/dashboard/seasons" className="text-[#e8a000] hover:underline">Back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/seasons" className="text-[#666] hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="font-black text-2xl text-white uppercase tracking-[0.08em]">
            {season.name}
          </h1>
          <p className="text-sm text-[#666]">
            {new Date(season.startDate).toLocaleDateString()} — {new Date(season.endDate).toLocaleDateString()}
          </p>
        </div>
        <span className={`ml-auto px-2 py-0.5 text-xs font-bold rounded ${STATUS_COLORS[season.status] ?? "bg-white/10 text-white"}`}>
          {season.status}
        </span>
      </div>

      {/* Feedback */}
      {error && (
        <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}
      {success && (
        <div className="border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
          <CheckCircle size={14} /> {success}
        </div>
      )}

      {/* Tournaments overview */}
      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        <div className="p-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#666]">Tournaments</span>
          <button
            type="button"
            onClick={load}
            className="text-[#555] hover:text-white transition-colors"
          >
            <RefreshCw size={13} />
          </button>
        </div>
        {tournaments.length === 0 ? (
          <div className="p-6 text-center text-[#555] text-sm">No tournaments yet.</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#555]">
                <th className="p-3">Name</th>
                <th className="p-3">Phase</th>
                <th className="p-3">Format</th>
                <th className="p-3">Status</th>
                <th className="p-3">Matches</th>
                <th className="p-3">Teams</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((t) => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/2">
                  <td className="p-3 text-white font-semibold text-sm">{t.name}</td>
                  <td className="p-3">
                    {t.phase ? (
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${STATUS_COLORS[t.phase] ?? "bg-white/10 text-white"}`}>
                        {t.phase}
                      </span>
                    ) : (
                      <span className="text-[#555] text-xs">Cup</span>
                    )}
                  </td>
                  <td className="p-3 text-[#aaa] text-xs">{t.format.replace(/_/g, " ")}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${STATUS_COLORS[t.status] ?? "bg-white/10 text-white"}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3 text-[#666] text-sm">{t._count?.matches ?? 0}</td>
                  <td className="p-3 text-[#666] text-sm">{t._count?.registrations ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Action buttons row */}
      <div className="flex flex-wrap gap-3">
        {!hasLeague && (
          <button
            type="button"
            onClick={() => { setShowLeagueForm(!showLeagueForm); setShowPlayoffsForm(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800]"
          >
            <Calendar size={14} /> Initialize League
          </button>
        )}
        {hasLeague && !hasPlayoffs && standings.length >= 4 && (
          <button
            type="button"
            onClick={() => { setShowPlayoffsForm(!showPlayoffsForm); setShowLeagueForm(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-xs font-black uppercase tracking-wider hover:bg-purple-500"
          >
            <Trophy size={14} /> Generate Playoffs Bracket
          </button>
        )}
        {hasLeague && !hasPlayoffs && standings.length > 0 && standings.length < 4 && (
          <p className="text-xs text-[#666] flex items-center gap-1">
            <Zap size={12} /> Submit more match results to unlock playoffs (need 4 ranked teams)
          </p>
        )}
        {hasPlayoffs && (
          <span className="flex items-center gap-2 px-4 py-2 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-wider">
            <Trophy size={14} /> Playoffs bracket active
          </span>
        )}
      </div>

      {/* League init form */}
      {showLeagueForm && (
        <div className="rounded-lg border border-[#e8a000]/30 bg-[#0a0a0f]/80 p-5 space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#e8a000] flex items-center gap-2">
            <Calendar size={14} /> Initialize Regular Season
          </h2>
          <form onSubmit={initLeague} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">
                  League name (optional)
                </label>
                <input
                  type="text"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  placeholder={`${season.name} — Regular Season`}
                  className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">
                  Round 1 start date (defaults to season start)
                </label>
                <input
                  type="date"
                  value={leagueStartDate}
                  onChange={(e) => setLeagueStartDate(e.target.value)}
                  className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-2">
                Select teams ({selectedTeamIds.length} selected — min 2, max 32)
              </label>
              {allTeams.length === 0 ? (
                <p className="text-[#555] text-sm">No active teams found.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1">
                  {allTeams.map((team) => {
                    const checked = selectedTeamIds.includes(team.id);
                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => toggleTeam(team.id)}
                        className={`flex items-center gap-2 px-3 py-2 border text-left text-xs transition-colors ${
                          checked
                            ? "border-[#e8a000] bg-[#e8a000]/10 text-white"
                            : "border-white/10 bg-[#0d0d14] text-[#aaa] hover:border-white/30"
                        }`}
                      >
                        <span
                          className={`w-3 h-3 rounded-sm border shrink-0 ${checked ? "bg-[#e8a000] border-[#e8a000]" : "border-white/30"}`}
                        />
                        <span className="font-semibold">[{team.tag}]</span>
                        <span className="truncate">{team.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedTeamIds.length >= 2 && (
              <div className="text-[11px] text-[#888] bg-white/5 border border-white/10 px-3 py-2 rounded">
                <strong className="text-white">{selectedTeamIds.length} teams</strong> →{" "}
                <strong className="text-[#e8a000]">
                  {((selectedTeamIds.length * (selectedTeamIds.length - 1)) / 2)} matches
                </strong>{" "}
                across{" "}
                <strong className="text-[#e8a000]">
                  {selectedTeamIds.length % 2 === 0 ? selectedTeamIds.length - 1 : selectedTeamIds.length} rounds
                </strong>
                {" "}(one per week · BO3 each)
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={initializingLeague || selectedTeamIds.length < 2}
                className="flex items-center gap-2 px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50"
              >
                {initializingLeague ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Generate Schedule
              </button>
              <button
                type="button"
                onClick={() => setShowLeagueForm(false)}
                className="px-4 py-2 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Playoffs init form */}
      {showPlayoffsForm && (
        <div className="rounded-lg border border-purple-500/30 bg-[#0a0a0f]/80 p-5 space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-purple-400 flex items-center gap-2">
            <Trophy size={14} /> Generate Playoffs Bracket
          </h2>
          <p className="text-[11px] text-[#777]">
            This will seed the top 4 teams from the current standings:
            {standings.slice(0, 4).map((s, i) => (
              <span key={s.id} className="ml-1 text-white font-semibold">
                #{i + 1} {s.team.tag}{i < 3 ? "," : ""}
              </span>
            ))}
          </p>
          <p className="text-[11px] text-[#555]">
            SF1: #1 vs #4 (BO5) · SF2: #2 vs #3 (BO5) · 3rd Place (BO3) · Grand Final (BO7)
          </p>
          <form onSubmit={initPlayoffs} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">
                Playoffs start date &amp; time
              </label>
              <input
                type="datetime-local"
                value={playoffsStartDate}
                onChange={(e) => setPlayoffsStartDate(e.target.value)}
                className="bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-purple-500/50"
                required
              />
            </div>
            <button
              type="submit"
              disabled={initializingPlayoffs || !playoffsStartDate}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-xs font-black uppercase tracking-wider hover:bg-purple-500 disabled:opacity-50"
            >
              {initializingPlayoffs ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
              Create Bracket
            </button>
            <button
              type="button"
              onClick={() => setShowPlayoffsForm(false)}
              className="px-4 py-2 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider hover:bg-white/5"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Standings table */}
      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        <div className="p-3 border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
          Season Standings — {season.name}
        </div>
        {standings.length === 0 ? (
          <div className="p-8 text-center text-[#555] text-sm">
            No standings yet. Initialize the league and submit match results to see rankings.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#555]">
                  <th className="p-3 w-12">#</th>
                  <th className="p-3">Team</th>
                  <th className="p-3 text-center">W</th>
                  <th className="p-3 text-center">L</th>
                  <th className="p-3 text-center">FF</th>
                  <th className="p-3 text-center">PTS</th>
                  <th className="p-3 text-center">Streak</th>
                  <th className="p-3 text-center">Δ</th>
                  <th className="p-3 text-center">Tier</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="p-3 text-[#e8a000] font-black text-sm">{s.rank}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {s.team.logo ? (
                          <Image
                            src={s.team.logo}
                            alt={s.team.tag}
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black"
                            style={{ background: s.team.color ?? "#333", color: "#fff" }}
                          >
                            {s.team.tag.slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-semibold text-sm leading-none">{s.team.name}</p>
                          <p className="text-[#666] text-[10px]">[{s.team.tag}]</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center text-emerald-400 font-bold">{s.wins}</td>
                    <td className="p-3 text-center text-red-400 font-bold">{s.losses}</td>
                    <td className="p-3 text-center text-[#666] text-sm">{s.forfeits}</td>
                    <td className="p-3 text-center">
                      <span className={`font-black text-sm ${s.points < 0 ? "text-red-400" : "text-[#e8a000]"}`}>
                        {s.points}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {s.streak ? (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            s.streak.startsWith("W")
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {s.streak}
                        </span>
                      ) : (
                        <span className="text-[#555]">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <RankDelta current={s.rank} previous={s.previousRank} />
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-[10px] font-bold text-[#888]">{s.tier}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Awards Dashboard */}
      {season && (
        <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-6">
          <TournamentAwardsDashboard
            seasonAwards={seasonAwards}
            tournamentMvps={tournamentMvps}
            isLoading={loadingAwards}
            onViewMore={() => {
              // Optional: Add action to view full MVP list
            }}
          />
        </div>
      )}
    </div>
  );
}
