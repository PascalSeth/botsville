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
  Plus,
  Trash2,
  UserPlus,
  X,
  Check,
  Settings,
  Sliders,
  RotateCcw,
  Clock,
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
  date?: string | null;
  slots?: number | null;
  filled?: number | null;
  banner?: string | null;
  prizePool?: string | null;
  rules?: string[];
  numGroups?: number | null;
  teamsPerGroup?: number | null;
  matchesPerTeam?: number | null;
  playDaysPerWeek?: number[];
  matchesPerDay?: number | null;
  pointSystem?: string | null;
  defaultBestOf?: number;
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

const WEEKDAYS = [
  { id: 0, label: "Sun" },
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
];

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

type TeamOption = {
  id: string;
  name: string;
  tag: string;
  logo: string | null;
  region: string;
  captain?: { id: string; ign: string } | null;
  _count?: { players: number };
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

  // Orchestration Setup Modal State
  const [showOrchestrateModal, setShowOrchestrateModal] = useState(false);
  const [orchestrateStartDate, setOrchestrateStartDate] = useState("");
  const [orchestratePlayDays, setOrchestratePlayDays] = useState<number[]>([5, 6, 0, 2, 4]);
  const [orchestrateMatchesPerDay, setOrchestrateMatchesPerDay] = useState<number>(4);
  const [orchestrateBestOf, setOrchestrateBestOf] = useState<number>(3);
  const [orchestrateNumGroups, setOrchestrateNumGroups] = useState<number>(1);
  const [orchestratePointSystem, setOrchestratePointSystem] = useState<string>("MLBB_WEIGHTED");

  // 2-Step Orchestration State & Group Preview
  const [orchestrationStep, setOrchestrationStep] = useState<1 | 2>(1);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [groupingPreviewData, setGroupingPreviewData] = useState<{
    name: string;
    teams: { id: string; name: string; tag: string; logo: string | null }[];
  }[] | null>(null);
  const [previewSummary, setPreviewSummary] = useState<{
    totalMatches: number;
    estimatedDays: number;
    seriesBestOf: number;
  } | null>(null);

  // Reset / Clear Matches Modal State
  const [showResetMatchesModal, setShowResetMatchesModal] = useState(false);
  const [clearingMatches, setClearingMatches] = useState(false);

  // Manually Add Team Modal & Remove Team State
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [allTeams, setAllTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [addAutoApprove, setAddAutoApprove] = useState(true);
  const [addingTeam, setAddingTeam] = useState(false);
  const [teamSearchTerm, setTeamSearchTerm] = useState("");
  const [confirmDeleteReg, setConfirmDeleteReg] = useState<{ id: string; name: string } | null>(null);
  const [deletingRegId, setDeletingRegId] = useState<string | null>(null);

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

  // Handle Open Add Team Modal
  const handleOpenAddTeamModal = async () => {
    setShowAddTeamModal(true);
    setSelectedTeamId("");
    setTeamSearchTerm("");
    if (allTeams.length === 0) {
      setLoadingTeams(true);
      const { data } = await dashboardFetch<{ teams?: TeamOption[] }>("/api/teams?limit=100");
      setLoadingTeams(false);
      if (data) {
        const list = Array.isArray(data) ? data : data.teams ?? [];
        setAllTeams(list as TeamOption[]);
      }
    }
  };

  // Handle Submit Manually Adding a Team
  const handleAddTeamSubmit = async () => {
    if (!selectedTeamId || !tournamentId) return;
    setAddingTeam(true);
    setError(null);
    setSuccess(null);

    const { data, error: err } = await dashboardFetch<{ message?: string; results?: Array<{ message: string }> }>(
      `/api/tournaments/${tournamentId}/registrations`,
      {
        method: "POST",
        body: JSON.stringify({
          teamIds: [selectedTeamId],
          autoApprove: addAutoApprove,
        }),
      }
    );

    setAddingTeam(false);

    if (err) {
      setError(err);
      return;
    }

    const resultMessage = data?.results?.[0]?.message || data?.message || "Team registered successfully!";
    setSuccess(`Success: ${resultMessage}`);
    setShowAddTeamModal(false);
    setSelectedTeamId("");
    await loadData();
  };

  // Handle Removing a Team Registration
  const handleRemoveRegistration = async (registrationId: string) => {
    if (!tournamentId) return;
    setDeletingRegId(registrationId);
    setError(null);
    setSuccess(null);

    const { data, error: err } = await dashboardFetch<{ message?: string }>(
      `/api/tournaments/${tournamentId}/registrations?registrationId=${registrationId}`,
      {
        method: "DELETE",
      }
    );

    setDeletingRegId(null);
    setConfirmDeleteReg(null);

    if (err) {
      setError(err);
      return;
    }

    setSuccess(data?.message || "Team removed from tournament.");
    await loadData();
  };

  // Open Orchestrate Modal with current tournament parameters
  const handleOpenOrchestrateModal = () => {
    if (tournament) {
      let isoDate = "";
      if (tournament.date) {
        const d = new Date(tournament.date);
        if (!isNaN(d.getTime())) {
          isoDate = d.toISOString().slice(0, 16);
        }
      }
      if (!isoDate) {
        isoDate = new Date().toISOString().slice(0, 16);
      }
      setOrchestrateStartDate(isoDate);
      setOrchestratePlayDays(
        tournament.playDaysPerWeek && tournament.playDaysPerWeek.length > 0
          ? tournament.playDaysPerWeek
          : [5, 6, 0, 2, 4]
      );
      setOrchestrateMatchesPerDay(tournament.matchesPerDay || 4);
      setOrchestrateBestOf(tournament.defaultBestOf || 3);
      setOrchestrateNumGroups(tournament.numGroups || 1);
      setOrchestratePointSystem(tournament.pointSystem || "MLBB_WEIGHTED");
    }
    setOrchestrationStep(1);
    setGroupingPreviewData(null);
    setPreviewSummary(null);
    setShowOrchestrateModal(true);
  };

  // Toggle active play day in modal
  const togglePlayDay = (dayId: number) => {
    setOrchestratePlayDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort((a, b) => a - b)
    );
  };

  // Step 1 -> Step 2: Fetch Grouping Preview
  const handleFetchGroupingPreview = async () => {
    if (!tournamentId) return;
    setPreviewLoading(true);
    setError(null);

    const { data, error: err } = await dashboardFetch<{
      previewOnly?: boolean;
      preview?: {
        groupings: { name: string; teams: { id: string; name: string; tag: string; logo: string | null }[] }[];
        totalMatches: number;
        estimatedDays: number;
        seriesBestOf: number;
      };
    }>(`/api/tournaments/${tournamentId}/initialize-orchestrator`, {
      method: "POST",
      body: JSON.stringify({
        previewOnly: true,
        startDate: orchestrateStartDate,
        playDays: orchestratePlayDays,
        matchesPerDay: orchestrateMatchesPerDay,
        bestOf: orchestrateBestOf,
        numGroups: orchestrateNumGroups,
        pointSystem: orchestratePointSystem,
      }),
    });

    setPreviewLoading(false);

    if (err) {
      setError(err);
      return;
    }

    if (data?.preview) {
      setGroupingPreviewData(data.preview.groupings);
      setPreviewSummary({
        totalMatches: data.preview.totalMatches,
        estimatedDays: data.preview.estimatedDays,
        seriesBestOf: data.preview.seriesBestOf,
      });
      setOrchestrationStep(2);
    }
  };

  // Step 2 -> Execute: Confirm Groupings & Generate Matches
  const handleConfirmAndExecuteOrchestration = async () => {
    if (!tournamentId || !groupingPreviewData) return;
    setStartingTournament(true);
    setError(null);
    setSuccess(null);

    const customGroupings = groupingPreviewData.map((g) => ({
      name: g.name,
      teamIds: g.teams.map((t) => t.id),
    }));

    const { data, error: err } = await dashboardFetch<{ message?: string }>(
      `/api/tournaments/${tournamentId}/initialize-orchestrator`,
      {
        method: "POST",
        body: JSON.stringify({
          previewOnly: false,
          customGroupings,
          startDate: orchestrateStartDate,
          playDays: orchestratePlayDays,
          matchesPerDay: orchestrateMatchesPerDay,
          bestOf: orchestrateBestOf,
          numGroups: orchestrateNumGroups,
          pointSystem: orchestratePointSystem,
        }),
      }
    );

    setStartingTournament(false);
    setShowOrchestrateModal(false);
    setOrchestrationStep(1);

    if (err) {
      setError(err);
      return;
    }

    setSuccess(data?.message ?? "Tournament roadmap orchestrated successfully! Matches & schedule created.");
    await loadData();
  };

  // Clear all matches for a tournament
  const handleClearMatches = async () => {
    if (!tournamentId) return;
    setClearingMatches(true);
    setError(null);
    setSuccess(null);

    const { data, error: err } = await dashboardFetch<{ message?: string }>(
      `/api/tournaments/${tournamentId}/matches`,
      {
        method: "DELETE",
      }
    );

    setClearingMatches(false);
    setShowResetMatchesModal(false);

    if (err) {
      setError(err);
      return;
    }

    setSuccess(data?.message ?? "All tournament matches successfully cleared.");
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
              <button
                type="button"
                onClick={handleOpenAddTeamModal}
                className="px-3 py-2 bg-[#e8a000] hover:bg-[#ffb800] text-black font-black text-xs uppercase rounded-xl transition-all flex items-center gap-1 shadow-lg"
              >
                <UserPlus size={14} /> Add Team
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
                onClick={handleOpenOrchestrateModal}
                disabled={startingTournament || approvedCount < 2}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-500 to-[#e8a000] text-black font-black text-xs uppercase tracking-wider rounded-xl hover:from-amber-400 hover:to-[#ffb800] transition-all shadow-lg disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <Sliders size={15} /> Configure &amp; Launch Schedule
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("MATCHES")}
                  className="w-full px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs uppercase rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Swords size={14} /> View Live Matches ({matches.length})
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenOrchestrateModal}
                    className="flex-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] uppercase rounded-xl transition-all flex items-center justify-center gap-1 border border-white/15"
                    title="Re-configure schedule parameters and re-generate matches"
                  >
                    <Sliders size={13} /> Re-Orchestrate
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetMatchesModal(true)}
                    className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-[11px] uppercase rounded-xl transition-all flex items-center justify-center gap-1"
                    title="Clear all matches for this tournament"
                  >
                    <Trash2 size={13} /> Reset Matches
                  </button>
                </div>
              </div>
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
                Manually add teams that missed registration, approve/reject pending applications, or remove squads.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap shrink-0">
              <button
                type="button"
                onClick={handleOpenAddTeamModal}
                className="px-4 py-2.5 bg-[#e8a000] hover:bg-[#ffb800] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-1.5"
              >
                <UserPlus size={15} /> Add Team (Missed Reg)
              </button>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {registrations.length === 0 ? (
              <div className="col-span-full p-12 text-center text-gray-500 text-sm bg-[#0a0a0f] rounded-3xl border border-white/10 space-y-3">
                <Users className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="text-base text-gray-400 font-bold">No teams registered for this tournament yet.</p>
                <button
                  type="button"
                  onClick={handleOpenAddTeamModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8a000] hover:bg-[#ffb800] text-black font-black text-xs uppercase rounded-xl transition-all"
                >
                  <UserPlus size={14} /> Manually Add First Squad
                </button>
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
                    <div className="flex items-center gap-2 flex-wrap">
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
                          className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black font-bold text-xs rounded-lg transition-all border border-amber-500/20"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteReg({ id: reg.id, name: reg.team?.name || "Squad" })}
                        className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-bold text-xs rounded-lg transition-all border border-red-500/20 flex items-center gap-1"
                        title="Remove team completely from tournament"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── MANUALLY ADD TEAM MODAL ─────────────────────────── */}
      <AnimatePresence>
        {showAddTeamModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0a0a12] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#e8a000]/10 text-[#e8a000] border border-[#e8a000]/20">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase text-white tracking-wider">
                      Manually Add Team / Squad
                    </h3>
                    <p className="text-xs text-gray-400">
                      Register a squad that missed the standard registration deadline.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search filter */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search team by name, tag, or region..."
                    value={teamSearchTerm}
                    onChange={(e) => setTeamSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#e8a000]"
                  />
                </div>

                {/* Teams Selection List */}
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {loadingTeams ? (
                    <div className="py-8 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-[#e8a000]" />
                      <span>Loading available teams...</span>
                    </div>
                  ) : (() => {
                    const availableTeams = allTeams.filter((t) => {
                      const isAlreadyIn = registrations.some(
                        (r) => r.teamId === t.id && (r.status === "APPROVED" || r.status === "PENDING")
                      );
                      if (isAlreadyIn) return false;
                      if (!teamSearchTerm) return true;
                      const q = teamSearchTerm.toLowerCase();
                      return (
                        t.name.toLowerCase().includes(q) ||
                        t.tag.toLowerCase().includes(q) ||
                        t.region?.toLowerCase().includes(q)
                      );
                    });

                    if (availableTeams.length === 0) {
                      return (
                        <p className="py-8 text-center text-gray-500 text-xs">
                          {teamSearchTerm ? "No matching available teams found." : "All active teams are already registered!"}
                        </p>
                      );
                    }

                    return availableTeams.map((team) => {
                      const isSelected = selectedTeamId === team.id;
                      return (
                        <div
                          key={team.id}
                          onClick={() => setSelectedTeamId(team.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-[#e8a000]/15 border-[#e8a000] text-white"
                              : "bg-white/[0.02] border-white/10 hover:border-white/20 text-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-amber-400 text-xs overflow-hidden shrink-0">
                              {team.logo ? (
                                <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                              ) : (
                                team.tag || "TEAM"
                              )}
                            </div>
                            <div className="truncate">
                              <h4 className="text-xs font-black text-white truncate">[{team.tag}] {team.name}</h4>
                              <p className="text-[10px] text-gray-400">
                                {team.region ? `Region: ${team.region}` : ""} {team.captain ? `• Capt: @${team.captain.ign}` : ""}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="p-1.5 rounded-full bg-[#e8a000] text-black shrink-0">
                              <Check size={12} className="stroke-[3]" />
                            </span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Auto Approve Toggle */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Auto-Approve Registration</span>
                  <span className="text-[10px] text-gray-400">Immediately approve squad and fill tournament slot</span>
                </div>
                <input
                  type="checkbox"
                  checked={addAutoApprove}
                  onChange={(e) => setAddAutoApprove(e.target.checked)}
                  className="w-4 h-4 accent-[#e8a000] rounded cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-bold uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddTeamSubmit}
                  disabled={addingTeam || !selectedTeamId}
                  className="px-5 py-2.5 rounded-xl bg-[#e8a000] hover:bg-[#ffb800] text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#e8a000]/20 disabled:opacity-40 flex items-center gap-2"
                >
                  {addingTeam ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  Confirm Add Team
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CONFIRM REMOVE TEAM MODAL ─────────────────────────── */}
      <AnimatePresence>
        {confirmDeleteReg && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0a0a12] border border-red-500/30 rounded-3xl p-6 space-y-5 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black uppercase text-white">
                  Remove Squad from Tournament?
                </h3>
                <p className="text-xs text-gray-400">
                  Are you sure you want to remove <span className="text-white font-bold">{confirmDeleteReg.name}</span> from this tournament? This will release their slot.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteReg(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-bold uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveRegistration(confirmDeleteReg.id)}
                  disabled={deletingRegId === confirmDeleteReg.id}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-1.5 disabled:opacity-40"
                >
                  {deletingRegId === confirmDeleteReg.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Confirm Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CONFIGURE & LAUNCH ORCHESTRATION MODAL (2-STEP WIZARD) ─────────────────────────── */}
      <AnimatePresence>
        {showOrchestrateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#0a0a12] border border-amber-500/30 rounded-3xl p-6 space-y-6 shadow-2xl my-8 relative overflow-hidden text-left"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Sliders size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase">
                        Step {orchestrationStep} of 2
                      </span>
                      <h3 className="text-base font-black uppercase text-white tracking-wide">
                        {orchestrationStep === 1 ? "Configure Schedule Parameters" : "Review Groupings & Schedule"}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-400">
                      {orchestrationStep === 1
                        ? `Set scheduling and group parameters for ${approvedCount} approved squads.`
                        : `Review squad allocation across ${groupingPreviewData?.length || 1} group(s) before generating matches.`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOrchestrateModal(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white bg-white/5 hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* STEP 1: PARAMETER SELECTION */}
              {orchestrationStep === 1 && (
                <div className="space-y-4 text-left">
                  {/* Field 1: Start Date & Time */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <Calendar size={14} className="text-amber-400" /> Start Date &amp; Kickoff Time
                    </label>
                    <input
                      type="datetime-local"
                      value={orchestrateStartDate}
                      onChange={(e) => setOrchestrateStartDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-all"
                    />
                  </div>

                  {/* Field 2: Active Play Days per Week */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-400" /> Active Play Days per Week
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {WEEKDAYS.map((day) => {
                        const selected = orchestratePlayDays.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => togglePlayDay(day.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all border ${
                              selected
                                ? "bg-amber-500 text-black border-amber-400 font-black shadow-md shadow-amber-500/20"
                                : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-white"
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grid Fields: Matches/Day, Best Of, Num Groups, Point System */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Matches per Day */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                        Matches Per Day
                      </label>
                      <select
                        value={orchestrateMatchesPerDay}
                        onChange={(e) => setOrchestrateMatchesPerDay(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-all"
                      >
                        <option value={2} className="bg-[#0a0a12]">2 Matches / Day (Light)</option>
                        <option value={4} className="bg-[#0a0a12]">4 Matches / Day (Standard)</option>
                        <option value={6} className="bg-[#0a0a12]">6 Matches / Day (Intense)</option>
                        <option value={8} className="bg-[#0a0a12]">8 Matches / Day (Marathon)</option>
                      </select>
                    </div>

                    {/* Best Of Format */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                        Series Format (Best Of)
                      </label>
                      <select
                        value={orchestrateBestOf}
                        onChange={(e) => setOrchestrateBestOf(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-all"
                      >
                        <option value={1} className="bg-[#0a0a12]">BO1 (Single Game)</option>
                        <option value={3} className="bg-[#0a0a12]">BO3 (Best of 3 - Standard)</option>
                        <option value={5} className="bg-[#0a0a12]">BO5 (Best of 5 - Extended)</option>
                      </select>
                    </div>

                    {/* Number of Groups */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                        Number of Groups
                      </label>
                      <select
                        value={orchestrateNumGroups}
                        onChange={(e) => setOrchestrateNumGroups(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-all"
                      >
                        <option value={1} className="bg-[#0a0a12]">1 Group (Single Pool League)</option>
                        <option value={2} className="bg-[#0a0a12]">2 Groups (Group A / Group B)</option>
                        <option value={4} className="bg-[#0a0a12]">4 Groups (Group A-D)</option>
                      </select>
                    </div>

                    {/* Point System */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                        Standings Point System
                      </label>
                      <select
                        value={orchestratePointSystem}
                        onChange={(e) => setOrchestratePointSystem(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-all"
                      >
                        <option value="MLBB_WEIGHTED" className="bg-[#0a0a12]">MLBB Weighted (3pt / 2pt / 1pt / 0pt)</option>
                        <option value="STANDARD" className="bg-[#0a0a12]">Standard (3pt Win / 0pt Loss)</option>
                      </select>
                    </div>
                  </div>

                  {/* Step 1 Action Buttons */}
                  <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowOrchestrateModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-bold uppercase transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleFetchGroupingPreview}
                      disabled={previewLoading || approvedCount < 2 || orchestratePlayDays.length === 0}
                      className="px-5 py-2.5 rounded-xl bg-[#e8a000] hover:bg-[#ffb800] text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#e8a000]/20 disabled:opacity-40 flex items-center gap-2"
                    >
                      {previewLoading ? <Loader2 size={15} className="animate-spin" /> : <Users size={15} />}
                      Review Groupings &amp; Schedule &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: GROUPING PREVIEW & CONFIRMATION */}
              {orchestrationStep === 2 && (
                <div className="space-y-5 text-left">
                  {/* Top Control Bar with Reshuffle Button */}
                  <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 p-3 rounded-2xl">
                    <div className="text-xs">
                      <span className="font-bold text-white block">Group Allocation Preview</span>
                      <span className="text-[11px] text-gray-400">
                        {approvedCount} Squads distributed across {groupingPreviewData?.length || 1} Group(s)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleFetchGroupingPreview}
                      disabled={previewLoading}
                      className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs uppercase rounded-xl transition-all flex items-center gap-1.5"
                      title="Re-randomize team group distribution"
                    >
                      {previewLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Reshuffle Groups
                    </button>
                  </div>

                  {/* Group Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
                    {groupingPreviewData?.map((grp, gIdx) => (
                      <div
                        key={grp.name || gIdx}
                        className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider">
                            {grp.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold">
                            {grp.teams.length} Squads
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {grp.teams.map((tm) => (
                            <div
                              key={tm.id}
                              className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center font-bold text-[10px] text-amber-400 overflow-hidden shrink-0">
                                  {tm.logo ? (
                                    <img src={tm.logo} alt={tm.name} className="w-full h-full object-cover" />
                                  ) : (
                                    tm.tag?.slice(0, 3) || "TM"
                                  )}
                                </div>
                                <span className="font-bold text-white truncate">{tm.name}</span>
                              </div>
                              <span className="px-1.5 py-0.5 rounded bg-white/10 text-amber-300 font-mono text-[10px] font-bold">
                                {tm.tag}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Card */}
                  {previewSummary && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">Total Matches</span>
                        <span className="text-sm font-black text-white">{previewSummary.totalMatches}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">Est. Play Days</span>
                        <span className="text-sm font-black text-white">{previewSummary.estimatedDays} Days</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">Series Format</span>
                        <span className="text-sm font-black text-white">BO{previewSummary.seriesBestOf}</span>
                      </div>
                    </div>
                  )}

                  {/* Step 2 Action Buttons */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => setOrchestrationStep(1)}
                      className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-bold uppercase transition-all"
                    >
                      &larr; Back to Parameters
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAndExecuteOrchestration}
                      disabled={startingTournament}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#e8a000] hover:from-amber-400 hover:to-[#ffb800] text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 disabled:opacity-40 flex items-center gap-2"
                    >
                      {startingTournament ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                      🚀 Confirm Groupings &amp; Generate Matches
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── RESET / CLEAR MATCHES CONFIRMATION MODAL ─────────────────────────── */}
      <AnimatePresence>
        {showResetMatchesModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0a0a12] border border-red-500/30 rounded-3xl p-6 space-y-5 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto">
                <RotateCcw size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-black uppercase text-white">
                  Reset Tournament Roadmap &amp; Clear Matches?
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  This action will <span className="text-red-400 font-bold">permanently delete all {matches.length} matches</span> and clear group standings for this tournament. Approved squad registrations will remain intact so you can re-configure parameters and re-orchestrate the schedule.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetMatchesModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-bold uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearMatches}
                  disabled={clearingMatches}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-1.5 disabled:opacity-40"
                >
                  {clearingMatches ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Confirm Reset &amp; Clear
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

