'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { X, Crown, Swords, Users, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Types ── */
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

/* ── Helpers ── */
const ROLE_ICONS: Record<string, string> = {
  JUNGLER: '/roles/jungle.png', MID_LANER: '/roles/mid.png',
  GOLD_LANER: '/roles/gold.png', EXP_LANER: '/roles/exp.png', ROAMER: '/roles/roam.png',
};
const ROLE_SHORT: Record<string, string> = {
  JUNGLER: 'JG', MID_LANER: 'MID', GOLD_LANER: 'GLD', EXP_LANER: 'EXP', ROAMER: 'RMR',
};
const ROLE_COLORS: Record<string, string> = {
  JUNGLER: '#22c55e', MID_LANER: '#3b82f6', GOLD_LANER: '#f59e0b',
  EXP_LANER: '#a855f7', ROAMER: '#ec4899',
};
const TEAM_A_COLOR = '#e8740a';
const TEAM_B_COLOR = '#3b82f6';
const STATUS_CFG = {
  LIVE:      { label: 'Live',      color: '#ef4444' },
  UPCOMING:  { label: 'Upcoming',  color: '#f59e0b' },
  COMPLETED: { label: 'Completed', color: '#22c55e' },
  FORFEITED: { label: 'Forfeited', color: '#71717a' },
  DISPUTED:  { label: 'Disputed',  color: '#f97316' },
};

const getPhoto = (p: PlayerData | null) => p?.photo || p?.user?.photo || null;
const getRoleColor = (role: string) => ROLE_COLORS[role] || '#ffffff';

/* ─────────────────────────────────────────────── */
/*  MOBILE: Full-bleed spotlight view             */
/* ─────────────────────────────────────────────── */

type SpotlightPlayer = PlayerData & { teamSide: 'A' | 'B'; teamColor: string; teamName: string };

const MobileSpotlight = ({
  allPlayers,
  match,
  isLive,
  isCompleted,
  teamAWon,
  teamBWon,
  loading,
  onClose,
}: {
  allPlayers: SpotlightPlayer[];
  match: ScheduleMatch;
  isLive: boolean;
  isCompleted: boolean;
  teamAWon: boolean;
  teamBWon: boolean;
  loading: boolean;
  onClose: () => void;
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const go = useCallback((newIdx: number, dir: number) => {
    setDirection(dir);
    setActiveIdx(newIdx);
  }, []);

  const next = useCallback(() => {
    if (allPlayers.length === 0) return;
    const newIdx = (activeIdx + 1) % allPlayers.length;
    go(newIdx, 1);
  }, [activeIdx, allPlayers.length, go]);

  const prev = useCallback(() => {
    if (allPlayers.length === 0) return;
    const newIdx = (activeIdx - 1 + allPlayers.length) % allPlayers.length;
    go(newIdx, -1);
  }, [activeIdx, allPlayers.length, go]);

  /* Auto-cycle every 3.5s */
  useEffect(() => {
    if (allPlayers.length <= 1 || loading) return;
    timerRef.current = setInterval(next, 3500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, allPlayers.length, loading]);

  /* Reset on new players */
  // Reset handled by parent remount via `key` prop; avoid calling setState synchronously in effect

  const player = allPlayers[activeIdx] ?? null;
  const photo = player ? getPhoto(player) : null;
  const roleColor = player ? getRoleColor(player.role) : '#ffffff';
  const teamColor = player?.teamColor ?? '#ffffff';
  const isWinner = isCompleted && ((player?.teamSide === 'A' && teamAWon) || (player?.teamSide === 'B' && teamBWon));
  const isLoser = isCompleted && !isWinner && (teamAWon || teamBWon);
  const cfg = STATUS_CFG[match.status];

  /* Touch swipe */
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
    touchStartX.current = null;
  };

  return (
    <div className="flex flex-col h-full" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* ── Full-bleed photo area ── */}
      <div className="relative flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Background photo crossfade */}
        <AnimatePresence mode="sync" custom={direction}>
          {photo ? (
            <motion.div
              key={`photo-${activeIdx}`}
              custom={direction}
              variants={{
                enter: (d: number) => ({ x: d * 60, opacity: 0, scale: 1.04 }),
                center: { x: 0, opacity: 1, scale: 1 },
                exit: (d: number) => ({ x: d * -60, opacity: 0, scale: 0.97 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
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
              key={`empty-${activeIdx}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: `radial-gradient(circle at center, ${teamColor}18, transparent 70%)` }}
            >
              <Users size={48} style={{ color: 'rgba(255,255,255,0.1)' }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gradient overlays */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(to top, rgba(6,6,12,1) 0%, rgba(6,6,12,0.7) 25%, rgba(6,6,12,0.1) 55%, rgba(6,6,12,0.4) 100%)',
        }} />
        {/* Team color side tint */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `linear-gradient(to ${player?.teamSide === 'A' ? 'right' : 'left'}, ${teamColor}22 0%, transparent 60%)`,
        }} />
        {/* Loser dimming */}
        {isLoser && <div className="absolute inset-0 pointer-events-none bg-black/50" />}

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4 z-20">
          <div className="flex items-center gap-2">
            <Shield size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {match.stage}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
          >
            <X size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        {/* Team label top-center */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`team-${activeIdx}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20"
          >
            {player?.teamSide === 'A' && match.teamA.logo && (
              <div className="w-5 h-5 rounded-md overflow-hidden" style={{ border: `1px solid ${TEAM_A_COLOR}60` }}>
                <Image src={match.teamA.logo} alt={match.teamA.name} width={20} height={20} className="object-cover" />
              </div>
            )}
            {player?.teamSide === 'B' && match.teamB.logo && (
              <div className="w-5 h-5 rounded-md overflow-hidden" style={{ border: `1px solid ${TEAM_B_COLOR}60` }}>
                <Image src={match.teamB.logo} alt={match.teamB.name} width={20} height={20} className="object-cover" />
              </div>
            )}
            <span
              className="text-[11px] font-black tracking-wider uppercase"
              style={{ color: teamColor, textShadow: `0 0 12px ${teamColor}80` }}
            >
              {player?.teamName ?? ''}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Player info bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={`info-${activeIdx}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {/* Role badge */}
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                  style={{ background: roleColor + 'cc', backdropFilter: 'blur(4px)' }}
                >
                  {ROLE_ICONS[player?.role ?? ''] ? (
                    <Image src={ROLE_ICONS[player!.role]} alt={player!.role} width={11} height={11} />
                  ) : null}
                  <span className="text-[9px] font-black text-white">
                    {ROLE_SHORT[player?.role ?? ''] ?? player?.role?.slice(0, 3) ?? '?'}
                  </span>
                </div>
                {isWinner && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                    style={{ background: 'rgba(245,158,11,0.9)' }}
                  >
                    <Crown size={9} fill="white" className="text-white" />
                    <span className="text-[9px] font-black text-white">Winner</span>
                  </motion.div>
                )}
              </div>

              {/* IGN */}
              <h2
                className="font-black leading-none mb-0.5"
                style={{
                  fontSize: 'clamp(1.6rem, 7vw, 2.2rem)',
                  color: isLoser ? 'rgba(255,255,255,0.3)' : '#ffffff',
                  textShadow: isWinner ? `0 0 30px ${roleColor}60` : '0 2px 12px rgba(0,0,0,0.8)',
                  letterSpacing: '-0.02em',
                }}
              >
                {player?.ign ?? '—'}
              </h2>

              {player?.isSubstitute && (
                <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Substitute
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Prev/Next arrows */}
        {allPlayers.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = setInterval(next, 3500); } }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
            >
              <ChevronLeft size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = setInterval(next, 3500); } }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
            >
              <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
            </button>
          </>
        )}
      </div>

      {/* ── Score strip ── */}
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
            <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[9px] font-black" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
              {match.teamA.tag.slice(0, 3)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-black truncate leading-none" style={{ color: isCompleted ? (teamAWon ? TEAM_A_COLOR : 'rgba(255,255,255,0.25)') : 'rgba(255,255,255,0.8)' }}>
              {match.teamA.tag}
            </p>
            {teamAWon && <p className="text-[9px] font-bold" style={{ color: TEAM_A_COLOR }}>WINNER</p>}
          </div>
        </div>

        {/* Score / VS */}
        <div className="flex flex-col items-center shrink-0 px-3">
          {isLive || isCompleted ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tabular-nums leading-none" style={{ color: isCompleted ? (teamAWon ? TEAM_A_COLOR : 'rgba(255,255,255,0.2)') : '#fff' }}>
                  {match.scoreA}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.8rem' }}>:</span>
                <span className="font-black text-xl tabular-nums leading-none" style={{ color: isCompleted ? (teamBWon ? TEAM_B_COLOR : 'rgba(255,255,255,0.2)') : '#fff' }}>
                  {match.scoreB}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {isLive && <span className="relative flex h-1 w-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" /><span className="relative inline-flex rounded-full h-1 w-1 bg-red-500" /></span>}
                <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
              {isLive && match.elapsed && <span className="text-[9px] font-mono" style={{ color: '#ef4444' }}>{match.elapsed}</span>}
            </>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <Swords size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
              <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.18)' }}>VS</span>
              <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>{match.time}</span>
            </div>
          )}
        </div>

        {/* Team B */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <div className="min-w-0 text-right">
            <p className="text-[11px] font-black truncate leading-none" style={{ color: isCompleted ? (teamBWon ? TEAM_B_COLOR : 'rgba(255,255,255,0.25)') : 'rgba(255,255,255,0.8)' }}>
              {match.teamB.tag}
            </p>
            {teamBWon && <p className="text-[9px] font-bold" style={{ color: TEAM_B_COLOR }}>WINNER</p>}
          </div>
          {match.teamB.logo ? (
            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0" style={{ border: `1.5px solid ${teamBWon ? TEAM_B_COLOR + '80' : 'rgba(255,255,255,0.1)'}` }}>
              <Image src={match.teamB.logo} alt={match.teamB.name} width={28} height={28} className="object-cover" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[9px] font-black" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
              {match.teamB.tag.slice(0, 3)}
            </div>
          )}
        </div>
      </div>

      {/* ── Player thumbnail selector ── */}
      <div
        className="shrink-0 px-3 py-2.5"
        style={{ background: 'rgba(0,0,0,0.8)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        {loading ? (
          <div className="flex gap-2 justify-center">
            {[0,1,2,3,4,5,6,7,8,9].map(i => (
              <div key={i} className="w-9 h-9 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', animationDelay: `${i*0.07}s` }} />
            ))}
          </div>
        ) : (
          <div className="flex gap-1.5 justify-center flex-wrap">
            {allPlayers.map((p, i) => {
              const pPhoto = getPhoto(p);
              const isActive = i === activeIdx;
              const pWon = isCompleted && ((p.teamSide === 'A' && teamAWon) || (p.teamSide === 'B' && teamBWon));
              const pLost = isCompleted && !pWon && (teamAWon || teamBWon);
              return (
                <button
                  key={p.id}
                  onClick={() => { go(i, i > activeIdx ? 1 : -1); if (timerRef.current) clearInterval(timerRef.current); }}
                  className="relative shrink-0 transition-all duration-200"
                  style={{
                    width: 36, height: 36,
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: isActive
                      ? `2px solid ${p.teamColor}`
                      : '2px solid rgba(255,255,255,0.08)',
                    transform: isActive ? 'scale(1.12)' : 'scale(1)',
                    filter: pLost ? 'grayscale(0.8) brightness(0.4)' : 'none',
                    boxShadow: isActive ? `0 0 10px ${p.teamColor}60` : 'none',
                  }}
                >
                  {pPhoto ? (
                    <Image src={pPhoto} alt={p.ign} fill className="object-cover object-top" sizes="36px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <Users size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    </div>
                  )}
                  {/* Team color dot */}
                  <div
                    className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: p.teamColor, boxShadow: `0 0 4px ${p.teamColor}` }}
                  />
                  {/* Winner crown */}
                  {pWon && (
                    <div className="absolute top-0 left-0 right-0 flex justify-center">
                      <Crown size={8} fill="#f59e0b" style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 3px rgba(245,158,11,0.8))' }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Progress dots */}
        {allPlayers.length > 0 && (
          <div className="flex justify-center gap-1 mt-2">
            {allPlayers.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === activeIdx ? 16 : 4,
                  height: 3,
                  background: i === activeIdx ? (allPlayers[i]?.teamColor ?? '#ffffff') : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────── */
/*  DESKTOP: Side-by-side tall card layout        */
/* ─────────────────────────────────────────────── */

const DesktopPlayerCard = ({
  player,
  index,
  winnerState,
  teamColor,
}: {
  player: PlayerData | null;
  index: number;
  winnerState: boolean | null;
  teamColor: string;
}) => {
  const photo = player ? getPhoto(player) : null;
  const roleColor = player ? getRoleColor(player.role) : teamColor;
  const isLoser = winnerState === false;
  const isWinner = winnerState === true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: 0.08 + index * 0.07, ease: [0.34, 1.2, 0.64, 1] }}
      className="relative flex-1 min-w-0"
      style={{ filter: isLoser ? 'grayscale(0.6) brightness(0.45)' : 'none' }}
    >
      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          aspectRatio: '2/3',
          border: `1px solid ${isWinner ? roleColor + '55' : 'rgba(255,255,255,0.07)'}`,
          background: 'rgba(0,0,0,0.4)',
          boxShadow: isWinner ? `0 0 20px 1px ${roleColor}28` : 'none',
        }}
      >
        {photo ? (
          <>
            <Image src={photo} alt={player?.ign ?? ''} fill className="object-cover object-top" sizes="80px" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 28%, transparent 55%)' }} />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(160deg, rgba(255,255,255,0.02), rgba(0,0,0,0.3))` }}>
            <Users size={18} style={{ color: 'rgba(255,255,255,0.1)' }} />
          </div>
        )}

        {isWinner && (
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-xl"
            animate={{ opacity: [0, 0.12, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ background: `radial-gradient(ellipse at center bottom, ${roleColor}50, transparent 70%)` }}
          />
        )}

        {/* Role badge */}
        <div
          className="absolute top-1 left-1 flex items-center justify-center rounded px-1 py-0.5"
          style={{ background: roleColor + 'dd', backdropFilter: 'blur(4px)' }}
        >
          {ROLE_ICONS[player?.role ?? ''] ? (
            <Image src={ROLE_ICONS[player!.role]} alt={player!.role} width={9} height={9} className="opacity-95" />
          ) : (
            <span className="text-[7px] font-black text-white leading-none">
              {ROLE_SHORT[player?.role ?? ''] ?? '?'}
            </span>
          )}
        </div>

        {/* IGN */}
        <div className="absolute bottom-0 left-0 right-0 p-1.5">
          <p
            className="text-[10px] font-black truncate leading-none text-center"
            style={{
              color: isWinner ? '#fff' : isLoser ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)',
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              letterSpacing: '0.01em',
            }}
          >
            {player?.ign ?? '—'}
          </p>
        </div>
      </div>

      {isWinner && (
        <motion.div
          className="absolute -top-2.5 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + index * 0.07, type: 'spring', stiffness: 300 }}
        >
          <Crown size={11} fill="#f59e0b" style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 5px rgba(245,158,11,0.8))' }} />
        </motion.div>
      )}
    </motion.div>
  );
};

const DesktopTeamPanel = ({
  team, players, side, won, lost, teamColor,
}: {
  team: MatchTeam; players: PlayerData[]; side: 'left' | 'right';
  won: boolean; lost: boolean; teamColor: string;
}) => {
  const starting = players.filter(p => !p.isSubstitute).slice(0, 5);
  const allSlots: (PlayerData | null)[] = [...starting, ...Array(Math.max(0, 5 - starting.length)).fill(null)];
  const winnerState = won ? true : lost ? false : null;

  return (
    <div className={`relative flex flex-col gap-3 flex-1 min-w-0 ${side === 'right' ? 'items-end' : 'items-start'}`}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: side === 'left'
          ? `linear-gradient(to right, ${teamColor}12 0%, transparent 100%)`
          : `linear-gradient(to left, ${teamColor}12 0%, transparent 100%)`,
      }} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: side === 'left' ? -16 : 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className={`relative flex items-center gap-2.5 z-10 w-full ${side === 'right' ? 'flex-row-reverse' : ''}`}
      >
        <div className="relative shrink-0">
          {won && (
            <motion.div
              className="absolute -inset-2 rounded-xl"
              style={{ background: `radial-gradient(circle, ${teamColor}28, transparent 70%)` }}
              animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
          )}
          <div
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden relative ${lost ? 'opacity-35' : ''}`}
            style={{ border: `1.5px solid ${won ? teamColor + '80' : 'rgba(255,255,255,0.1)'}`, background: 'rgba(255,255,255,0.04)' }}
          >
            {team.logo ? <Image src={team.logo} alt={team.name} fill className="object-cover" /> : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-black">{team.tag.slice(0, 3)}</div>
            )}
          </div>
          {won && (
            <motion.div
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: '#f59e0b', boxShadow: '0 0 10px rgba(245,158,11,0.7)' }}
              animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Crown size={9} fill="white" style={{ color: '#78350f' }} />
            </motion.div>
          )}
        </div>
        <div className={`min-w-0 flex-1 ${side === 'right' ? 'text-right' : ''}`}>
          <p className="font-black text-sm leading-tight truncate" style={{ color: lost ? 'rgba(255,255,255,0.18)' : '#fff', letterSpacing: '-0.01em' }}>
            {team.name}
          </p>
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: won ? teamColor : lost ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.28)' }}>
            {won ? '✦ VICTORY' : lost ? 'DEFEAT' : team.tag}
          </p>
        </div>
      </motion.div>

      {/* Cards */}
      <div className={`flex gap-1.5 sm:gap-2 w-full z-10 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
        {allSlots.map((p, i) => (
          <DesktopPlayerCard key={p?.id ?? `e-${i}`} player={p} index={i} winnerState={winnerState} teamColor={teamColor} />
        ))}
      </div>

      {(won || lost) && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.65, delay: 0.5 }}
          className="w-full h-px z-10"
          style={{
            transformOrigin: side === 'left' ? 'left' : 'right',
            background: won
              ? `linear-gradient(${side === 'left' ? 'to right' : 'to left'}, ${teamColor}, transparent)`
              : `linear-gradient(${side === 'left' ? 'to right' : 'to left'}, rgba(239,68,68,0.25), transparent)`,
          }}
        />
      )}
    </div>
  );
};

const DesktopCenterClash = ({ match, isLive, isCompleted, teamAWon, teamBWon }: {
  match: ScheduleMatch; isLive: boolean; isCompleted: boolean; teamAWon: boolean; teamBWon: boolean;
}) => {
  const cfg = STATUS_CFG[match.status];
  const hasScore = isLive || isCompleted;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
      className="flex flex-col items-center justify-center gap-2 shrink-0 z-20 relative"
      style={{ minWidth: 'clamp(56px, 10vw, 88px)' }}
    >
      <div className="w-px" style={{ height: 24, background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.07))' }} />
      {hasScore ? (
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <motion.span
              key={`a-${match.scoreA}`} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="font-black tabular-nums"
              style={{ fontSize: 'clamp(1.5rem, 4vw, 2.8rem)', lineHeight: 1, color: isCompleted ? (teamAWon ? TEAM_A_COLOR : 'rgba(255,255,255,0.18)') : '#fff', textShadow: teamAWon && isCompleted ? `0 0 20px ${TEAM_A_COLOR}70` : 'none' }}
            >{match.scoreA}</motion.span>
            <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: '0.9rem' }}>:</span>
            <motion.span
              key={`b-${match.scoreB}`} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="font-black tabular-nums"
              style={{ fontSize: 'clamp(1.5rem, 4vw, 2.8rem)', lineHeight: 1, color: isCompleted ? (teamBWon ? TEAM_B_COLOR : 'rgba(255,255,255,0.18)') : '#fff', textShadow: teamBWon && isCompleted ? `0 0 20px ${TEAM_B_COLOR}70` : 'none' }}
            >{match.scoreB}</motion.span>
          </div>
          {isCompleted && (teamAWon || teamBWon) && <span className="text-[8px] font-black tracking-[0.3em] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>FINAL</span>}
          {isLive && match.elapsed && <span className="text-[10px] font-mono font-bold" style={{ color: '#ef4444' }}>{match.elapsed}</span>}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <motion.div animate={isLive ? { rotate: [0, 6, -6, 0] } : {}} transition={{ duration: 3, repeat: Infinity }}>
            <Swords size={18} style={{ color: 'rgba(255,255,255,0.18)' }} />
          </motion.div>
          <span className="font-black tracking-[0.35em] uppercase" style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.16)' }}>VS</span>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace' }}>{match.time}</span>
        </div>
      )}
      <div
        className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest uppercase"
        style={{ color: cfg.color, borderColor: cfg.color + '35', background: cfg.color + '12' }}
      >
        {isLive && <span className="relative flex h-1 w-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: cfg.color }} /><span className="relative inline-flex rounded-full h-1 w-1" style={{ background: cfg.color }} /></span>}
        {cfg.label}
      </div>
      <div className="w-px" style={{ height: 24, background: 'linear-gradient(to top, transparent, rgba(255,255,255,0.07))' }} />
    </motion.div>
  );
};

/* ─────────────────────────────────────────────── */
/*  Main Modal                                    */
/* ─────────────────────────────────────────────── */
export const StartingFiveModal = ({
  match, teamAPlayers, teamBPlayers, loading, onClose,
}: {
  match: ScheduleMatch;
  teamAPlayers: PlayerData[];
  teamBPlayers: PlayerData[];
  loading: boolean;
  onClose: () => void;
}) => {
  const isCompleted = match.status === 'COMPLETED';
  const isLive = match.status === 'LIVE';
  const teamAWon = isCompleted && match.scoreA > match.scoreB;
  const teamBWon = isCompleted && match.scoreB > match.scoreA;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  /* Build flat spotlight player list: Team A first, then Team B */
  const allPlayers: SpotlightPlayer[] = [
    ...teamAPlayers.filter(p => !p.isSubstitute).slice(0, 5).map(p => ({
      ...p, teamSide: 'A' as const, teamColor: TEAM_A_COLOR, teamName: match.teamA.name,
    })),
    ...teamBPlayers.filter(p => !p.isSubstitute).slice(0, 5).map(p => ({
      ...p, teamSide: 'B' as const, teamColor: TEAM_B_COLOR, teamName: match.teamB.name,
    })),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-100 flex items-end sm:items-center justify-center sm:p-5"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 32 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 16 }}
        transition={{ duration: 0.36, ease: [0.34, 1.3, 0.64, 1] }}
        onClick={e => e.stopPropagation()}
        className="relative w-full sm:max-w-5xl overflow-hidden"
        style={{
          background: 'linear-gradient(170deg, #0c0c14 0%, #08080f 60%, #0c0c14 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 48px 140px rgba(0,0,0,0.9)',
          /* Mobile: sheet from bottom, rounded top corners only */
          borderRadius: 'clamp(16px, 3vw, 20px) clamp(16px, 3vw, 20px) 0 0',
        }}
        /* Override border-radius for sm+ */
        {...{} as object}
      >
        {/* sm+ rounded everywhere */}
        <style>{`@media (min-width: 640px) { .modal-inner { border-radius: 20px !important; } }`}</style>
        <div className="modal-inner" style={{ borderRadius: 'inherit', overflow: 'hidden' }}>

          {/* Atmospheric glows */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div className="absolute" style={{ left: '-5%', top: '10%', width: '50%', height: '110%', background: `radial-gradient(ellipse at left center, ${TEAM_A_COLOR}15 0%, transparent 65%)` }} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 4, repeat: Infinity }} />
            <motion.div className="absolute" style={{ right: '-5%', top: '10%', width: '50%', height: '110%', background: `radial-gradient(ellipse at right center, ${TEAM_B_COLOR}15 0%, transparent 65%)` }} animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 4, repeat: Infinity }} />
            {isLive && (
              <motion.div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(to right, transparent, #ef4444, transparent)' }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} />
            )}
          </div>

          {/* ── MOBILE layout (< sm) ── */}
              <div
                className="sm:hidden flex flex-col relative"
                style={{ height: '88dvh', maxHeight: 680 }}
              >
                <MobileSpotlight
                  key={allPlayers.length}
                  allPlayers={allPlayers}
                  match={match}
                  isLive={isLive}
                  isCompleted={isCompleted}
                  teamAWon={teamAWon}
                  teamBWon={teamBWon}
                  loading={loading}
                  onClose={onClose}
                />
              </div>

          {/* ── DESKTOP layout (sm+) ── */}
          <div className="hidden sm:block">
            {/* Desktop top bar */}
            <div className="relative flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.35)' }}>
              <div className="flex items-center gap-2.5">
                <Shield size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />
                <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>{match.stage}</span>
                {isLive && (
                  <span className="flex items-center gap-1 text-[10px] font-bold tracking-wide" style={{ color: '#ef4444' }}>
                    <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" /></span>
                    LIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono hidden sm:block" style={{ color: 'rgba(255,255,255,0.18)' }}>{match.time}</span>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                >
                  <X size={13} style={{ color: 'rgba(255,255,255,0.35)' }} />
                </button>
              </div>
            </div>

            {/* Desktop arena */}
            <div className="relative p-5 lg:p-6">
              {loading ? (
                <div className="flex gap-3">
                  <div className="flex gap-1.5 flex-1">{[0,1,2,3,4].map(i => <div key={i} className="flex-1 rounded-xl animate-pulse" style={{ aspectRatio: '2/3', background: 'rgba(255,255,255,0.04)', animationDelay: `${i*0.1}s` }} />)}</div>
                  <div className="flex flex-col items-center justify-center gap-3 px-4 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
                    <div className="w-14 h-3 rounded bg-white/5 animate-pulse" />
                  </div>
                  <div className="flex gap-1.5 flex-1">{[0,1,2,3,4].map(i => <div key={i} className="flex-1 rounded-xl animate-pulse" style={{ aspectRatio: '2/3', background: 'rgba(255,255,255,0.04)', animationDelay: `${i*0.1}s` }} />)}</div>
                </div>
              ) : (
                <div className="flex items-start gap-3 lg:gap-5">
                  <DesktopTeamPanel team={match.teamA} players={teamAPlayers} side="left" won={teamAWon} lost={teamBWon} teamColor={TEAM_A_COLOR} />
                  <DesktopCenterClash match={match} isLive={isLive} isCompleted={isCompleted} teamAWon={teamAWon} teamBWon={teamBWon} />
                  <DesktopTeamPanel team={match.teamB} players={teamBPlayers} side="right" won={teamBWon} lost={teamAWon} teamColor={TEAM_B_COLOR} />
                </div>
              )}
            </div>

            {/* Desktop bottom accent */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
              style={{
                background: isLive
                  ? 'linear-gradient(to right, transparent, #ef4444, transparent)'
                  : isCompleted
                    ? `linear-gradient(to right, ${TEAM_A_COLOR}50, transparent 35%, transparent 65%, ${TEAM_B_COLOR}50)`
                    : 'linear-gradient(to right, transparent, rgba(255,255,255,0.05), transparent)',
              }}
              animate={isLive ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
              transition={isLive ? { duration: 2, repeat: Infinity } : {}}
            />
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
};

export default StartingFiveModal;