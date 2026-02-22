'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Swords, Star, Target, Wind, Trophy, Search, X, MapPin, Users, ChevronRight, Crown, Loader2 } from 'lucide-react';

// ── Role system ─────────────────────────────────────────────
const ROLE_META: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  EXP:      { color: '#e8a000', icon: <Swords size={9} />,  label: 'EXP'     },
  JUNGLE:   { color: '#e84040', icon: <Zap    size={9} />,  label: 'Jungle'  },
  MAGE:     { color: '#9b59b6', icon: <Star   size={9} />,  label: 'Mage'    },
  MARKSMAN: { color: '#27ae60', icon: <Target size={9} />,  label: 'Marksman' },
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
const SpotlightPanel = ({ team }: { team: ApiTeam }) => {
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
const SidebarEntry = ({ team, active, onClick, index }: {
  team: ApiTeam; active: boolean; onClick: () => void; index: number;
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
            style={{ color: active ? 'white' : '#777', fontFamily: "'Barlow Condensed', sans-serif" }}>
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

        <ChevronRight size={11} style={{ color: active ? teamColor : '#222' }} className="shrink-0" />
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
const MobileTeamRow = ({ team, active, onClick }: {
  team: ApiTeam; active: boolean; onClick: () => void;
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

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams');
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

      <main className="min-h-screen bg-[#08080e]">
        <PageHeader teamsCount={teams.length} topTeam={teams[0]} />

        {/* ── DESKTOP: spotlight + sidebar ── */}
        <div className="hidden lg:flex" style={{ height: 'calc(100vh - 196px)', minHeight: 560 }}>

          {/* Spotlight */}
          <div className="flex-1 relative overflow-hidden">
            {activeTeam && <SpotlightPanel team={activeTeam} />}
          </div>

          {/* Sidebar */}
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
            </div>

            <div className="overflow-y-auto flex-1">
              {filtered.length === 0
                ? <p className="text-[#1e1e28] text-[10px] tracking-widest uppercase text-center mt-12">No results</p>
                : filtered.map((team, i) => (
                    <SidebarEntry key={team.id} team={team} index={i}
                      active={activeId === team.id} onClick={() => setActiveId(team.id)} />
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
          </div>

          <div>
            {filtered.map(team => (
              <MobileTeamRow key={team.id} team={team}
                active={activeId === team.id}
                onClick={() => setActiveId(prev => prev === team.id ? null : team.id)} />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
