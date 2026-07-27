'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, useAnimationFrame } from 'framer-motion';
import {
  Trophy,
  Calendar,
  Clock,
  ChevronRight,
  X,
  CheckCircle,
  AlertCircle,
  Swords,
  MapPin,
  Flame,
  Zap,
  Loader2,
  Shield,
  Users,
  Sparkles,
  Search,
  Filter,
  Radio,
  Share2,
  Crown,
  Award,
  ArrowRight,
  Play,
} from 'lucide-react';
import { useHero } from "@/app/contexts/HeroContext";
import { getHeroImageUrl, optimizeImageUrl } from '@/lib/image-utils';

// ─────────────────────────────────────────────────────────────
// SCANLINES & CYBER EFFECTS
// ─────────────────────────────────────────────────────────────
const Scanlines = ({ opacity = 0.03 }: { opacity?: number }) => (
  <div
    className="absolute inset-0 pointer-events-none z-[1]"
    style={{
      opacity,
      backgroundImage:
        'repeating-linear-gradient(0deg,transparent,transparent 2px,#fff 2px,#fff 3px)',
      backgroundSize: '100% 3px',
    }}
  />
);

type TStatus = 'OPEN' | 'CLOSED' | 'UPCOMING' | 'COMPLETED' | 'LIVE' | 'ONGOING';

type Tournament = {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  format: string;
  location: string;
  date: string;
  registrationDeadline?: string;
  slots: number;
  filled?: number;
  status: TStatus;
  color?: string | null;
  tags?: string[];
  heroImage?: string | null;
  banner?: string | null;
  image?: string | null;
  prizePool?: string | null;
  rules?: string[];
  season?: { id: string; name: string } | null;
};

type TickerTeam = {
  rank: number;
  name: string;
  points: number;
  logo: string;
};

const DEFAULT_TICKER: TickerTeam[] = [
  { rank: 1, name: 'CERUS AL EGAN', points: 10145, logo: '/mlbb_logo.png' },
  { rank: 2, name: 'AD57 AUY', points: 10003, logo: '/mlbb_logo.png' },
  { rank: 3, name: 'AEDF AJAY', points: 9045, logo: '/mlbb_logo.png' },
  { rank: 4, name: 'NOVA STRIKE', points: 8870, logo: '/mlbb_logo.png' },
  { rank: 5, name: 'LEGION GH', points: 8610, logo: '/mlbb_logo.png' },
];

const FORMAT_CONFIG: Record<
  string,
  { label: string; tag: string; bg: string; text: string; border: string; glow: string }
> = {
  GROUP_STAGE: {
    label: "Group Stage + Playoffs",
    tag: "MPL PRO",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/40",
    glow: "shadow-emerald-500/10",
  },
  DOUBLE_ELIMINATION: {
    label: "Double Elimination",
    tag: "PRO PLAY",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/40",
    glow: "shadow-purple-500/10",
  },
  SINGLE_ELIMINATION: {
    label: "Single Elimination",
    tag: "FAST CUP",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/40",
    glow: "shadow-blue-500/10",
  },
  ROUND_ROBIN: {
    label: "Round Robin League",
    tag: "LEAGUE",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/40",
    glow: "shadow-amber-500/10",
  },
  SWISS: {
    label: "Swiss System",
    tag: "M-SERIES",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/40",
    glow: "shadow-cyan-500/10",
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string; canReg: boolean }
> = {
  OPEN: {
    label: "Registration Open",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-400",
    dot: "bg-emerald-400 animate-pulse",
    canReg: true,
  },
  ONGOING: {
    label: "Live Matches",
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-400",
    dot: "bg-amber-400 animate-ping",
    canReg: false,
  },
  UPCOMING: {
    label: "Scheduled",
    bg: "bg-blue-500/10 border-blue-500/30",
    text: "text-blue-400",
    dot: "bg-blue-400",
    canReg: false,
  },
  COMPLETED: {
    label: "Finished",
    bg: "bg-white/5 border-white/10",
    text: "text-gray-400",
    dot: "bg-gray-500",
    canReg: false,
  },
  CLOSED: {
    label: "Reg Closed",
    bg: "bg-red-500/10 border-red-500/30",
    text: "text-red-400",
    dot: "bg-red-500",
    canReg: false,
  },
};

const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// ── Infinity Marquee Ticker ─────────────────────────────────────────
const SeasonLeaderboardTicker = () => {
  const [tickerTeams, setTickerTeams] = useState<TickerTeam[]>(DEFAULT_TICKER);
  const trackRef = useRef<HTMLDivElement>(null);
  const xRef = useRef(0);

  useEffect(() => {
    fetch('/api/leaderboards/teams?limit=8', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const standings = Array.isArray(data?.standings) ? data.standings : [];
        const mapped: TickerTeam[] = standings
          .map((s: { rank?: number; points?: number; team?: { name?: string; logo?: string } }, i: number) => ({
            rank: s?.rank ?? i + 1,
            name: s?.team?.name || `Team ${i + 1}`,
            points: s?.points ?? 0,
            logo: s?.team?.logo || '/mlbb_logo.png',
          }))
          .filter((t: TickerTeam) => t.name.length > 0);
        if (mapped.length > 0) setTickerTeams(mapped);
      })
      .catch(() => undefined);
  }, []);

  const dupe = [...tickerTeams, ...tickerTeams];

  useAnimationFrame(() => {
    const t = trackRef.current;
    if (!t) return;
    xRef.current -= 0.6;
    if (Math.abs(xRef.current) >= t.scrollWidth / 2) xRef.current = 0;
    t.style.transform = `translateX(${xRef.current}px)`;
  });

  return (
    <div
      className="w-full overflow-hidden bg-black/40 border-y border-white/10 py-2.5"
      style={{ maskImage: 'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)' }}
    >
      <div ref={trackRef} className="flex gap-4 will-change-transform" style={{ width: 'max-content' }}>
        {dupe.map((team, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 px-4 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] shrink-0 hover:border-[#e8a000]/40 transition-colors"
          >
            <span className="text-[10px] font-black text-[#e8a000]">#{team.rank}</span>
            <span className="text-xs font-black uppercase text-white tracking-wider">{team.name}</span>
            <span className="text-[10px] font-mono text-gray-400">{team.points} PTS</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Countdown Hook ─────────────────────────────────────────────────
function useCountdown(target: Date) {
  const calc = useCallback(() => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, over: true };
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
      over: false,
    };
  }, [target]);
  const [tick, setTick] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTick(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return tick;
}

const HeroCountdownDisplay = ({ target }: { target: string }) => {
  const t = useCountdown(new Date(target));
  if (t.over)
    return (
      <span className="text-red-400 text-xs font-black tracking-widest uppercase">
        Registration Closed
      </span>
    );
  return (
    <div className="flex items-center gap-2">
      {[
        { v: t.d, l: "Days" },
        { v: t.h, l: "Hours" },
        { v: t.m, l: "Mins" },
        { v: t.s, l: "Secs" },
      ].map(({ v, l }, i) => (
        <React.Fragment key={l}>
          <div className="flex flex-col items-center bg-black/60 border border-white/15 px-3 py-2 rounded-xl min-w-[56px] backdrop-blur-md">
            <span className="font-mono font-black text-xl text-white leading-none">
              {String(v).padStart(2, "0")}
            </span>
            <span className="text-[8px] uppercase tracking-widest text-[#e8a000] mt-1 font-bold">
              {l}
            </span>
          </div>
          {i < 3 && <span className="text-white/30 font-black text-lg mb-2">:</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

// ── Registration Modal ──────────────────────────────────────────────
const RegisterModal = ({
  t: tournament,
  onClose,
}: {
  t: Tournament;
  onClose: () => void;
}) => {
  const [team, setTeam] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCaptain, setIsCaptain] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [registeredTeams, setRegisteredTeams] = useState<string[]>([]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const [teamResponse, registrationResponse] = await Promise.all([
          fetch("/api/my-team"),
          fetch(`/api/tournaments/${tournament.id}/register`),
        ]);
        const teamData = await teamResponse.json();
        const registrationData = await registrationResponse.json();

        if (teamResponse.ok && teamData?.name) {
          setRegisteredTeams([teamData.name]);
          setIsCaptain(Boolean(teamData.isCaptain));
          if (Boolean(teamData.isCaptain)) setTeam(teamData.name);
        }
        if (registrationResponse.ok && registrationData?.registered) {
          setAlreadyRegistered(true);
        }
      } catch {
        /* silent catch */
      }
    };
    void fetchTeams();
  }, [tournament.id]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const canSubmit = isCaptain && team && agreed && !loading && !alreadyRegistered;
  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || "Failed to register team");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const accentColor = tournament.color || "#e8a000";

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl bg-[#08080d] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-48 shrink-0 overflow-hidden bg-gradient-to-br from-gray-900 via-[#10101a] to-[#0a0a0f]">
          {(tournament.banner || tournament.heroImage || tournament.image) && (
            <img
              src={tournament.banner || tournament.heroImage || tournament.image || ""}
              alt=""
              className="w-full h-full object-cover brightness-[0.3]"
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at bottom left, ${accentColor}40, transparent 60%)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08080d] via-transparent to-transparent" />
          <Scanlines />
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded.xl bg-black/60 border border-white/10 text-white hover:bg-white/10 transition-colors z-10"
          >
            <X size={18} />
          </button>
          <div className="absolute bottom-5 left-6 right-6">
            <p
              className="text-[10px] tracking-[0.3em] uppercase font-black mb-1"
              style={{ color: accentColor }}
            >
              Team Registration Protocol
            </p>
            <h2 className="text-white font-black text-2xl uppercase tracking-tight leading-tight">
              {tournament.name}
            </h2>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <CheckCircle size={56} className="text-emerald-400" />
              <div className="space-y-1">
                <p className="text-white font-black text-2xl uppercase tracking-tight">
                  Registration Verified
                </p>
                <p className="text-gray-400 text-xs font-medium">
                  Your squad has been entered into the tournament registry.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-[#e8a000] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#ffb800] transition-all"
              >
                Close Window
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Start Date", val: formatDate(tournament.date), icon: Calendar },
                  { label: "Format", val: tournament.format.replace(/_/g, " "), icon: Swords },
                  { label: "Capacity", val: `${tournament.filled || 0}/${tournament.slots}`, icon: Users },
                  { label: "Location", val: tournament.location || "Online", icon: MapPin },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-white/2 border border-white/5 p-3 rounded-xl"
                  >
                    <div className="flex items-center gap-1.5 mb-1 opacity-50">
                      <s.icon size={12} className="text-[#e8a000]" />
                      <p className="text-[9px] tracking-widest uppercase font-black">{s.label}</p>
                    </div>
                    <p className="text-white text-xs font-black uppercase tracking-wide">{s.val}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
                  Select Registered Squad
                </label>
                {registeredTeams.length > 0 ? (
                  <div className="space-y-2">
                    {registeredTeams.map((tm) => (
                      <button
                        key={tm}
                        onClick={() => setTeam(tm)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                          team === tm
                            ? "bg-[#e8a000]/10 border-[#e8a000] text-white"
                            : "bg-white/2 border-white/5 text-gray-400 hover:bg-white/5"
                        }`}
                      >
                        <span className="font-black text-xs uppercase tracking-wider">{tm}</span>
                        {team === tm && <CheckCircle size={16} className="text-[#e8a000]" />}
                      </button>
                    ))}
                    {!isCaptain && (
                      <p className="text-[10px] text-red-400 font-bold flex items-center gap-1 mt-2">
                        <AlertCircle size={12} /> You must be a Team Captain to submit registration.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-6 border border-dashed border-white/10 rounded-xl text-center space-y-2">
                    <p className="text-xs text-gray-400 font-bold uppercase">No active squads found</p>
                    <Link
                      href="/register-team"
                      className="inline-block text-[#e8a000] text-xs font-black uppercase tracking-widest hover:underline"
                    >
                      Establish New Squad &rarr;
                    </Link>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 bg-white/5 text-[#e8a000] focus:ring-0"
                  />
                  <span className="text-gray-400 text-xs leading-relaxed font-bold">
                    Accept tournament protocol, role roster rules, and community guidelines.
                  </span>
                </label>
                <button
                  onClick={submit}
                  disabled={!canSubmit}
                  className="w-full py-4 bg-[#e8a000] text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-[#ffb800] transition-all disabled:opacity-30 flex items-center justify-center gap-2 shadow-xl shadow-[#e8a000]/15"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Shield size={16} /> Confirm Roster Registration
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ── Main Page Component ─────────────────────────────────────────────
export default function PublicTournamentsPage() {
  const { heroImage } = useHero();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [formatFilter, setFormatFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [registerModalTournament, setRegisterModalTournament] = useState<Tournament | null>(null);

  const heroArtUrl = heroImage
    ? getHeroImageUrl(heroImage)
    : '/heroes/granger.png';

  const fetchTournaments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/tournaments?limit=50${statusFilter ? `&status=${statusFilter}` : ""}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load tournaments");
      }
      setTournaments(data.tournaments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchTournaments();
  }, [fetchTournaments]);

  const featuredTournament =
    tournaments.find((t) => t.status === "ONGOING" || t.status === "OPEN") || tournaments[0];

  const filteredTournaments = tournaments.filter((t) => {
    if (formatFilter && t.format !== formatFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.format.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#05050a] text-white selection:bg-[#e8a000]/30 selection:text-white pb-24 relative overflow-hidden">
      {/* Dynamic Hero Glow Orbs */}
      <div className="absolute top-0 left-1/3 w-[45rem] h-[45rem] bg-[#e8a000]/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-10 w-[35rem] h-[35rem] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Ticker Bar Across Top */}
      <SeasonLeaderboardTicker />

      {/* Main Hero Showcase Section */}
      <section className="relative pt-12 pb-16 px-6 border-b border-white/10 overflow-hidden">
        <Scanlines opacity={0.02} />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#e8a000]/20 to-amber-500/10 border border-[#e8a000]/40 text-[#e8a000] text-xs font-black uppercase tracking-widest shadow-lg shadow-[#e8a000]/5">
              <Zap size={14} className="animate-pulse text-[#e8a000]" /> Season 6 Official Tournament Arena
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-none">
                Battle for <span className="text-[#e8a000]">Glory</span> &amp; Championship Points
              </h1>
              <p className="text-sm md:text-base text-gray-400 leading-relaxed max-w-2xl font-medium">
                Official Ghanaian MLBB Esports Hub. Compete in group stage qualifiers, double-elimination bracket series, and Swiss tournaments to earn season points and qualify for the Grand Finals.
              </p>
            </div>

            {/* Quick Stats Badges */}
            <div className="grid grid-cols-3 gap-3 max-w-lg pt-2">
              <div className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Active Events</p>
                <p className="text-xl font-black text-white mt-0.5">{tournaments.length}</p>
              </div>
              <div className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Formats</p>
                <p className="text-xl font-black text-[#e8a000] mt-0.5">5 Formats</p>
              </div>
              <div className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Status</p>
                <p className="text-xl font-black text-emerald-400 mt-0.5">Live Season</p>
              </div>
            </div>
          </div>

          {/* Right Hero Artwork Floating Showcase */}
          <div className="lg:col-span-5 relative flex justify-center items-center min-h-[320px]">
            {/* Glowing Neon Ring */}
            <div className="absolute w-72 h-72 rounded-full border border-[#e8a000]/30 bg-gradient-to-br from-[#e8a000]/10 to-purple-600/10 blur-xl animate-pulse" />

            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 w-full max-w-sm"
            >
              <img
                src={heroArtUrl}
                alt="MLBB Hero Artwork"
                className="w-full h-auto object-contain drop-shadow-[0_20px_40px_rgba(232,160,0,0.35)]"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 pt-12 space-y-12">
        {/* Featured Live/Open Tournament Card */}
        {featuredTournament && (
          <div className="relative rounded-3xl border border-[#e8a000]/30 bg-gradient-to-b from-[#141005] via-[#0d0a14] to-[#0a0514] p-6 md:p-10 overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#e8a000]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              {/* Image Thumbnail */}
              <div className="lg:col-span-5 relative h-64 lg:h-72 rounded-2xl overflow-hidden border border-white/10">
                {(featuredTournament.banner || featuredTournament.heroImage || featuredTournament.image) ? (
                  <img
                    src={featuredTournament.banner || featuredTournament.heroImage || featuredTournament.image || ""}
                    alt={featuredTournament.name}
                    className="w-full h-full object-cover brightness-[0.7] group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-900 via-purple-950 to-black flex items-center justify-center">
                    <Trophy size={64} className="text-white/10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    SEASON FEATURED EVENT
                  </span>
                </div>
              </div>

              {/* Tournament Info */}
              <div className="lg:col-span-7 space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-[#e8a000]/20 text-[#e8a000] border border-[#e8a000]/30">
                      {featuredTournament.format.replace(/_/g, " ")}
                    </span>
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {featuredTournament.status}
                    </span>
                  </div>

                  <h2 className="text-3xl md:text-4xl font-black uppercase text-white tracking-tight leading-tight">
                    {featuredTournament.name}
                  </h2>

                  {featuredTournament.prizePool && (
                    <p className="text-sm font-black text-amber-400 flex items-center gap-1.5">
                      <Sparkles size={16} /> Prize Pool: {featuredTournament.prizePool}
                    </p>
                  )}
                </div>

                {/* Countdown Timer if Deadline exists */}
                {featuredTournament.registrationDeadline && (
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      Registration Countdown
                    </p>
                    <HeroCountdownDisplay target={featuredTournament.registrationDeadline} />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-4 pt-2">
                  {featuredTournament.status === "OPEN" && (
                    <button
                      onClick={() => setRegisterModalTournament(featuredTournament)}
                      className="px-8 py-3.5 bg-gradient-to-r from-[#e8a000] to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl hover:from-[#ffb800] hover:to-amber-400 transition-all shadow-xl shadow-[#e8a000]/20 hover:scale-105"
                    >
                      Register Squad Now
                    </button>
                  )}
                  <Link
                    href={`/tournaments/${featuredTournament.id}`}
                    className="px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all"
                  >
                    View Bracket &amp; Schedule
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar & Filters */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search tournament or format..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#e8a000]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
              <Filter size={12} className="text-gray-500 shrink-0 mr-1" />
              {[
                { id: "", label: "All Statuses" },
                { id: "OPEN", label: "Open Reg" },
                { id: "ONGOING", label: "Live Matches" },
                { id: "UPCOMING", label: "Scheduled" },
                { id: "COMPLETED", label: "Finished" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all shrink-0 ${
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

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-[#e8a000]" />
            <p className="text-xs uppercase font-bold tracking-widest">Loading Tournament Catalog...</p>
          </div>
        )}

        {/* Error Feedback */}
        {error && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredTournaments.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-[#0a0a0f] p-16 text-center space-y-2">
            <Trophy className="w-12 h-12 mx-auto text-gray-600 mb-2" />
            <p className="font-bold text-white text-base">No Tournaments Found</p>
            <p className="text-xs text-gray-500">Try adjusting your filters or search term.</p>
          </div>
        )}

        {/* Tournaments Grid Cards */}
        {!loading && !error && filteredTournaments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((t) => {
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
                canReg: false,
              };

              const filledCount = t.filled || 0;
              const filledPercent = Math.min(100, Math.round((filledCount / (t.slots || 1)) * 100));

              return (
                <div
                  key={t.id}
                  className={`rounded-3xl border border-white/10 bg-[#0a0a0f] hover:border-[#e8a000]/40 transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:shadow-2xl ${fmtConfig.glow}`}
                >
                  <div className="relative h-44 bg-gradient-to-br from-gray-900 via-[#10101a] to-[#0a0a0f] overflow-hidden">
                    {(t.banner || t.heroImage || t.image) ? (
                      <img
                        src={t.banner || t.heroImage || t.image || ""}
                        alt={t.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white/10">
                        <Trophy size={56} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />

                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border backdrop-blur-md ${fmtConfig.bg} ${fmtConfig.text} ${fmtConfig.border}`}>
                        {fmtConfig.tag} — {fmtConfig.label}
                      </span>
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border backdrop-blur-md flex items-center gap-1.5 ${stConfig.bg} ${stConfig.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stConfig.dot}`} />
                        {stConfig.label}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-white group-hover:text-[#e8a000] transition-colors leading-tight">
                        {t.name}
                      </h3>
                      {t.prizePool && (
                        <p className="text-xs font-bold text-amber-400 flex items-center gap-1">
                          <Sparkles size={12} /> Prize Pool: {t.prizePool}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
                          <span>Slots Filled</span>
                          <span className="text-white font-black">{filledCount} / {t.slots} Squads</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#e8a000] to-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${filledPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-white/5">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Calendar size={12} className="text-gray-500" /> {formatDate(t.date)}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <MapPin size={12} className="text-gray-500" /> {t.location}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                      {stConfig.canReg ? (
                        <button
                          onClick={() => setRegisterModalTournament(t)}
                          className="flex-1 py-3 bg-gradient-to-r from-[#e8a000] to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl hover:from-[#ffb800] hover:to-amber-400 transition-all shadow-lg shadow-[#e8a000]/10"
                        >
                          Register Team
                        </button>
                      ) : (
                        <Link
                          href={`/tournaments/${t.id}`}
                          className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors text-center border border-white/10"
                        >
                          View Schedule &amp; Bracket &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {registerModalTournament && (
        <RegisterModal
          t={registerModalTournament}
          onClose={() => setRegisterModalTournament(null)}
        />
      )}
    </div>
  );
}