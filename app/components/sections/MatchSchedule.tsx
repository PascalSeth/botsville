'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Eye, Bell, Radio, Clock, Trophy, Swords, ChevronRight } from 'lucide-react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

/* ────────────────────────────────────────────────────────── */
/*  Types                                                     */
/* ────────────────────────────────────────────────────────── */
type MatchTeam = { name: string; tag: string; logo: string | null };

type ScheduleMatch = {
  id: string;
  time: string;
  elapsed: string | null;
  teamA: MatchTeam;
  teamB: MatchTeam;
  status: 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'FORFEITED' | 'DISPUTED';
  scoreA: number;
  scoreB: number;
  stage: string;
};

type TournamentListItem = { id: string; _count?: { matches?: number } };
type TournamentListResponse = { tournaments?: TournamentListItem[] };

type ApiMatch = {
  id: string;
  scheduledTime: string;
  elapsed: string | null;
  status: 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'FORFEITED' | 'DISPUTED';
  scoreA: number;
  scoreB: number;
  stage: string | null;
  teamA: { name: string; tag: string | null; logo: string | null };
  teamB: { name: string; tag: string | null; logo: string | null };
};

/* ────────────────────────────────────────────────────────── */
/*  Helpers                                                   */
/* ────────────────────────────────────────────────────────── */
const formatMatchTime = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const buildTeamTag = (name: string, tag?: string | null) => {
  if (tag?.trim()) return tag.trim().toUpperCase();
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 3)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'TM'
  );
};

/* ────────────────────────────────────────────────────────── */
/*  Data hook                                                 */
/* ────────────────────────────────────────────────────────── */
const useRealtimeMatches = () => {
  const [matches, setMatches] = useState<ScheduleMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const tRes = await fetch('/api/tournaments?limit=20', { cache: 'no-store' });
        if (!tRes.ok) { if (mounted) { setMatches([]); setLoading(false); } return; }

        const tData: TournamentListResponse = await tRes.json();
        const list = Array.isArray(tData?.tournaments) ? tData.tournaments : [];
        const target = list.find((t) => (t._count?.matches ?? 0) > 0) ?? list[0];
        if (!target?.id) { if (mounted) { setMatches([]); setLoading(false); } return; }

        const mRes = await fetch('/api/tournaments/' + target.id + '/matches', { cache: 'no-store' });
        if (!mRes.ok) { if (mounted) { setMatches([]); setLoading(false); } return; }

        const mData: ApiMatch[] = await mRes.json();
        if (!mounted) return;

        const mapped: ScheduleMatch[] = (Array.isArray(mData) ? mData : []).slice(0, 8).map((m) => ({
          id: m.id,
          time: formatMatchTime(m.scheduledTime),
          elapsed: m.elapsed,
          teamA: { name: m.teamA?.name || 'Team A', tag: buildTeamTag(m.teamA?.name || 'Team A', m.teamA?.tag), logo: m.teamA?.logo || null },
          teamB: { name: m.teamB?.name || 'Team B', tag: buildTeamTag(m.teamB?.name || 'Team B', m.teamB?.tag), logo: m.teamB?.logo || null },
          status: m.status,
          scoreA: typeof m.scoreA === 'number' ? m.scoreA : 0,
          scoreB: typeof m.scoreB === 'number' ? m.scoreB : 0,
          stage: m.stage || 'Match',
        }));
        setMatches(mapped);
      } catch {
        if (mounted) setMatches([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load().catch(() => undefined);
    const iv = setInterval(() => { load().catch(() => undefined); }, 30_000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  return { matches, loading };
};

/* ────────────────────────────────────────────────────────── */
/*  Status config                                             */
/* ────────────────────────────────────────────────────────── */
const statusConfig = {
  LIVE:      { label: 'Live',      bg: 'bg-red-500/15',     text: 'text-red-400',        border: 'border-red-500/30',     dot: 'bg-red-500' },
  UPCOMING:  { label: 'Upcoming',  bg: 'bg-amber-500/10',   text: 'text-amber-400/70',   border: 'border-amber-500/20',   dot: 'bg-amber-500' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-500/10', text: 'text-emerald-400/70', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  FORFEITED: { label: 'Forfeited', bg: 'bg-zinc-500/10',    text: 'text-zinc-400/70',    border: 'border-zinc-500/20',    dot: 'bg-zinc-500' },
  DISPUTED:  { label: 'Disputed',  bg: 'bg-orange-500/10',  text: 'text-orange-400/70',  border: 'border-orange-500/20',  dot: 'bg-orange-500' },
} as const;

const StatusPill = ({ status }: { status: ScheduleMatch['status'] }) => {
  const cfg = statusConfig[status];
  return (
    <span className={'inline-flex items-center gap-1.5 ' + cfg.bg + ' ' + cfg.text + ' ' + cfg.border + ' border text-[10px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full'}>
      <span className="relative flex h-1.5 w-1.5">
        {status === 'LIVE' && (
          <span className={'animate-ping absolute inline-flex h-full w-full rounded-full ' + cfg.dot + ' opacity-60'} />
        )}
        <span className={'relative inline-flex rounded-full h-1.5 w-1.5 ' + cfg.dot} />
      </span>
      {cfg.label}
    </span>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  Team avatar                                              */
/* ────────────────────────────────────────────────────────── */
const TeamAvatar = ({ team, size = 'md' }: { team: MatchTeam; size?: 'sm' | 'md' }) => {
  const dims = size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-xs';
  return (
    <div className={dims + ' rounded-lg bg-white/6 border border-white/10 flex items-center justify-center font-bold text-white/60 shrink-0 uppercase tracking-wider'}>
      {team.tag.slice(0, 3)}
    </div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  Score block                                               */
/* ────────────────────────────────────────────────────────── */
const ScoreBlock = ({ match }: { match: ScheduleMatch }) => {
  const hasScore = match.status === 'LIVE' || match.status === 'COMPLETED';
  if (!hasScore) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-white/20 text-[10px] font-bold tracking-widest uppercase">VS</span>
        <span className="text-white/30 text-[10px] font-mono">{match.time}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className={'text-xl font-black font-mono tabular-nums ' + (match.status === 'LIVE' ? 'text-white' : match.scoreA > match.scoreB ? 'text-white' : 'text-white/40')}>
          {match.scoreA}
        </span>
        <span className="text-white/20 text-sm font-light">&ndash;</span>
        <span className={'text-xl font-black font-mono tabular-nums ' + (match.status === 'LIVE' ? 'text-white' : match.scoreB > match.scoreA ? 'text-white' : 'text-white/40')}>
          {match.scoreB}
        </span>
      </div>
      {match.status === 'LIVE' && match.elapsed && (
        <span className="text-red-400/80 text-[10px] font-mono">{match.elapsed}</span>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  Skeleton loader                                          */
/* ────────────────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="animate-pulse rounded-xl bg-white/3 border border-white/6 p-4">
    <div className="flex items-center justify-between mb-3">
      <div className="h-4 w-16 bg-white/6 rounded-full" />
      <div className="h-4 w-12 bg-white/6 rounded-full" />
    </div>
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 flex-1">
        <div className="w-10 h-10 bg-white/6 rounded-lg" />
        <div className="h-4 w-20 bg-white/6 rounded" />
      </div>
      <div className="h-6 w-14 bg-white/6 rounded" />
      <div className="flex items-center gap-2.5 flex-1 justify-end">
        <div className="h-4 w-20 bg-white/6 rounded" />
        <div className="w-10 h-10 bg-white/6 rounded-lg" />
      </div>
    </div>
  </div>
);

/* ────────────────────────────────────────────────────────── */
/*  Empty state                                              */
/* ────────────────────────────────────────────────────────── */
const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="col-span-full flex flex-col items-center justify-center py-16 text-center"
  >
    <div className="w-16 h-16 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mb-4">
      <Swords size={24} className="text-white/20" />
    </div>
    <p className="text-white/50 text-sm font-medium">No matches scheduled yet</p>
    <p className="text-white/25 text-xs mt-1">Check back soon for upcoming battles</p>
  </motion.div>
);

/* ────────────────────────────────────────────────────────── */
/*  MOBILE match card                                        */
/* ────────────────────────────────────────────────────────── */
const MobileMatchCard = ({ match, index }: { match: ScheduleMatch; index: number }) => {
  const isLive = match.status === 'LIVE';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={
        'relative rounded-xl overflow-hidden border transition-all duration-300 ' +
        (isLive
          ? 'bg-red-500/4 border-red-500/20'
          : 'bg-white/2 border-white/6 active:bg-white/4')
      }
    >
      {isLive && (
        <motion.div
          className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-red-500 to-transparent"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StatusPill status={match.status} />
            <span className="text-white/30 text-[10px] font-medium tracking-wide">{match.stage}</span>
          </div>
          {isLive ? (
            <button className="flex items-center gap-1 bg-red-500 hover:bg-red-400 text-white text-[10px] font-bold tracking-wide uppercase px-3 py-1.5 rounded-lg transition-colors">
              <Eye size={10} />
              Watch
            </button>
          ) : (
            <button className="flex items-center gap-1 text-white/30 hover:text-[#e8a000] text-[10px] font-medium tracking-wide transition-colors">
              <Bell size={10} />
              Remind
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <TeamAvatar team={match.teamA} size="sm" />
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">{match.teamA.name}</p>
              <p className="text-white/30 text-[10px] font-medium">{match.teamA.tag}</p>
            </div>
          </div>

          <ScoreBlock match={match} />

          <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
            <div className="min-w-0 text-right">
              <p className="text-white font-bold text-sm truncate">{match.teamB.name}</p>
              <p className="text-white/30 text-[10px] font-medium">{match.teamB.tag}</p>
            </div>
            <TeamAvatar team={match.teamB} size="sm" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  DESKTOP match card                                       */
/* ────────────────────────────────────────────────────────── */
const DesktopMatchCard = ({ match, index }: { match: ScheduleMatch; index: number }) => {
  const isLive = match.status === 'LIVE';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2 }}
      className={
        'group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-300 ' +
        (isLive
          ? 'bg-red-500/3 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5'
          : 'bg-white/2 border-white/6 hover:border-white/12 hover:bg-white/4')
      }
    >
      {isLive && (
        <motion.div
          className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-red-500 to-transparent"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <StatusPill status={match.status} />
            <span className="text-white/25 text-[11px] font-medium">{match.stage}</span>
          </div>
          <div className="flex items-center gap-2">
            {isLive ? (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-400 text-white text-[11px] font-bold tracking-wide uppercase px-4 py-1.5 rounded-lg transition-colors duration-200"
              >
                <Eye size={12} />
                Watch Live
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1.5 text-white/25 hover:text-[#e8a000] text-[11px] font-medium tracking-wide transition-colors duration-200"
              >
                <Bell size={12} />
                Set Reminder
              </motion.button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <TeamAvatar team={match.teamA} />
            <div className="min-w-0">
              <p className="text-white font-bold text-base truncate group-hover:text-white/90 transition-colors">
                {match.teamA.name}
              </p>
              <p className="text-white/30 text-[11px] font-medium">{match.teamA.tag}</p>
            </div>
          </div>

          <ScoreBlock match={match} />

          <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
            <div className="min-w-0 text-right">
              <p className="text-white font-bold text-base truncate group-hover:text-white/90 transition-colors">
                {match.teamB.name}
              </p>
              <p className="text-white/30 text-[11px] font-medium">{match.teamB.tag}</p>
            </div>
            <TeamAvatar team={match.teamB} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  Filter tabs                                               */
/* ────────────────────────────────────────────────────────── */
type FilterTab = 'ALL' | 'LIVE' | 'UPCOMING' | 'COMPLETED';
const FILTER_TABS: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
  { key: 'ALL', label: 'All', icon: <Swords size={13} /> },
  { key: 'LIVE', label: 'Live', icon: <Radio size={13} /> },
  { key: 'UPCOMING', label: 'Upcoming', icon: <Clock size={13} /> },
  { key: 'COMPLETED', label: 'Results', icon: <Trophy size={13} /> },
];

/* ────────────────────────────────────────────────────────── */
/*  Main Export                                              */
/* ────────────────────────────────────────────────────────── */
export const MatchSchedule = () => {
  const { matches, loading } = useRealtimeMatches();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-40px' });
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const liveCount = matches.filter((m) => m.status === 'LIVE').length;

  const filtered = activeTab === 'ALL'
    ? matches
    : matches.filter((m) => m.status === activeTab);

  return (
    <section
      id="schedule"
      ref={sectionRef}
      className="relative bg-[#0a0a0f] overflow-hidden"
    >
      {/* ── Hero background images ── */}
      <div className="absolute inset-0 hidden lg:flex pointer-events-none select-none" aria-hidden="true">
        {/* Left hero — Freya */}
        <div className="relative w-1/2 h-full overflow-hidden">
          <Image
            src="/heroes/freya.png"
            alt=""
            fill
            className="object-cover object-top opacity-[0.2]"
            style={{ maskImage: 'linear-gradient(to right, black 40%, transparent 100%)' }}
            priority
          />
          <div className="absolute inset-0 bg-linear-to-r from-transparent to-[#0a0a0f]" />
          <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0f] via-transparent to-[#0a0a0f]/80" />
        </div>
        {/* Right hero — Seiya */}
        <div className="relative w-1/2 h-full overflow-hidden">
          <Image
            src="/heroes/seiya.png"
            alt=""
            fill
            className="object-cover object-top opacity-[0.2]"
            style={{ maskImage: 'linear-gradient(to left, black 40%, transparent 100%)' }}
            priority
          />
          <div className="absolute inset-0 bg-linear-to-l from-transparent to-[#0a0a0f]" />
          <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0f] via-transparent to-[#0a0a0f]/80" />
        </div>
      </div>

      {/* Mobile hero bg — subtle single blend */}
      <div className="absolute inset-0 lg:hidden pointer-events-none select-none" aria-hidden="true">
        <div className="absolute inset-0 flex">
          <div className="relative w-1/2 h-full overflow-hidden">
            <Image src="/heroes/freya.png" alt="" fill className="object-cover object-top opacity-[0.04]" />
            <div className="absolute inset-0 bg-linear-to-r from-transparent to-[#0a0a0f]" />
          </div>
          <div className="relative w-1/2 h-full overflow-hidden">
            <Image src="/heroes/seiya.png" alt="" fill className="object-cover object-top opacity-[0.04]" />
            <div className="absolute inset-0 bg-linear-to-l from-transparent to-[#0a0a0f]" />
          </div>
        </div>
        <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0f] via-transparent to-[#0a0a0f]" />
      </div>

      {/* ── Animated background effects ── */}
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Pulsing gradient orbs — CSS animations */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[140px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(232,64,64,0.08), transparent 70%)',
          animation: 'pulse-orb-lg 8s ease-in-out infinite',
          willChange: 'transform, opacity',
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[140px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(74,144,217,0.08), transparent 70%)',
          animation: 'pulse-orb-lg-alt 8s ease-in-out 4s infinite',
          willChange: 'transform, opacity',
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-100 rounded-full blur-[120px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(232,160,0,0.06), transparent 70%)',
          animation: 'pulse-orb-lg-center 6s ease-in-out 2s infinite',
          willChange: 'transform, opacity',
        }}
      />

      {/* Floating particles — CSS animations */}
      {[...Array(12)].map((_, i) => (
        <div
          key={'ms-p-' + i}
          className="absolute w-px h-px rounded-full bg-white/20 pointer-events-none"
          style={{
            left: (8 + ((i * 37) % 84)) + '%',
            top: (5 + ((i * 23) % 90)) + '%',
            animation: `float-particle-up ${4 + (i % 3) * 2}s ease-in-out ${i * 0.7}s infinite`,
            willChange: 'transform, opacity',
          }}
        />
      ))}

      {/* Animated horizontal accent line — CSS animation */}
      <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
        <div
          className="h-full w-1/3 bg-linear-to-r from-transparent via-[#e8a000]/40 to-transparent"
          style={{ animation: 'accent-slide-x 8s linear infinite', willChange: 'transform' }}
        />
      </div>

      {/* Subtle top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/6 to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">

        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 lg:mb-8"
          initial={{ opacity: 0, y: -12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-white font-extrabold text-lg sm:text-xl tracking-tight">
                Match Schedule
              </h2>
              {liveCount > 0 && (
                <span className="flex items-center gap-1.5 bg-red-500/15 text-red-400 text-[10px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full border border-red-500/25">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                  {liveCount} Live
                </span>
              )}
            </div>
            <p className="text-white/30 text-sm">
              Follow the action across all tournaments
            </p>
          </div>

          <a
            href="/tournaments"
            className="flex items-center gap-1 text-white/30 hover:text-[#e8a000] text-xs font-medium tracking-wide transition-colors duration-200 shrink-0"
          >
            View all schedules
            <ChevronRight size={14} />
          </a>
        </motion.div>

        {/* Filter tabs */}
        <motion.div
          className="flex items-center gap-1.5 mb-5 lg:mb-6 overflow-x-auto pb-1 -mx-1 px-1"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {FILTER_TABS.map((tab) => {
            const count = tab.key === 'ALL'
              ? matches.length
              : matches.filter((m) => m.status === tab.key).length;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={
                  'flex items-center gap-1.5 text-[11px] font-semibold tracking-wide px-3.5 py-2 rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 ' +
                  (isActive
                    ? 'bg-white/8 text-white border border-white/12'
                    : 'text-white/30 hover:text-white/50 hover:bg-white/3 border border-transparent')
                }
              >
                {tab.icon}
                {tab.label}
                {count > 0 && (
                  <span className={'text-[10px] font-bold ml-0.5 ' + (isActive ? 'text-[#e8a000]' : 'text-white/20')}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>

        {/* MOBILE: card list (< lg) */}
        <div className="lg:hidden">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="skeleton" className="flex flex-col gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
              </motion.div>
            ) : filtered.length === 0 ? (
              <EmptyState key="empty" />
            ) : (
              <motion.div key="cards" className="flex flex-col gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {filtered.map((match, i) => (
                  <MobileMatchCard key={match.id} match={match} index={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DESKTOP: 2-col grid */}
        <div className="hidden lg:block">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="skeleton" className="grid grid-cols-2 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
              </motion.div>
            ) : filtered.length === 0 ? (
              <EmptyState key="empty" />
            ) : (
              <motion.div key="cards" className="grid grid-cols-2 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {filtered.map((match, i) => (
                  <DesktopMatchCard key={match.id} match={match} index={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Bottom animated accent line — CSS animation */}
      <div className="absolute bottom-0 left-0 right-0 h-px overflow-hidden">
        <div
          className="h-full w-1/4 bg-linear-to-r from-transparent via-red-500/30 to-transparent"
          style={{ animation: 'accent-slide-x-reverse 10s linear infinite', willChange: 'transform' }}
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/4 to-transparent" />
    </section>
  );
};
