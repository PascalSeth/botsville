"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Trophy,
  Calendar,
  Plus,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  Zap,
  ChevronRight,
  ShieldAlert,
  Layers,
  Swords,
  Users,
  Sparkles,
  Award,
  BarChart3,
  Flame,
  CheckCircle2,
  Clock,
  Radio,
  Edit,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { dashboardFetch } from "../lib/api";

type Season = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
};

type Tournament = {
  id: string;
  name: string;
  subtitle: string | null;
  status: string;
  format: string;
  date: string;
  slots: number;
  filled: number;
  banner?: string | null;
  heroImage?: string | null;
  prizePool?: string | null;
  season?: { id: string; name: string } | null;
  stages?: { id: string; name: string; stageType: string; status: string }[];
  _count?: { registrations: number; matches: number };
};

const FORMAT_CONFIG: Record<
  string,
  { label: string; tag: string; bg: string; text: string; border: string; glow: string }
> = {
  GROUP_STAGE: {
    label: "Group Stage + Playoffs",
    tag: "MPL PRO",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/10",
  },
  DOUBLE_ELIMINATION: {
    label: "Double Elimination",
    tag: "PRO PLAY",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
    glow: "shadow-purple-500/10",
  },
  SINGLE_ELIMINATION: {
    label: "Single Elimination",
    tag: "FAST CUP",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    glow: "shadow-blue-500/10",
  },
  ROUND_ROBIN: {
    label: "Round Robin League",
    tag: "LEAGUE",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    glow: "shadow-amber-500/10",
  },
  SWISS: {
    label: "Swiss System",
    tag: "M-SERIES",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    glow: "shadow-cyan-500/10",
  },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  OPEN: { label: "Open for Reg", bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400", dot: "bg-blue-400" },
  ONGOING: { label: "Live Matches", bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-400 animate-ping" },
  UPCOMING: { label: "Scheduled", bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", dot: "bg-amber-400" },
  COMPLETED: { label: "Finished", bg: "bg-white/5 border-white/10", text: "text-gray-400", dot: "bg-gray-500" },
  CANCELLED: { label: "Cancelled", bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", dot: "bg-red-500" },
};

export default function UnifiedTournamentsDashboardPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [formatFilter, setFormatFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [seasonsRes, tourneysRes] = await Promise.all([
      dashboardFetch<Season[]>("/api/seasons"),
      dashboardFetch<{ tournaments: Tournament[] }>(
        `/api/tournaments?limit=50${statusFilter ? `&status=${statusFilter}` : ""}`
      ),
    ]);

    setLoading(false);

    if (seasonsRes.error) {
      setError(seasonsRes.error);
      return;
    }

    setSeasons(Array.isArray(seasonsRes.data) ? seasonsRes.data : []);
    setTournaments(tourneysRes.data?.tournaments ?? (Array.isArray(tourneysRes.data) ? tourneysRes.data : []));
  }, [statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeSeason = seasons.find((s) => s.status === "ACTIVE");

  const filteredTournaments = tournaments.filter((t) => {
    if (formatFilter && t.format !== formatFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.format.toLowerCase().includes(q) ||
        t.season?.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalRegisteredTeams = tournaments.reduce(
    (acc, cur) => acc + (cur._count?.registrations ?? cur.filled ?? 0),
    0
  );
  const liveCount = tournaments.filter((t) => t.status === "ONGOING" || t.status === "OPEN").length;

  return (
    <div className="min-h-screen bg-[#05050a] text-white p-6 md:p-10 space-y-8 relative overflow-hidden selection:bg-[#e8a000]/30 selection:text-white">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/4 w-[32rem] h-[32rem] bg-[#e8a000]/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 w-[28rem] h-[28rem] bg-purple-600/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Command Bar Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/10 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e8a000] to-amber-600 flex items-center justify-center text-black font-black shadow-lg shadow-[#e8a000]/20">
              <Trophy size={22} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                Tournaments <span className="text-[#e8a000]">&amp;</span> Seasons
              </h1>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Esports Command Center — Multi-stage brackets, dynamic seeding, and automated match progression.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-gray-400 hover:text-white hover:border-white/20 active:scale-95"
            title="Refresh Registry"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <Link
            href="/dashboard/tournaments/setup"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#e8a000] to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl hover:from-[#ffb800] hover:to-amber-400 transition-all shadow-xl shadow-[#e8a000]/15 hover:shadow-[#e8a000]/25 hover:scale-[1.02] active:scale-95"
          >
            <Plus size={18} />
            Launch New Tournament
          </Link>
        </div>
      </div>

      {/* Global Stat Counters Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
            <span>Total Tournaments</span>
            <Trophy size={16} className="text-[#e8a000]" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-white">{tournaments.length}</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
            <span>Live / Open Events</span>
            <Radio size={16} className="text-emerald-400 animate-pulse" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-emerald-400">{liveCount}</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
            <span>Registered Squads</span>
            <Users size={16} className="text-purple-400" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-purple-400">{totalRegisteredTeams}</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
            <span>Active Season</span>
            <Zap size={16} className="text-amber-400" />
          </div>
          <p className="text-base font-black text-white truncate">
            {activeSeason ? activeSeason.name : "None Active"}
          </p>
        </div>
      </div>

      {/* Active Season Banner */}
      {activeSeason && (
        <div className="relative rounded-3xl border border-amber-500/30 bg-gradient-to-r from-[#141005] via-[#0d0a14] to-[#0a0514] p-6 md:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  CURRENT ACTIVE SEASON
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {new Date(activeSeason.startDate).toLocaleDateString()} — {new Date(activeSeason.endDate).toLocaleDateString()}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {activeSeason.name}
              </h2>
              <p className="text-xs text-gray-400 max-w-xl">
                Cumulative regular season standings, monthly rankings, and playoff qualification brackets are live.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href={`/dashboard/seasons/${activeSeason.id}`}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all hover:scale-[1.02] active:scale-95"
              >
                Season Command Center <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search tournament, season, or format..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#e8a000]/60 focus:ring-1 focus:ring-[#e8a000]/30 transition-all"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter size={12} /> Status:
            </span>
            {[
              { id: "", label: "All Events" },
              { id: "OPEN", label: "Open Reg" },
              { id: "ONGOING", label: "Live Matches" },
              { id: "UPCOMING", label: "Scheduled" },
              { id: "COMPLETED", label: "Finished" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all shrink-0 ${
                  statusFilter === st.id
                    ? "bg-[#e8a000] text-black border-[#e8a000] shadow-lg shadow-[#e8a000]/10"
                    : "bg-[#0a0a0f] text-gray-400 border-white/10 hover:border-white/20 hover:text-white"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Format filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider shrink-0">
            Format:
          </span>
          <button
            type="button"
            onClick={() => setFormatFilter("")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
              formatFilter === ""
                ? "bg-white/15 text-white border border-white/20"
                : "bg-white/5 text-gray-400 hover:text-gray-200 border border-transparent"
            }`}
          >
            All Formats
          </button>
          {Object.entries(FORMAT_CONFIG).map(([fmtKey, fmtVal]) => (
            <button
              key={fmtKey}
              type="button"
              onClick={() => setFormatFilter(fmtKey)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all shrink-0 ${
                formatFilter === fmtKey
                  ? `${fmtVal.bg} ${fmtVal.text} ${fmtVal.border}`
                  : "bg-white/5 text-gray-400 hover:text-gray-200 border-transparent"
              }`}
            >
              {fmtVal.tag} — {fmtVal.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#e8a000]" />
          <p className="text-xs uppercase font-bold tracking-widest">Loading Esports Registry...</p>
        </div>
      )}

      {/* Error Feedback */}
      {error && (
        <div className="p-5 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-center gap-3">
          <ShieldAlert size={20} className="shrink-0" />
          <div>
            <p className="font-bold">Failed to load tournaments</p>
            <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredTournaments.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-[#0a0a0f] p-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-600">
            <Trophy size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white uppercase tracking-wider">No Tournaments Found</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              No events match your search or filter criteria. Click &quot;Launch New Tournament&quot; to initialize a new competition.
            </p>
          </div>
          <Link
            href="/dashboard/tournaments/setup"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#e8a000] text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-[#ffb800] transition-all shadow-lg shadow-[#e8a000]/10"
          >
            <Plus size={16} /> Setup Tournament
          </Link>
        </div>
      )}

      {/* Tournaments Grid Cards */}
      {!loading && !error && filteredTournaments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredTournaments.map((t, idx) => {
              const fmtConfig = FORMAT_CONFIG[t.format] ?? {
                label: t.format,
                tag: "EVENT",
                bg: "bg-white/10",
                text: "text-white",
                border: "border-white/20",
                glow: "shadow-white/5",
              };
              const stConfig = STATUS_CONFIG[t.status] ?? {
                label: t.status,
                bg: "bg-white/10 border-white/20",
                text: "text-white",
                dot: "bg-gray-400",
              };

              const filledCount = t._count?.registrations ?? t.filled ?? 0;
              const filledPercent = Math.min(100, Math.round((filledCount / (t.slots || 1)) * 100));

              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className={`rounded-3xl border border-white/10 bg-[#0a0a0f] hover:border-[#e8a000]/40 transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:shadow-2xl ${fmtConfig.glow}`}
                >
                  {/* Banner / Card Header */}
                  <div className="relative h-36 bg-gradient-to-br from-gray-900 via-[#10101a] to-[#0a0a0f] overflow-hidden">
                    {t.banner ? (
                      <img
                        src={t.banner}
                        alt={t.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent flex items-center justify-center opacity-30">
                        <Trophy size={64} className="text-white/10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />

                    {/* Format & Status Floating Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border backdrop-blur-md ${fmtConfig.bg} ${fmtConfig.text} ${fmtConfig.border}`}>
                        {fmtConfig.tag} — {fmtConfig.label}
                      </span>
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border backdrop-blur-md flex items-center gap-1.5 ${stConfig.bg} ${stConfig.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stConfig.dot}`} />
                        {stConfig.label}
                      </span>
                    </div>

                    {/* Season Pill */}
                    {t.season && (
                      <div className="absolute bottom-2 left-4 z-10 flex items-center gap-1 text-[11px] font-bold text-amber-400">
                        <Calendar size={12} /> {t.season.name}
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <h3 className="text-xl font-black text-white group-hover:text-[#e8a000] transition-colors leading-tight">
                        {t.name}
                      </h3>

                      {t.prizePool && (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                          <Sparkles size={12} /> Prize Pool: {t.prizePool}
                        </div>
                      )}
                    </div>

                    {/* Progress & Quick Stats */}
                    <div className="space-y-3 pt-2">
                      {/* Slots Fill Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users size={12} className="text-gray-500" /> Registration Slots
                          </span>
                          <span className="text-white font-black">{filledCount} / {t.slots} Teams</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#e8a000] to-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${filledPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-2 text-center pt-2">
                        <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-center gap-1">
                            <Swords size={10} /> Matches
                          </p>
                          <p className="text-sm font-black text-white mt-0.5">{t._count?.matches ?? 0}</p>
                        </div>
                        <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-center gap-1">
                            <Layers size={10} /> Stages
                          </p>
                          <p className="text-sm font-black text-white mt-0.5">{t.stages?.length ?? 1}</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer Manage Action */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-gray-500">
                        {new Date(t.date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/tournaments/${t.id}/edit`}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/10"
                          title="Edit Tournament Settings"
                        >
                          <Edit size={14} />
                        </Link>
                        <Link
                          href={`/dashboard/tournaments/${t.id}`}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-[#e8a000] text-gray-300 hover:text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all group-hover:shadow-lg group-hover:shadow-[#e8a000]/10"
                        >
                          Manage Bracket <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
