'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Swords, Star, Target, Wind, Trophy, Search, X, MapPin, Users, ChevronRight, Crown, Loader2, AlertTriangle, CheckCircle2, MessageSquare, Send, ArrowRight, Clock } from 'lucide-react';
import { useHero } from '@/app/contexts/HeroContext';




// ── Role system ─────────────────────────────────────────────
const ROLE_META: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  EXP:      { color: '#e8a000', icon: <Swords size={9} />,  label: 'EXP'     },
  JUNGLE:   { color: '#e84040', icon: <Zap    size={9} />,  label: 'Jungle'  },
  MID:      { color: '#9b59b6', icon: <Star   size={9} />,  label: 'Mid'     },
  GOLD:     { color: '#27ae60', icon: <Target size={9} />,  label: 'Gold'    },
  ROAM:     { color: '#4a90d9', icon: <Shield size={9} />,  label: 'Roam'    },
  // Legacy role mapping for display
  Tank:      { color: '#4a90d9', icon: <Shield size={9} />,  label: 'Tank'     },
  Fighter:   { color: '#e8a000', icon: <Swords size={9} />,  label: 'Fighter'  },
  Assassin:  { color: '#e84040', icon: <Zap    size={9} />,  label: 'Assassin' },
  Support:   { color: '#16a085', icon: <Wind   size={9} />,  label: 'Support'  },
};

const TIER_COLORS: Record<string, string> = { S: '#e8a000', A: '#4a90d9', B: '#9b59b6', C: '#555' };

// ── API Response Types ─────────────────────────────────────────────
interface ApiPlayer {
  id: string;
  ign: string;
  role: string;
  secondaryRole?: string;
  signatureHero?: string;
  photo: string | null;
  isSubstitute: boolean;
  realName?: string;
  user?: {
    id: string;
    ign: string;
    photo: string | null;
  };
}

interface ApiTeam {
  id: string;
  name: string;
  tag: string;
  logo: string | null;
  banner: string | null;
  color: string | null;
  region: string;
  status: string;
  isRecruiting?: boolean;
  trophies: string[];
  totalPrizeMoney: number;
  registeredAt: string;
  captain?: {
    id: string;
    ign: string;
    photo: string | null;
  };
  players: ApiPlayer[];
  rank: number;
  points: number;
  wins: number;
  losses: number;
  tier: string;
  _count?: {
    players: number;
  };
}

interface AvailabilityTeam {
  teamId: string;
}

interface AvailabilityPayload {
  weekStart?: string;
  ping?: {
    weekStart: string;
    scrimDate: string;
  } | null;
  availableTeams?: AvailabilityTeam[];
}

// ── Scanlines ────────────────────────────────────────────────
const Scanlines = ({ opacity = 0.03 }: { opacity?: number }) => (
  <div className="absolute inset-0 pointer-events-none z-[1]"
    style={{ opacity, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,#fff 2px,#fff 3px)', backgroundSize: '100% 3px' }} />
);

// ── Player photo card (starters + subs) ─────────────────────
const PlayerPhotoCard = ({ p, delay = 0 }: { p: ApiPlayer; delay?: number }) => {
  const rm = ROLE_META[p.role] || ROLE_META.ROAM;
  const photoUrl = p.photo || p.user?.photo || '/heroes/stun.png';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.32 }}
      className="shrink-0 flex flex-col overflow-hidden border"
      style={{
        width: 96,
        borderColor: p.isSubstitute ? `${rm.color}15` : `${rm.color}35`,
        background: 'rgba(0,0,0,0.6)',
        opacity: p.isSubstitute ? 0.72 : 1,
      }}
    >
      {/* Role colour bar */}
      <div className="h-0.5 w-full shrink-0" style={{ background: p.isSubstitute ? `${rm.color}55` : rm.color }} />

      {/* Photo */}
      <div className="relative w-full overflow-hidden bg-[#111]" style={{ aspectRatio: '3/4' }}>
        <Image
          src={photoUrl}
          alt={p.ign}
          fill
          className="object-cover object-top"
          style={{ filter: p.isSubstitute ? 'grayscale(40%) brightness(0.75)' : 'brightness(0.9)' }}
        />
        {/* bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Sub badge */}
        {p.isSubstitute && (
          <div className="absolute top-1 left-1 bg-black/75 border border-white/10 px-1 py-px">
            <span className="text-[7px] font-black tracking-widest uppercase text-[#555]">SUB</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-1.5 flex flex-col gap-0.5">
        <div className="flex items-center gap-1" style={{ color: rm.color }}>
          {rm.icon}
          <span className="text-[7px] font-black tracking-widest uppercase">{rm.label}</span>
        </div>
        <p className="text-white font-black text-[13px] leading-none uppercase truncate"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{p.ign}</p>
        <p className="text-[7px] tracking-wide truncate" style={{ color: `${rm.color}80` }}>{p.signatureHero || '—'}</p>
        <p className="text-[#2a2a2a] text-[7px] truncate">{p.realName || '—'}</p>
      </div>
    </motion.div>
  );
};

// ══════════════════════════════════════════════════════════
// PAGE HEADER
// ══════════════════════════════════════════════════════════
const PageHeader = ({ teamsCount, topTeam }: { teamsCount: number; topTeam?: ApiTeam }) => (
  <div className="relative overflow-hidden border-b border-white/[0.05]">
    <div className="absolute inset-0">
      {topTeam?.banner && (
        <Image src={topTeam.banner} alt="" fill className="object-cover brightness-[0.12]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#08080e]/95 via-[#08080e]/80 to-[#08080e]/95" />
      {topTeam?.color && (
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at left, ${topTeam.color}15, transparent 60%)` }} />
      )}
    </div>
    <Scanlines opacity={0.02} />

    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">

        {/* Title */}
        <div>
          <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-[#e8a000] text-[9px] tracking-[0.4em] uppercase font-black mb-2 flex items-center gap-2">
            <span className="w-4 h-px bg-[#e8a000]" />Ghana MLBB · Season 5
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }}
            className="text-white font-black uppercase leading-none tracking-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2.2rem, 6vw, 4rem)' }}>
            Registered<br />
            <span style={{ WebkitTextStroke: topTeam?.color ? `2px ${topTeam.color}` : '2px #e8a000', color: 'transparent' }}>Teams</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-[#444] text-sm mt-2 tracking-wide">
            {teamsCount} squads competing · IESF Africa qualifier
          </motion.p>
        </div>

        {/* Right: gif + standings */}
        <div className="flex items-end gap-4">

          {/* ── Badang gif ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none select-none shrink-0"
          >
            <Image
              src="/gif/badang.gif"
              alt="Badang"
              width={80}
              height={80}
              className="object-contain sm:w-[100px] sm:h-[100px] lg:w-[110px] lg:h-[110px]
                         drop-shadow-[0_0_28px_rgba(232,160,0,0.4)]"
              unoptimized
            />
          </motion.div>
        </div>
      </div>
    </div>
    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e8a000]/30 to-transparent" />
  </div>
);

// ══════════════════════════════════════════════════════════
// SPOTLIGHT PANEL (desktop left zone)
// ══════════════════════════════════════════════════════════
const SpotlightPanel = ({ team, userTeamId }: { team: ApiTeam; userTeamId?: string | null }) => {
  const winRate = team.wins + team.losses > 0 
    ? Math.round((team.wins / (team.wins + team.losses)) * 100) 
    : 0;
  const starters = team.players.filter(p => !p.isSubstitute);
  const subs = team.players.filter(p => p.isSubstitute);
  const teamColor = team.color || '#e8a000';
  const bannerUrl = team.banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1400&q=80';
  const logoUrl = team.logo || '/heroes/stun.png';

  return (
    <AnimatePresence mode="wait">
      <motion.div key={team.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }} className="relative w-full h-full flex flex-col overflow-hidden">

        {/* ── Banner BG ── */}
        <div className="absolute inset-0">
          <Image src={bannerUrl} alt={team.name} fill className="object-cover object-center brightness-[0.2]" />
          <div className="absolute inset-0"
            style={{ background: `radial-gradient(ellipse at bottom left, ${teamColor}45, transparent 60%)` }} />
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(125deg, ${teamColor}15, transparent 45%)` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08080e] via-[#08080e]/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#08080e]/60" />
        </div>
        <Scanlines opacity={0.02} />

        {/* Ghost rank */}
        <div className="absolute inset-0 flex items-center justify-end pr-4 pointer-events-none select-none overflow-hidden">
          <motion.span key={`ghost-${team.id}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }} className="font-black leading-none"
            style={{ fontSize: 'clamp(8rem, 20vw, 16rem)', color: `${teamColor}0b`,
                     fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '-0.05em' }}>
            #{team.rank || '—'}
          </motion.span>
        </div>

        {/* ── Scrollable content ── */}
        <div className="relative z-10 flex flex-col gap-5 h-full p-6 lg:p-8 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

          {/* Top: logo + rank + tier */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Team logo */}
            <div className="relative w-12 h-12 border-2 overflow-hidden shrink-0"
              style={{ borderColor: `${teamColor}60` }}>
              <Image src={logoUrl} alt={`${team.name} logo`} fill className="object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              {/* Fallback: show tag text if logo missing */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="font-black text-[10px] tracking-widest" style={{ color: teamColor, fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {team.tag}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-black/60 border border-white/10 px-2.5 py-1.5 flex items-center gap-2 backdrop-blur-sm">
                <span className="text-[#444] text-[8px] tracking-widest uppercase">Rank</span>
                <span className="text-white font-black text-lg font-mono leading-none">#{team.rank || '—'}</span>
              </div>
              <span className="font-black text-[10px] tracking-widest px-2.5 py-1.5"
                style={{ color: TIER_COLORS[team.tier] || TIER_COLORS.C, background: `${TIER_COLORS[team.tier] || TIER_COLORS.C}20`,
                         border: `1px solid ${TIER_COLORS[team.tier] || TIER_COLORS.C}50` }}>
                {team.tier || 'C'}-TIER
              </span>
              {team.trophies.length > 0 && (
                <div className="flex items-center gap-1.5 bg-black/50 border border-[#e8a000]/20 px-2 py-1.5">
                  <Trophy size={9} className="text-[#e8a000]" />
                  <span className="text-[#e8a000] text-[8px] font-black tracking-widest">{team.trophies.length} TROPHY</span>
                </div>
              )}
            </div>
          </div>

          {/* Team name + stats */}
          <div className="flex flex-col gap-3 shrink-0">
            <motion.div key={`name-${team.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
              <p className="text-[8px] tracking-[0.4em] uppercase font-black mb-1" style={{ color: `${teamColor}80` }}>
                <MapPin size={8} className="inline mr-1" />{team.region} · Ghana MLBB Season 5
              </p>
              <h2 className="font-black uppercase leading-none text-white"
                style={{ fontFamily: "'Barlow Condensed', sans-serif",
                         fontSize: 'clamp(1.8rem, 4.5vw, 3.6rem)', letterSpacing: '-0.02em' }}>
                {team.name}
              </h2>
              <div className="mt-2 h-0.5 w-20" style={{ background: `linear-gradient(90deg, ${teamColor}, transparent)` }} />
            </motion.div>

            <motion.div key={`stats-${team.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }} className="flex items-center gap-4 flex-wrap">
              {[
                { label: 'Wins',     val: team.wins,                  color: '#27ae60' },
                { label: 'Losses',   val: team.losses,                color: '#e84040' },
                { label: 'Win Rate', val: `${winRate}%`,              color: teamColor },
                { label: 'Points',   val: team.points.toLocaleString(), color: teamColor },
                { label: 'Prize',    val: `₵${(team.totalPrizeMoney / 100).toLocaleString()}`, color: '#e8a000'  },
              ].map(s => (
                <div key={s.label}>
                  <span className="font-black text-xl font-mono leading-none" style={{ color: s.color }}>{s.val}</span>
                  <p className="text-[8px] tracking-[0.2em] uppercase mt-0.5 text-[#333]">{s.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Win bar */}
            <div className="w-full max-w-xs h-0.5 bg-white/[0.06]">
              <motion.div className="h-full" key={`bar-${team.id}`}
                style={{ background: `linear-gradient(90deg, ${teamColor}60, ${teamColor})` }}
                initial={{ width: 0 }} animate={{ width: `${winRate}%` }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }} />
            </div>

            {/* Trophies */}
            {team.trophies.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {team.trophies.map(t => (
                  <div key={t} className="flex items-center gap-1.5 border border-[#e8a000]/20 bg-black/50 px-2 py-1">
                    <Trophy size={8} className="text-[#e8a000] shrink-0" />
                    <span className="text-[#777] text-[9px] tracking-wide">{t}</span>
                  </div>
                ))}
              </div>
            )}

          {/* Apply button for users without a team */}
          {team.isRecruiting && (
            <div>
              <button
                type="button"
                onClick={() => {
                  if (userTeamId) return; // prevent action if already in a team
                  const ev = new CustomEvent('team-apply', { detail: { teamId: team.id } });
                  window.dispatchEvent(ev);
                }}
                disabled={Boolean(userTeamId)}
                className={
                  `text-[10px] font-black uppercase tracking-widest px-3 py-2 border border-white/10 ` +
                  (userTeamId ? 'opacity-40 cursor-not-allowed text-[#bbb]' : 'text-white hover:bg-white/5')
                }
              >
                {userTeamId ? 'Already In A Team' : 'Apply To Join'}
              </button>
            </div>
          )}
          </div>

          {/* ── Starting Five ── */}
          {starters.length > 0 && (
            <div className="shrink-0">
              <div className="flex items-center gap-1.5 mb-2">
                <Users size={9} className="text-[#333]" />
                <span className="text-[#333] text-[8px] tracking-[0.3em] uppercase font-black">Starting Five</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {starters.map((p, i) => <PlayerPhotoCard key={p.id} p={p} delay={0.18 + i * 0.06} />)}
              </div>
            </div>
          )}

          {/* ── Substitutes ── */}
          {subs.length > 0 && (
            <div className="shrink-0">
              <div className="flex items-center gap-1.5 mb-2">
                <Crown size={9} className="text-[#333]" />
                <span className="text-[#333] text-[8px] tracking-[0.3em] uppercase font-black">Substitutes</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {subs.map((p, i) => <PlayerPhotoCard key={p.id} p={p} delay={0.4 + i * 0.07} />)}
              </div>
            </div>
          )}
        </div>

        {/* Right edge fade into sidebar */}
        <div className="hidden lg:block absolute top-0 right-0 bottom-0 w-12
                        bg-gradient-to-l from-[#08080e] to-transparent pointer-events-none z-20" />
      </motion.div>
    </AnimatePresence>
  );
};

// ══════════════════════════════════════════════════════════
// SIDEBAR ENTRY
// ══════════════════════════════════════════════════════════
const SidebarEntry = ({ team, active, onClick, index, canChallenge, challengeLoading, onChallenge, captainTeamId }: {
  team: ApiTeam;
  active: boolean;
  onClick: () => void;
  index: number;
  canChallenge?: boolean;
  challengeLoading?: boolean;
  onChallenge?: () => void;
  captainTeamId?: string | null;
}) => {
  const teamColor = team.color || '#e8a000';
  const logoUrl = team.logo || '/heroes/stun.png';
  const bannerUrl = team.banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1400&q=80';

  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      onClick={onClick}
      className="w-full text-left relative overflow-hidden border-b transition-all duration-200 group"
      style={{ borderColor: active ? `${teamColor}30` : 'rgba(255,255,255,0.04)',
               background: active ? `${teamColor}0e` : 'transparent' }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5 transition-all duration-300"
        style={{ background: active ? teamColor : 'transparent' }} />

      <div className="flex items-center gap-2 pl-3 pr-3">
        {/* Rank */}
        <span className="font-black font-mono text-base w-6 shrink-0 py-3 leading-none"
          style={{ color: active ? teamColor : '#1e1e28', fontFamily: "'Barlow Condensed', sans-serif" }}>
          {team.rank || '—'}
        </span>

        {/* Team logo */}
        <div className="relative w-8 h-8 shrink-0 border overflow-hidden"
          style={{ borderColor: `${teamColor}35` }}>
          <Image src={logoUrl} alt="" fill className="object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="font-black text-[7px]" style={{ color: teamColor }}>{team.tag}</span>
          </div>
        </div>

        {/* Banner thumb */}
        <div className="relative w-10 h-10 shrink-0 overflow-hidden">
          <Image src={bannerUrl} alt="" fill
            className="object-cover brightness-50 group-hover:brightness-75 transition-all duration-300" />
          <div className="absolute inset-0" style={{ background: `${teamColor}22` }} />
        </div>

        {/* Name + tier */}
        <div className="flex-1 min-w-0 py-3">
          <p className="font-black text-xs uppercase tracking-wide leading-none truncate"
            style={{ color: active ? 'white' : (canChallenge ? '#777' : (captainTeamId ? teamColor : '#777')), fontFamily: "'Barlow Condensed', sans-serif" }}>
            {team.name}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[7px] font-black tracking-widest px-1 py-px"
              style={{ color: TIER_COLORS[team.tier] || TIER_COLORS.C, background: `${TIER_COLORS[team.tier] || TIER_COLORS.C}18`,
                       border: `1px solid ${TIER_COLORS[team.tier] || TIER_COLORS.C}30` }}>
              {team.tier || 'C'}
            </span>
            <span className="text-[#2a2a2a] text-[8px] font-mono">{team.points.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canChallenge && onChallenge && (
            <div
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                if (!challengeLoading) onChallenge();
              }}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && !challengeLoading) {
                  event.stopPropagation();
                  onChallenge();
                }
              }}
              className="text-[8px]  uppercase tracking-wider px-2 py-1 border hover:bg-[#e8a000]/15 cursor-pointer disabled:opacity-50"
              style={{ color: teamColor, borderColor: `${teamColor}35`, opacity: challengeLoading ? 0.5 : 1 }}
            >
              {challengeLoading ? '...' : 'Challenge'}
            </div>
          )}
          <ChevronRight size={11} style={{ color: active ? teamColor : '#222' }} className="shrink-0" />
        </div>
      </div>

      {!active && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: `linear-gradient(90deg, ${teamColor}08, transparent)` }} />
      )}
    </motion.button>
  );
};

// ══════════════════════════════════════════════════════════
// MOBILE TEAM ROW — accordion with photo cards
// ══════════════════════════════════════════════════════════
const MobileTeamRow = ({ team, active, onClick, canChallenge, challengeLoading, onChallenge, userTeamId, isPendingApplied }: {
  team: ApiTeam;
  active: boolean;
  onClick: () => void;
  canChallenge?: boolean;
  challengeLoading?: boolean;
  onChallenge?: () => void;
  userTeamId?: string | null;
  isPendingApplied?: boolean;
}) => {

  const winRate = team.wins + team.losses > 0 
    ? Math.round((team.wins / (team.wins + team.losses)) * 100) 
    : 0;
  const starters = team.players.filter(p => !p.isSubstitute);
  const subs = team.players.filter(p => p.isSubstitute);
  const teamColor = team.color || '#e8a000';
  const bannerUrl = team.banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1400&q=80';
  const logoUrl = team.logo || '/heroes/stun.png';

  return (
    <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>

      {/* ── Collapsed header ── */}
      <button onClick={onClick} className="w-full relative overflow-hidden group text-left">
        {/* Banner BG */}
        <div className="absolute inset-0">
          <Image src={bannerUrl} alt="" fill className="object-cover brightness-[0.18]" />
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(90deg, ${teamColor}18, transparent 60%)` }} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#08080e]/75 to-[#08080e]/92" />
        </div>
        <div className="absolute left-0 top-0 bottom-0 w-0.5 transition-colors"
          style={{ background: active ? teamColor : 'transparent' }} />

        <div className="relative flex items-center gap-3 px-4 py-3.5">
          {/* Logo */}
          <div className="relative w-11 h-11 shrink-0 border-2 overflow-hidden"
            style={{ borderColor: `${teamColor}50` }}>
            <Image src={logoUrl} alt="" fill className="object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="font-black text-[8px]" style={{ color: teamColor, fontFamily: "'Barlow Condensed', sans-serif" }}>{team.tag}</span>
            </div>
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-black font-mono text-sm" style={{ color: active ? teamColor : '#2a2a2a' }}>#{team.rank || '—'}</span>
              <span className="text-[7px] font-black tracking-widest px-1.5 py-0.5"
                style={{ color: TIER_COLORS[team.tier] || TIER_COLORS.C, background: `${TIER_COLORS[team.tier] || TIER_COLORS.C}18`,
                         border: `1px solid ${TIER_COLORS[team.tier] || TIER_COLORS.C}30` }}>
                {team.tier || 'C'}
              </span>
            </div>
            <p className="text-white font-black text-base uppercase leading-tight truncate"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{team.name}</p>
            <p className="text-[8px] tracking-widest uppercase mt-0.5" style={{ color: `${teamColor}70` }}>{team.region}</p>
          </div>

          {/* Points */}
          <div className="text-right shrink-0">
            <p className="font-black text-sm font-mono" style={{ color: teamColor }}>{(team.points/1000).toFixed(1)}k</p>
            <p className="text-[8px] text-[#2a2a2a] uppercase tracking-widest">pts</p>
          </div>

          <motion.div animate={{ rotate: active ? 90 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronRight size={13} style={{ color: active ? teamColor : '#2a2a2a' }} />
          </motion.div>
        </div>
      </button>

      {/* ── Expanded ── */}
      <AnimatePresence>
        {active && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden">

            {/* Mini cinematic banner */}
            <div className="relative h-24 overflow-hidden shrink-0">
              <Image src={bannerUrl} alt="" fill className="object-cover brightness-30" />
              <div className="absolute inset-0"
                style={{ background: `radial-gradient(ellipse at bottom left, ${teamColor}35, transparent 60%)` }} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#09090f] to-transparent" />
              <Scanlines opacity={0.02} />
              {/* Ghost tag */}
              <div className="absolute right-3 bottom-1 pointer-events-none select-none">
                <span className="font-black text-5xl leading-none"
                  style={{ color: `${teamColor}12`, fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {team.tag}
                </span>
              </div>
              {/* Trophies inside banner */}
              {team.trophies.length > 0 && (
                <div className="absolute top-2 left-3 flex flex-col gap-1">
                  {team.trophies.map(t => (
                    <div key={t} className="flex items-center gap-1 bg-black/65 border border-[#e8a000]/20 px-2 py-1">
                      <Trophy size={8} className="text-[#e8a000] shrink-0" />
                      <span className="text-[#e8a000] text-[8px] font-black tracking-wide uppercase truncate max-w-[200px]">{t}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#09090f] border-t px-4 pb-6" style={{ borderColor: `${teamColor}18` }}>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-1.5 my-4">
                {[
                  { label: 'Wins',     val: team.wins,     color: '#27ae60' },
                  { label: 'Losses',   val: team.losses,   color: '#e84040' },
                  { label: 'Win Rate', val: `${winRate}%`, color: teamColor },
                ].map(s => (
                  <div key={s.label} className="flex flex-col items-center py-2 border"
                    style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <span className="font-black text-lg font-mono" style={{ color: s.color }}>{s.val}</span>
                    <span className="text-[8px] text-[#333] tracking-widest uppercase">{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Win bar */}
              <div className="h-0.5 w-full bg-white/[0.05] mb-5">
                <motion.div className="h-full" style={{ background: teamColor }}
                  initial={{ width: 0 }} animate={{ width: `${winRate}%` }}
                  transition={{ duration: 0.8, delay: 0.1 }} />
              </div>

              {canChallenge && onChallenge && (
                <div className="mb-4">
                  <button
                    type="button"
                    disabled={challengeLoading}
                    onClick={onChallenge}
                    className="text-[10px] font-black uppercase tracking-widest px-3 py-2 border hover:bg-[#e8a000]/15 disabled:opacity-50"
                    style={{ color: teamColor, borderColor: `${teamColor}35` }}
                  >
                    {challengeLoading ? 'Sending...' : 'Challenge This Team'}
                  </button>
                </div>
              )}
              {/* Apply button for users without a team */}
              {!canChallenge && team.isRecruiting && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('team-apply', { detail: { teamId: team.id } }));
                    }}
                    className={
                      `flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all shadow-md ` +
                      (isPendingApplied
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/35'
                        : userTeamId
                          ? 'bg-white/5 border-white/10 text-zinc-500 hover:border-red-500/30 hover:text-red-400'
                          : 'bg-gradient-to-r from-[#e8a000]/20 to-[#ffb800]/20 border-[#e8a000]/40 text-[#ffb800] hover:bg-[#e8a000]/30 hover:border-[#e8a000]')
                    }
                  >
                    {isPendingApplied ? (
                      <Clock size={12} className="animate-pulse text-amber-400 shrink-0" />
                    ) : (
                      <Swords size={12} />
                    )}
                    <span>
                      {isPendingApplied
                        ? 'Application Pending'
                        : userTeamId
                          ? 'Already In A Team'
                          : 'Apply For Roster'}
                    </span>
                  </button>
                </div>
              )}



              {/* ── Starting Five — photo cards ── */}
              {starters.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users size={9} className="text-[#333]" />
                    <span className="text-[#333] text-[8px] tracking-[0.25em] uppercase font-black">Starting Five</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                    {starters.map((p, i) => <PlayerPhotoCard key={p.id} p={p} delay={0.04 + i * 0.05} />)}
                  </div>
                </>
              )}

              {/* ── Substitutes ── */}
              {subs.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 mt-4 mb-2">
                    <Crown size={9} className="text-[#333]" />
                    <span className="text-[#333] text-[8px] tracking-[0.25em] uppercase font-black">Substitutes</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {subs.map((p, i) => <PlayerPhotoCard key={p.id} p={p} delay={0.28 + i * 0.06} />)}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function TeamsPage() {
  const [teams, setTeams] = useState<ApiTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All'|'S'|'A'|'B'|'C'>('All');
  const [captainTeamId, setCaptainTeamId] = useState<string | null>(null);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [challengeSubmittingId, setChallengeSubmittingId] = useState<string | null>(null);
  const [challengeFeedback, setChallengeFeedback] = useState<string | null>(null);
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null);
  const [availableTeamIds, setAvailableTeamIds] = useState<string[]>([]);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [weeklyScrimDateLabel, setWeeklyScrimDateLabel] = useState<string | null>(null);


  // ── Hero Catalog from DB ──
  const heroCtx = useHero();
  const heroCatalog = heroCtx?.heroCatalog ?? [];
  const [heroSearch, setHeroSearch] = useState('');

  // ── Roster Application Modal State ──
  const [selectedApplyTeam, setSelectedApplyTeam] = useState<ApiTeam | null>(null);
  const [applyForm, setApplyForm] = useState({
    role: 'EXP' as 'EXP' | 'JUNGLE' | 'MID' | 'GOLD' | 'ROAM',
    signatureHero: '',
    pitch: '',
  });
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);

  // ── Pending Applications State ──
  const [myApplications, setMyApplications] = useState<Array<{
    id: string;
    teamId: string;
    message: string | null;
    sentAt: string;
    team?: { id: string; name: string; tag: string };
  }>>([]);

  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const fetchMyApplications = useCallback(async () => {
    try {
      const res = await fetch('/api/my-applications', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMyApplications(Array.isArray(data?.applications) ? data.applications : []);
      }
    } catch {
      setMyApplications([]);
    }
  }, []);

  const withdrawApplication = async (teamId: string) => {
    try {
      setWithdrawingId(teamId);
      const res = await fetch(`/api/my-applications?teamId=${teamId}`, { method: 'DELETE' });
      if (res.ok) {
        setApplySuccessMessage('Application withdrawn.');
        setSelectedApplyTeam(null);
        await fetchMyApplications();
      } else {
        const data = await res.json().catch(() => ({}));
        setApplyError(data?.error || 'Failed to withdraw application');
      }
    } catch {
      setApplyError('Failed to withdraw application');
    } finally {
      setWithdrawingId(null);
    }
  };




  const fetchWeeklyAvailability = useCallback(async () => {
    try {
      const response = await fetch('/api/matches/challenges/availability');
      const data = (await response.json()) as AvailabilityPayload;
      if (!response.ok) {
        setAvailableTeamIds([]);
        setWeeklyScrimDateLabel(null);
        return;
      }

      const ids = Array.isArray(data.availableTeams)
        ? data.availableTeams.map((entry) => entry.teamId)
        : [];

      setAvailableTeamIds(ids);
      setWeeklyScrimDateLabel(data.ping?.scrimDate ? new Date(data.ping.scrimDate).toLocaleString() : null);
    } catch {
      setAvailableTeamIds([]);
      setWeeklyScrimDateLabel(null);
    }
  }, []);

  const fetchCaptainTeam = useCallback(async () => {
    try {
      const response = await fetch('/api/my-team');
      if (!response.ok) {
        setCaptainTeamId(null);
        setUserTeamId(null);
        return;
      }
      const data = await response.json();
      // Track whether the user is a captain and also whether they belong to a team at all
      if (data?.isCaptain && data?.id) {
        setCaptainTeamId(data.id);
        setUserTeamId(data.id);
        fetchWeeklyAvailability();
      } else if (data?.id) {
        setUserTeamId(data.id);
        setCaptainTeamId(null);
      } else {
        setCaptainTeamId(null);
        setUserTeamId(null);
      }
    } catch {
      setCaptainTeamId(null);
      setUserTeamId(null);
    }
  }, [fetchWeeklyAvailability]);

  useEffect(() => {
    fetchTeams();
    fetchCaptainTeam();
    fetchMyApplications();
  }, [fetchCaptainTeam, fetchMyApplications]);


  // Auto-dismiss applyFeedback after a short time to avoid sticky messages
  useEffect(() => {
    if (!applyFeedback) return;
    const t = setTimeout(() => setApplyFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [applyFeedback]);

  const challengeTeam = async (teamId: string) => {
    if (!captainTeamId) {
      setChallengeFeedback('Only team captains can send challenges.');
      return;
    }

    if (!availableTeamIds.includes(teamId)) {
      setChallengeFeedback('This team is not marked available for this week yet.');
      return;
    }

    setChallengeSubmittingId(teamId);
    setChallengeFeedback(null);
    try {
      const response = await fetch('/api/matches/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengedTeamId: teamId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setChallengeFeedback(data?.error || 'Failed to send challenge');
        return;
      }
      setChallengeFeedback('Challenge sent successfully. Waiting for captain response.');
    } catch {
      setChallengeFeedback('Failed to send challenge');
    } finally {
      setChallengeSubmittingId(null);
    }
  };

  const applyToTeam = useCallback(async (teamId: string, payload?: { role?: string; signatureHero?: string; pitch?: string }) => {
    if (userTeamId) {
      setApplyError('You are currently registered under another squad. Leave your current squad or ask your captain to disband before applying.');
      return;
    }

    setApplySubmitting(true);
    setApplyError(null);
    setApplyFeedback(null);

    try {
      const response = await fetch(`/api/teams/${teamId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setApplyError(data?.error || 'Unable to submit application to this team.');
        return;
      }
      setApplySuccessMessage(`⚔️ Application submitted to squad captain!`);
      setSelectedApplyTeam(null);
      setApplyForm({ role: 'EXP', signatureHero: '', pitch: '' });
      await fetchMyApplications();

    } catch {
      setApplyError('Network connection issue. Please check your connection and try again.');
    } finally {
      setApplySubmitting(false);
    }
  }, [userTeamId]);

  // Listen for in-panel apply button events
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ teamId: string }>;
      if (ce?.detail?.teamId) {
        const targetTeam = teams.find(t => t.id === ce.detail.teamId);
        if (targetTeam) {
          setSelectedApplyTeam(targetTeam);
          setApplyError(null);
        }
      }
    };
    window.addEventListener('team-apply', handler as EventListener);
    return () => window.removeEventListener('team-apply', handler as EventListener);
  }, [teams]);


  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams', { cache: 'no-store' });
      const data = await response.json();
      
      if (response.ok && data.teams) {
        setTeams(data.teams);
        if (data.teams.length > 0) {
          setActiveId(data.teams[0].id);
        }
      } else {
        setError(data.error || 'Failed to load teams');
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const activeTeam = teams.find(t => t.id === activeId);
  const filtered = teams.filter(t => {
    if (filter !== 'All' && t.tier !== filter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
        !t.tag.toLowerCase().includes(search.toLowerCase())) return false;
    if (showAvailableOnly && captainTeamId) {
      if (t.id === captainTeamId) return true;
      if (!availableTeamIds.includes(t.id)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-[#08080e] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#e8a000]" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#08080e] flex items-center justify-center">
        <p className="text-[#e84040]">{error}</p>
      </main>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&display=swap');
        ::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>

      <main className="min-h-screen bg-[#08080e] pt-24 lg:pt-28">
        <PageHeader teamsCount={teams.length} topTeam={teams[0]} />

        {challengeFeedback && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
            <div className="border border-[#e8a000]/25 bg-[#e8a000]/8 px-3 py-2 text-xs text-[#e8a000]">
              {challengeFeedback}
            </div>
          </div>
        )}

        {/* ── DESKTOP: spotlight + sidebar ── */}
        <div className="hidden lg:flex" style={{ height: 'calc(100vh - 196px)', minHeight: 560 }}>

              {applyFeedback && applyFeedback.length > 0 && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
                  <div className="border border-white/10 bg-white/3 px-3 py-2 text-xs text-white">
                    {applyFeedback}
                  </div>
                </div>
              )}

            {/* Spotlight column */}
            <div className="flex-1 relative overflow-hidden">
              {activeTeam && <SpotlightPanel team={activeTeam} userTeamId={userTeamId} />}
            </div>

            <div className="w-72 xl:w-80 shrink-0 border-l flex flex-col bg-[#08080e]"
              style={{ borderColor: 'rgba(255,255,255,0.05)' }}>

              <div className="p-3 border-b space-y-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2 bg-[#0d0d14] border border-white/[0.06] px-2.5 py-2
                              focus-within:border-[#e8a000]/30 transition-colors">
                <Search size={11} className="text-[#333] shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search team..."
                  className="bg-transparent text-white text-[10px] placeholder:text-[#222] outline-none flex-1 tracking-wide" />
                {search && <button onClick={() => setSearch('')}><X size={10} className="text-[#444]" /></button>}
              </div>
              <div className="flex gap-1">
                {(['All','S','A','B','C'] as const).map(t => (
                  <button key={t} onClick={() => setFilter(t)}
                    className="flex-1 py-1 text-[9px] font-black tracking-widest uppercase border transition-all"
                    style={filter === t
                      ? { background: '#e8a000', color: '#000', borderColor: '#e8a000' }
                      : { background: 'transparent', color: '#333', borderColor: '#ffffff0a' }}>
                    {t}
                  </button>
                ))}
              </div>
              {captainTeamId && (
                <button
                  type="button"
                  onClick={() => setShowAvailableOnly((prev) => !prev)}
                  className="w-full py-1 text-[9px] font-black tracking-widest uppercase border transition-all"
                  style={showAvailableOnly
                    ? { background: '#e8a000', color: '#000', borderColor: '#e8a000' }
                    : { background: 'transparent', color: '#666', borderColor: '#ffffff0f' }}
                >
                  {showAvailableOnly ? 'Showing Available Teams' : 'Available Teams Only'}
                </button>
              )}
              {captainTeamId && weeklyScrimDateLabel && (
                <p className="text-[9px] text-[#777] tracking-wide">Scrim date: {weeklyScrimDateLabel}</p>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {filtered.length === 0
                ? <p className="text-[#1e1e28] text-[10px] tracking-widest uppercase text-center mt-12">No results</p>
                : filtered.map((team, i) => (
                    <SidebarEntry key={team.id} team={team} index={i}
                      active={activeId === team.id}
                      onClick={() => setActiveId(team.id)}
                        canChallenge={Boolean(captainTeamId && captainTeamId !== team.id && availableTeamIds.includes(team.id))}
                      challengeLoading={challengeSubmittingId === team.id}
                      onChallenge={() => challengeTeam(team.id)}
                      captainTeamId={captainTeamId} />
                  ))
              }
            </div>

            <div className="border-t p-3" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <p className="text-[#222] text-[8px] tracking-[0.25em] uppercase text-center">
                {filtered.length} of {teams.length} teams
              </p>
            </div>
          </div>
        </div>

        {/* ── MOBILE / TABLET: accordion ── */}
        <div className="lg:hidden">
          <div className="px-4 py-3 border-b flex flex-col gap-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2 bg-[#0d0d14] border border-white/[0.06] px-3 py-2.5
                            focus-within:border-[#e8a000]/30 transition-colors">
              <Search size={12} className="text-[#333] shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search team or tag..."
                className="bg-transparent text-white text-[11px] placeholder:text-[#2a2a2a] outline-none flex-1 tracking-wide" />
              {search && <button onClick={() => setSearch('')}><X size={11} className="text-[#444]" /></button>}
            </div>
            <div className="flex gap-1.5">
              {(['All','S','A','B','C'] as const).map(t => (
                <button key={t} onClick={() => setFilter(t)}
                  className="flex-1 py-1.5 text-[9px] font-black tracking-widest uppercase border transition-all"
                  style={filter === t
                    ? { background: '#e8a000', color: '#000', borderColor: '#e8a000' }
                    : { background: 'transparent', color: '#444', borderColor: '#ffffff0d' }}>
                  {t}
                </button>
              ))}
            </div>
            {captainTeamId && (
              <button
                type="button"
                onClick={() => setShowAvailableOnly((prev) => !prev)}
                className="w-full py-1.5 text-[9px] font-black tracking-widest uppercase border transition-all"
                style={showAvailableOnly
                  ? { background: '#e8a000', color: '#000', borderColor: '#e8a000' }
                  : { background: 'transparent', color: '#666', borderColor: '#ffffff0f' }}
              >
                {showAvailableOnly ? 'Showing Available Teams' : 'Available Teams Only'}
              </button>
            )}
            {captainTeamId && weeklyScrimDateLabel && (
              <p className="text-[9px] text-[#777] tracking-wide">Scrim date: {weeklyScrimDateLabel}</p>
            )}
          </div>

          <div>
            {filtered.map(team => (
              <MobileTeamRow key={team.id} team={team}
                active={activeId === team.id}
                onClick={() => setActiveId(prev => prev === team.id ? null : team.id)}
                canChallenge={Boolean(captainTeamId && captainTeamId !== team.id && availableTeamIds.includes(team.id))}
                challengeLoading={challengeSubmittingId === team.id}
                onChallenge={() => challengeTeam(team.id)}
                userTeamId={userTeamId}
                isPendingApplied={myApplications.some(a => a.teamId === team.id)} />
            ))}

          </div>
        </div>

        {/* ── Success Toast Banner ── */}
        <AnimatePresence>
          {applySuccessMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="fixed bottom-6 right-6 z-[999] bg-[#0c1a14] border border-emerald-500/40 text-emerald-300 p-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-md backdrop-blur-xl"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs leading-tight">{applySuccessMessage}</p>
                <p className="text-[10px] text-emerald-400/70 mt-0.5">The squad captain will review your application on their My Team portal.</p>
              </div>
              <button onClick={() => setApplySuccessMessage(null)} className="p-1 hover:bg-white/10 rounded-lg">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Creative Roster Application Modal ── */}
        <AnimatePresence>
          {selectedApplyTeam && (() => {
            const teamColor = selectedApplyTeam.color || '#e8a000';
            const roles = ['EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM'] as const;
            const myAppForTeam = myApplications.find((a) => a.teamId === selectedApplyTeam.id);

            const filteredHeroes = heroCatalog.filter((h) =>
              h.name.toLowerCase().includes(heroSearch.toLowerCase()) ||
              h.key.toLowerCase().includes(heroSearch.toLowerCase())
            );

            return (
              <div
                className="fixed inset-0 z-[1000] overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-4 flex min-h-full items-center justify-center"
                onClick={() => { setSelectedApplyTeam(null); setApplyError(null); setHeroSearch(''); }}
              >

                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 15 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-lg max-h-[88vh] flex flex-col bg-[#0a0a12] border border-white/10 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden my-auto text-white"
                >
                  {/* Modal Header (Fixed, non-shrinking) */}
                  <div
                    className="shrink-0 p-4 sm:p-5 border-b border-white/10 relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${teamColor}25, transparent 80%)` }}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-xl border-2 flex items-center justify-center bg-black/60 font-black overflow-hidden relative shrink-0"
                          style={{ borderColor: `${teamColor}60` }}
                        >
                          {selectedApplyTeam.logo ? (
                            <Image src={selectedApplyTeam.logo} alt="" fill className="object-cover" />
                          ) : (
                            <span className="text-xs" style={{ color: teamColor }}>{selectedApplyTeam.tag}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400">
                            {myAppForTeam ? 'Application Status' : 'Roster Application'}
                          </p>
                          <h3
                            className="text-lg sm:text-xl font-black uppercase tracking-tight text-white leading-none mt-0.5"
                            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                          >
                            {selectedApplyTeam.name}
                          </h3>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelectedApplyTeam(null); setApplyError(null); setHeroSearch(''); }}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Modal Body (Scrollable inside max-height) */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">

                    {/* Human Error HUD Card if error occurred */}
                    {applyError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 space-y-2"
                      >
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h4 className="text-xs font-black uppercase tracking-wider text-red-400">Application Notice</h4>
                            <p className="text-xs leading-relaxed text-red-200/90">{applyError}</p>
                          </div>
                        </div>

                        {applyError.includes('Leave your current squad') && (
                          <div className="pt-2 border-t border-red-500/20 flex justify-end">
                            <a
                              href="/my-team"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[10px] font-black uppercase tracking-wider transition-colors"
                            >
                              <span>Manage My Team</span>
                              <ArrowRight size={12} />
                            </a>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Pending Application State View */}
                    {myAppForTeam ? (
                      <div className="space-y-4 py-2">
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3">
                          <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                            <div className="space-y-1">
                              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                                <span>Application Under Review</span>
                                <span className="px-2 py-0.5 rounded text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  PENDING CAPTAIN RESPONSE
                                </span>
                              </h4>
                              <p className="text-xs leading-relaxed text-amber-100/90">
                                Your application has been delivered to the squad captain of <span className="font-bold text-white">{selectedApplyTeam.name}</span>. You will receive a notification as soon as they review your profile.
                              </p>
                            </div>
                          </div>

                          {myAppForTeam.message && (
                            <div className="pt-2.5 border-t border-amber-500/20 space-y-1">
                              <p className="text-[9px] font-black uppercase tracking-widest text-amber-400/80">Submitted Note to Captain</p>
                              <p className="text-xs italic text-amber-100/80 bg-black/30 p-2.5 rounded-lg border border-amber-500/20">
                                "{myAppForTeam.message}"
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                          <span className="text-zinc-400 text-[10px] uppercase font-mono tracking-wider">
                            Submitted: {new Date(myAppForTeam.sentAt).toLocaleDateString()}
                          </span>
                          <button
                            type="button"
                            disabled={withdrawingId === selectedApplyTeam.id}
                            onClick={() => withdrawApplication(selectedApplyTeam.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {withdrawingId === selectedApplyTeam.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <X size={12} />
                            )}
                            <span>Withdraw Request</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* New Application Form */
                      <>
                        {/* 1. Preferred Role Picker */}
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                            1. Preferred Main Role
                          </label>
                          <div className="grid grid-cols-5 gap-1.5">
                            {roles.map((r) => {
                              const meta = ROLE_META[r];
                              const selected = applyForm.role === r;
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setApplyForm((prev) => ({ ...prev, role: r }))}
                                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                                    selected
                                      ? 'bg-white/15 border-white text-white shadow-lg scale-105'
                                      : 'bg-white/5 border-white/5 text-zinc-500 hover:border-white/20 hover:text-zinc-300'
                                  }`}
                                >
                                  <div
                                    className="w-5 h-5 rounded-lg flex items-center justify-center mb-0.5"
                                    style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                                  >
                                    {meta.icon}
                                  </div>
                                  <span className="text-[8px] font-black uppercase tracking-wider">{meta.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. Signature Hero Selector (From DB Catalog) */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400">
                              2. Signature Hero (Select from DB)
                            </label>
                            {applyForm.signatureHero && (
                              <span className="text-[10px] font-black text-[#ffb800]">Selected: {applyForm.signatureHero}</span>
                            )}
                          </div>

                          {/* Hero Search input */}
                          <div className="relative mb-2">
                            <Search size={12} className="absolute left-3 top-3 text-zinc-500" />
                            <input
                              type="text"
                              value={heroSearch}
                              onChange={(e) => setHeroSearch(e.target.value)}
                              placeholder="Search DB hero list (e.g. Chou, Ling, Fanny)..."
                              className="w-full bg-[#12121a] border border-white/10 rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#e8a000]/60 transition-all"
                            />
                          </div>

                          {/* Hero Avatars Grid */}
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 bg-black/40 border border-white/5 rounded-xl custom-scrollbar">
                            {filteredHeroes.map((hero) => {
                              const isSelected = applyForm.signatureHero.toLowerCase() === hero.name.toLowerCase();
                              return (
                                <button
                                  key={hero.id || hero.key}
                                  type="button"
                                  onClick={() => setApplyForm((prev) => ({ ...prev, signatureHero: hero.name }))}
                                  className={`relative flex flex-col items-center p-1.5 rounded-xl border transition-all ${
                                    isSelected
                                      ? 'bg-[#e8a000]/20 border-[#e8a000] shadow-md shadow-[#e8a000]/30 scale-105'
                                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                  }`}
                                >
                                  <div className="relative w-8 h-8 rounded-lg overflow-hidden mb-1 border border-white/10">
                                    <Image src={hero.imageUrl || '/heroes/stun.png'} alt={hero.name} fill className="object-cover" />
                                  </div>
                                  <span className="text-[8px] font-bold text-center truncate w-full text-zinc-300">
                                    {hero.name}
                                  </span>
                                </button>
                              );
                            })}
                            {filteredHeroes.length === 0 && (
                              <div className="col-span-full py-4 text-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                No matching heroes found in DB
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 3. Pitch / Message to Captain */}
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                            3. Pitch Note to Captain
                          </label>
                          <textarea
                            rows={2}
                            value={applyForm.pitch}
                            onChange={(e) => setApplyForm((prev) => ({ ...prev, pitch: e.target.value }))}
                            placeholder="Introduce your rank, win rate, or scrimmage availability..."
                            className="w-full bg-[#12121a] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#e8a000]/60 transition-all resize-none"
                          />
                        </div>

                        {/* Live Application Card Preview */}
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Applicant HUD Card Preview</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="px-2 py-0.5 rounded text-[9px] font-black uppercase"
                              style={{
                                backgroundColor: `${ROLE_META[applyForm.role]?.color || '#e8a000'}20`,
                                color: ROLE_META[applyForm.role]?.color || '#e8a000',
                              }}
                            >
                              {applyForm.role}
                            </span>
                            {applyForm.signatureHero && (
                              <span className="text-[10px] text-zinc-300 font-bold">⚡ Signature: {applyForm.signatureHero}</span>
                            )}
                          </div>
                          {applyForm.pitch && (
                            <p className="text-[10px] text-zinc-400 italic">"{applyForm.pitch}"</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Modal Footer (Fixed, non-shrinking) */}
                  <div className="shrink-0 p-4 border-t border-white/10 bg-black/50 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => { setSelectedApplyTeam(null); setApplyError(null); setHeroSearch(''); }}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                    {!myAppForTeam && (
                      <button
                        type="button"
                        disabled={applySubmitting}
                        onClick={() => applyToTeam(selectedApplyTeam.id, applyForm)}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#e8a000] to-[#ffb800] hover:brightness-110 disabled:opacity-50 text-black text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#e8a000]/20"
                      >
                        {applySubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send size={13} />
                        )}
                        <span>{applySubmitting ? 'Submitting...' : 'Submit Application'}</span>
                      </button>
                    )}
                  </div>

                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>

      </main>
    </>
  );
}

