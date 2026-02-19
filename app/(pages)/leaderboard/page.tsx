'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Shield, Zap, Swords, Star, Target, Wind, Crown, TrendingUp, TrendingDown, Minus, Trophy, Flame } from 'lucide-react';

// ── MLBB Role meta ─────────────────────────────────────────
const ROLE_META = {
  Tank:      { color: '#4a90d9', icon: <Shield size={9} /> },
  Fighter:   { color: '#e8a000', icon: <Swords size={9} /> },
  Assassin:  { color: '#e84040', icon: <Zap    size={9} /> },
  Mage:      { color: '#9b59b6', icon: <Star   size={9} /> },
  Marksman:  { color: '#27ae60', icon: <Target size={9} /> },
  Support:   { color: '#16a085', icon: <Wind   size={9} /> },
};
type Role = keyof typeof ROLE_META;

// ── Leaderboard data ───────────────────────────────────────
// Team standings — Ghana MLBB Season 5
const STANDINGS = [
  { rank: 1,  prev: 1,  team: 'CERUS AL EGAN', tag: 'CAE',  w: 38, l: 6,  pts: 10145, prize: '₵4,800', streak: 'W5', tier: 'S', color: '#e8a000' },
  { rank: 2,  prev: 3,  team: 'AD57 AUY',       tag: 'AD57', w: 33, l: 9,  pts: 10003, prize: '₵3,200', streak: 'W3', tier: 'S', color: '#cc3333' },
  { rank: 3,  prev: 2,  team: 'AEDF AJAY',      tag: 'AJAY', w: 28, l: 12, pts: 9045,  prize: '₵2,100', streak: 'W1', tier: 'A', color: '#9b59b6' },
  { rank: 4,  prev: 4,  team: 'YACD3 SQUAD',    tag: 'YCD3', w: 24, l: 16, pts: 8200,  prize: '₵1,400', streak: 'L2', tier: 'A', color: '#27ae60' },
  { rank: 5,  prev: 7,  team: 'PHANTOM LORDS',  tag: 'PHXL', w: 19, l: 21, pts: 6750,  prize: '₵800',   streak: 'W2', tier: 'B', color: '#16a085' },
  { rank: 6,  prev: 5,  team: 'VENOM RISING',   tag: 'VNMR', w: 15, l: 25, pts: 5120,  prize: '₵500',   streak: 'L1', tier: 'B', color: '#4a90d9' },
  { rank: 7,  prev: 6,  team: 'GOLD TITANS GH', tag: 'GTGH', w: 12, l: 28, pts: 4380,  prize: '—',      streak: 'L3', tier: 'B', color: '#e8a000' },
  { rank: 8,  prev: 8,  team: 'KRYPTONITE GH',  tag: 'KRYP', w: 10, l: 30, pts: 3200,  prize: '—',      streak: 'L4', tier: 'C', color: '#555'    },
];

// Individual MVP leaderboard — top players this season
// Heroes from real 2025 MLBB meta (Hayabusa, Kagura, Wanwan, Gloo, Chou etc.)
const PLAYERS = [
  { rank: 1,  ign: 'Zephyr',    team: 'CAE',  role: 'Assassin' as Role, hero: 'Hayabusa', kda: '8.4', wr: '78%', mvp: 22, image: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&q=80' },
  { rank: 2,  ign: 'Lumen',     team: 'AD57', role: 'Mage'     as Role, hero: 'Kagura',   kda: '7.9', wr: '74%', mvp: 19, image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80' },
  { rank: 3,  ign: 'Snipe',     team: 'CAE',  role: 'Marksman' as Role, hero: 'Wanwan',   kda: '7.2', wr: '71%', mvp: 17, image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80' },
  { rank: 4,  ign: 'IronWall',  team: 'AD57', role: 'Tank'     as Role, hero: 'Gloo',     kda: '6.8', wr: '70%', mvp: 15, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80' },
  { rank: 5,  ign: 'Vortex',    team: 'CAE',  role: 'Fighter'  as Role, hero: 'Chou',     kda: '6.5', wr: '68%', mvp: 14, image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80' },
  { rank: 6,  ign: 'Fang',      team: 'AJAY', role: 'Assassin' as Role, hero: 'Fanny',    kda: '6.1', wr: '65%', mvp: 11, image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80' },
  { rank: 7,  ign: 'Pulse',     team: 'AD57', role: 'Marksman' as Role, hero: 'Granger',  kda: '5.9', wr: '63%', mvp: 10, image: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=200&q=80' },
  { rank: 8,  ign: 'ArcMage',   team: 'CAE',  role: 'Mage'     as Role, hero: 'Valentina',kda: '5.8', wr: '62%', mvp: 9,  image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80' },
];

// Most-picked heroes in Ghana MLBB Season 5
const HERO_META = [
  { hero: 'Hayabusa', role: 'Assassin' as Role, pickRate: '34%', banRate: '61%', wr: '58%', tier: 'S+' },
  { hero: 'Kagura',   role: 'Mage'     as Role, pickRate: '29%', banRate: '45%', wr: '56%', tier: 'S+' },
  { hero: 'Wanwan',   role: 'Marksman' as Role, pickRate: '31%', banRate: '52%', wr: '55%', tier: 'S+' },
  { hero: 'Gloo',     role: 'Tank'     as Role, pickRate: '26%', banRate: '38%', wr: '54%', tier: 'S'  },
  { hero: 'Chou',     role: 'Fighter'  as Role, pickRate: '22%', banRate: '30%', wr: '53%', tier: 'S'  },
  { hero: 'Fanny',    role: 'Assassin' as Role, pickRate: '18%', banRate: '41%', wr: '52%', tier: 'S'  },
];

// ── Helpers ────────────────────────────────────────────────
const RankDelta = ({ curr, prev }: { curr: number; prev: number }) => {
  const d = prev - curr;
  if (d > 0) return <span className="flex items-center gap-0.5 text-[#27ae60] text-[9px] font-bold"><TrendingUp size={9} />+{d}</span>;
  if (d < 0) return <span className="flex items-center gap-0.5 text-[#e84040] text-[9px] font-bold"><TrendingDown size={9} />{d}</span>;
  return <span className="text-[#333] text-[9px]"><Minus size={9} /></span>;
};

const StreakBadge = ({ streak }: { streak: string }) => {
  const isWin = streak.startsWith('W');
  return (
    <span
      className="text-[9px] font-black px-1.5 py-0.5 tracking-wide"
      style={isWin
        ? { background: '#27ae6022', color: '#27ae60', border: '1px solid #27ae6044' }
        : { background: '#e8404022', color: '#e84040', border: '1px solid #e8404044' }
      }
    >
      {streak}
    </span>
  );
};

const TierBadge = ({ tier }: { tier: string }) => {
  const colors: Record<string, string> = { 'S+': '#e8a000', S: '#e8a000', A: '#4a90d9', B: '#9b59b6', C: '#555' };
  const c = colors[tier] ?? '#555';
  return (
    <span className="text-[9px] font-black px-1.5 py-0.5" style={{ color: c, background: `${c}22`, border: `1px solid ${c}44` }}>
      {tier}
    </span>
  );
};

// ── Tab system ─────────────────────────────────────────────
type Tab = 'standings' | 'players' | 'meta';

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('standings');

  return (
    <main className="min-h-screen bg-[#08080d]">

      {/* Hero header */}
      <div className="relative border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-linear-to-br from-[#e8a000]/8 via-transparent to-transparent" />
          {/* Decorative grid */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Crown size={14} className="text-[#e8a000]" />
                <p className="text-[#e8a000] text-[10px] tracking-[0.4em] uppercase font-semibold">Ghana MLBB Season 5</p>
              </div>
              <h1 className="text-white font-black text-3xl md:text-4xl tracking-tight uppercase">Leaderboards</h1>
              <p className="text-[#444] text-sm mt-1 tracking-wide">APL · AFL · IESF Africa qualifier · Updated live</p>
            </div>

            {/* Center — Chou gif */}
            <div className="hidden md:flex flex-1 justify-end pr-8 pointer-events-none select-none">
              <Image
                src="/gif/chou.gif"
                alt="Chou"
                width={120}
                height={120}
                className="object-contain drop-shadow-[0_0_24px_rgba(232,160,0,0.35)]"
                unoptimized
              />
            </div>

            {/* Season prize pool */}
            <div className="hidden md:block text-right shrink-0">
              <p className="text-[#444] text-[9px] tracking-[0.3em] uppercase">Season Prize Pool</p>
              <p className="text-white font-black text-2xl">₵12,800 <span className="text-[#e8a000]">GHS</span></p>
            </div>
          </div>

          {/* Top 3 quick cards */}
          <div className="grid grid-cols-3 gap-3 mt-8 max-w-lg">
            {STANDINGS.slice(0, 3).map((s, i) => (
              <div key={s.rank} className="bg-[#0f0f18] border border-white/[0.06] p-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: s.color }} />
                {i === 0 && <Crown size={10} className="absolute top-2 right-2 text-[#e8a000]" />}
                <p className="text-[#444] text-[8px] uppercase tracking-widest mb-0.5">#{s.rank}</p>
                <p className="text-white font-black text-[11px] uppercase tracking-wide leading-tight">{s.team}</p>
                <p className="font-mono text-[10px] font-bold mt-1" style={{ color: s.color }}>{s.pts.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Tabs */}
        <div className="flex items-center gap-0 mb-6 border-b border-white/[0.06]">
          {([
            { key: 'standings', label: 'Team Standings', icon: <Trophy size={11} /> },
            { key: 'players',   label: 'Player MVP',     icon: <Flame   size={11} /> },
            { key: 'meta',      label: 'Hero Meta',      icon: <Star    size={11} /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-3 text-[11px] font-black tracking-[0.15em] uppercase transition-all border-b-2 -mb-px"
              style={tab === t.key
                ? { color: '#e8a000', borderColor: '#e8a000' }
                : { color: '#444',    borderColor: 'transparent' }
              }
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── STANDINGS ── */}
        {tab === 'standings' && (
          <div className="overflow-x-auto">
            {/* Column headers */}
            <div className="grid grid-cols-[32px_1fr_60px_60px_80px_60px_80px_80px] gap-3 px-3 mb-2">
              {['#', 'Team', 'W', 'L', 'Points', 'Streak', 'Prize', 'Tier'].map((h) => (
                <p key={h} className="text-[#333] text-[9px] uppercase tracking-widest font-bold">{h}</p>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              {STANDINGS.map((s) => (
                <div
                  key={s.rank}
                  className="grid grid-cols-[32px_1fr_60px_60px_80px_60px_80px_80px] gap-3 items-center px-3 py-3 bg-[#0f0f18] border border-white/[0.05] hover:border-white/[0.12] transition-colors group cursor-pointer"
                  style={{ borderLeft: s.rank <= 3 ? `2px solid ${s.color}` : '2px solid transparent' }}
                >
                  {/* Rank */}
                  <div className="flex flex-col items-center">
                    <span className="text-white font-black text-sm font-mono">
                      {s.rank <= 3 ? ['🥇','🥈','🥉'][s.rank-1] : s.rank}
                    </span>
                    <RankDelta curr={s.rank} prev={s.prev} />
                  </div>

                  {/* Team */}
                  <div>
                    <p className="text-white font-black text-[12px] uppercase tracking-wide group-hover:text-[#e8a000] transition-colors">
                      {s.team}
                    </p>
                    <p className="text-[#444] text-[9px] tracking-widest">{s.tag}</p>
                  </div>

                  <p className="text-[#27ae60] font-black text-sm">{s.w}</p>
                  <p className="text-[#e84040] font-black text-sm">{s.l}</p>

                  <p className="text-[#e8a000] font-black font-mono text-sm">{s.pts.toLocaleString()}</p>

                  <StreakBadge streak={s.streak} />

                  <p className="text-[#666] text-[11px] font-mono">{s.prize}</p>

                  <TierBadge tier={s.tier} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PLAYERS ── */}
        {tab === 'players' && (
          <div className="flex flex-col gap-1">
            {/* Header */}
            <div className="grid grid-cols-[32px_1fr_80px_80px_60px_60px_60px] gap-3 px-3 mb-2">
              {['#', 'Player', 'Role', 'Signature', 'KDA', 'Win%', 'MVP'].map((h) => (
                <p key={h} className="text-[#333] text-[9px] uppercase tracking-widest font-bold">{h}</p>
              ))}
            </div>

            {PLAYERS.map((p) => (
              <div
                key={p.rank}
                className="grid grid-cols-[32px_1fr_80px_80px_60px_60px_60px] gap-3 items-center px-3 py-3 bg-[#0f0f18] border border-white/[0.05] hover:border-white/[0.12] transition-colors group cursor-pointer"
              >
                {/* Rank */}
                <span className="text-white font-black text-sm font-mono text-center">
                  {p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank-1] : p.rank}
                </span>

                {/* Player */}
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 overflow-hidden shrink-0 border border-white/10">
                    <Image src={p.image} alt={p.ign} fill className="object-cover grayscale group-hover:grayscale-0 transition-all" />
                  </div>
                  <div>
                    <p className="text-white font-black text-[12px] tracking-wide group-hover:text-[#e8a000] transition-colors">{p.ign}</p>
                    <p className="text-[#444] text-[9px] tracking-widest">{p.team}</p>
                  </div>
                </div>

                {/* Role */}
                <span
                  className="flex items-center gap-1 text-[9px] font-black tracking-wide uppercase px-1.5 py-0.5 w-fit"
                  style={{ color: ROLE_META[p.role].color, background: `${ROLE_META[p.role].color}22`, border: `1px solid ${ROLE_META[p.role].color}33` }}
                >
                  {ROLE_META[p.role].icon} {p.role}
                </span>

                {/* Hero */}
                <p className="text-[#666] text-[11px] tracking-wide">{p.hero}</p>

                {/* KDA */}
                <p className="text-white font-black text-sm font-mono">{p.kda}</p>

                {/* Win rate */}
                <div>
                  <p className="text-[#27ae60] font-bold text-[11px] font-mono">{p.wr}</p>
                  <div className="w-full h-0.5 bg-white/[0.05] mt-1 overflow-hidden">
                    <div className="h-full bg-[#27ae60]" style={{ width: p.wr }} />
                  </div>
                </div>

                {/* MVP count */}
                <div className="flex items-center gap-1">
                  <Crown size={9} className="text-[#e8a000]" />
                  <p className="text-[#e8a000] font-black text-sm">{p.mvp}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── HERO META ── */}
        {tab === 'meta' && (
          <div>
            <p className="text-[#444] text-[10px] tracking-[0.3em] uppercase mb-4">
              Ghana Season 5 · Most picked & banned heroes in competitive play
            </p>

            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_80px_80px_80px_60px] gap-4 px-3 mb-2">
              {['Hero', 'Role', 'Pick%', 'Ban%', 'Win%', 'Tier'].map((h) => (
                <p key={h} className="text-[#333] text-[9px] uppercase tracking-widest font-bold">{h}</p>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              {HERO_META.map((h) => (
                <div
                  key={h.hero}
                  className="grid grid-cols-[1fr_80px_80px_80px_80px_60px] gap-4 items-center px-3 py-3 bg-[#0f0f18] border border-white/[0.05] hover:border-white/[0.12] transition-colors cursor-pointer group"
                >
                  <p className="text-white font-black text-[13px] tracking-wide group-hover:text-[#e8a000] transition-colors">{h.hero}</p>

                  <span
                    className="flex items-center gap-1 text-[9px] font-black tracking-wide uppercase px-1.5 py-0.5 w-fit"
                    style={{ color: ROLE_META[h.role].color, background: `${ROLE_META[h.role].color}22`, border: `1px solid ${ROLE_META[h.role].color}33` }}
                  >
                    {ROLE_META[h.role].icon} {h.role}
                  </span>

                  {/* Pick bar */}
                  <div>
                    <p className="text-[#4a90d9] font-mono text-[11px] font-bold">{h.pickRate}</p>
                    <div className="w-full h-0.5 bg-white/[0.05] mt-1">
                      <div className="h-full bg-[#4a90d9]" style={{ width: h.pickRate }} />
                    </div>
                  </div>

                  {/* Ban bar */}
                  <div>
                    <p className="text-[#e84040] font-mono text-[11px] font-bold">{h.banRate}</p>
                    <div className="w-full h-0.5 bg-white/[0.05] mt-1">
                      <div className="h-full bg-[#e84040]" style={{ width: h.banRate }} />
                    </div>
                  </div>

                  {/* Win rate bar */}
                  <div>
                    <p className="text-[#27ae60] font-mono text-[11px] font-bold">{h.wr}</p>
                    <div className="w-full h-0.5 bg-white/[0.05] mt-1">
                      <div className="h-full bg-[#27ae60]" style={{ width: h.wr }} />
                    </div>
                  </div>

                  <TierBadge tier={h.tier} />
                </div>
              ))}
            </div>

            <p className="text-[#2a2a2a] text-[9px] tracking-wide mt-6 text-center uppercase">
              Data sourced from APL S5 · AFL S5.1 · Ghana MLBB Open 2024 · IESF Africa Qualifier
            </p>
          </div>
        )}

      </div>
    </main>
  );
}