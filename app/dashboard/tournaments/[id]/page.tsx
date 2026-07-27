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
  slots?: number | null;
  filled?: number | null;
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

type Registration = {
  id: string;
  tournamentId: string;
  teamId: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  seed?: number | null;
  registeredAt: string;
  team?: {
    id: string;
    name: string;
    tag: string;
    logo: string | null;
    region: string;
    captain?: { id: string; ign: string } | null;
  } | null;
};

export default function TournamentDetailPage() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const router = useRouter();

  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"BRACKET" | "MATCHES" | "STANDINGS" | "REGISTRATIONS">("BRACKET");
  const [advancingStage, setAdvancingStage] = useState(false);
  const [fixingSeriesSpecs, setFixingSeriesSpecs] = useState(false);
  const [startingTournament, setStartingTournament] = useState(false);
  const [approvingReg, setApprovingReg] = useState(false);
  const [matchSearch, setMatchSearch] = useState("");

  const loadData = useCallback(async () => {
    if (!tournamentId) return;
    setLoading(true);
    setError(null);

    const [tRes, mRes, rRes] = await Promise.all([
      dashboardFetch<TournamentDetail>(`/api/tournaments/${tournamentId}`),
      dashboardFetch<Match[]>(`/api/tournaments/${tournamentId}/matches`),
      dashboardFetch<Registration[]>(`/api/tournaments/${tournamentId}/registrations`),
    ]);

    setLoading(false);

    if (tRes.error) {
      setError(tRes.error);
      return;
    }

    setTournament(tRes.data ?? null);
    setMatches(mRes.data ?? (Array.isArray(mRes.data) ? mRes.data : []));
    setRegistrations(rRes.data ?? (Array.isArray(rRes.data) ? rRes.data : []));
  }, [tournamentId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Handle Approve single registration
  const handleApproveRegistration = async (registrationId: string) => {
    setApprovingReg(true);
    const { error: err } = await dashboardFetch(`/api/tournaments/${tournamentId}/registrations`, {
      method: "PUT",
      body: JSON.stringify({ registrationId, action: "approve" }),
    });
    setApprovingReg(false);
    if (err) {
      setError(err);
    } else {
      setSuccess("Squad registration approved!");
      void loadData();
    }
  };

  // Handle Reject single registration
  const handleRejectRegistration = async (registrationId: string) => {
    setApprovingReg(true);
    const { error: err } = await dashboardFetch(`/api/tournaments/${tournamentId}/registrations`, {
      method: "PUT",
      body: JSON.stringify({ registrationId, action: "reject" }),
    });
    setApprovingReg(false);
    if (err) {
      setError(err);
    } else {
      setSuccess("Squad registration rejected.");
      void loadData();
    }
  };

  // Handle Approve All Pending Squads
  const handleApproveAllPending = async () => {
    const pending = registrations.filter((r) => r.status === "PENDING");
    if (pending.length === 0) return;

    setApprovingReg(true);
    setError(null);
    setSuccess(null);

    for (const r of pending) {
      await dashboardFetch(`/api/tournaments/${tournamentId}/registrations`, {
        method: "PUT",
        body: JSON.stringify({ registrationId: r.id, action: "approve" }),
      });
    }

    setApprovingReg(false);
    setSuccess(`Successfully approved ${pending.length} pending squad registrations!`);
    await loadData();
  };

  // Handle Start Tournament & Generate Matches
  const handleStartTournament = async () => {
    if (!tournamentId) return;
    setStartingTournament(true);
    setError(null);
    setSuccess(null);

    const { data, error: err } = await dashboardFetch<{ message?: string }>(
      `/api/tournaments/${tournamentId}/initialize-orchestrator`,
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );

    setStartingTournament(false);

    if (err) {
      setError(err);
      return;
    }

    setSuccess(data?.message ?? "Tournament successfully started! Matches and schedule generated.");
    await loadData();
  };

  // Handle Fix Series Specs (Retroactive fix for Season 2 / existing tournaments)
  const handleFixSeriesSpecs = async () => {
    if (!tournamentId) return;
    setFixingSeriesSpecs(true);
    setError(null);
    setSuccess(null);

    const { data, error: err } = await dashboardFetch<{ message: string }>(
      `/api/tournaments/${tournamentId}/fix-bestof`,
      { method: "POST" }
    );

    setFixingSeriesSpecs(false);

    if (err) {
      setError(err);
      return;
    }

    setSuccess(data?.message ?? "Series specifications updated: Playoffs set to BO5, Grand Finals set to BO7!");
    await loadData();
  };

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

  const approvedCount = registrations.filter((r) => r.status === "APPROVED").length;
  const pendingCount = registrations.filter((r) => r.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-[#05050a] text-white p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8 selection:bg-[#e8a000]/30 relative overflow-x-hidden">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/dashboard/tournaments"
            className="p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-gray-400 hover:text-white shrink-0"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border ${fmtConfig.bg} ${fmtConfig.text} ${fmtConfig.border}`}>
                {fmtConfig.label}
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {tournament.status}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-tight">
              {tournament.name}
            </h1>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full lg:w-auto">
          <Link
            href={`/dashboard/tournaments/${tournament.id}/edit`}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white rounded-xl transition-all"
          >
            <Edit size={15} /> Edit Settings
          </Link>

          <button
            type="button"
            onClick={loadData}
            className="p-2.5 sm:p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white shrink-0"
            title="Refresh Bracket Data"
          >
            <RefreshCw size={17} />
          </button>

          <button
            type="button"
            onClick={handleFixSeriesSpecs}
            disabled={fixingSeriesSpecs}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
            title="Retroactively update all existing matches: Playoffs to BO5 and Grand Finals to BO7"
          >
            {fixingSeriesSpecs ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Fix Rules (BO5/BO7)
          </button>

          {tournament.format === "GROUP_STAGE" && (
            <button
              type="button"
              onClick={handleStartPlayoffs}
              disabled={advancingStage}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all shadow-xl shadow-purple-600/20 disabled:opacity-50"
            >
              {advancingStage ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
              Generate Playoffs Bracket
            </button>
          )}
        </div>
      </div>

      {/* ── TOURNAMENT WORKFLOW & LAUNCH COMMAND CENTER BAR ───────── */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#0d0d18] via-[#0b0b12] to-[#0d0d18] p-5 sm:p-6 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                Tournament Launch Workflow &amp; Operations
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-400">
                Follow the 3-step process to review registered teams, generate match schedules, and run playoffs.
              </p>
            </div>
          </div>

          {/* Quick Counts */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              {approvedCount} Approved Squads
            </span>
            {pendingCount > 0 && (
              <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold animate-pulse">
                {pendingCount} Pending Approval
              </span>
            )}
            <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-bold">
              {matches.length} Scheduled Matches
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* STEP 1: REGISTRATION REVIEW */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Step 1: Registrations</span>
                <span className="text-xs font-bold text-gray-400">{approvedCount}/{tournament.slots || 16} Teams</span>
              </div>
              <p className="text-xs text-gray-300 font-semibold">Review squad applications &amp; approve teams.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => setActiveTab("REGISTRATIONS")}
                className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold uppercase rounded-xl transition-all"
              >
                View Squads ({registrations.length})
              </button>
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={handleApproveAllPending}
                  disabled={approvingReg}
                  className="px-3 py-2 bg-emerald-500 text-black font-black text-xs uppercase rounded-xl hover:bg-emerald-400 transition-all"
                >
                  {approvingReg ? "Approving..." : `Approve All (${pendingCount})`}
                </button>
              )}
            </div>
          </div>

          {/* STEP 2: LAUNCH & GENERATE MATCHES */}
          <div className={`p-4 rounded-2xl border space-y-3 flex flex-col justify-between ${matches.length > 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/30"}`}>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Step 2: Match Schedule</span>
                <span className="text-xs font-bold text-gray-400">{matches.length > 0 ? "Matches Live" : "Not Started"}</span>
              </div>
              <p className="text-xs text-gray-300 font-semibold">
                {matches.length > 0 ? `${matches.length} matches generated & scheduled.` : "Generate initial match schedule for approved squads."}
              </p>
            </div>

            {matches.length === 0 ? (
              <button
                type="button"
                onClick={handleStartTournament}
                disabled={startingTournament || approvedCount < 2}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-500 to-[#e8a000] text-black font-black text-xs uppercase tracking-wider rounded-xl hover:from-amber-400 hover:to-[#ffb800] transition-all shadow-lg disabled:opacity-40"
              >
                {startingTournament ? <Loader2 size={14} className="animate-spin inline mr-1" /> : <Play size={14} className="inline mr-1" />}
                🚀 Start Tournament &amp; Generate Matches
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab("MATCHES")}
                className="w-full px-4 py-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs uppercase rounded-xl transition-all"
              >
                View Live Matches ({matches.length})
              </button>
            )}
          </div>

          {/* STEP 3: PLAYOFFS & STAGES */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Step 3: Knockout Playoffs</span>
                <span className="text-xs font-bold text-gray-400">BO5 / BO7</span>
              </div>
              <p className="text-xs text-gray-300 font-semibold">Advance top qualifying teams to knockout bracket.</p>
            </div>
            {tournament.format === "GROUP_STAGE" && (
              <button
                type="button"
                onClick={handleStartPlayoffs}
                disabled={advancingStage}
                className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg disabled:opacity-40"
              >
                {advancingStage ? <Loader2 size={14} className="animate-spin inline mr-1" /> : <Zap size={14} className="inline mr-1" />}
                Generate Playoffs Bracket
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Banners */}
      {error && (
        <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs sm:text-sm flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs sm:text-sm flex items-center gap-3">
          <CheckCircle size={18} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Navigation Tab Pills */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto scrollbar-none w-full">
        {[
          { id: "REGISTRATIONS", label: `Squad Registrations (${registrations.length})`, icon: <Users size={15} /> },
          { id: "BRACKET", label: "Bracket / Stages", icon: <Layers size={15} /> },
          { id: "MATCHES", label: `Matches (${matches.length})`, icon: <Swords size={15} /> },
          { id: "STANDINGS", label: "Group / League Table", icon: <Trophy size={15} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as "BRACKET" | "MATCHES" | "STANDINGS" | "REGISTRATIONS")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
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

      {/* ── TAB 4: REGISTRATIONS MANAGEMENT ─────────────────────────── */}
      {activeTab === "REGISTRATIONS" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0a0f] p-6 rounded-3xl border border-white/10">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="text-[#e8a000]" size={18} /> Registered Squads ({registrations.length})
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Approve or reject squad entries. Once teams are approved, click &quot;🚀 Start Tournament &amp; Generate Matches&quot;.
              </p>
            </div>
            {registrations.filter((r) => r.status === "PENDING").length > 0 && (
              <button
                type="button"
                onClick={handleApproveAllPending}
                disabled={approvingReg}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shrink-0"
              >
                {approvingReg ? "Processing..." : `Approve All Pending (${registrations.filter((r) => r.status === "PENDING").length})`}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {registrations.length === 0 ? (
              <div className="col-span-full p-12 text-center text-gray-500 text-sm bg-[#0a0a0f] rounded-3xl border border-white/10">
                No teams have registered for this tournament yet.
              </div>
            ) : (
              registrations.map((reg) => (
                <div
                  key={reg.id}
                  className="p-5 rounded-2xl border border-white/10 bg-[#0a0a0f] space-y-4 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-amber-400 text-sm overflow-hidden shrink-0">
                        {reg.team?.logo ? (
                          <img src={reg.team.logo} alt={reg.team.name} className="w-full h-full object-cover" />
                        ) : (
                          reg.team?.tag || "TEAM"
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">{reg.team?.name || "Unknown Squad"}</h4>
                        <p className="text-[11px] text-gray-400 font-mono">
                          Tag: [{reg.team?.tag}] • Captain: @{reg.team?.captain?.ign || "N/A"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-black uppercase rounded border shrink-0 ${
                        reg.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : reg.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse"
                          : "bg-red-500/10 text-red-400 border-red-500/30"
                      }`}
                    >
                      {reg.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                    <span className="text-gray-500 text-[10px]">
                      Registered: {new Date(reg.registeredAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      {reg.status !== "APPROVED" && (
                        <button
                          type="button"
                          onClick={() => handleApproveRegistration(reg.id)}
                          disabled={approvingReg}
                          className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black font-bold text-xs rounded-lg transition-all border border-emerald-500/30"
                        >
                          Approve
                        </button>
                      )}
                      {reg.status !== "REJECTED" && (
                        <button
                          type="button"
                          onClick={() => handleRejectRegistration(reg.id)}
                          disabled={approvingReg}
                          className="px-3 py-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-bold text-xs rounded-lg transition-all border border-red-500/20"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
