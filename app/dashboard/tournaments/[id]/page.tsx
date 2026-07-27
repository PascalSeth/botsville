"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Swords,
  Layers,
  Users,
  CheckCircle,
  AlertTriangle,
  Play,
  Shield,
  Zap,
  Sparkles,
  Calendar,
  Search,
  Radio,
  ExternalLink,
  Award,
  Edit,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { dashboardFetch } from "../../lib/api";

type TournamentStage = {
  id: string;
  name: string;
  order: number;
  stageType: string;
  status: string;
  format: string;
  defaultBestOf: number;
};

type Match = {
  id: string;
  stage: string | null;
  round: number | null;
  status: string;
  scoreA: number;
  scoreB: number;
  scheduledTime: string;
  bracketType: string | null;
  bestOf: number;
  winnerId: string | null;
  teamA: { id: string; name: string; tag: string; logo: string | null } | null;
  teamB: { id: string; name: string; tag: string; logo: string | null } | null;
  winner: { id: string; name: string; tag: string } | null;
};

type GroupStanding = {
  id: string;
  groupName: string;
  rank: number;
  wins: number;
  losses: number;
  groupPoints: number;
  team: { id: string; name: string; tag: string; logo: string | null };
};

type TournamentDetail = {
  id: string;
  name: string;
  subtitle: string | null;
  status: string;
  format: string;
  seasonId: string;
  banner?: string | null;
  prizePool?: string | null;
  rules?: string[];
  season?: { id: string; name: string };
  stages?: TournamentStage[];
  matches?: Match[];
  groupStandings?: GroupStanding[];
};

const FORMAT_TAGS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  GROUP_STAGE: { label: "Group Stage + Playoffs", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  DOUBLE_ELIMINATION: { label: "Double Elimination", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  SINGLE_ELIMINATION: { label: "Single Elimination", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  ROUND_ROBIN: { label: "Round Robin League", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  SWISS: { label: "Swiss System", bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
};

export default function TournamentDetailPage() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const router = useRouter();

  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"BRACKET" | "MATCHES" | "STANDINGS">("BRACKET");
  const [advancingStage, setAdvancingStage] = useState(false);
  const [matchSearch, setMatchSearch] = useState("");

  const loadData = useCallback(async () => {
    if (!tournamentId) return;
    setLoading(true);
    setError(null);

    const [tRes, mRes] = await Promise.all([
      dashboardFetch<TournamentDetail>(`/api/tournaments/${tournamentId}`),
      dashboardFetch<Match[]>(`/api/tournaments/${tournamentId}/matches`),
    ]);

    setLoading(false);

    if (tRes.error) {
      setError(tRes.error);
      return;
    }

    setTournament(tRes.data ?? null);
    setMatches(mRes.data ?? (Array.isArray(mRes.data) ? mRes.data : []));
  }, [tournamentId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Handle Advance to Playoffs (for Group Stage or Swiss)
  const handleStartPlayoffs = async () => {
    if (!tournamentId) return;
    setAdvancingStage(true);
    setError(null);
    setSuccess(null);

    const { data, error: err } = await dashboardFetch<{ message: string }>(
      `/api/tournaments/${tournamentId}/advance-to-playoffs`,
      {
        method: "POST",
        body: JSON.stringify({ teamsPerGroup: 2 }),
      }
    );

    setAdvancingStage(false);

    if (err) {
      setError(err);
      return;
    }

    setSuccess(data?.message ?? "Playoffs bracket generated!");
    await loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05050a] flex flex-col items-center justify-center text-gray-500 space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#e8a000]" />
        <p className="text-xs uppercase font-bold tracking-widest">Loading Tournament Manager...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#05050a] p-10 text-center text-gray-500 space-y-4">
        <Trophy className="w-12 h-12 text-gray-600 mx-auto" />
        <p className="text-base text-gray-400 font-bold">Tournament not found or deleted.</p>
        <Link href="/dashboard/tournaments" className="inline-flex items-center gap-1 text-xs font-bold text-[#e8a000] underline">
          &larr; Return to Tournaments Hub
        </Link>
      </div>
    );
  }

  const fmtConfig = FORMAT_TAGS[tournament.format] ?? {
    label: tournament.format,
    bg: "bg-white/10",
    text: "text-white",
    border: "border-white/20",
  };

  // Group Matches by Bracket Type
  const upperBracketMatches = matches.filter(
    (m) => m.bracketType === "WINNER_BRACKET" || m.bracketType === "GRAND_FINAL" || m.bracketType === "BRACKET_RESET"
  );
  const lowerBracketMatches = matches.filter((m) => m.bracketType === "LOSER_BRACKET");
  const filteredMatches = matches.filter((m) => {
    if (!matchSearch) return true;
    const q = matchSearch.toLowerCase();
    return (
      m.stage?.toLowerCase().includes(q) ||
      m.teamA?.name.toLowerCase().includes(q) ||
      m.teamB?.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#05050a] text-white p-6 md:p-10 space-y-8 selection:bg-[#e8a000]/30">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/tournaments"
            className="p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-gray-400 hover:text-white"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border ${fmtConfig.bg} ${fmtConfig.text} ${fmtConfig.border}`}>
                {fmtConfig.label}
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {tournament.status}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
              {tournament.name}
            </h1>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/tournaments/${tournament.id}/edit`}
            className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white rounded-xl transition-all"
          >
            <Edit size={16} /> Edit Settings
          </Link>

          <button
            type="button"
            onClick={loadData}
            className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            title="Refresh Bracket Data"
          >
            <RefreshCw size={18} />
          </button>

          {tournament.format === "GROUP_STAGE" && (
            <button
              type="button"
              onClick={handleStartPlayoffs}
              disabled={advancingStage}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all shadow-xl shadow-purple-600/20 disabled:opacity-50"
            >
              {advancingStage ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              Generate Playoffs Bracket
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banners */}
      {error && (
        <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle size={18} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Navigation Tab Pills */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        {[
          { id: "BRACKET", label: "Bracket / Stages", icon: <Layers size={16} /> },
          { id: "MATCHES", label: `Matches (${matches.length})`, icon: <Swords size={16} /> },
          { id: "STANDINGS", label: "Group / League Table", icon: <Trophy size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as "BRACKET" | "MATCHES" | "STANDINGS")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === tab.id
                ? "bg-[#e8a000] text-black shadow-lg shadow-[#e8a000]/15"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: BRACKET & STAGES VIEW ─────────────────────────── */}
      {activeTab === "BRACKET" && (
        <div className="space-y-10">
          {/* Upper Bracket Section */}
          {upperBracketMatches.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest text-[#e8a000] flex items-center gap-2">
                  <Trophy size={16} /> Upper Bracket &amp; Grand Finals
                </h2>
                <span className="text-[11px] font-bold text-gray-500 uppercase">
                  {upperBracketMatches.length} Bracket Matches
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {upperBracketMatches.map((m) => {
                  const isGrandFinal = m.bracketType === "GRAND_FINAL" || m.bracketType === "BRACKET_RESET";
                  return (
                    <div
                      key={m.id}
                      className={`p-5 rounded-2xl border bg-[#0a0a0f] space-y-4 transition-all ${
                        isGrandFinal
                          ? "border-[#e8a000]/50 bg-gradient-to-b from-[#141005] to-[#0a0a0f] shadow-xl shadow-[#e8a000]/5"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      {/* Match Stage & BO Badge */}
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase">
                        <span className={isGrandFinal ? "text-[#e8a000]" : "text-gray-400"}>
                          {m.stage || "Upper Bracket"}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">
                          BO{m.bestOf}
                        </span>
                      </div>

                      {/* Teams & Score Cards */}
                      <div className="space-y-2">
                        {/* Team A */}
                        <div
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            m.winnerId === m.teamA?.id
                              ? "bg-emerald-500/10 border-emerald-500/40 text-white font-bold"
                              : "bg-white/[0.02] border-white/5 text-gray-400"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {m.teamA?.logo && (
                              <img src={m.teamA.logo} alt="" className="w-5 h-5 rounded object-cover" />
                            )}
                            <span className="text-xs truncate">
                              {m.teamA ? `[${m.teamA.tag}] ${m.teamA.name}` : "TBD"}
                            </span>
                          </div>
                          <span className="text-sm font-black text-[#e8a000]">{m.scoreA}</span>
                        </div>

                        {/* Team B */}
                        <div
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            m.winnerId === m.teamB?.id
                              ? "bg-emerald-500/10 border-emerald-500/40 text-white font-bold"
                              : "bg-white/[0.02] border-white/5 text-gray-400"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {m.teamB?.logo && (
                              <img src={m.teamB.logo} alt="" className="w-5 h-5 rounded object-cover" />
                            )}
                            <span className="text-xs truncate">
                              {m.teamB ? `[${m.teamB.tag}] ${m.teamB.name}` : "TBD"}
                            </span>
                          </div>
                          <span className="text-sm font-black text-[#e8a000]">{m.scoreB}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 font-mono">
                          {new Date(m.scheduledTime).toLocaleDateString()}
                        </span>
                        <Link
                          href={`/matches/${m.id}`}
                          className="text-[#e8a000] hover:underline font-bold"
                        >
                          Details &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lower Bracket Section */}
          {lowerBracketMatches.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
                  <Shield size={16} /> Lower Bracket (Redemption Path)
                </h2>
                <span className="text-[11px] font-bold text-gray-500 uppercase">
                  {lowerBracketMatches.length} Bracket Matches
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {lowerBracketMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-5 rounded-2xl border border-purple-500/20 bg-[#0a0a0f] space-y-4 hover:border-purple-500/40 transition-all"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase text-purple-400">
                      <span>{m.stage || "Lower Bracket"}</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">
                        BO{m.bestOf}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          m.winnerId === m.teamA?.id
                            ? "bg-purple-500/20 border-purple-500/40 text-white font-bold"
                            : "bg-white/[0.02] border-white/5 text-gray-400"
                        }`}
                      >
                        <span className="text-xs truncate">
                          {m.teamA ? `[${m.teamA.tag}] ${m.teamA.name}` : "TBD"}
                        </span>
                        <span className="text-sm font-black">{m.scoreA}</span>
                      </div>

                      <div
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          m.winnerId === m.teamB?.id
                            ? "bg-purple-500/20 border-purple-500/40 text-white font-bold"
                            : "bg-white/[0.02] border-white/5 text-gray-400"
                        }`}
                      >
                        <span className="text-xs truncate">
                          {m.teamB ? `[${m.teamB.tag}] ${m.teamB.name}` : "TBD"}
                        </span>
                        <span className="text-sm font-black">{m.scoreB}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 font-mono">
                        {new Date(m.scheduledTime).toLocaleDateString()}
                      </span>
                      <Link
                        href={`/matches/${m.id}`}
                        className="text-purple-400 hover:underline font-bold"
                      >
                        Details &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty Bracket Fallback */}
          {upperBracketMatches.length === 0 && lowerBracketMatches.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-[#0a0a0f] p-12 text-center text-gray-500 space-y-3">
              <Trophy className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-base text-gray-400 font-bold">No Playoff Bracket Initialized Yet</p>
              <p className="text-xs text-gray-500">
                Check the &quot;Matches&quot; tab to view Group Stage games or click &quot;Generate Playoffs Bracket&quot; above once group play concludes.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MATCHES LIST ─────────────────────────── */}
      {activeTab === "MATCHES" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search match or team tag..."
                value={matchSearch}
                onChange={(e) => setMatchSearch(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#e8a000]"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0a0a0f] overflow-hidden">
            {filteredMatches.length === 0 ? (
              <p className="p-12 text-center text-gray-500 text-sm">No matches found.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="space-y-1 min-w-[200px]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#e8a000]">
                        {m.stage || `Round ${m.round || 1}`}
                      </span>
                      <p className="text-xs text-gray-500 font-mono">
                        {new Date(m.scheduledTime).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 justify-center flex-1">
                      <div className="text-right w-44 truncate">
                        <span className="text-xs font-bold text-white truncate">
                          {m.teamA ? `[${m.teamA.tag}] ${m.teamA.name}` : "TBD"}
                        </span>
                      </div>

                      <div className="px-3 py-1 bg-white/5 rounded-xl border border-white/10 font-black text-sm text-[#e8a000]">
                        {m.scoreA} — {m.scoreB}
                      </div>

                      <div className="text-left w-44 truncate">
                        <span className="text-xs font-bold text-white truncate">
                          {m.teamB ? `[${m.teamB.tag}] ${m.teamB.name}` : "TBD"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 min-w-[150px]">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-white/5 text-gray-400 border border-white/10">
                        {m.status}
                      </span>
                      <Link
                        href={`/matches/${m.id}`}
                        className="text-xs text-[#e8a000] hover:underline font-bold"
                      >
                        Details &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: STANDINGS TABLE ─────────────────────────── */}
      {activeTab === "STANDINGS" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#0a0a0f] p-8 text-center space-y-3">
            <Trophy className="w-10 h-10 text-[#e8a000] mx-auto" />
            <h3 className="text-base font-black text-white uppercase tracking-wider">Tournament Leaderboard</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Standings automatically compute head-to-head records, game differentials, and MLBB weighted points.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
