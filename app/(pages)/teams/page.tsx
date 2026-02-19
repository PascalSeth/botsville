'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Shield, Zap, Swords, Star, Target, Wind, Trophy, Search, X } from 'lucide-react';

// ── Role system ────────────────────────────────────────────
const ROLE_META = {
  Tank:      { color: '#4a90d9', icon: <Shield size={10} />, bg: '#4a90d922' },
  Fighter:   { color: '#e8a000', icon: <Swords size={10} />, bg: '#e8a00022' },
  Assassin:  { color: '#e84040', icon: <Zap    size={10} />, bg: '#e8404022' },
  Mage:      { color: '#9b59b6', icon: <Star   size={10} />, bg: '#9b59b622' },
  Marksman:  { color: '#27ae60', icon: <Target size={10} />, bg: '#27ae6022' },
  Support:   { color: '#16a085', icon: <Wind   size={10} />, bg: '#16a08522' },
};
type Role = keyof typeof ROLE_META;

// ── Teams data ─────────────────────────────────────────────
const TEAMS = [
  {
    id: 1, name: 'CERUS AL EGAN', tag: 'CAE', rank: 1, tier: 'S',
    wins: 38, losses: 6, points: 10145, prize: '₵4,800', region: 'Accra', color: '#e8a000',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80',
    trophies: ['APL Season 5 Champions', 'Ghana MLBB Open 2024'],
    players: [
      { ign: 'Zephyr',  role: 'Tank'     as Role, hero: 'Tigreal',  realName: 'Kwame A.' },
      { ign: 'Vortex',  role: 'Fighter'  as Role, hero: 'Chou',     realName: 'Kofi M.'  },
      { ign: 'ShadowX', role: 'Assassin' as Role, hero: 'Hayabusa', realName: 'Ebo T.'   },
      { ign: 'ArcMage', role: 'Mage'     as Role, hero: 'Kagura',   realName: 'Ama S.'   },
      { ign: 'Snipe',   role: 'Marksman' as Role, hero: 'Granger',  realName: 'Nii K.'   },
    ],
  },
  {
    id: 2, name: 'AD57 AUY', tag: 'AD57', rank: 2, tier: 'S',
    wins: 33, losses: 9, points: 10003, prize: '₵3,200', region: 'Kumasi', color: '#cc3333',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80',
    trophies: ['APL Season 4 Runners-Up'],
    players: [
      { ign: 'IronWall', role: 'Tank'     as Role, hero: 'Gloo',      realName: 'Yaw P.'   },
      { ign: 'Rampage',  role: 'Fighter'  as Role, hero: 'Alucard',   realName: 'Fiifi B.' },
      { ign: 'Ghost',    role: 'Assassin' as Role, hero: 'Ling',      realName: 'Kojo D.'  },
      { ign: 'Lumen',    role: 'Mage'     as Role, hero: 'Valentina', realName: 'Abena R.' },
      { ign: 'Pulse',    role: 'Marksman' as Role, hero: 'Wanwan',    realName: 'Nana A.'  },
    ],
  },
  {
    id: 3, name: 'AEDF AJAY', tag: 'AJAY', rank: 3, tier: 'A',
    wins: 28, losses: 12, points: 9045, prize: '₵2,100', region: 'Takoradi', color: '#9b59b6',
    image: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=600&q=80',
    trophies: ['AFL Season 5.1 Top 3'],
    players: [
      { ign: 'Bastion', role: 'Tank'     as Role, hero: 'Khufra',  realName: 'Sena A.'   },
      { ign: 'Crusher', role: 'Fighter'  as Role, hero: 'Freya',   realName: 'Efua K.'   },
      { ign: 'Fang',    role: 'Assassin' as Role, hero: 'Fanny',   realName: 'Ato G.'    },
      { ign: 'Wisp',    role: 'Mage'     as Role, hero: 'Harith',  realName: 'Akosua B.' },
      { ign: 'Bolt',    role: 'Marksman' as Role, hero: 'Beatrix', realName: 'Kwesi L.'  },
    ],
  },
  {
    id: 4, name: 'YACD3 SQUAD', tag: 'YCD3', rank: 4, tier: 'A',
    wins: 24, losses: 16, points: 8200, prize: '₵1,400', region: 'Accra', color: '#27ae60',
    image: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=600&q=80',
    trophies: [],
    players: [
      { ign: 'Aegis',  role: 'Tank'     as Role, hero: 'Fredrinn', realName: 'Fiifi M.' },
      { ign: 'Strike', role: 'Fighter'  as Role, hero: 'Argus',    realName: 'Kpodo J.' },
      { ign: 'Blade',  role: 'Assassin' as Role, hero: 'Saber',    realName: 'Ebo N.'   },
      { ign: 'Ember',  role: 'Mage'     as Role, hero: 'Pharsa',   realName: 'Adwoa M.' },
      { ign: 'Arrow',  role: 'Marksman' as Role, hero: 'Moskov',   realName: 'Nii O.'   },
    ],
  },
  {
    id: 5, name: 'PHANTOM LORDS', tag: 'PHXL', rank: 5, tier: 'B',
    wins: 19, losses: 21, points: 6750, prize: '₵800', region: 'Tema', color: '#16a085',
    image: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=600&q=80',
    trophies: [],
    players: [
      { ign: 'Bulwark', role: 'Tank'     as Role, hero: 'Minotaur', realName: 'Kwame L.' },
      { ign: 'Rogue',   role: 'Fighter'  as Role, hero: 'Leomord',  realName: 'Kofi S.'  },
      { ign: 'Wraith',  role: 'Assassin' as Role, hero: 'Helcurt',  realName: 'Ebo A.'   },
      { ign: 'Mystic',  role: 'Mage'     as Role, hero: 'Cecilion', realName: 'Akua D.'  },
      { ign: 'Reaper',  role: 'Marksman' as Role, hero: 'Kimmy',    realName: 'Nana B.'  },
    ],
  },
  {
    id: 6, name: 'VENOM RISING', tag: 'VNMR', rank: 6, tier: 'B',
    wins: 15, losses: 25, points: 5120, prize: '₵500', region: 'Cape Coast', color: '#4a90d9',
    image: 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=600&q=80',
    trophies: [],
    players: [
      { ign: 'Titan', role: 'Tank'     as Role, hero: 'Uranus',    realName: 'Sena K.'  },
      { ign: 'Valor', role: 'Fighter'  as Role, hero: 'Guinevere', realName: 'Efua A.'  },
      { ign: 'Shade', role: 'Assassin' as Role, hero: 'Lancelot',  realName: 'Kwesi A.' },
      { ign: 'Flux',  role: 'Mage'     as Role, hero: 'Kadita',    realName: 'Ama P.'   },
      { ign: 'Trace', role: 'Marksman' as Role, hero: 'Irithel',   realName: 'Yaw S.'   },
    ],
  },
];

const TIER_COLORS: Record<string, string> = { S: '#e8a000', A: '#4a90d9', B: '#9b59b6', C: '#555' };

// ── Role Badge ─────────────────────────────────────────────
const RoleBadge = ({ role }: { role: Role }) => {
  const m = ROLE_META[role];
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-black tracking-wide uppercase px-1.5 py-0.5 shrink-0"
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.color}33` }}
    >
      {m.icon} {role}
    </span>
  );
};

// ── Team Card ──────────────────────────────────────────────
const TeamCard = ({ team, onClick }: { team: typeof TEAMS[0]; onClick: () => void }) => (
  <div
    onClick={onClick}
    className="group cursor-pointer bg-[#0f0f18] border border-white/[0.06] hover:border-white/20 transition-all duration-300 overflow-hidden flex flex-col"
  >
    <div className="h-0.5 w-full shrink-0" style={{ background: team.color }} />

    <div className="relative h-28 sm:h-32 overflow-hidden shrink-0">
      <Image src={team.image} alt={team.name} fill
        className="object-cover brightness-50 group-hover:brightness-60 group-hover:scale-105 transition-all duration-500" />
      <div className="absolute inset-0 bg-linear-to-t from-[#0f0f18] via-transparent to-transparent" />
      <div className="absolute top-2 left-2 flex items-center gap-1.5">
        <span className="bg-black/70 text-white font-black text-[10px] px-2 py-0.5 font-mono">#{team.rank}</span>
        <span className="font-black text-[10px] px-2 py-0.5"
          style={{ color: TIER_COLORS[team.tier], background: `${TIER_COLORS[team.tier]}22`, border: `1px solid ${TIER_COLORS[team.tier]}44` }}>
          {team.tier}-TIER
        </span>
      </div>
      <div className="absolute bottom-2 left-3">
        <p className="text-white/20 font-black text-3xl tracking-widest select-none">{team.tag}</p>
      </div>
    </div>

    <div className="p-3 flex flex-col gap-2 flex-1">
      <div>
        <p className="text-white font-black text-sm tracking-wide uppercase">{team.name}</p>
        <p className="text-[#555] text-[10px] tracking-widest uppercase">{team.region} · Ghana</p>
      </div>
      <div className="flex items-center gap-3 text-[10px]">
        <span className="text-[#27ae60] font-bold">{team.wins}W</span>
        <span className="text-[#e84040] font-bold">{team.losses}L</span>
        <span className="text-[#555]">·</span>
        <span className="font-mono text-[#e8a000]">{team.points.toLocaleString()} pts</span>
      </div>
      <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 pt-1 border-t border-white/[0.05]">
        {team.players.map((p, i) => (
          <span key={p.ign} className="text-[#555] text-[9px]">
            {p.ign}{i < team.players.length - 1 ? ' ·' : ''}
          </span>
        ))}
      </div>
      {team.trophies.length > 0 && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-white/[0.05]">
          <Trophy size={9} className="text-[#e8a000] shrink-0" />
          <p className="text-[#666] text-[9px] truncate">{team.trophies[0]}</p>
        </div>
      )}
    </div>
  </div>
);

// ── Team Detail Modal (fully responsive) ───────────────────
const TeamDetail = ({ team, onClose }: { team: typeof TEAMS[0]; onClose: () => void }) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Modal panel — slides up from bottom on mobile, centered on desktop */}
      <div
        className="
          relative w-full sm:max-w-lg md:max-w-xl
          bg-[#0d0d14] border-t sm:border border-white/10
          overflow-hidden
          max-h-[92dvh] sm:max-h-[85vh]
          flex flex-col
          sm:mx-4
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Team color top bar */}
        <div className="h-1 w-full shrink-0"
          style={{ background: `linear-gradient(90deg, transparent, ${team.color}, transparent)` }} />

        {/* Close button — always visible top-right */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-7 h-7 bg-black/60 border border-white/10 flex items-center justify-center text-[#666] hover:text-white transition-colors"
          aria-label="Close"
        >
          <X size={13} />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 overscroll-contain">

          {/* Hero image header */}
          <div className="relative h-32 sm:h-40 shrink-0">
            <Image src={team.image} alt={team.name} fill className="object-cover brightness-40" />
            <div className="absolute inset-0 bg-linear-to-t from-[#0d0d14] to-transparent" />
            <div className="absolute bottom-3 left-4 right-12">
              <p className="text-[#555] text-[9px] tracking-[0.3em] uppercase">{team.region} · Ghana</p>
              <h2 className="text-white font-black text-xl sm:text-2xl tracking-wide uppercase leading-tight">{team.name}</h2>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 border-b border-white/[0.06] shrink-0">
            {[
              { label: 'Rank',   value: `#${team.rank}`,           color: 'white'    },
              { label: 'Wins',   value: String(team.wins),          color: '#27ae60'  },
              { label: 'Losses', value: String(team.losses),        color: '#e84040'  },
              { label: 'Prize',  value: team.prize,                 color: '#e8a000'  },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center py-3 border-r border-white/[0.04] last:border-0">
                <p className="text-[8px] text-[#444] uppercase tracking-widest">{s.label}</p>
                <p className="font-black text-base sm:text-lg" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Points row */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
            <p className="text-[#444] text-[9px] tracking-[0.3em] uppercase">Season Points</p>
            <p className="font-black text-lg font-mono" style={{ color: team.color }}>{team.points.toLocaleString()}</p>
          </div>

          {/* Roster */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-[#444] text-[9px] tracking-[0.3em] uppercase mb-3">Active Roster</p>
            <div className="flex flex-col">
              {team.players.map((p) => (
                <div key={p.ign} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0"
                      style={{ color: ROLE_META[p.role].color }}>
                      {ROLE_META[p.role].icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-black text-sm tracking-wide truncate">{p.ign}</p>
                      <p className="text-[#444] text-[9px]">{p.realName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <RoleBadge role={p.role} />
                    <span className="text-[#444] text-[9px] tracking-wide hidden xs:block">on {p.hero}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trophies */}
          {team.trophies.length > 0 && (
            <div className="px-4 pb-4 pt-2 border-t border-white/[0.06]">
              <p className="text-[#444] text-[9px] tracking-[0.3em] uppercase mb-2">Achievements</p>
              {team.trophies.map((t) => (
                <div key={t} className="flex items-center gap-2 py-1.5">
                  <Trophy size={10} className="text-[#e8a000] shrink-0" />
                  <p className="text-[#777] text-[11px]">{t}</p>
                </div>
              ))}
            </div>
          )}

          {/* Bottom safe area padding for mobile */}
          <div className="h-4 sm:h-0" />
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────
export default function TeamsPage() {
  const [selected, setSelected] = useState<typeof TEAMS[0] | null>(null);
  const [filter, setFilter]     = useState<'All' | 'S' | 'A' | 'B'>('All');
  const [search, setSearch]     = useState('');

  const filtered = TEAMS.filter((t) => {
    if (filter !== 'All' && t.tier !== filter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
        !t.tag.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-[#08080d]">

      {/* Page header */}
      <div className="relative border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-[#e8a000]/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex items-end justify-between">
            {/* Title */}
            <div>
              <p className="text-[#e8a000] text-[10px] tracking-[0.4em] uppercase mb-1 font-semibold">
                Ghana MLBB Season 5
              </p>
              <h1 className="text-white font-black text-2xl sm:text-3xl md:text-4xl tracking-tight uppercase">
                Registered Teams
              </h1>
              <p className="text-[#444] text-sm mt-1 tracking-wide">
                {TEAMS.length} squads · IESF Africa qualifier
              </p>
            </div>

            {/* Chou gif */}
            <div className="hidden sm:flex flex-1 justify-end pointer-events-none select-none">
              <Image
                src="/gif/badang.gif"
                alt="Badang"
                width={100}
                height={100}
                className="object-contain drop-shadow-[0_0_24px_rgba(232,160,0,0.35)]"
                unoptimized
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 sm:mb-8">
          {/* Tier filters */}
          <div className="flex items-center gap-1 flex-wrap">
            {(['All', 'S', 'A', 'B'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className="px-3 py-1.5 text-[10px] font-black tracking-[0.15em] uppercase transition-all duration-200 border"
                style={filter === t
                  ? { background: '#e8a000', color: '#000', borderColor: '#e8a000' }
                  : { background: 'transparent', color: '#555', borderColor: '#ffffff10' }
                }
              >
                {t === 'All' ? 'All Tiers' : `${t}-Tier`}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-[#0f0f18] border border-white/[0.07] px-3 py-2 sm:w-60">
            <Search size={12} className="text-[#444] shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team or tag..."
              className="bg-transparent text-white text-[11px] placeholder:text-[#333] outline-none flex-1 tracking-wide min-w-0"
            />
          </div>
        </div>

        {/* Team grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((team) => (
            <TeamCard key={team.id} team={team} onClick={() => setSelected(team)} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#333] font-black text-lg tracking-widest uppercase">No teams found</p>
          </div>
        )}
      </div>

      {selected && <TeamDetail team={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}