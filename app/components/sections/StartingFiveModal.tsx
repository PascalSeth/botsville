'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import {
  X, Crown, Swords, Users, Shield, ChevronLeft, ChevronRight,
  Axe, Zap, Coins, ArrowLeft, Crosshair, Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ========================================================= */
/*  TYPES                                                    */
/* ========================================================= */
type MatchTeam = { id?: string; name: string; tag: string; logo: string | null };
type PlayerData = {
  id: string; ign: string; role: string; photo: string | null;
  isSubstitute: boolean; user?: { photo: string | null };
  stats?: { kda?: string; winRate?: number; mvpCount?: number };
};
type ScheduleMatch = {
  id: string; time: string; elapsed: string | null;
  teamA: MatchTeam; teamB: MatchTeam;
  status: 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'FORFEITED' | 'DISPUTED';
  scoreA: number; scoreB: number; stage: string;
  flyerUrl?: string | null; flyerType?: string | null;
  streamUrl?: string | null;
};

/* ========================================================= */
/*  CINEMATIC PALETTE — Desaturated, film-like                 */
/* ========================================================= */
const ROLE_ICON_MAP: Record<string, React.ElementType> = {
  EXP: Crosshair, JUNGLE: Axe, MID: Zap, ROAM: Shield, GOLD: Coins,
};
const ROLE_COLORS: Record<string, string> = {
  JUNGLE: '#8a9a5b', MID: '#6b8e9f', GOLD: '#b8956a', EXP: '#9b6b7a', ROAM: '#7a6b8e',
};
const ROLE_LABEL: Record<string, string> = {
  JUNGLE: 'Jungler', MID: 'Mid Laner', GOLD: 'Gold Laner', EXP: 'Exp Laner', ROAM: 'Roamer',
};
const TEAM_A_COLOR = '#c9a96e'; // aged gold
const TEAM_B_COLOR = '#8a9aaa'; // steel blue-grey

const getPhoto = (p: PlayerData | null) => p?.photo || p?.user?.photo || null;
const getRoleColor = (role: string) => ROLE_COLORS[role?.toUpperCase()] || '#a0a0a0';

const RoleIcon = ({ role, size = 12 }: { role: string; size?: number }) => {
  const Icon = ROLE_ICON_MAP[role?.toUpperCase()] || Users;
  return <Icon size={size} strokeWidth={2} />;
};

/* ========================================================= */
/*  FILM GRAIN OVERLAY — Subtle organic texture                */
/* ========================================================= */
const FilmGrain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let animId: number;
    const animate = () => {
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const val = Math.random() * 255;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        data[i + 3] = 8; // very subtle
      }
      ctx.putImageData(imageData, 0, 0);
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-50"
      style={{ opacity: 0.4, mixBlendMode: 'overlay' }}
    />
  );
};

/* ========================================================= */
/*  VIGNETTE — Heavy cinematic darkening at edges              */
/* ========================================================= */
const Vignette = () => (
  <div
    className="absolute inset-0 pointer-events-none z-40"
    style={{
      background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
    }}
  />
);

/* ========================================================= */
/*  DUST MOTES — Slow floating particles in light beams        */
/* ========================================================= */
const DustMotes = ({ color = '#c9a96e' }: { color?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motesRef = useRef<Array<{
    x: number; y: number; vx: number; vy: number; size: number; alpha: number; twinkle: number;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 40; i++) {
      motesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -Math.random() * 0.2 - 0.05,
        size: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.3 + 0.05,
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      motesRef.current.forEach((m) => {
        m.x += m.vx;
        m.y += m.vy;
        m.twinkle += 0.02;
        const flicker = 0.5 + Math.sin(m.twinkle) * 0.5;
        const a = m.alpha * flicker;

        if (m.y < -5) {
          m.x = Math.random() * canvas.width;
          m.y = canvas.height + 5;
        }

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.floor(a * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [color]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.7 }} />;
};

/* ========================================================= */
/*  FLYER BACKDROP — Cinematic, desaturated, moody             */
/* ========================================================= */
const FlyerBackground = ({
  flyerUrl, flyerType, teamAColor, teamBColor, isLive,
}: {
  flyerUrl: string; flyerType: string; teamAColor: string; teamBColor: string; isLive: boolean;
}) => (
  <div className="absolute inset-0 z-0 overflow-hidden bg-[#0a0a0a]">
    {/* Base image — heavily desaturated */}
    <div className="absolute inset-0" style={{ opacity: 0.06, filter: 'saturate(0.2) contrast(1.2)' }}>
      {flyerType === 'VIDEO' ? (
        <video src={flyerUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
      ) : (
        <Image src={flyerUrl} alt="Match Flyer" fill className="object-cover object-center" priority />
      )}
    </div>

    {/* Heavy blur */}
    <div className="absolute inset-0 backdrop-blur-[4px]" />

    {/* Atmospheric color zones — very subtle */}
    <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 0% 50%, ${teamAColor}08 0%, transparent 60%)` }} />
    <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 100% 50%, ${teamBColor}08 0%, transparent 60%)` }} />

    {/* Deep bottom fade */}
    <div className="absolute bottom-0 left-0 right-0 h-5/6" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.98) 0%, rgba(10,10,10,0.7) 40%, rgba(10,10,10,0.2) 75%, transparent 100%)' }} />

    {/* Top dark gradient */}
    <div className="absolute top-0 left-0 right-0 h-1/3" style={{ background: 'linear-gradient(to bottom, rgba(10,10,10,0.7) 0%, transparent 100%)' }} />

    {/* Live subtle pulse */}
    {isLive && (
      <motion.div className="absolute inset-0 pointer-events-none" animate={{ opacity: [0, 0.05, 0] }} transition={{ duration: 4, repeat: Infinity }} style={{ background: 'radial-gradient(ellipse at center, rgba(200,50,50,0.2), transparent 70%)' }} />
    )}
  </div>
);

/* ========================================================= */
/*  PLAYER CARD — Minimal, dark, elegant                       */
/* ========================================================= */
const PlayerCard = ({
  player, teamColor, isWinner, isLoser, side, onClick, index,
}: {
  player: PlayerData; teamColor: string; isWinner: boolean; isLoser: boolean;
  side: 'left' | 'right'; onClick: () => void; index: number;
}) => {
  const photo = getPhoto(player);
  const roleColor = getRoleColor(player.role);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative cursor-pointer"
      onClick={onClick}
    >
      <div
        className={`relative flex items-center gap-3 rounded-xl p-3 transition-all duration-500 ${side === 'right' ? 'flex-row-reverse' : ''}`}
        style={{
          background: isLoser ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isWinner ? teamColor + '30' : 'rgba(255,255,255,0.04)'}`,
          opacity: isLoser ? 0.35 : 1,
        }}
      >
        {/* Hover state */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: `linear-gradient(135deg, ${teamColor}08, transparent 60%)` }} />

        {/* Photo — simple square with thin border */}
        <div className="relative flex-shrink-0 overflow-hidden rounded-lg" style={{ width: 48, height: 60, border: `1px solid ${isWinner ? teamColor + '40' : 'rgba(255,255,255,0.06)'}` }}>
          {photo ? (
            <Image src={photo} alt={player.ign} fill className="object-cover object-top grayscale-[30%] group-hover:grayscale-0 transition-all duration-700" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Users size={16} style={{ color: 'rgba(255,255,255,0.15)' }} />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-4 flex items-center justify-center" style={{ background: roleColor + '90' }}>
            <RoleIcon role={player.role} size={7} />
          </div>
        </div>

        {/* Info */}
        <div className={`flex-1 min-w-0 ${side === 'right' ? 'text-right' : ''}`}>
          <p className="text-[11px] font-semibold uppercase leading-none tracking-wide truncate" style={{ color: isWinner ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>
            {player.ign}
          </p>
          <p className="text-[8px] font-medium uppercase tracking-[0.15em] mt-1.5" style={{ color: roleColor + 'bb' }}>
            {ROLE_LABEL[player.role?.toUpperCase()] || player.role}
          </p>
          {player.isSubstitute && (
            <span className="text-[7px] font-medium uppercase tracking-[0.2em] mt-0.5 inline-block" style={{ color: 'rgba(255,255,255,0.2)' }}>
              substitute
            </span>
          )}
        </div>

        {/* Winner crown — minimal */}
        {isWinner && (
          <div className="flex-shrink-0 opacity-60">
            <Crown size={10} fill="#c9a96e" className="text-[#c9a96e]" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ========================================================= */
/*  PLAYER SPOTLIGHT — Full-bleed, dark, atmospheric           */
/* ========================================================= */
const PlayerSpotlight = ({
  player, team, teamColor, isWinner, isLoser, onClose, onPrev, onNext, total, index,
}: {
  player: PlayerData; team: MatchTeam; teamColor: string;
  isWinner: boolean; isLoser: boolean;
  onClose: () => void; onPrev: () => void; onNext: () => void;
  total: number; index: number;
}) => {
  const photo = getPhoto(player);
  const roleColor = getRoleColor(player.role);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 z-30 overflow-hidden rounded-2xl"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={player.id}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
        >
          {photo ? (
            <Image src={photo} alt={player.ign} fill className="object-cover object-top" style={{ filter: 'saturate(0.7) contrast(1.1)' }} priority />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: `radial-gradient(circle, ${teamColor}10, #0a0a0a 70%)` }}>
              <Users size={80} style={{ color: `${teamColor}15` }} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Deep cinematic gradients */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.5) 40%, rgba(10,10,10,0.1) 70%, transparent 100%)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${teamColor}10, transparent 35%)` }} />
      {isLoser && <div className="absolute inset-0 bg-black/40 pointer-events-none" />}
      {isWinner && (
        <motion.div className="absolute inset-0 pointer-events-none" animate={{ opacity: [0, 0.08, 0] }} transition={{ duration: 4, repeat: Infinity }} style={{ background: `radial-gradient(ellipse at center 85%, ${teamColor}40, transparent 50%)` }} />
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-5">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/50 hover:text-white transition-colors duration-300"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <ArrowLeft size={12} />
          <span className="text-[9px] font-medium uppercase tracking-[0.15em]">Back</span>
        </button>

        <div className="flex items-center gap-2">
          {team.logo && (
            <div className="w-6 h-6 rounded overflow-hidden border border-white/10 opacity-60">
              <Image src={team.logo} alt={team.name} width={24} height={24} className="object-cover" />
            </div>
          )}
          <span className="text-[9px] font-medium uppercase tracking-[0.15em]" style={{ color: teamColor + 'aa' }}>{team.name}</span>
        </div>
      </div>

      {/* Navigation */}
      {total > 1 && (
        <>
          <button onClick={onPrev} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 transition-colors duration-300" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={onNext} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 transition-colors duration-300" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md" style={{ background: roleColor + '40', backdropFilter: 'blur(8px)', border: `1px solid ${roleColor}30` }}>
            <RoleIcon role={player.role} size={10} />
            <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-white/80">{ROLE_LABEL[player.role?.toUpperCase()] || player.role}</span>
          </div>
          {isWinner && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md" style={{ background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.2)' }}>
              <Crown size={9} fill="#c9a96e" className="text-[#c9a96e]" />
              <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-[#c9a96e]">Victory</span>
            </div>
          )}
          {player.isSubstitute && (
            <span className="px-3 py-1.5 rounded-md text-[9px] font-medium uppercase tracking-[0.15em]" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>Substitute</span>
          )}
        </div>

        <h2 className="font-light uppercase leading-none mb-4" style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', letterSpacing: '-0.02em', color: isLoser ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.95)', textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
          {player.ign}
        </h2>

        {/* Stats */}
        {player.stats && (
          <div className="flex items-center gap-5 mb-4">
            {player.stats.kda && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[7px] font-medium uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.25)' }}>KDA</span>
                <span className="text-[13px] font-light" style={{ color: roleColor }}>{player.stats.kda}</span>
              </div>
            )}
            {player.stats.winRate && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[7px] font-medium uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.25)' }}>Win Rate</span>
                <span className="text-[13px] font-light" style={{ color: roleColor }}>{player.stats.winRate}%</span>
              </div>
            )}
            {player.stats.mvpCount && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[7px] font-medium uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.25)' }}>MVP</span>
                <span className="text-[13px] font-light" style={{ color: roleColor }}>{player.stats.mvpCount}</span>
              </div>
            )}
          </div>
        )}

        {/* Dot nav */}
        {total > 1 && (
          <div className="flex items-center gap-2">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className="rounded-full transition-all duration-500" style={{ width: i === index ? 16 : 4, height: 4, background: i === index ? teamColor : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ========================================================= */
/*  TEAM PANEL — Dark glass, minimal, atmospheric              */
/* ========================================================= */
const TeamPanel = ({
  team, players, teamColor, isWinner, isLoser, side, loading,
}: {
  team: MatchTeam; players: PlayerData[]; teamColor: string;
  isWinner: boolean; isLoser: boolean; side: 'left' | 'right'; loading: boolean;
}) => {
  const starters = players.filter(p => !p.isSubstitute).slice(0, 5);
  const subs = players.filter(p => p.isSubstitute).slice(0, 2);
  const all = [...starters, ...subs];
  const [spotlightIdx, setSpotlightIdx] = useState<number | null>(null);
  const current = spotlightIdx !== null ? all[spotlightIdx] : null;

  return (
    <div className="relative flex-1 min-w-0 flex flex-col overflow-hidden rounded-2xl" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${isWinner ? teamColor + '25' : 'rgba(255,255,255,0.04)'}`, backdropFilter: 'blur(24px) saturate(0.8)' }}>
      <DustMotes color={teamColor} />

      {/* Team header */}
      <div className={`relative flex items-center gap-3 p-4 border-b ${side === 'right' ? 'flex-row-reverse' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {team.logo ? (
          <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 opacity-70" style={{ border: `1px solid ${isWinner ? teamColor + '30' : 'rgba(255,255,255,0.06)'}` }}>
            <Image src={team.logo} alt={team.name} fill className="object-cover" style={{ filter: 'saturate(0.5)' }} />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[9px] font-medium flex-shrink-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
            {team.tag.slice(0, 3)}
          </div>
        )}

        <div className={`flex-1 min-w-0 ${side === 'right' ? 'text-right' : ''}`}>
          <p className="text-[12px] font-medium uppercase truncate leading-none tracking-wide" style={{ color: isLoser ? 'rgba(255,255,255,0.2)' : isWinner ? teamColor : 'rgba(255,255,255,0.85)', letterSpacing: '0.04em' }}>
            {team.name}
          </p>
          <p className="text-[7px] font-medium uppercase tracking-[0.2em] mt-1" style={{ color: isWinner ? teamColor + '80' : 'rgba(255,255,255,0.15)' }}>
            {isWinner ? 'Victory' : isLoser ? 'Defeat' : team.tag}
          </p>
        </div>

        {isWinner && (
          <div className="flex-shrink-0 opacity-50">
            <Crown size={12} fill="#c9a96e" className="text-[#c9a96e]" />
          </div>
        )}
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: 'none' }}>
        {loading ? (
          [0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.02)', animationDelay: `${i * 0.1}s` }} />
          ))
        ) : starters.length > 0 ? (
          <>
            {starters.map((p, i) => (
              <PlayerCard key={p.id} player={p} teamColor={teamColor} isWinner={isWinner} isLoser={isLoser} side={side} index={i} onClick={() => setSpotlightIdx(i)} />
            ))}
            {subs.length > 0 && (
              <>
                <div className="flex items-center gap-3 py-2">
                  <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.03)' }} />
                  <span className="text-[7px] font-medium uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.12)' }}>Subs</span>
                  <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.03)' }} />
                </div>
                {subs.map((p, i) => (
                  <PlayerCard key={p.id} player={p} teamColor={teamColor} isWinner={isWinner} isLoser={isLoser} side={side} index={starters.length + i} onClick={() => setSpotlightIdx(starters.length + i)} />
                ))}
              </>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-10 gap-3">
            <Shield size={24} style={{ color: 'rgba(255,255,255,0.06)' }} />
            <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-center" style={{ color: 'rgba(255,255,255,0.1)' }}>No roster data</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {current && (
          <PlayerSpotlight
            player={current} team={team} teamColor={teamColor}
            isWinner={isWinner} isLoser={isLoser}
            onClose={() => setSpotlightIdx(null)}
            onPrev={() => setSpotlightIdx(i => i !== null ? (i - 1 + all.length) % all.length : 0)}
            onNext={() => setSpotlightIdx(i => i !== null ? (i + 1) % all.length : 0)}
            total={all.length} index={spotlightIdx!}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ========================================================= */
/*  CENTER CLASH — Minimal score, elegant typography           */
/* ========================================================= */
const CenterClash = ({
  match, isLive, isCompleted, teamAWon, teamBWon, onWatchLive,
}: {
  match: ScheduleMatch; isLive: boolean; isCompleted: boolean;
  teamAWon: boolean; teamBWon: boolean; onWatchLive: () => void;
}) => (
  <div className="flex flex-col items-center justify-center gap-4 px-4 sm:px-6 flex-shrink-0 z-10 py-4">
    <span className="text-[7px] font-medium uppercase tracking-[0.3em] text-white/20 text-center">
      {match.stage}
    </span>

    {isCompleted || isLive ? (
      <div className="flex items-center gap-3 sm:gap-5">
        <span className="font-light tabular-nums leading-none" style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', color: teamAWon ? TEAM_A_COLOR : isCompleted ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.7)' }}>
          {match.scoreA}
        </span>
        <span className="text-white/10 font-extralight" style={{ fontSize: '1.2rem' }}>:</span>
        <span className="font-light tabular-nums leading-none" style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', color: teamBWon ? TEAM_B_COLOR : isCompleted ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.7)' }}>
          {match.scoreB}
        </span>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-2">
        <div className="w-px h-8 bg-white/5" />
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Swords size={14} className="text-white/15" />
        </div>
        <div className="w-px h-8 bg-white/5" />
      </div>
    )}

    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[8px] font-medium uppercase tracking-[0.2em] ${isLive
      ? 'border border-red-900/30 text-red-400/60'
      : isCompleted
        ? 'border border-white/5 text-white/20'
        : 'border border-white/5 text-white/30'
      }`} style={{ background: isLive ? 'rgba(150,30,30,0.08)' : 'rgba(255,255,255,0.02)' }}>
      {isLive && <span className="w-1 h-1 rounded-full bg-red-500/60 animate-pulse" />}
      {isLive ? 'Live' : isCompleted ? 'Final' : match.time}
    </div>

    {match.streamUrl && (
      <button
        onClick={onWatchLive}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/30 text-red-400 border border-red-500/20 rounded-full text-[8px] font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:scale-105 active:scale-95 cursor-pointer"
      >
        <Radio size={10} className="animate-pulse" />
        Watch Live
      </button>
    )}

    <div className="w-px h-16 bg-white/3" />
  </div>
);

/* ========================================================= */
/*  MOBILE CAROUSEL — Swipeable, dark, cinematic               */
/* ========================================================= */
const MobilePlayerCarousel = ({
  match, teamAPlayers, teamBPlayers, isCompleted, teamAWon, teamBWon, loading,
}: {
  match: ScheduleMatch; teamAPlayers: PlayerData[]; teamBPlayers: PlayerData[];
  isCompleted: boolean; teamAWon: boolean; teamBWon: boolean; loading: boolean;
}) => {
  const allPlayers = [
    ...teamAPlayers.filter(p => !p.isSubstitute).slice(0, 5).map(p => ({ ...p, side: 'A' as const })),
    ...teamBPlayers.filter(p => !p.isSubstitute).slice(0, 5).map(p => ({ ...p, side: 'B' as const })),
  ];
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const total = allPlayers.length;

  const current = allPlayers[idx];
  const teamColor = current?.side === 'A' ? TEAM_A_COLOR : TEAM_B_COLOR;
  const photo = current ? getPhoto(current) : null;
  const isWinner = isCompleted && ((current?.side === 'A' && teamAWon) || (current?.side === 'B' && teamBWon));
  const isLoser = isCompleted && !isWinner && (teamAWon || teamBWon);

  useEffect(() => {
    if (total <= 1 || loading) return;
    const iv = setInterval(() => setIdx(i => (i + 1) % total), 5000);
    return () => clearInterval(iv);
  }, [loading, total]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center gap-3">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="w-10 h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col flex-1 min-h-0" style={{ maxHeight: 660 }}>
      <div
        className="relative flex-1 min-h-0 overflow-hidden"
        onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (!touchStartX.current) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 40) {
            if (dx < 0) setIdx(i => (i + 1) % total);
            else setIdx(i => (i - 1 + total) % total);
          }
          touchStartX.current = null;
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`mob-${idx}`}
            className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.5, ease: [0.43, 0.13, 0.23, 0.96] }}
          >
            {photo ? (
              <Image src={photo} alt={current?.ign ?? ''} fill className="object-cover object-top" style={{ filter: 'saturate(0.6) contrast(1.1)' }} priority />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: `radial-gradient(circle, ${teamColor}10, transparent 70%)` }}>
                <Users size={56} style={{ color: `${teamColor}15` }} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.3) 50%, transparent 80%)' }} />
        {isLoser && <div className="absolute inset-0 bg-black/40" />}

        <button onClick={() => setIdx(i => (i - 1 + total) % total)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white/20 hover:text-white/40 transition-colors" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <ChevronLeft size={14} />
        </button>
        <button onClick={() => setIdx(i => (i + 1) % total)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white/20 hover:text-white/40 transition-colors" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="relative z-10 px-5 pb-5 pt-3 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[9px] font-medium uppercase tracking-[0.15em]" style={{ color: TEAM_A_COLOR + 'aa' }}>{match.teamA.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-light tabular-nums" style={{ color: teamAWon ? TEAM_A_COLOR : 'rgba(255,255,255,0.2)' }}>{match.scoreA}</span>
            <span className="text-white/8">:</span>
            <span className="text-lg font-light tabular-nums" style={{ color: teamBWon ? TEAM_B_COLOR : 'rgba(255,255,255,0.2)' }}>{match.scoreB}</span>
          </div>
          <span className="text-[9px] font-medium uppercase tracking-[0.15em]" style={{ color: TEAM_B_COLOR + 'aa' }}>{match.teamB.name}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={`name-${idx}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            {current && (
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="font-light uppercase leading-none" style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', color: isLoser ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.9)', letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                    {current.ign}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ background: getRoleColor(current.role) + '30', border: `1px solid ${getRoleColor(current.role)}20` }}>
                      <RoleIcon role={current.role} size={8} />
                      <span className="text-[8px] font-medium text-white/60 uppercase tracking-wider">{ROLE_LABEL[current.role?.toUpperCase()] || current.role}</span>
                    </div>
                    <span className="text-[8px] font-medium uppercase tracking-wider" style={{ color: teamColor + '80' }}>{current.side === 'A' ? match.teamA.tag : match.teamB.tag}</span>
                    {isWinner && <Crown size={12} fill="#c9a96e" className="text-[#c9a96e] opacity-50" />}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end max-w-[80px]">
                  {allPlayers.map((_, i) => (
                    <div key={i} className="rounded-full cursor-pointer transition-all duration-500" onClick={() => setIdx(i)} style={{ width: i === idx ? 14 : 4, height: 4, background: i === idx ? teamColor : 'rgba(255,255,255,0.1)' }} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

function getEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // YouTube matches:
  // - https://www.youtube.com/watch?v=dQw4w9WgXcQ
  // - https://youtu.be/dQw4w9WgXcQ
  // - https://www.youtube.com/embed/dQw4w9WgXcQ
  // - https://www.youtube.com/live/dQw4w9WgXcQ
  let match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1`;
  }

  // Twitch match:
  // - https://www.twitch.tv/ninja
  match = url.match(/twitch\.tv\/([a-z0-9_]+)/i);
  if (match && match[1]) {
    return `https://player.twitch.tv/?channel=${match[1]}&parent=${typeof window !== "undefined" ? window.location.hostname : "localhost"}&muted=true&autoplay=true`;
  }

  return null;
}

/* ========================================================= */
/*  MAIN EXPORT — Cinematic Starting Five Modal                  */
/* ========================================================= */
export const StartingFiveModal: React.FC<{
  match: ScheduleMatch;
  teamAPlayers: PlayerData[];
  teamBPlayers: PlayerData[];
  loading: boolean;
  onClose: () => void;
}> = ({ match, teamAPlayers, teamBPlayers, loading, onClose }) => {
  const isCompleted = match.status === 'COMPLETED';
  const isLive = match.status === 'LIVE';
  const teamAWon = isCompleted && match.scoreA > match.scoreB;
  const teamBWon = isCompleted && match.scoreB > match.scoreA;
  const hasFlyer = Boolean(match.flyerUrl);

  const [showStream, setShowStream] = useState(() => isLive && !!match.streamUrl);
  const embedUrl = getEmbedUrl(match.streamUrl);


  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 lg:p-8"
      style={{ zIndex: 9999, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(16px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full overflow-hidden flex flex-col"
        style={{
          maxWidth: 1000,
          maxHeight: 'calc(100dvh - 1.5rem)',
          background: hasFlyer ? 'transparent' : '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.04)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.02), 0 40px 120px rgba(0,0,0,0.95)',
          borderRadius: 16,
        }}
      >
        <div className="relative flex flex-col flex-1 min-h-0" style={{ borderRadius: 'inherit', overflow: 'hidden' }}>
          <FilmGrain />
          <Vignette />

          {hasFlyer && (
            <FlyerBackground
              flyerUrl={match.flyerUrl!}
              flyerType={match.flyerType || 'IMAGE'}
              teamAColor={TEAM_A_COLOR}
              teamBColor={TEAM_B_COLOR}
              isLive={isLive}
            />
          )}

          {!hasFlyer && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute" style={{ left: 0, top: 0, width: '50%', height: '100%', background: `radial-gradient(ellipse at left, ${TEAM_A_COLOR}06, transparent 70%)` }} />
              <div className="absolute" style={{ right: 0, top: 0, width: '50%', height: '100%', background: `radial-gradient(ellipse at right, ${TEAM_B_COLOR}06, transparent 70%)` }} />
              {isLive && (
                <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(to right, transparent, rgba(200,50,50,0.3), transparent)' }} />
              )}
            </div>
          )}

          {/* Top bar */}
          <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center gap-2 sm:gap-3">
              <Shield size={11} style={{ color: 'rgba(255,255,255,0.15)' }} />
              <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.2em] text-white/25">Starting Five</span>
              {isLive && (
                <span className="flex items-center gap-2 text-[8px] sm:text-[9px] font-medium text-red-400/60 tracking-wider">
                  <span className="w-1 h-1 rounded-full bg-red-500/60 animate-pulse" />
                  Live
                </span>
              )}
              {hasFlyer && (
                <span className="text-[6px] sm:text-[7px] font-medium uppercase tracking-[0.15em] px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.15)' }}>
                  {match.flyerType === 'VIDEO' ? 'Video' : 'Poster'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {match.streamUrl && (
                <div className="flex items-center bg-black/40 border border-white/5 rounded-full p-0.5 mr-1 sm:mr-2">
                  <button
                    onClick={() => setShowStream(false)}
                    className={`px-2.5 sm:px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${!showStream ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                      }`}
                  >
                    Lineups
                  </button>
                  <button
                    onClick={() => setShowStream(true)}
                    className={`px-2.5 sm:px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1 ${showStream ? "bg-red-500/20 text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "text-white/40 hover:text-white/70"
                      }`}
                  >
                    <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                    Watch Live
                  </button>
                </div>
              )}
              <span className="hidden sm:block text-[9px] font-mono text-white/10">{match.time}</span>
              <button
                onClick={onClose}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors duration-300 hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <X size={12} className="sm:w-[13px] sm:h-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            </div>
          </div>

          {/* Mobile */}
          <div className="sm:hidden relative z-10 flex flex-col flex-1 min-h-0" style={{ minHeight: 500 }}>
            {showStream && embedUrl ? (
              <div className="p-3 flex flex-col items-center justify-center flex-1 min-h-0 gap-3">
                <div className="w-full aspect-video rounded-xl overflow-hidden border border-red-500/20 relative">
                  <iframe
                    src={embedUrl}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
                <a
                  href={match.streamUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-red-600 text-white text-center rounded-xl text-xs font-black uppercase tracking-widest shadow-lg"
                >
                  Open Stream App
                </a>
                <button
                  onClick={() => setShowStream(false)}
                  className="text-[10px] text-white/40 font-bold uppercase tracking-wider"
                >
                  Return to Lineups
                </button>
              </div>
            ) : showStream && !embedUrl ? (
              <div className="p-4 flex flex-col items-center justify-center text-center flex-1 min-h-0 gap-3">
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
                  <Swords size={20} />
                </div>
                <h4 className="text-sm font-black uppercase tracking-widest text-white">External Stream link</h4>
                <p className="text-[10px] text-white/40">The broadcast for this match is hosted on an external platform.</p>
                <a
                  href={match.streamUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-red-600 text-white text-center rounded-xl text-xs font-black uppercase tracking-widest shadow-lg"
                >
                  Open Stream Link
                </a>
                <button
                  onClick={() => setShowStream(false)}
                  className="text-[10px] text-white/40 font-bold uppercase tracking-wider"
                >
                  Return to Lineups
                </button>
              </div>
            ) : (
              <MobilePlayerCarousel
                match={match}
                teamAPlayers={teamAPlayers}
                teamBPlayers={teamBPlayers}
                isCompleted={isCompleted}
                teamAWon={teamAWon}
                teamBWon={teamBWon}
                loading={loading}
              />
            )}
          </div>

          {/* Desktop */}
          <div className="hidden sm:flex flex-col relative z-10 flex-1 min-h-0" style={{ minHeight: 440, maxHeight: 580 }}>
            {showStream && embedUrl ? (
              <div className="flex-1 p-5 flex flex-col items-center justify-center">
                <div className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.15)] relative">
                  <iframe
                    src={embedUrl}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
                <div className="mt-3 flex items-center gap-4 text-[10px] uppercase font-bold text-white/40 tracking-wider">
                  <span>Streaming via External Broadcaster</span>
                  <span>•</span>
                  <a
                    href={match.streamUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#e8a000] hover:underline animate-pulse"
                  >
                    Open in new window
                  </a>
                </div>
              </div>
            ) : showStream && !embedUrl ? (
              <div className="flex-1 p-5 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 animate-pulse mb-4">
                  <Swords size={32} />
                </div>
                <h4 className="text-lg font-black uppercase tracking-widest text-white mb-2">Live Broadcast Ready</h4>
                <p className="text-xs text-white/50 max-w-md mb-6">This stream is hosted externally. Click below to tune in live and cheer for your team!</p>
                <a
                  href={match.streamUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:scale-105 active:scale-95"
                >
                  Join Stream Channel
                </a>
              </div>
            ) : (
              <div className="flex flex-1 min-h-0 gap-4 p-5">
                <TeamPanel
                  team={match.teamA} players={teamAPlayers} teamColor={TEAM_A_COLOR}
                  isWinner={teamAWon} isLoser={teamBWon} side="left" loading={loading}
                />
                <CenterClash
                  match={match} isLive={isLive} isCompleted={isCompleted}
                  teamAWon={teamAWon} teamBWon={teamBWon}
                  onWatchLive={() => setShowStream(true)}
                />
                <TeamPanel
                  team={match.teamB} players={teamBPlayers} teamColor={TEAM_B_COLOR}
                  isWinner={teamBWon} isLoser={teamAWon} side="right" loading={loading}
                />
              </div>
            )}

            <div className="h-px flex-shrink-0" style={{
              background: isLive
                ? 'linear-gradient(to right, transparent, rgba(200,50,50,0.2), transparent)'
                : isCompleted
                  ? `linear-gradient(to right, ${TEAM_A_COLOR}30, transparent 40%, transparent 60%, ${TEAM_B_COLOR}30)`
                  : 'linear-gradient(to right, transparent, rgba(255,255,255,0.03), transparent)',
            }} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StartingFiveModal;