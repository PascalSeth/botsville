'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { X, Crown, Swords, Users, Shield, ChevronLeft, ChevronRight, Axe, Zap, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ───────────────────────────────────────────────────────── */
/*  Types                                                    */
/* ───────────────────────────────────────────────────────── */
type MatchTeam = { id?: string; name: string; tag: string; logo: string | null };
type PlayerData = {
  id: string; ign: string; role: string; photo: string | null;
  isSubstitute: boolean; user?: { photo: string | null };
};
type ScheduleMatch = {
  id: string; time: string; elapsed: string | null;
  teamA: MatchTeam; teamB: MatchTeam;
  status: 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'FORFEITED' | 'DISPUTED';
  scoreA: number; scoreB: number; stage: string;
};

/* ───────────────────────────────────────────────────────── */
/*  Constants                                                */
/* ───────────────────────────────────────────────────────── */
const ROLE_ICON_MAP: Record<string, any> = {
  EXP: Swords,
  JUNGLE: Axe,
  MID: Zap,
  ROAM: Shield,
  GOLD: Coins,
};

const RoleIcon = ({ role, size = 10, className = "" }: { role: string; size?: number; className?: string }) => {
  const Icon = ROLE_ICON_MAP[role.toUpperCase()] || Users;
  return <Icon size={size} className={className} strokeWidth={2.5} />;
};
const ROLE_SHORT: Record<string, string> = {
  JUNGLE: 'JG',
  MID: 'MID',
  GOLD: 'GLD',
  EXP: 'EXP',
  ROAM: 'RMR',
};
const ROLE_COLORS: Record<string, string> = {
  JUNGLE: '#22c55e',
  MID: '#3b82f6',
  GOLD: '#f59e0b',
  EXP: '#a855f7',
  ROAM: '#ec4899',
};
const TEAM_A_COLOR = '#e8740a';
const TEAM_B_COLOR = '#3b82f6';
const STATUS_CFG = {
  LIVE:      { label: 'Live',      color: '#ef4444' },
  UPCOMING:  { label: 'Upcoming',  color: '#f59e0b' },
  COMPLETED: { label: 'Completed', color: '#22c55e' },
  FORFEITED: { label: 'Forfeited', color: '#71717a' },
  DISPUTED:  { label: 'Disputed',  color: '#f97316' },
  RESTING:   { label: 'Resting',   color: '#a1a1aa' },
  BANNED:    { label: 'Banned',    color: '#ef4444' },
} as const;

const getPhoto = (p: PlayerData | null) => p?.photo || p?.user?.photo || null;
const getRoleColor = (role: string) => ROLE_COLORS[role] || '#ffffff';

/* ───────────────────────────────────────────────────────── */
/*  TeamSpotlight — shared by both mobile & desktop         */
/*  Full-bleed player photo carousel for one team           */
/* ───────────────────────────────────────────────────────── */
interface TeamSpotlightProps {
  team: MatchTeam;
  players: PlayerData[];
  teamColor: string;
  side: 'left' | 'right'; // which half of the arena
  won: boolean;
  lost: boolean;
  loading: boolean;
  autoPlay?: boolean; // desktop may offset timing
  autoPlayDelay?: number;
}

const TeamSpotlight: React.FC<TeamSpotlightProps> = ({
  team, players, teamColor, side, won, lost, loading,
  autoPlay = true, autoPlayDelay = 0,
}) => {
  const starting = players.filter(p => !p.isSubstitute).slice(0, 5);
  const [activeIdx, setActiveIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((idx: number, dir: number) => {
    setDirection(dir);
    setActiveIdx(idx);
  }, []);

  const next = useCallback(() => {
    if (starting.length === 0) return;
    go((activeIdx + 1) % starting.length, 1);
  }, [activeIdx, starting.length, go]);

  const prev = useCallback(() => {
    if (starting.length === 0) return;
    go((activeIdx - 1 + starting.length) % starting.length, -1);
  }, [activeIdx, starting.length, go]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoPlay && starting.length > 1) {
      timerRef.current = setInterval(() => {
        setDirection(1);
        setActiveIdx(a => (a + 1) % starting.length);
      }, 3500);
    }
  }, [autoPlay, starting.length, next]);

  useEffect(() => {
    if (!autoPlay || starting.length <= 1 || loading) return;
    const t = setTimeout(() => {
      timerRef.current = setInterval(() => {
        setDirection(1);
        setActiveIdx(a => (a + 1) % starting.length);
      }, 3500);
    }, autoPlayDelay);
    return () => {
      clearTimeout(t);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, starting.length, autoPlay, autoPlayDelay]);

  useEffect(() => { setActiveIdx(0); }, [players.length]);

  /* Swipe */
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); resetTimer(); }
    touchStartX.current = null;
  };

  const player = starting[activeIdx] ?? null;
  const photo = getPhoto(player);
  const roleColor = player ? getRoleColor(player.role) : teamColor;
  const isWinner = won;
  const isLoser = lost;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div className="flex-1 animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="flex gap-1.5 justify-center mt-2 pb-1">
          {[0,1,2,3,4].map(i => <div key={i} className="w-8 h-8 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', animationDelay: `${i*0.08}s` }} />)}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col min-w-0 h-full"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Photo spotlight area ── */}
      <div className="relative flex-1 overflow-hidden rounded-xl min-h-0">
        {/* Background crossfade */}
        <AnimatePresence mode="sync" custom={direction}>
          {photo ? (
            <motion.div
              key={`photo-${team.id}-${activeIdx}`}
              custom={direction}
              variants={{
                enter: (d: number) => ({ x: d * 48, opacity: 0, scale: 1.05 }),
                center: { x: 0, opacity: 1, scale: 1 },
                exit:  (d: number) => ({ x: d * -48, opacity: 0, scale: 0.96 }),
              }}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={photo}
                alt={player?.ign ?? ''}
                fill
                className="object-cover object-top"
                priority
              />
            </motion.div>
          ) : (
            <motion.div
              key={`empty-${team.id}-${activeIdx}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: `radial-gradient(circle at center, ${teamColor}12, transparent 70%)` }}
            >
              <Users size={40} style={{ color: 'rgba(255,255,255,0.08)' }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gradient overlays */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(to top, rgba(6,6,14,1) 0%, rgba(6,6,14,0.65) 28%, rgba(6,6,14,0.08) 58%, rgba(6,6,14,0.45) 100%)',
        }} />
        {/* Team color edge tint */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: side === 'left'
            ? `linear-gradient(to right, ${teamColor}20 0%, transparent 65%)`
            : `linear-gradient(to left,  ${teamColor}20 0%, transparent 65%)`,
        }} />
        {/* Loser overlay */}
        {isLoser && <div className="absolute inset-0 pointer-events-none bg-black/55" />}

        {/* Winner shimmer */}
        {isWinner && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0, 0.1, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ background: `radial-gradient(ellipse at 50% 90%, ${teamColor}50, transparent 65%)` }}
          />
        )}

        {/* Team header — inside photo */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            {team.logo ? (
              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0" style={{ border: `1.5px solid ${won ? teamColor + '90' : 'rgba(255,255,255,0.15)'}` }}>
                <Image src={team.logo} alt={team.name} width={28} height={28} className="object-cover" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0"
                style={{ background: teamColor + '25', border: `1.5px solid ${teamColor}50`, color: teamColor }}>
                {team.tag.slice(0, 3)}
              </div>
            )}
            <div>
              <p className="text-[11px] font-black leading-none" style={{ color: won ? teamColor : 'rgba(255,255,255,0.8)', textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
                {team.name}
              </p>
              <p className="text-[9px] font-bold tracking-widest uppercase leading-none mt-0.5" style={{ color: won ? teamColor : lost ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.35)' }}>
                {won ? '✦ VICTORY' : lost ? 'DEFEAT' : team.tag}
              </p>
            </div>
          </div>
          {won && (
            <motion.div
              className="flex items-center justify-center w-7 h-7 rounded-full"
              style={{ background: '#f59e0b', boxShadow: '0 0 14px rgba(245,158,11,0.7)' }}
              animate={{ scale: [1, 1.12, 1], rotate: [0, 6, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Crown size={13} fill="white" style={{ color: '#78350f' }} />
            </motion.div>
          )}
        </div>

        {/* Player info — bottom of photo */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-3 pt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={`info-${team.id}-${activeIdx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
            >
              {/* Role + winner badge */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                  style={{ background: roleColor + 'cc', backdropFilter: 'blur(4px)' }}
                >
                  <RoleIcon role={player?.role ?? ''} size={8} className="text-white" />
                  <span className="text-[8px] font-black text-white leading-none">
                    {ROLE_SHORT[player?.role?.toUpperCase() ?? ''] ?? player?.role?.slice(0,3) ?? '?'}
                  </span>
                </div>
                {isWinner && (
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                    style={{ background: 'rgba(245,158,11,0.9)' }}
                  >
                    <Crown size={8} fill="white" className="text-white" />
                    <span className="text-[8px] font-black text-white">Winner</span>
                  </motion.div>
                )}
              </div>
              {/* IGN */}
              <h3
                className="font-black leading-none"
                style={{
                  fontSize: 'clamp(1.1rem, 3.5vw, 1.7rem)',
                  color: isLoser ? 'rgba(255,255,255,0.28)' : '#ffffff',
                  textShadow: isWinner ? `0 0 24px ${roleColor}55` : '0 2px 10px rgba(0,0,0,0.9)',
                  letterSpacing: '-0.02em',
                }}
              >
                {player?.ign ?? '—'}
              </h3>
              {player?.isSubstitute && (
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.28)' }}>Sub</span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Prev / Next arrows */}
        {starting.length > 1 && (
          <>
            <button
              onClick={() => { prev(); resetTimer(); }}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all"
              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)' }}
            >
              <ChevronLeft size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
            </button>
            <button
              onClick={() => { next(); resetTimer(); }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all"
              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)' }}
            >
              <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
            </button>
          </>
        )}
      </div>

      {/* ── Thumbnail selector ── */}
      <div className="shrink-0 pt-2 pb-1">
        <div className="flex gap-1.5 justify-center">
          {starting.map((p, i) => {
            const pPhoto = getPhoto(p);
            const isActive = i === activeIdx;
            return (
              <button
                key={p.id}
                onClick={() => { go(i, i > activeIdx ? 1 : -1); resetTimer(); }}
                className="relative shrink-0 transition-all duration-200"
                style={{
                  width: 32, height: 32,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: isActive ? `2px solid ${teamColor}` : '2px solid rgba(255,255,255,0.08)',
                  transform: isActive ? 'scale(1.15)' : 'scale(1)',
                  filter: isLoser ? 'grayscale(0.8) brightness(0.4)' : 'none',
                  boxShadow: isActive ? `0 0 8px ${teamColor}60` : 'none',
                }}
              >
                {pPhoto ? (
                  <Image src={pPhoto} alt={p.ign} fill className="object-cover object-top" sizes="32px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <Users size={10} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  </div>
                )}
                {/* Team color dot */}
                <div className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full" style={{ background: teamColor }} />
              </button>
            );
          })}
        </div>

        {/* Progress dots */}
        {starting.length > 1 && (
          <div className="flex justify-center gap-1 mt-1.5">
            {starting.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === activeIdx ? 14 : 3,
                  height: 2.5,
                  background: i === activeIdx ? teamColor : 'rgba(255,255,255,0.12)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────────────────── */
/*  CenterDivider — score / VS column between the two teams */
/* ───────────────────────────────────────────────────────── */
const CenterDivider: React.FC<{
  match: ScheduleMatch;
  isLive: boolean;
  isCompleted: boolean;
  teamAWon: boolean;
  teamBWon: boolean;
}> = ({ match, isLive, isCompleted, teamAWon, teamBWon }) => {
  const hasScore = isLive || isCompleted;
  const cfg = STATUS_CFG[match.status as keyof typeof STATUS_CFG] || STATUS_CFG.UPCOMING;

  return (
    <div className="flex flex-col items-center justify-center shrink-0 z-20 relative px-1" style={{ width: 72 }}>
      {/* Top vertical line */}
      <div className="w-px flex-1" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.08) 70%, transparent)', minHeight: 24 }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
        className="flex flex-col items-center gap-2 py-3 shrink-0"
      >
        {/* Score or VS icon */}
        {hasScore ? (
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-baseline gap-1">
              <motion.span
                key={`sa-${match.scoreA}`}
                initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="font-black tabular-nums"
                style={{
                  fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', lineHeight: 1,
                  color: isCompleted ? (teamAWon ? TEAM_A_COLOR : 'rgba(255,255,255,0.18)') : '#fff',
                  textShadow: teamAWon && isCompleted ? `0 0 20px ${TEAM_A_COLOR}80` : 'none',
                }}
              >{match.scoreA}</motion.span>
              <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: '1rem', lineHeight: 1 }}>:</span>
              <motion.span
                key={`sb-${match.scoreB}`}
                initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="font-black tabular-nums"
                style={{
                  fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', lineHeight: 1,
                  color: isCompleted ? (teamBWon ? TEAM_B_COLOR : 'rgba(255,255,255,0.18)') : '#fff',
                  textShadow: teamBWon && isCompleted ? `0 0 20px ${TEAM_B_COLOR}80` : 'none',
                }}
              >{match.scoreB}</motion.span>
            </div>
            {isCompleted && (teamAWon || teamBWon) && (
              <span className="text-[8px] font-black tracking-[0.3em] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>FINAL</span>
            )}
            {isLive && match.elapsed && (
              <span className="text-[10px] font-mono font-bold" style={{ color: '#ef4444' }}>{match.elapsed}</span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <motion.div animate={isLive ? { rotate: [0, 8, -8, 0] } : {}} transition={{ duration: 3, repeat: Infinity }}>
              <Swords size={20} style={{ color: 'rgba(255,255,255,0.18)' }} />
            </motion.div>
            <span style={{ fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.16)' }}>VS</span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>{match.time}</span>
          </div>
        )}

        {/* Status pill */}
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest uppercase"
          style={{ color: cfg.color, borderColor: cfg.color + '40', background: cfg.color + '14' }}
        >
          {isLive && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: cfg.color }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: cfg.color }} />
            </span>
          )}
          {cfg.label}
        </div>
      </motion.div>

      {/* Bottom vertical line */}
      <div className="w-px flex-1" style={{ background: 'linear-gradient(to top, transparent, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.08) 70%, transparent)', minHeight: 24 }} />
    </div>
  );
};

/* ───────────────────────────────────────────────────────── */
/*  MobileScoreStrip                                         */
/* ───────────────────────────────────────────────────────── */
const MobileScoreStrip: React.FC<{
  match: ScheduleMatch;
  isLive: boolean;
  isCompleted: boolean;
  teamAWon: boolean;
  teamBWon: boolean;
}> = ({ match, isLive, isCompleted, teamAWon, teamBWon }) => {
  const cfg = STATUS_CFG[match.status as keyof typeof STATUS_CFG] || STATUS_CFG.UPCOMING;
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 shrink-0"
      style={{ background: 'rgba(0,0,0,0.6)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
    >
      {/* Team A */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {match.teamA.logo ? (
          <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0" style={{ border: `1.5px solid ${teamAWon ? TEAM_A_COLOR + '80' : 'rgba(255,255,255,0.1)'}` }}>
            <Image src={match.teamA.logo} alt={match.teamA.name} width={28} height={28} className="object-cover" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[9px] font-black"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
            {match.teamA.tag.slice(0, 3)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-black truncate leading-none" style={{ color: isCompleted ? (teamAWon ? TEAM_A_COLOR : 'rgba(255,255,255,0.25)') : 'rgba(255,255,255,0.85)' }}>
            {match.teamA.tag}
          </p>
          {teamAWon && <p className="text-[8px] font-bold" style={{ color: TEAM_A_COLOR }}>WINNER</p>}
        </div>
      </div>

      {/* Center score */}
      <div className="flex flex-col items-center shrink-0 px-3">
        {isLive || isCompleted ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xl tabular-nums leading-none" style={{ color: isCompleted ? (teamAWon ? TEAM_A_COLOR : 'rgba(255,255,255,0.2)') : '#fff' }}>{match.scoreA}</span>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.8rem' }}>:</span>
              <span className="font-black text-xl tabular-nums leading-none" style={{ color: isCompleted ? (teamBWon ? TEAM_B_COLOR : 'rgba(255,255,255,0.2)') : '#fff' }}>{match.scoreB}</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              {isLive && <span className="relative flex h-1 w-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" /><span className="relative inline-flex rounded-full h-1 w-1 bg-red-500" /></span>}
              <span className="text-[8px] font-black tracking-widest uppercase" style={{ color: cfg.color }}>{cfg.label}</span>
            </div>
            {isLive && match.elapsed && <span className="text-[8px] font-mono" style={{ color: '#ef4444' }}>{match.elapsed}</span>}
          </>
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <Swords size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />
            <span className="text-[8px] font-black tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.18)' }}>VS</span>
            <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>{match.time}</span>
          </div>
        )}
      </div>

      {/* Team B */}
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <div className="min-w-0 text-right">
          <p className="text-[11px] font-black truncate leading-none" style={{ color: isCompleted ? (teamBWon ? TEAM_B_COLOR : 'rgba(255,255,255,0.25)') : 'rgba(255,255,255,0.85)' }}>
            {match.teamB.tag}
          </p>
          {teamBWon && <p className="text-[8px] font-bold" style={{ color: TEAM_B_COLOR }}>WINNER</p>}
        </div>
        {match.teamB.logo ? (
          <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0" style={{ border: `1.5px solid ${teamBWon ? TEAM_B_COLOR + '80' : 'rgba(255,255,255,0.1)'}` }}>
            <Image src={match.teamB.logo} alt={match.teamB.name} width={28} height={28} className="object-cover" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[9px] font-black"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
            {match.teamB.tag.slice(0, 3)}
          </div>
        )}
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────────────────── */
/*  Main Modal Export                                        */
/* ───────────────────────────────────────────────────────── */
export const StartingFiveModal: React.FC<{
  match: ScheduleMatch;
  teamAPlayers: PlayerData[];
  teamBPlayers: PlayerData[];
  loading: boolean;
  onClose: () => void;
}> = ({ match, teamAPlayers, teamBPlayers, loading, onClose }) => {
  const isCompleted = match.status === 'COMPLETED';
  const isLive      = match.status === 'LIVE';
  const teamAWon    = isCompleted && match.scoreA > match.scoreB;
  const teamBWon    = isCompleted && match.scoreB > match.scoreA;

  /* Keyboard close */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  /* Prevent body scroll while open */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const sharedBg = (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div className="absolute" style={{ left: '-5%', top: 0, width: '52%', height: '100%', background: `radial-gradient(ellipse at left center, ${TEAM_A_COLOR}12 0%, transparent 65%)` }}
        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 4, repeat: Infinity }} />
      <motion.div className="absolute" style={{ right: '-5%', top: 0, width: '52%', height: '100%', background: `radial-gradient(ellipse at right center, ${TEAM_B_COLOR}12 0%, transparent 65%)` }}
        animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 4, repeat: Infinity }} />
      {/* Noise */}
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '256px 256px',
      }} />
      {isLive && (
        <motion.div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(to right, transparent, #ef4444, transparent)' }}
          animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} />
      )}
    </div>
  );

  return (
    /* ── Backdrop — highest z-index, covers everything ── */
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-4 lg:p-6"
      style={{ zIndex: 9999, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.36, ease: [0.34, 1.2, 0.64, 1] }}
        onClick={e => e.stopPropagation()}
        className="relative w-full overflow-hidden"
        style={{
          maxWidth: 960,
          background: 'linear-gradient(170deg, #0c0c16 0%, #08080f 55%, #0c0c16 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 32px 80px rgba(0,0,0,0.85), 0 80px 160px rgba(0,0,0,0.6)',
          /* Mobile: sheet slides up, rounded top only */
          borderRadius: '20px 20px 0 0',
        }}
      >
        {/* sm+: all corners rounded */}
        <style>{`
          @media (min-width: 640px) {
            .modal-shell { border-radius: 20px !important; }
          }
        `}</style>

        <div className="modal-shell" style={{ borderRadius: 'inherit', overflow: 'hidden', position: 'relative' }}>
          {sharedBg}

          {/* ───── Top bar ───── */}
          <div
            className="relative flex items-center justify-between px-4 sm:px-5 py-3 border-b z-10"
            style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          >
            <div className="flex items-center gap-2.5">
              <Shield size={12} style={{ color: 'rgba(255,255,255,0.22)' }} />
              <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {match.stage}
              </span>
              {isLive && (
                <span className="flex items-center gap-1 text-[10px] font-bold tracking-wide" style={{ color: '#ef4444' }}>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                  LIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.18)' }}>{match.time}</span>
              <button
                onClick={onClose}
                className="hidden sm:inline-flex w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                <X size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            </div>
          </div>

          {/* ───── MOBILE layout (<sm): single spotlight, cycles all 10 ───── */}
          <div className="sm:hidden flex flex-col" style={{ height: '86dvh', maxHeight: 660 }}>
            {/* Mobile uses TeamA spotlight only — cycles all players by combining */}
            {/* We render a "merged" mobile view: full-bleed single carousel + score strip */}
            <MobileLayout
              match={match}
              teamAPlayers={teamAPlayers}
              teamBPlayers={teamBPlayers}
              isLive={isLive}
              isCompleted={isCompleted}
              teamAWon={teamAWon}
              teamBWon={teamBWon}
              loading={loading}
              onClose={onClose}
            />
          </div>

          {/* ───── DESKTOP layout (sm+): two carousels side by side ───── */}
          <div className="hidden sm:flex flex-col" style={{ height: 'min(88dvh, 580px)' }}>
            {/* Main arena row */}
            <div className="flex flex-1 min-h-0 gap-0 relative px-4 pt-4 pb-3">
              {/* Team A spotlight */}
              <TeamSpotlight
                team={match.teamA}
                players={teamAPlayers}
                teamColor={TEAM_A_COLOR}
                side="left"
                won={teamAWon}
                lost={teamBWon}
                loading={loading}
                autoPlay
                autoPlayDelay={0}
              />

              {/* Center divider */}
              <CenterDivider
                match={match}
                isLive={isLive}
                isCompleted={isCompleted}
                teamAWon={teamAWon}
                teamBWon={teamBWon}
              />

              {/* Team B spotlight — offset auto-play so they're not in sync */}
              <TeamSpotlight
                team={match.teamB}
                players={teamBPlayers}
                teamColor={TEAM_B_COLOR}
                side="right"
                won={teamBWon}
                lost={teamAWon}
                loading={loading}
                autoPlay
                autoPlayDelay={1750}
              />
            </div>
          </div>

          {/* Bottom accent */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-px pointer-events-none z-10"
            style={{
              background: isLive
                ? 'linear-gradient(to right, transparent, #ef4444, transparent)'
                : isCompleted
                  ? `linear-gradient(to right, ${TEAM_A_COLOR}55, transparent 35%, transparent 65%, ${TEAM_B_COLOR}55)`
                  : 'linear-gradient(to right, transparent, rgba(255,255,255,0.05), transparent)',
            }}
            animate={isLive ? { opacity: [0.35, 1, 0.35] } : { opacity: 1 }}
            transition={isLive ? { duration: 2, repeat: Infinity } : {}}
          />
        </div>
      </motion.div>
    </div>
  );
};

/* ───────────────────────────────────────────────────────── */
/*  MobileLayout — single full-bleed carousel cycling       */
/*  all players from both teams, with score strip below     */
/* ───────────────────────────────────────────────────────── */
type SpotlightPlayer = PlayerData & { teamSide: 'A' | 'B'; teamColor: string; teamName: string };

const MobileLayout: React.FC<{
  match: ScheduleMatch;
  teamAPlayers: PlayerData[];
  teamBPlayers: PlayerData[];
  isLive: boolean;
  isCompleted: boolean;
  teamAWon: boolean;
  teamBWon: boolean;
  loading: boolean;
  onClose: () => void;
}> = ({ match, teamAPlayers, teamBPlayers, isLive, isCompleted, teamAWon, teamBWon, loading, onClose }) => {
  const allPlayers: SpotlightPlayer[] = [
    ...teamAPlayers.filter(p => !p.isSubstitute).slice(0, 5).map(p => ({ ...p, teamSide: 'A' as const, teamColor: TEAM_A_COLOR, teamName: match.teamA.name })),
    ...teamBPlayers.filter(p => !p.isSubstitute).slice(0, 5).map(p => ({ ...p, teamSide: 'B' as const, teamColor: TEAM_B_COLOR, teamName: match.teamB.name })),
  ];

  const [activeIdx, setActiveIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((idx: number, dir: number) => { setDirection(dir); setActiveIdx(idx); }, []);
  const next = useCallback(() => {
    if (!allPlayers.length) return;
    go((activeIdx + 1) % allPlayers.length, 1);
  }, [activeIdx, allPlayers.length, go]);
  const prev = useCallback(() => {
    if (!allPlayers.length) return;
    go((activeIdx - 1 + allPlayers.length) % allPlayers.length, -1);
  }, [activeIdx, allPlayers.length, go]);
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (allPlayers.length > 1) {
      timerRef.current = setInterval(() => {
        setDirection(1);
        setActiveIdx(a => (a + 1) % allPlayers.length);
      }, 3500);
    }
  }, [allPlayers.length, next]);

  useEffect(() => {
    if (allPlayers.length <= 1 || loading) return;
    timerRef.current = setInterval(() => {
      setDirection(1);
      setActiveIdx(a => (a + 1) % allPlayers.length);
    }, 3500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, allPlayers.length]);

  useEffect(() => { setActiveIdx(0); }, [allPlayers.length]);

  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); resetTimer(); }
    touchStartX.current = null;
  };

  const player = allPlayers[activeIdx] ?? null;
  const photo = player ? getPhoto(player) : null;
  const roleColor = player ? getRoleColor(player.role) : '#ffffff';
  const teamColor = player?.teamColor ?? '#ffffff';
  const isWinner = isCompleted && ((player?.teamSide === 'A' && teamAWon) || (player?.teamSide === 'B' && teamBWon));
  const isLoser  = isCompleted && !isWinner && (teamAWon || teamBWon);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-2">
          {[0,1,2,3,4].map(i => <div key={i} className="w-9 h-9 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', animationDelay: `${i*0.08}s` }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Full-bleed photo */}
      <div className="relative flex-1 overflow-hidden min-h-0">
        <AnimatePresence mode="sync" custom={direction}>
          {photo ? (
            <motion.div
              key={`m-photo-${activeIdx}`}
              custom={direction}
              variants={{
                enter:  (d: number) => ({ x: d * 56, opacity: 0, scale: 1.04 }),
                center: { x: 0, opacity: 1, scale: 1 },
                exit:   (d: number) => ({ x: d * -56, opacity: 0, scale: 0.96 }),
              }}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.44, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0"
            >
              <Image src={photo} alt={player?.ign ?? ''} fill className="object-cover object-top" priority />
            </motion.div>
          ) : (
            <motion.div key={`m-empty-${activeIdx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: `radial-gradient(circle at center, ${teamColor}15, transparent 70%)` }}>
              <Users size={48} style={{ color: 'rgba(255,255,255,0.08)' }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gradients */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(6,6,14,1) 0%, rgba(6,6,14,0.68) 28%, rgba(6,6,14,0.08) 58%, rgba(6,6,14,0.42) 100%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to ${player?.teamSide === 'A' ? 'right' : 'left'}, ${teamColor}18 0%, transparent 55%)` }} />
        {isLoser && <div className="absolute inset-0 bg-black/55 pointer-events-none" />}
        {isWinner && (
          <motion.div className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0, 0.1, 0] }} transition={{ duration: 3, repeat: Infinity }}
            style={{ background: `radial-gradient(ellipse at 50% 90%, ${teamColor}50, transparent 65%)` }} />
        )}

        {/* Top: team chip */}
        <div className="absolute top-3 left-4 right-12 z-10 flex items-center gap-1.5">
          {player?.teamSide === 'A' && match.teamA.logo && (
            <div className="w-5 h-5 rounded overflow-hidden" style={{ border: `1px solid ${TEAM_A_COLOR}70` }}>
              <Image src={match.teamA.logo} alt={match.teamA.name} width={20} height={20} className="object-cover" />
            </div>
          )}
          {player?.teamSide === 'B' && match.teamB.logo && (
            <div className="w-5 h-5 rounded overflow-hidden" style={{ border: `1px solid ${TEAM_B_COLOR}70` }}>
              <Image src={match.teamB.logo} alt={match.teamB.name} width={20} height={20} className="object-cover" />
            </div>
          )}
          <span className="text-[10px] font-black tracking-wider uppercase" style={{ color: teamColor, textShadow: `0 0 10px ${teamColor}80` }}>
            {player?.teamName ?? ''}
          </span>
        </div>

        {/* Close (mobile has no top bar on this layout) */}
        <button onClick={onClose} className="absolute top-3 right-3 z-20 w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
          <X size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
        </button>

        {/* Bottom player info */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-3">
          <AnimatePresence mode="wait">
            <motion.div key={`m-info-${activeIdx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.26 }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: roleColor + 'cc', backdropFilter: 'blur(4px)' }}>
                  <RoleIcon role={player?.role ?? ''} size={8} className="text-white" />
                  <span className="text-[8px] font-black text-white">{ROLE_SHORT[player?.role?.toUpperCase() ?? ''] ?? player?.role?.slice(0,3) ?? '?'}</span>
                </div>
                {isWinner && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: 'rgba(245,158,11,0.9)' }}>
                    <Crown size={8} fill="white" className="text-white" /><span className="text-[8px] font-black text-white">Winner</span>
                  </motion.div>
                )}
              </div>
              <h2 className="font-black leading-none" style={{ fontSize: 'clamp(1.6rem, 8vw, 2.4rem)', color: isLoser ? 'rgba(255,255,255,0.25)' : '#fff', textShadow: isWinner ? `0 0 28px ${roleColor}55` : '0 2px 12px rgba(0,0,0,0.9)', letterSpacing: '-0.02em' }}>
                {player?.ign ?? '—'}
              </h2>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Prev/Next */}
        {allPlayers.length > 1 && (
          <>
            <button onClick={() => { prev(); resetTimer(); }} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
              <ChevronLeft size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
            </button>
            <button onClick={() => { next(); resetTimer(); }} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
              <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
            </button>
          </>
        )}
      </div>

      {/* Score strip */}
      <MobileScoreStrip match={match} isLive={isLive} isCompleted={isCompleted} teamAWon={teamAWon} teamBWon={teamBWon} />

      {/* Thumbnail row */}
      <div className="shrink-0 px-3 py-2" style={{ background: 'rgba(0,0,0,0.8)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex gap-1.5 justify-center flex-wrap">
          {allPlayers.map((p, i) => {
            const pPhoto = getPhoto(p);
            const isActive = i === activeIdx;
            const pWon = isCompleted && ((p.teamSide === 'A' && teamAWon) || (p.teamSide === 'B' && teamBWon));
            const pLost = isCompleted && !pWon && (teamAWon || teamBWon);
            return (
              <button key={p.id} onClick={() => { go(i, i > activeIdx ? 1 : -1); resetTimer(); }}
                className="relative shrink-0 transition-all duration-200"
                style={{ width: 36, height: 36, borderRadius: 10, overflow: 'hidden', border: isActive ? `2px solid ${p.teamColor}` : '2px solid rgba(255,255,255,0.08)', transform: isActive ? 'scale(1.12)' : 'scale(1)', filter: pLost ? 'grayscale(0.8) brightness(0.4)' : 'none', boxShadow: isActive ? `0 0 10px ${p.teamColor}60` : 'none' }}>
                {pPhoto ? <Image src={pPhoto} alt={p.ign} fill className="object-cover object-top" sizes="36px" /> : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}><Users size={12} style={{ color: 'rgba(255,255,255,0.2)' }} /></div>
                )}
                <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: p.teamColor }} />
                {pWon && <div className="absolute top-0 left-0 right-0 flex justify-center"><Crown size={8} fill="#f59e0b" style={{ color: '#f59e0b' }} /></div>}
              </button>
            );
          })}
        </div>
        {allPlayers.length > 0 && (
          <div className="flex justify-center gap-1 mt-2">
            {allPlayers.map((p, i) => (
              <div key={i} className="rounded-full transition-all duration-300" style={{ width: i === activeIdx ? 16 : 3.5, height: 2.5, background: i === activeIdx ? (allPlayers[i]?.teamColor ?? '#fff') : 'rgba(255,255,255,0.12)' }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StartingFiveModal;