/* ────────────────────────────────────────────────────────── */
/*  StartingFiveModal — BATTLE ARENA redesign                */
/* ────────────────────────────────────────────────────────── */

'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { X, Crown, Skull, Swords, Users, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

/* ── re-use types from parent ── */
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

/* ── role helpers ── */
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

/* ── status config ── */
const STATUS_CFG = {
  LIVE:      { label: 'Live',      color: '#ef4444' },
  UPCOMING:  { label: 'Upcoming',  color: '#f59e0b' },
  COMPLETED: { label: 'Completed', color: '#22c55e' },
  FORFEITED: { label: 'Forfeited', color: '#71717a' },
  DISPUTED:  { label: 'Disputed',  color: '#f97316' },
};

const PlayerSlot = ({ player, side, index, winner, }: { player: PlayerData | null; side: 'left' | 'right'; index: number; winner: boolean | null; }) => {
  const photo = player?.photo || player?.user?.photo || null;
  const roleColor = player ? (ROLE_COLORS[player.role] || '#ffffff') : '#ffffff';

  return (
    <motion.div initial={{ opacity: 0, x: side === 'left' ? -30 : 30, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.4, delay: 0.15 + index * 0.07, ease: [0.34, 1.56, 0.64, 1] }} className="flex flex-col items-center gap-1">
      <div className="relative" style={{ filter: winner === false ? 'grayscale(0.7) brightness(0.6)' : 'none' }}>
        {winner === true && (<motion.div className="absolute inset-0 rounded-2xl" style={{ boxShadow: `0 0 20px 4px ${roleColor}55` }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />)}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 relative bg-white/5" style={{ borderColor: winner === false ? '#333' : roleColor + '80' }}>
          {photo ? (<Image src={photo} alt={player?.ign || ''} fill className="object-cover" />) : (<div className="w-full h-full flex items-center justify-center"><Users size={22} className="text-white/20" /></div>)}
          <div className="absolute bottom-0 left-0 right-0 h-4 flex items-center justify-center" style={{ background: `${roleColor}cc` }}>
            {ROLE_ICONS[player?.role || ''] ? (<Image src={ROLE_ICONS[player!.role]} alt={player!.role} width={10} height={10} className="opacity-90" />) : (<span className="text-[8px] font-black text-white">{ROLE_SHORT[player?.role || ''] || '?'}</span>)}
          </div>
        </div>
      </div>
      <span className="text-[10px] sm:text-[11px] font-bold truncate max-w-[60px] sm:max-w-[72px] text-center leading-tight" style={{ color: winner === false ? '#4a4a5a' : winner === true ? '#e2e8f0' : '#94a3b8' }}>{player?.ign || '—'}</span>
    </motion.div>
  );
};

const TeamPanel = ({ team, players, side, won, lost, }: { team: MatchTeam; players: PlayerData[]; side: 'left' | 'right'; won: boolean; lost: boolean; }) => {
  const starting = players.filter(p => !p.isSubstitute).slice(0, 5);
  const winnerState = won ? true : lost ? false : null;
  return (
    <div className={`relative flex flex-col ${side === 'right' ? 'items-end' : 'items-start'} flex-1 min-w-0`}>
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className={`flex items-center gap-3 mb-4 sm:mb-6 ${side === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="relative shrink-0">{won && (<motion.div className="absolute -inset-1.5 rounded-2xl" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.3), transparent 70%)' }} animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 2.5, repeat: Infinity }} />)}
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border relative ${ won ? 'border-emerald-500/60' : lost ? 'border-white/6 opacity-50' : 'border-white/15' } bg-white/5`}>{team.logo ? (<Image src={team.logo} alt={team.name} fill className="object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-white/30 text-sm font-black">{team.tag.slice(0, 3)}</div>)}</div>
          {won && (<div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/50"><Crown size={11} className="text-amber-900" fill="currentColor" /></div>)}
        </div>
        <div className={side === 'right' ? 'text-right' : 'text-left'}>
          <p className={`font-black text-base sm:text-lg leading-tight ${ won ? 'text-white' : lost ? 'text-white/25' : 'text-white/80' }`}>{team.name}</p>
          <p className={`text-[11px] font-bold tracking-widest uppercase ${ won ? 'text-emerald-400' : lost ? 'text-white/15' : 'text-white/30' }`}>{won ? '✦ Victory' : lost ? 'Defeat' : team.tag}</p>
        </div>
      </motion.div>
      <div className={`flex gap-2 sm:gap-3 ${side === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>{starting.length > 0 ? (starting.map((p, i) => <PlayerSlot key={p.id} player={p} side={side} index={i} winner={winnerState} />)) : ([0,1,2,3,4].map(i => <PlayerSlot key={i} player={null} side={side} index={i} winner={winnerState} />))}</div>
      {(won || lost) && (<motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 0.6, delay: 0.5 }} className={`mt-4 sm:mt-6 h-px w-full origin-${side === 'right' ? 'right' : 'left'}`} style={{ background: won ? 'linear-gradient(to right, #22c55e, transparent)' : 'linear-gradient(to right, transparent, #ef444430)' }} />)}
    </div>
  );
};

const CenterClash = ({ match, isLive, isCompleted, teamAWon, teamBWon, }: { match: ScheduleMatch; isLive: boolean; isCompleted: boolean; teamAWon: boolean; teamBWon: boolean; }) => {
  const hasScore = isLive || isCompleted;
  const cfg = STATUS_CFG[match.status];
  return (
    <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }} className="flex flex-col items-center justify-center gap-2 shrink-0 z-10 relative px-2">
      {hasScore ? (
        <div className="flex items-center gap-1.5 sm:gap-3">
          <motion.span key={match.scoreA} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="font-black tabular-nums leading-none" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: isCompleted ? (teamAWon ? '#22c55e' : '#ef444460') : '#ffffff', textShadow: teamAWon && isCompleted ? '0 0 30px #22c55e80' : 'none' }}>{match.scoreA}</motion.span>
          <div className="flex flex-col items-center gap-0.5"><div className="w-px h-3 bg-white/15" /><span className="text-white/20 text-xs font-light">:</span><div className="w-px h-3 bg-white/15" /></div>
          <motion.span key={match.scoreB} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="font-black tabular-nums leading-none" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: isCompleted ? (teamBWon ? '#22c55e' : '#ef444460') : '#ffffff', textShadow: teamBWon && isCompleted ? '0 0 30px #22c55e80' : 'none' }}>{match.scoreB}</motion.span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <motion.div animate={isLive ? { rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] } : {}} transition={{ duration: 3, repeat: Infinity }}><Swords size={28} className="text-white/30" /></motion.div>
          <span className="text-white/20 text-xs font-black tracking-[0.3em] uppercase">VS</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black tracking-widest uppercase" style={{ color: cfg.color, borderColor: cfg.color + '40', background: cfg.color + '12' }}>{isLive && <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: cfg.color }} /><span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: cfg.color }} /></span>}{cfg.label}</div>
      {isLive && match.elapsed && <span className="text-red-400/80 text-[11px] font-mono font-bold">{match.elapsed}</span>}
      {isCompleted && (teamAWon || teamBWon) && <span className="text-emerald-400/50 text-[9px] font-black tracking-[0.3em] uppercase">Final</span>}
    </motion.div>
  );
};

export const StartingFiveModal = ({ match, teamAPlayers, teamBPlayers, loading, onClose, }: { match: ScheduleMatch; teamAPlayers: PlayerData[]; teamBPlayers: PlayerData[]; loading: boolean; onClose: () => void; }) => {
  const isCompleted = match.status === 'COMPLETED';
  const isLive = match.status === 'LIVE';
  const teamAWon = isCompleted && match.scoreA > match.scoreB;
  const teamBWon = isCompleted && match.scoreB > match.scoreA;
  useEffect(() => { const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [onClose]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" style={{ background: 'rgba(0,0,0,0.88)' }} onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-4xl rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(160deg, #0d0d14 0%, #0a0a10 50%, #0d0d14 100%)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)' }}>

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0" style={{ background: isCompleted && teamAWon ? 'linear-gradient(105deg, rgba(34,197,94,0.06) 0%, transparent 50%)' : isCompleted && teamBWon ? 'linear-gradient(105deg, rgba(239,68,68,0.04) 0%, transparent 50%)' : isLive ? 'linear-gradient(105deg, rgba(239,68,68,0.04) 0%, transparent 50%)' : 'linear-gradient(105deg, rgba(255,255,255,0.02) 0%, transparent 50%)' }} />
          <div className="absolute inset-0" style={{ background: isCompleted && teamBWon ? 'linear-gradient(255deg, rgba(34,197,94,0.06) 0%, transparent 50%)' : isCompleted && teamAWon ? 'linear-gradient(255deg, rgba(239,68,68,0.04) 0%, transparent 50%)' : isLive ? 'linear-gradient(255deg, rgba(239,68,68,0.04) 0%, transparent 50%)' : 'linear-gradient(255deg, rgba(255,255,255,0.02) 0%, transparent 50%)' }} />
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.05) 70%, transparent)' }} />
          <div className="absolute inset-y-0" style={{ left: '50%', width: '120px', transform: 'translateX(-50%) skewX(-8deg)', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.015), transparent)' }} />
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '200px 200px' }} />
        </div>

        <div className="relative px-5 py-3 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>
          <div className="flex items-center gap-2.5"><Shield size={13} className="text-white/25" /><span className="text-white/40 text-[11px] font-bold tracking-widest uppercase">{match.stage}</span></div>
          <div className="flex items-center gap-2"><span className="text-white/20 text-[10px] font-mono">{match.time}</span><button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')} onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}><X size={14} className="text-white/40" /></button></div>
        </div>

        <div className="relative p-4 sm:p-6 lg:p-8">
          {loading ? (<div className="flex items-center justify-center py-20"><motion.div className="w-10 h-10 rounded-full border-2 border-t-transparent" style={{ borderColor: 'rgba(232,160,0,0.3)', borderTopColor: '#e8a000' }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} /></div>) : (
            <div className="flex items-center gap-3 sm:gap-6 lg:gap-8">
              <TeamPanel team={match.teamA} players={teamAPlayers} side="left" won={teamAWon} lost={teamBWon} />
              <CenterClash match={match} isLive={isLive} isCompleted={isCompleted} teamAWon={teamAWon} teamBWon={teamBWon} />
              <TeamPanel team={match.teamB} players={teamBPlayers} side="right" won={teamBWon} lost={teamAWon} />
            </div>
          )}
        </div>

        <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 pointer-events-none" style={{ background: isLive ? 'linear-gradient(to right, transparent, #ef4444, transparent)' : isCompleted ? 'linear-gradient(to right, transparent, #22c55e, transparent)' : 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)', opacity: isLive ? undefined : 0.7 }} animate={isLive ? { opacity: [0.4, 1, 0.4] } : {}} transition={isLive ? { duration: 2, repeat: Infinity } : {}} />
      </motion.div>
    </motion.div>
  );
};

export default StartingFiveModal;
