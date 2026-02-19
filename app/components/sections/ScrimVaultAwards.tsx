'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Play, Swords, Shield, Zap, Target, Star, Wind } from 'lucide-react';

// ══════════════════════════════════════════════════════════
// SCRIM VAULT
// Real MLBB tournament names + Ghana local scene context
// ══════════════════════════════════════════════════════════

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

// Live match: Team A vs Team B (Ghana local squads)
const LIVE_MATCH = {
  teamA: { name: 'CERUS AL', score: 4 },
  teamB: { name: 'YACD3',    score: 3 },
  mode: 'Ranked · Bo5',
};

const LiveTimer = () => {
  const [secs, setSecs] = useState(30);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return <>{m}:{s}</>;
};

const ScrimCard = ({ scrim }: { scrim: typeof SCRIMS[0] }) => (
  <div className="group cursor-pointer flex flex-col gap-1.5">
    {/* Image */}
    <div className="relative w-full aspect-video overflow-hidden bg-[#111]">
      <Image
        src={scrim.image}
        alt={scrim.title}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-500 brightness-75 group-hover:brightness-90"
      />
      {/* Gradient */}
      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />

      {/* Featured highlight border */}
      {scrim.featured && (
        <div className="absolute inset-0 border border-[#e8a000]/50 pointer-events-none" />
      )}

      {/* Play on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-9 h-9 bg-[#e8a000] flex items-center justify-center shadow-lg shadow-[#e8a000]/30">
          <Play size={13} fill="black" className="text-black ml-0.5" />
        </div>
      </div>

      {/* Duration badge */}
      <span className="absolute top-1.5 right-1.5 bg-black/70 text-[#aaa] text-[9px] font-mono px-1.5 py-0.5">
        {scrim.duration}
      </span>

      {/* Title inside image */}
      <p className="absolute bottom-2 left-2 right-2 text-white font-black text-[11px] uppercase tracking-wide leading-tight drop-shadow-md">
        {scrim.title}
      </p>
    </div>

    {/* Meta */}
    <div>
      <p className="text-[#777] text-[10px] tracking-wide leading-tight">{scrim.tournament}</p>
      <p className="text-[#444] text-[9px] leading-tight">{scrim.matchup}</p>
    </div>
  </div>
);

export const ScrimVault = () => (
  <section className="bg-[#0d0d12] py-8">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      {/* Section title */}
      <h2 className="text-white font-black text-[11px] tracking-[0.3em] uppercase mb-4 border-l-2 border-[#e8a000] pl-3">
        Scrim Vault
      </h2>

      <div className="flex gap-5">

        {/* Left — live score block */}
        <div className="shrink-0 w-[88px] flex flex-col gap-1 pt-0.5">
          {/* Score line */}
          <p className="text-[#555] text-[8px] tracking-widest uppercase leading-none font-semibold">
            {LIVE_MATCH.teamA.name} <span className="text-[#666]">{LIVE_MATCH.teamA.score} · {LIVE_MATCH.teamB.score}</span>
          </p>

          {/* Big timer */}
          <p className="text-white font-black text-[28px] leading-none font-mono tracking-tight">
            <LiveTimer />
          </p>

          {/* Live indicator */}
          <div className="flex items-center gap-1 mt-0.5">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
            <span className="text-[#555] text-[8px] tracking-widest uppercase font-semibold">Live</span>
          </div>
          <p className="text-[#3a3a3a] text-[8px] leading-none">{LIVE_MATCH.mode}</p>
        </div>

        {/* Right — 3 scrim cards */}
        <div className="flex-1 grid grid-cols-3 gap-3">
          {SCRIMS.map((s) => <ScrimCard key={s.id} scrim={s} />)}
        </div>

      </div>
    </div>
  </section>
);

// ══════════════════════════════════════════════════════════
// BEST ROLE AWARDS
// Real MLBB roles: Tank, Fighter, Assassin, Mage, Marksman, Support
// ══════════════════════════════════════════════════════════

// Role icon map
const ROLE_ICONS: Record<string, React.ReactNode> = {
  Tank:      <Shield  size={9} />,
  Fighter:   <Swords  size={9} />,
  Assassin:  <Zap     size={9} />,
  Mage:      <Star    size={9} />,
  Marksman:  <Target  size={9} />,
  Support:   <Wind    size={9} />,
};

const ROLE_COLORS: Record<string, string> = {
  Tank:      '#4a90d9',
  Fighter:   '#e8a000',
  Assassin:  '#cc3333',
  Mage:      '#9b59b6',
  Marksman:  '#27ae60',
  Support:   '#16a085',
};

// Ghana MLBB Best Role Award winners — fictional local players, real hero references
const AWARDS = [
  {
    id: 1,
    role:   'Assassin',
    award:  'KING OF JUNGLE',
    player: 'ABASS · GH',
    hero:   'Hayabusa',          // real MLBB iconic assassin
    image:  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&q=80',
  },
  {
    id: 2,
    role:   'Fighter',
    award:  'KING OF EXP LANE',
    player: 'JUNEERS · GH',
    hero:   'Chou',              // real MLBB iconic fighter
    image:  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
  },
  {
    id: 3,
    role:   'Mage',
    award:  'QUEEN OF MIDLANE',
    player: 'SELENA · GH',
    hero:   'Kagura',            // real MLBB iconic mage
    image:  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
  },
];

const AwardCard = ({ award }: { award: typeof AWARDS[0] }) => {
  const color = ROLE_COLORS[award.role] ?? '#e8a000';
  const icon  = ROLE_ICONS[award.role];

  return (
    <div className="group cursor-pointer flex flex-col gap-1.5">
      {/* Portrait image */}
      <div className="relative w-full aspect-square overflow-hidden bg-[#111]">
        <Image
          src={award.image}
          alt={award.player}
          fill
          className="object-cover object-top group-hover:scale-105 transition-transform duration-500 grayscale-[40%] group-hover:grayscale-0"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />

        {/* Role badge — top right */}
        <span
          className="absolute top-1.5 right-1.5 flex items-center gap-1 text-[9px] font-black tracking-wide uppercase px-1.5 py-0.5"
          style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
        >
          {icon} {award.role}
        </span>

        {/* Hero name — bottom left inside image */}
        <p className="absolute bottom-1.5 left-2 text-[#aaa] text-[9px] tracking-widest uppercase font-semibold">
          {award.hero}
        </p>
      </div>

      {/* Text below */}
      <div>
        <p
          className="text-[10px] font-black tracking-[0.15em] uppercase"
          style={{ color }}
        >
          {award.award}
        </p>
        <p className="text-white font-black text-[11px] uppercase tracking-wide leading-tight group-hover:text-[#e8a000] transition-colors">
          {award.player}
        </p>
      </div>
    </div>
  );
};

export const BestRoleAwards = () => (
  <section className="bg-[#0d0d12] pb-10 border-t border-white/[0.04]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7">

      <h2 className="text-white font-black text-[11px] tracking-[0.3em] uppercase mb-5 border-l-2 border-[#e8a000] pl-3">
        Best Role Awards
      </h2>

      <div className="flex gap-5">
        {/* Spacer to align under scrim cards */}
        <div className="shrink-0 w-[88px]" />

        <div className="flex-1 grid grid-cols-3 gap-3">
          {AWARDS.map((a) => <AwardCard key={a.id} award={a} />)}
        </div>
      </div>

    </div>
  </section>
);