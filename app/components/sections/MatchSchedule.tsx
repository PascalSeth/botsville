'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Eye, Bell, Radio, Clock, Trophy, Swords, Calendar, LayoutGrid, ChevronRight, Shield, Crown, Info } from 'lucide-react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import StartingFiveModal from './StartingFiveModal';

/* ────────────────────────────────────────────────────────── */
/*  Types & Types (Keep original logic)                       */
/* ────────────────────────────────────────────────────────── */
// ... (Types remain identical to your provided file)
type MatchTeam = { id?: string; name: string; tag: string; logo: string | null };
type PlayerData = { id: string; ign: string; role: string; photo: string | null; isSubstitute: boolean; user?: { photo: string | null }; };
type ScheduleMatch = { id: string; time: string; scheduledAt: string; elapsed: string | null; teamA: MatchTeam & { isEliminated?: boolean }; teamB: MatchTeam & { isEliminated?: boolean }; status: 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'FORFEITED' | 'DISPUTED'; scoreA: number; scoreB: number; stage: string; lobby?: 'LOBBY_A' | 'LOBBY_B'; playDay?: number; isChallenge?: boolean; };
type TournamentListItem = { id: string; name: string; status: string; _count?: { matches?: number } };
type ApiMatch = { id: string; scheduledTime: string; elapsed: string | null; status: 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'FORFEITED' | 'DISPUTED'; scoreA: number; scoreB: number; stage: string | null; lobby: 'LOBBY_A' | 'LOBBY_B' | null; playDay: number | null; teamA: { id: string; name: string; tag: string | null; logo: string | null; registrations?: { isEliminated: boolean }[] }; teamB: { id: string; name: string; tag: string | null; logo: string | null; registrations?: { isEliminated: boolean }[] }; challengeRequest?: { id: string } | null; };

/* ────────────────────────────────────────────────────────── */
/*  Helpers                                                   */
/* ────────────────────────────────────────────────────────── */
const formatMatchTime = (value: string) => {
  const d = new Date(value);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const buildTeamTag = (name: string, tag?: string | null) => {
  if (tag?.trim()) return tag.trim().toUpperCase();
  return name.split(' ').filter(Boolean).slice(0, 3).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'TM';
};

/* ────────────────────────────────────────────────────────── */
/*  Custom Hooks (Logic Kept Intact)                          */
/* ────────────────────────────────────────────────────────── */
const useRealtimeMatches = () => {
  const [matches, setMatches] = useState<ScheduleMatch[]>([]);
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initialSelectionDone = useRef(false);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await fetch('/api/tournaments?limit=20', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const list = (Array.isArray(data?.tournaments) ? data.tournaments : []).filter((t: TournamentListItem) => (t._count?.matches ?? 0) > 0);
        setTournaments(list);
        if (list.length > 0 && !initialSelectionDone.current) {
          const prioritize = list.find((t: TournamentListItem) => t.status === 'LIVE') || list.find((t: TournamentListItem) => t.status === 'UPCOMING') || list[0];
          setActiveTournamentId(prioritize.id);
          initialSelectionDone.current = true;
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchTournaments();
  }, []);

  const loadMatches = useCallback(async () => {
    if (!activeTournamentId) return;
    try {
      const mRes = await fetch(`/api/tournaments/${activeTournamentId}/matches`, { cache: 'no-store' });
      if (!mRes.ok) return;
      const mData: ApiMatch[] = await mRes.json();
      const mapped: ScheduleMatch[] = (Array.isArray(mData) ? mData : []).map((m) => ({
        id: m.id,
        time: formatMatchTime(m.scheduledTime),
        scheduledAt: m.scheduledTime,
        elapsed: m.elapsed,
        teamA: {
          id: m.teamA?.id, name: m.teamA?.name || 'Team A',
          tag: buildTeamTag(m.teamA?.name || 'Team A', m.teamA?.tag),
          logo: m.teamA?.logo || null,
          isEliminated: m.teamA?.registrations?.[0]?.isEliminated ?? false
        },
        teamB: {
          id: m.teamB?.id, name: m.teamB?.name || 'Team B',
          tag: buildTeamTag(m.teamB?.name || 'Team B', m.teamB?.tag),
          logo: m.teamB?.logo || null,
          isEliminated: m.teamB?.registrations?.[0]?.isEliminated ?? false
        },
        status: m.status, scoreA: m.scoreA || 0, scoreB: m.scoreB || 0,
        stage: m.stage || 'Match', lobby: m.lobby || undefined, playDay: m.playDay || undefined,
        isChallenge: Boolean(m.challengeRequest),
      }));
      setMatches(mapped);
    } catch (err) { console.error(err); }
  }, [activeTournamentId]);

  useEffect(() => {
    loadMatches();
    const iv = setInterval(loadMatches, 30000);
    return () => clearInterval(iv);
  }, [loadMatches]);

  return { matches, tournaments, activeTournamentId, setActiveTournamentId, loading };
};

/* ────────────────────────────────────────────────────────── */
/*  UI Components                                             */
/* ────────────────────────────────────────────────────────── */

const StatusBadge = ({ status, isLive }: { status: string, isLive: boolean }) => {
  const colors: any = {
    LIVE: 'text-red-500 bg-red-500/10 border-red-500/20',
    UPCOMING: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    COMPLETED: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  };
  return (
    <div className={`px-2 py-0.5 rounded-sm border text-[9px] font-black uppercase tracking-tighter ${colors[status] || 'text-white/40 bg-white/5 border-white/10'}`}>
      <span className="flex items-center gap-1.5">
        {isLive && <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />}
        {status}
      </span>
    </div>
  );
};

const MatchCard = ({ match, onClick }: { match: ScheduleMatch, onClick: () => void }) => {
  const isCompleted = match.status === 'COMPLETED';
  const isLive = match.status === 'LIVE';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="group relative bg-[#0d0d12] border border-white/5 hover:border-[#e8a000]/30 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Dynamic Background Glow for Live Matches */}
      {isLive && (
        <div className="absolute inset-0 bg-linear-to-r from-red-500/5 to-transparent pointer-events-none" />
      )}

      <div className="flex flex-col lg:flex-row items-stretch">
        {/* Time Slot */}
        <div className="lg:w-24 bg-white/[0.02] border-b lg:border-b-0 lg:border-r border-white/5 flex flex-row lg:flex-col items-center justify-between lg:justify-center p-3 lg:p-0">
          <span className="text-sm font-black text-white italic">{match.time}</span>
          <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em] lg:mt-1">{match.stage.split(' - ')[0]}</span>
        </div>

        {/* Match Content */}
        <div className="flex-1 p-4 lg:p-6 flex items-center justify-between gap-4">
          {/* Team A */}
          <div className="flex-1 flex flex-row-reverse lg:flex-row items-center justify-end gap-3 lg:gap-5">
            <div className="text-right">
              <h4 className={`text-xs lg:text-sm font-black uppercase tracking-tight truncate max-w-[80px] lg:max-w-none ${isCompleted && match.scoreA < match.scoreB ? 'text-white/30' : 'text-white'}`}>
                {match.teamA.name}
              </h4>
              <p className="text-[10px] font-bold text-[#e8a000]/60">{match.teamA.tag}</p>
            </div>
            <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-full p-1 border-2 transition-transform group-hover:scale-110 ${isCompleted && match.scoreA > match.scoreB ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-white/5'}`}>
              <div className="w-full h-full rounded-full bg-white/5 overflow-hidden flex items-center justify-center relative">
                {match.teamA.logo ? <Image src={match.teamA.logo} alt="" fill className="object-cover" /> : <Shield size={20} className="text-white/10" />}
              </div>
            </div>
          </div>

          {/* VS / Score Section */}
          <div className="flex flex-col items-center gap-2 min-w-[60px] lg:min-w-[100px]">
            {isCompleted || isLive ? (
              <div className="flex items-center gap-2 lg:gap-4">
                <span className={`text-xl lg:text-3xl font-black italic tabular-nums ${isCompleted && match.scoreA > match.scoreB ? 'text-emerald-400' : 'text-white'}`}>{match.scoreA}</span>
                <span className="text-white/10 text-xl font-light">:</span>
                <span className={`text-xl lg:text-3xl font-black italic tabular-nums ${isCompleted && match.scoreB > match.scoreA ? 'text-emerald-400' : 'text-white'}`}>{match.scoreB}</span>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center mb-1">
                <span className="text-[10px] font-black text-white/20 italic">VS</span>
              </div>
            )}
            <StatusBadge status={match.status} isLive={isLive} />
          </div>

          {/* Team B */}
          <div className="flex-1 flex items-center justify-start gap-3 lg:gap-5">
            <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-full p-1 border-2 transition-transform group-hover:scale-110 ${isCompleted && match.scoreB > match.scoreA ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-white/5'}`}>
              <div className="w-full h-full rounded-full bg-white/5 overflow-hidden flex items-center justify-center relative">
                {match.teamB.logo ? <Image src={match.teamB.logo} alt="" fill className="object-cover" /> : <Shield size={20} className="text-white/10" />}
              </div>
            </div>
            <div>
              <h4 className={`text-xs lg:text-sm font-black uppercase tracking-tight truncate max-w-[80px] lg:max-w-none ${isCompleted && match.scoreB < match.scoreA ? 'text-white/30' : 'text-white'}`}>
                {match.teamB.name}
              </h4>
              <p className="text-[10px] font-bold text-[#e8a000]/60">{match.teamB.tag}</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="lg:w-20 border-t lg:border-t-0 lg:border-l border-white/5 flex items-center justify-center p-3 lg:p-0">
          {isLive ? (
            <div className="p-3 rounded-full bg-red-500 text-white shadow-lg animate-pulse">
              <Eye size={18} />
            </div>
          ) : (
            <div className="text-white/20 group-hover:text-[#e8a000] transition-colors">
              <Bell size={18} />
            </div>
          )}
        </div>
      </div>

      {/* Lobby Badge - Floating */}
      {match.lobby && (
        <div className="absolute top-0 right-0 p-1">
          <span className="text-[7px] font-black bg-white/5 text-white/40 px-1.5 py-0.5 uppercase border border-white/5">
            {match.lobby.replace('_', ' ')}
          </span>
        </div>
      )}
    </motion.div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  Main Component                                            */
/* ────────────────────────────────────────────────────────── */
export const MatchSchedule = () => {
  const { matches, tournaments, activeTournamentId, setActiveTournamentId, loading } = useRealtimeMatches();
  const [activeTab, setActiveTab] = useState('ALL');
  const [activeDay, setActiveDay] = useState<number>(1);
  const [selectedMatch, setSelectedMatch] = useState<ScheduleMatch | null>(null);
  const [teamAPlayers, setTeamAPlayers] = useState<PlayerData[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<PlayerData[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const days = useMemo(() => Array.from(new Set(matches.map(m => m.playDay || 0))).sort((a, b) => a - b), [matches]);

  useEffect(() => {
    if (days.length > 0 && !days.includes(activeDay)) {
      setActiveDay(days[0]);
    }
  }, [days, activeDay]);

  const filteredMatches = matches.filter(m => {
    const isDay = m.playDay === activeDay;
    const isTab = activeTab === 'ALL' || m.status === activeTab;
    return isDay && isTab;
  });

  const handleMatchClick = async (match: ScheduleMatch) => {
    setSelectedMatch(match);
    setLoadingPlayers(true);
    try {
      const [resA, resB] = await Promise.all([
        match.teamA.id ? fetch(`/api/teams/${match.teamA.id}/players`) : null,
        match.teamB.id ? fetch(`/api/teams/${match.teamB.id}/players`) : null,
      ]);
      if (resA?.ok) setTeamAPlayers(await resA.json());
      if (resB?.ok) setTeamBPlayers(await resB.json());
    } catch (err) { console.error(err); } finally { setLoadingPlayers(false); }
  };

  return (
    <section className="relative bg-[#050508] min-h-screen text-white py-12 lg:py-24 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[#e8a000]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 relative z-10">

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-12 h-[2px] bg-[#e8a000]" />
              <span className="text-[#e8a000] text-[10px] font-black uppercase tracking-[0.5em]">Battle Log</span>
            </div>
            <h2 className="text-5xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.8]">
              Tournament <br />
              <span className="text-outline-white text-transparent">Timeline</span>
            </h2>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-4">
            {tournaments.length > 0 && (
              <div className="flex p-1 bg-white/5 rounded-full border border-white/10">
                {tournaments.slice(0, 3).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTournamentId(t.id)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTournamentId === t.id ? 'bg-[#e8a000] text-black' : 'text-white/40 hover:text-white'}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <Info size={12} className="text-[#e8a000]" />
              Syncing with global game servers
            </p>
          </div>
        </div>

        {/* --- Unified Mission Control (Filters) --- */}
        <div className="sticky top-4 z-40 mb-8 bg-[#0a0a0f]/80 backdrop-blur-md border border-white/5 p-2 rounded-2xl shadow-2xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">

            {/* Days Horizontal Scroll */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full md:max-w-[60%]">
              {days.map(day => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`flex flex-col items-center min-w-[70px] py-2 rounded-xl transition-all ${activeDay === day ? 'bg-[#e8a000] text-black shadow-[0_0_20px_rgba(232,160,0,0.3)]' : 'hover:bg-white/5 text-white/40'}`}
                >
                  <span className="text-[8px] font-black uppercase tracking-widest">Day</span>
                  <span className="text-lg font-black">{day < 10 ? `0${day}` : day}</span>
                </button>
              ))}
            </div>

            {/* Status Switcher */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 w-full md:w-auto">
              {['ALL', 'LIVE', 'COMPLETED'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black transition-all ${activeTab === tab ? 'bg-white/10 text-white' : 'text-white/30'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* --- Matches List --- */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div key="loading" className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 w-full bg-white/5 animate-pulse border border-white/5 rounded-xl" />
                ))}
              </div>
            ) : filteredMatches.length > 0 ? (
              filteredMatches.map((m, idx) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  onClick={() => handleMatchClick(m)}
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 flex flex-col items-center justify-center text-center opacity-40"
              >
                <LayoutGrid size={48} className="mb-4 text-[#e8a000]" />
                <h3 className="text-xl font-black uppercase tracking-widest">No Sector Activity</h3>
                <p className="text-xs">No matches found for the selected criteria</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Starting Five Modal (Original logic preserved) */}
      <AnimatePresence>
        {selectedMatch && (
          <StartingFiveModal
            match={selectedMatch}
            teamAPlayers={teamAPlayers}
            teamBPlayers={teamBPlayers}
            loading={loadingPlayers}
            onClose={() => setSelectedMatch(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
};