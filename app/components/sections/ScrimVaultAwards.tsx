'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Play, Swords, Shield, Zap, Target, Star, Wind, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

// ── Data ───────────────────────────────────────────────────
const SCRIMS = [
  {
    id: 1,
    title: 'HACK! MIDGAME!',
    tournament: 'APL Season 5 Finals',
    matchup: 'Yacd3',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80',
    duration: '14:32',
  },
  {
    id: 2,
    title: 'AMBUSH ON THE FLANK',
    tournament: 'APL Season 5 Finals',
    matchup: 'Commodity Saints · Wave 3',
    image: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=600&q=80',
    duration: '08:17',
    featured: true,
  },
  {
    id: 3,
    title: 'TURTLE STEAL',
    tournament: 'AFL Season 5.1',
    matchup: 'Voca 3',
    image: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=600&q=80',
    duration: '22:04',
  },
];

const LIVE_MATCH = {
  teamA: { name: 'CERUS AL', score: 4 },
  teamB: { name: 'YACD3',    score: 3 },
  mode: 'Ranked · Bo5',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  Tank:     <Shield  size={9} />,
  Fighter:  <Swords  size={9} />,
  Assassin: <Zap     size={9} />,
  Mage:     <Star    size={9} />,
  Marksman: <Target  size={9} />,
  Support:  <Wind    size={9} />,
};

const ROLE_COLORS: Record<string, string> = {
  Tank:     '#4a90d9',
  Fighter:  '#e8a000',
  Assassin: '#cc3333',
  Mage:     '#9b59b6',
  Marksman: '#27ae60',
  Support:  '#16a085',
};

const AWARDS = [
  {
    id: 1,
    role:   'Assassin',
    award:  'KING OF JUNGLE',
    player: 'ABASS · GH',
    hero:   'Hayabusa',
    image:  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&q=80',
  },
  {
    id: 2,
    role:   'Fighter',
    award:  'KING OF EXP LANE',
    player: 'JUNEERS · GH',
    hero:   'Chou',
    image:  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
  },
  {
    id: 3,
    role:   'Mage',
    award:  'QUEEN OF MIDLANE',
    player: 'SELENA · GH',
    hero:   'Kagura',
    image:  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
  },
];

// ── Shared ─────────────────────────────────────────────────
const LiveTimer = () => {
  const [secs, setSecs] = useState(30);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return <>{m}:{s}</>;
};

const LiveDot = () => (
  <span className="relative flex h-1.5 w-1.5 shrink-0">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
  </span>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-white font-black text-[11px] tracking-[0.3em] uppercase mb-4 border-l-2 border-[#e8a000] pl-3">
    {children}
  </h2>
);

// ── Desktop Scrim Card ─────────────────────────────────────
const DesktopScrimCard = ({ scrim }: { scrim: typeof SCRIMS[0] }) => (
  <div className="group cursor-pointer flex flex-col gap-1.5">
    <div className="relative w-full aspect-video overflow-hidden bg-[#111]">
      <Image src={scrim.image} alt={scrim.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500 brightness-75 group-hover:brightness-90" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      {scrim.featured && <div className="absolute inset-0 border border-[#e8a000]/50 pointer-events-none" />}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-9 h-9 bg-[#e8a000] flex items-center justify-center shadow-lg shadow-[#e8a000]/30">
          <Play size={13} fill="black" className="text-black ml-0.5" />
        </div>
      </div>
      <span className="absolute top-1.5 right-1.5 bg-black/70 text-[#aaa] text-[9px] font-mono px-1.5 py-0.5">{scrim.duration}</span>
      <p className="absolute bottom-2 left-2 right-2 text-white font-black text-[11px] uppercase tracking-wide leading-tight drop-shadow-md">{scrim.title}</p>
    </div>
    <div>
      <p className="text-[#777] text-[10px] tracking-wide leading-tight">{scrim.tournament}</p>
      <p className="text-[#444] text-[9px] leading-tight">{scrim.matchup}</p>
    </div>
  </div>
);

// ── Desktop Award Card ─────────────────────────────────────
const DesktopAwardCard = ({ award }: { award: typeof AWARDS[0] }) => {
  const color = ROLE_COLORS[award.role] ?? '#e8a000';
  const icon  = ROLE_ICONS[award.role];
  return (
    <div className="group cursor-pointer flex flex-col gap-1.5">
      <div className="relative w-full aspect-square overflow-hidden bg-[#111]">
        <Image src={award.image} alt={award.player} fill className="object-cover object-top group-hover:scale-105 transition-transform duration-500 grayscale-[40%] group-hover:grayscale-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <span className="absolute top-1.5 right-1.5 flex items-center gap-1 text-[9px] font-black tracking-wide uppercase px-1.5 py-0.5"
          style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
          {icon} {award.role}
        </span>
        <p className="absolute bottom-1.5 left-2 text-[#aaa] text-[9px] tracking-widest uppercase font-semibold">{award.hero}</p>
      </div>
      <div>
        <p className="text-[10px] font-black tracking-[0.15em] uppercase" style={{ color }}>{award.award}</p>
        <p className="text-white font-black text-[11px] uppercase tracking-wide leading-tight group-hover:text-[#e8a000] transition-colors">{award.player}</p>
      </div>
    </div>
  );
};

// ── Desktop Sections (100% original) ──────────────────────
export const ScrimVault = () => (
  <section className="hidden lg:block bg-[#0d0d12] py-8">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <SectionLabel>Scrim Vault</SectionLabel>
      <div className="flex gap-5">
        {/* Live score block */}
        <div className="shrink-0 w-[88px] flex flex-col gap-1 pt-0.5">
          <p className="text-[#555] text-[8px] tracking-widest uppercase leading-none font-semibold">
            {LIVE_MATCH.teamA.name} <span className="text-[#666]">{LIVE_MATCH.teamA.score} · {LIVE_MATCH.teamB.score}</span>
          </p>
          <p className="text-white font-black text-[28px] leading-none font-mono tracking-tight"><LiveTimer /></p>
          <div className="flex items-center gap-1 mt-0.5">
            <LiveDot />
            <span className="text-[#555] text-[8px] tracking-widest uppercase font-semibold">Live</span>
          </div>
          <p className="text-[#3a3a3a] text-[8px] leading-none">{LIVE_MATCH.mode}</p>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-3">
          {SCRIMS.map(s => <DesktopScrimCard key={s.id} scrim={s} />)}
        </div>
      </div>
    </div>
  </section>
);

export const BestRoleAwards = () => (
  <section className="hidden lg:block bg-[#0d0d12] pb-10 border-t border-white/[0.04]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7">
      <SectionLabel>Best Role Awards</SectionLabel>
      <div className="flex gap-5">
        <div className="shrink-0 w-[88px]" />
        <div className="flex-1 grid grid-cols-3 gap-3">
          {AWARDS.map(a => <DesktopAwardCard key={a.id} award={a} />)}
        </div>
      </div>
    </div>
  </section>
);

// ══════════════════════════════════════════════════════════
// MOBILE — combined Scrim Vault + Best Role Awards
// Single section, stacked, fully rethought for small screens
// ══════════════════════════════════════════════════════════

// ── Mobile: Live score bar (sticky feel at the top) ────────
const MobileLiveBar = () => (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="flex items-center justify-between px-4 py-2.5 bg-[#0a0a0f] border-b border-[#e8a000]/15 mb-4"
  >
    <div className="flex items-center gap-2">
      <LiveDot />
      <span className="text-[#555] text-[9px] tracking-[0.15em] uppercase font-black">Live</span>
      <span className="text-[#333] text-[9px] mx-1">·</span>
      <span className="text-[#888] text-[9px] tracking-wide uppercase font-bold">{LIVE_MATCH.mode}</span>
    </div>
    {/* Score pill */}
    <div className="flex items-center gap-2">
      <span className="text-white font-black text-[11px] uppercase tracking-wide">{LIVE_MATCH.teamA.name}</span>
      <div className="flex items-center gap-1.5 bg-[#111] border border-[#e8a000]/20 px-2.5 py-1">
        <span className="text-white font-black text-sm font-mono">{LIVE_MATCH.teamA.score}</span>
        <span className="text-[#333] text-xs">:</span>
        <span className="text-white font-black text-sm font-mono">{LIVE_MATCH.teamB.score}</span>
      </div>
      <span className="text-white font-black text-[11px] uppercase tracking-wide">{LIVE_MATCH.teamB.name}</span>
    </div>
    <p className="text-[#e8a000] font-black text-sm font-mono tracking-tight"><LiveTimer /></p>
  </motion.div>
);

// ── Mobile: Featured scrim (big hero card) ─────────────────
const MobileFeaturedScrim = ({ scrim }: { scrim: typeof SCRIMS[0] }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45 }}
    className="group relative cursor-pointer aspect-video overflow-hidden bg-[#111] mb-3"
  >
    <Image src={scrim.image} alt={scrim.title} fill className="object-cover brightness-75 group-hover:scale-105 transition-transform duration-500" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
    <div className="absolute inset-0 border border-[#e8a000]/40 pointer-events-none" />

    {/* Play button centre */}
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        whileTap={{ scale: 0.92 }}
        className="w-12 h-12 bg-[#e8a000] flex items-center justify-center shadow-2xl shadow-[#e8a000]/40"
      >
        <Play size={18} fill="black" className="ml-1 text-black" />
      </motion.div>
    </div>

    {/* Duration */}
    <span className="absolute top-3 right-3 bg-black/70 text-[#aaa] text-[9px] font-mono px-2 py-0.5">{scrim.duration}</span>

    {/* Bottom meta */}
    <div className="absolute bottom-0 left-0 right-0 p-4">
      <p className="text-white font-black text-lg uppercase tracking-wide leading-tight">{scrim.title}</p>
      <p className="text-[#888] text-[10px] tracking-wide mt-0.5">{scrim.tournament} · {scrim.matchup}</p>
    </div>
  </motion.div>
);

// ── Mobile: Small scrim row (horizontal) ──────────────────
const MobileScrimRow = ({ scrim, index }: { scrim: typeof SCRIMS[0]; index: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -14 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.35, delay: index * 0.08 }}
    className="group cursor-pointer flex items-center gap-3 border-b border-white/[0.05] pb-3"
  >
    {/* Thumb */}
    <div className="relative w-24 aspect-video shrink-0 overflow-hidden bg-[#111]">
      <Image src={scrim.image} alt={scrim.title} fill className="object-cover brightness-75 group-hover:brightness-90 transition-all duration-300" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-6 h-6 bg-[#e8a000] flex items-center justify-center">
          <Play size={9} fill="black" className="ml-0.5 text-black" />
        </div>
      </div>
      <span className="absolute bottom-1 right-1 bg-black/70 text-[#aaa] text-[8px] font-mono px-1 py-px">{scrim.duration}</span>
    </div>
    {/* Text */}
    <div className="flex-1 min-w-0">
      <p className="text-white font-black text-xs uppercase tracking-wide leading-tight group-hover:text-[#e8a000] transition-colors line-clamp-1">{scrim.title}</p>
      <p className="text-[#666] text-[9px] tracking-wide mt-0.5 truncate">{scrim.tournament}</p>
      <p className="text-[#3a3a3a] text-[9px] truncate">{scrim.matchup}</p>
    </div>
    <ChevronRight size={12} className="text-[#2a2a2a] group-hover:text-[#e8a000] transition-colors shrink-0" />
  </motion.div>
);

// ── Mobile: Award card (landscape — image left, info right) ─
const MobileAwardCard = ({ award, index }: { award: typeof AWARDS[0]; index: number }) => {
  const color = ROLE_COLORS[award.role] ?? '#e8a000';
  const icon  = ROLE_ICONS[award.role];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: index * 0.1 }}
      className="group cursor-pointer flex items-stretch gap-0 border border-white/[0.06] overflow-hidden bg-[#0c0c12]"
    >
      {/* Coloured left accent bar */}
      <div className="w-0.5 shrink-0" style={{ background: color }} />

      {/* Portrait thumb */}
      <div className="relative w-16 shrink-0 aspect-square">
        <Image src={award.image} alt={award.player} fill className="object-cover object-top grayscale-[30%] group-hover:grayscale-0 transition-all duration-400" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0c0c12]/60" />
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col justify-center px-3 py-2.5 min-w-0">
        {/* Role badge */}
        <span
          className="inline-flex items-center gap-1 text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 self-start mb-1"
          style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}
        >
          {icon} {award.role}
        </span>
        <p className="text-[10px] font-black tracking-[0.12em] uppercase leading-none" style={{ color }}>{award.award}</p>
        <p className="text-white font-black text-sm uppercase tracking-wide leading-tight mt-0.5 group-hover:text-[#e8a000] transition-colors">{award.player}</p>
        <p className="text-[#444] text-[9px] tracking-widest uppercase mt-0.5">{award.hero}</p>
      </div>

      {/* Rank number - decorative far right */}
      <div className="shrink-0 flex items-center px-3">
        <span className="text-[#1e1e28] font-black text-2xl tabular-nums font-mono leading-none">
          {String(award.id).padStart(2, '0')}
        </span>
      </div>
    </motion.div>
  );
};

// ── Mobile combined section ────────────────────────────────
export const MobileScrimAndAwards = () => {
  const featured = SCRIMS.find(s => s.featured)!;
  const rest = SCRIMS.filter(s => !s.featured);

  return (
    <section className="lg:hidden bg-[#0d0d12] py-6">

      {/* ── Scrim Vault ── */}
      <div className="px-4 sm:px-6 mb-6">
        <SectionLabel>Scrim Vault</SectionLabel>
        <MobileLiveBar />
        <MobileFeaturedScrim scrim={featured} />
        <div className="flex flex-col gap-3">
          {rest.map((s, i) => <MobileScrimRow key={s.id} scrim={s} index={i} />)}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px mx-4 sm:mx-6 bg-white/[0.04] mb-6" />

      {/* ── Best Role Awards ── */}
      <div className="px-4 sm:px-6">
        <SectionLabel>Best Role Awards</SectionLabel>
        <div className="flex flex-col gap-2">
          {AWARDS.map((a, i) => <MobileAwardCard key={a.id} award={a} index={i} />)}
        </div>
      </div>

    </section>
  );
};