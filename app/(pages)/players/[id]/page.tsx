'use client';

import React, { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Trophy,
  Flame,
  Shield,
  Star,
  Loader2,
  Crown,
  ChevronRight,
  Activity,
  Sword,
  Skull,
  TrendingUp,
  Gamepad2,
  ChevronLeft,
  Sparkles,
  Radio,
  Play,
  Target,
  Zap,
  Crosshair,
  Award,
  Swords,
  Clock,
  BarChart3,
  Hexagon,
  CircleDot,
  FlameKindling,
  Medal,
  GitBranch,
  Eye,
  Fingerprint,
  ScanLine,
  Orbit,
  Layers,
  Gauge,
  Radar,
  Scan,
  AlignLeft,
  Grid3X3,
  List,
  Filter,
  ArrowUpRight,
  Minus,
  Plus,
  X,
  ChevronDown,
  Bookmark,
  Heart,
  Percent,
  Hash,
  Gamepad2Icon,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// TYPES (unchanged)
// ─────────────────────────────────────────────────────────

interface PlayerInfo {
  id: string;
  ign: string;
  realName: string | null;
  role: string;
  secondaryRole: string | null;
  signatureHero: string | null;
  photo: string | null;
  rankBadge: string | null;
  region: string | null;
  headline: string | null;
  team: {
    id: string;
    name: string;
    tag: string;
    color: string | null;
    logo: string | null;
  } | null;
}

interface PlayerStats {
  totalGames: number;
  totalWins: number;
  winRate: number;
  overallKda: number;
  killPressure: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  mvpCount: number;
  maniacs: number;
  savages: number;
}

interface HeroStat {
  hero: string;
  games: number;
  wins: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  imageUrl?: string | null;
}

interface RecentGame {
  matchId: string;
  gameNumber: number;
  hero: string;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  isMvp: boolean;
  maniacs: number;
  savages: number;
  won: boolean;
  date: string;
  vsTeam: string | null;
  imageUrl?: string | null;
}

interface ProfileData {
  player: PlayerInfo;
  stats: PlayerStats | null;
  heroBreakdown: HeroStat[];
  recentGames: RecentGame[];
  hasData: boolean;
}

// ─────────────────────────────────────────────────────────
// ROLE CONFIG
// ─────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, {
  glow: string;
  accent: string;
  accentLight: string;
  gradient: string;
  gradientText: string;
  border: string;
  icon: React.ReactNode;
  hexColor: string;
}> = {
  EXP: {
    glow: 'shadow-orange-500/30',
    accent: '#ff7b00',
    accentLight: '#ffb366',
    gradient: 'from-orange-600 via-orange-400 to-yellow-400',
    gradientText: 'bg-gradient-to-r from-orange-400 to-yellow-300',
    border: 'border-orange-500/30',
    icon: <Shield size={16} />,
    hexColor: '#ff7b00',
  },
  JUNGLE: {
    glow: 'shadow-red-500/30',
    accent: '#ff2e63',
    accentLight: '#ff6b8a',
    gradient: 'from-red-600 via-red-400 to-pink-500',
    gradientText: 'bg-gradient-to-r from-red-400 to-pink-300',
    border: 'border-red-500/30',
    icon: <Crosshair size={16} />,
    hexColor: '#ff2e63',
  },
  MID: {
    glow: 'shadow-purple-500/30',
    accent: '#a855f7',
    accentLight: '#c084fc',
    gradient: 'from-purple-600 via-purple-400 to-fuchsia-500',
    gradientText: 'bg-gradient-to-r from-purple-400 to-fuchsia-300',
    border: 'border-purple-500/30',
    icon: <Zap size={16} />,
    hexColor: '#a855f7',
  },
  GOLD: {
    glow: 'shadow-yellow-500/30',
    accent: '#facc15',
    accentLight: '#fde047',
    gradient: 'from-yellow-500 via-amber-400 to-orange-400',
    gradientText: 'bg-gradient-to-r from-yellow-400 to-orange-300',
    border: 'border-yellow-500/30',
    icon: <Target size={16} />,
    hexColor: '#facc15',
  },
  ROAM: {
    glow: 'shadow-cyan-500/30',
    accent: '#06b6d4',
    accentLight: '#67e8f9',
    gradient: 'from-cyan-500 via-cyan-400 to-blue-500',
    gradientText: 'bg-gradient-to-r from-cyan-400 to-blue-300',
    border: 'border-cyan-500/30',
    icon: <Orbit size={16} />,
    hexColor: '#06b6d4',
  },
};

const getRoleCfg = (r: string) => ROLE_CONFIG[r] ?? ROLE_CONFIG.ROAM;

// ─────────────────────────────────────────────────────────
// ANIMATED COUNTER
// ─────────────────────────────────────────────────────────

function AnimatedCounter({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{display.toFixed(decimals)}{suffix}</span>;
}

// ─────────────────────────────────────────────────────────
// HEXAGON BADGE
// ─────────────────────────────────────────────────────────

function HexBadge({ children, color, size = 'md' }: { children: React.ReactNode; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-9 text-[10px]',
    md: 'w-12 h-14 text-xs',
    lg: 'w-16 h-18 text-sm',
  };

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      <svg viewBox="0 0 100 115" className="absolute inset-0 w-full h-full" style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}>
        <polygon
          points="50,2 95,27.5 95,82.5 50,108 5,82.5 5,27.5"
          fill={`${color}15`}
          stroke={color}
          strokeWidth="2"
        />
      </svg>
      <div className="relative z-10 font-black" style={{ color }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// CIRCULAR PROGRESS
// ─────────────────────────────────────────────────────────

function CircularProgress({ value, max = 100, size = 120, strokeWidth = 8, color, label, sublabel }: {
  value: number; max?: number; size?: number; strokeWidth?: number; color: string; label: string; sublabel?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const dashoffset = circumference - progress * circumference;

  return (
    <div className="relative flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{value.toFixed(1)}</span>
          {sublabel && <span className="text-[9px] uppercase tracking-wider text-white/30">{sublabel}</span>}
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// RADAR CHART (SVG)
// ─────────────────────────────────────────────────────────

function RadarChart({ stats, color }: { stats: { kda: number; winRate: number; killPressure: number; avgKills: number; avgAssists: number }; color: string }) {
  const values = [
    stats.kda / 10,
    stats.winRate / 100,
    stats.killPressure / 100,
    stats.avgKills / 20,
    stats.avgAssists / 20,
  ];
  const labels = ['KDA', 'WIN', 'AGR', 'KILLS', 'AST'];
  const size = 200;
  const center = size / 2;
  const radius = 70;
  const angleStep = (Math.PI * 2) / 5;

  const points = values.map((v, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = radius * Math.min(v, 1);
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
  }).join(' ');

  const gridPoints = [0.2, 0.4, 0.6, 0.8, 1].map(scale => {
    return Array.from({ length: 5 }, (_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = radius * scale;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(' ');
  });

  return (
    <div className="relative w-[200px] h-[200px]">
      <svg width={size} height={size} className="absolute inset-0">
        {gridPoints.map((pts, i) => (
          <polygon key={i} points={pts} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}
        {Array.from({ length: 5 }, (_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return (
            <line key={i}
              x1={center} y1={center}
              x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1"
            />
          );
        })}
        <polygon points={points} fill={`${color}25`} stroke={color} strokeWidth="2" style={{ filter: `drop-shadow(0 0 8px ${color}50)` }} />
        {values.map((v, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const r = radius * Math.min(v, 1);
          return (
            <circle key={i}
              cx={center + r * Math.cos(angle)} cy={center + r * Math.sin(angle)}
              r="4" fill={color} stroke="rgba(0,0,0,0.8)" strokeWidth="2"
            />
          );
        })}
      </svg>
      {labels.map((label, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const r = radius + 20;
        return (
          <span key={i}
            className="absolute text-[9px] font-black tracking-wider text-white/40"
            style={{
              left: `${center + r * Math.cos(angle)}px`,
              top: `${center + r * Math.sin(angle)}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SPARKLINE
// ─────────────────────────────────────────────────────────

function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 120;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}60)` }}
      />
      {data.map((v, i) => {
        const x = (i / (data.length - 1 || 1)) * width;
        const y = height - ((v - min) / range) * height;
        return (
          <circle key={i} cx={x} cy={y} r="3" fill={color} stroke="rgba(0,0,0,0.8)" strokeWidth="1" />
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// TROPHY CASE
// ─────────────────────────────────────────────────────────

function TrophyCase({ stats, color }: { stats: PlayerStats; color: string }) {
  const trophies = [
    { icon: <Crown size={20} />, label: 'MVP', value: stats.mvpCount, color: '#fbbf24' },
    { icon: <Flame size={20} />, label: 'MANIACS', value: stats.maniacs, color: '#f97316' },
    { icon: <Sword size={20} />, label: 'SAVAGES', value: stats.savages, color: '#ef4444' },
    { icon: <Star size={20} />, label: 'GAMES', value: stats.totalGames, color: '#a855f7' },
    { icon: <Trophy size={20} />, label: 'WINS', value: stats.totalWins, color: '#22c55e' },
    { icon: <Target size={20} />, label: 'KILLS', value: stats.totalKills, color: color },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {trophies.map((trophy, i) => (
        <div key={i} className="group relative rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-4 hover:border-white/20 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(135deg, ${trophy.color}10, transparent)` }} />
          <div className="relative flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${trophy.color}15`, color: trophy.color }}>
              {trophy.icon}
            </div>
            <span className="text-xl font-black" style={{ color: trophy.color }}>
              <AnimatedCounter value={trophy.value} />
            </span>
            <span className="text-[9px] uppercase tracking-[0.25em] text-white/30 font-bold">{trophy.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ═══════════════ REDESIGNED HERO SECTION ══════════════════
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// MASTERY TIER CALCULATOR
// ─────────────────────────────────────────────────────────

function getMasteryTier(games: number, winRate: number, kda: number): {
  tier: 'S' | 'A' | 'B' | 'C';
  level: number;
  label: string;
  color: string;
} {
  const score = (games * 2) + (winRate * 3) + (kda * 10);
  if (score >= 400) return { tier: 'S', level: 7, label: 'Godlike', color: '#fbbf24' };
  if (score >= 250) return { tier: 'A', level: 5, label: 'Elite', color: '#a855f7' };
  if (score >= 150) return { tier: 'B', level: 3, label: 'Veteran', color: '#3b82f6' };
  return { tier: 'C', level: 1, label: 'Novice', color: '#6b7280' };
}

// ─────────────────────────────────────────────────────────
// MASTERY BADGE
// ─────────────────────────────────────────────────────────

function MasteryBadge({ tier, level, color }: { tier: string; level: number; color: string }) {
  return (
    <div className="relative flex items-center gap-1.5">
      <div className="relative w-8 h-8">
        <svg viewBox="0 0 36 40" className="w-full h-full">
          <polygon
            points="18,2 34,11 34,29 18,38 2,29 2,11"
            fill={`${color}20`}
            stroke={color}
            strokeWidth="1.5"
          />
          <text x="18" y="24" textAnchor="middle" fill={color} fontSize="14" fontWeight="900">{tier}</text>
        </svg>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className={`w-1 h-3 rounded-full ${i < level ? '' : 'bg-white/10'}`} style={i < level ? { background: color, boxShadow: `0 0 4px ${color}` } : {}} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SIGNATURE HERO SHOWCASE (Large featured card)
// ─────────────────────────────────────────────────────────

function SignatureHeroShowcase({ hero, color }: { hero: HeroStat; color: string }) {
  const tier = getMasteryTier(hero.games, hero.winRate, hero.kda);

  return (
    <div className="relative rounded-[32px] overflow-hidden border border-white/10 bg-[#0a0a14] group">
      {/* Background */}
      <div className="absolute inset-0">
        {hero.imageUrl ? (
          <Image src={hero.imageUrl} alt={hero.hero} fill className="object-cover object-top opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#111827] to-[#1e293b]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a14] via-[#0a0a14]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14] via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-8 lg:p-10 flex flex-col lg:flex-row items-start lg:items-center gap-8">
        {/* Hero Image */}
        <div className="relative w-32 h-32 lg:w-40 lg:h-40 rounded-3xl overflow-hidden border-2 shrink-0" style={{ borderColor: `${color}40` }}>
          {hero.imageUrl ? (
            <Image src={hero.imageUrl} alt={hero.hero} fill className="object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1e293b] to-[#0f172a]" />
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}30, transparent)` }} />
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider" style={{ borderColor: `${color}40`, color: color, background: `${color}10` }}>
              Signature Pick
            </span>
            <MasteryBadge tier={tier.tier} level={tier.level} color={tier.color} />
          </div>

          <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tight text-white">{hero.hero}</h2>
          <p className="text-sm text-white/40">{tier.label} Mastery — {hero.games} games played</p>

          {/* Stats row */}
          <div className="flex items-center gap-6 pt-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Win Rate</p>
              <p className="text-2xl font-black" style={{ color: hero.winRate >= 50 ? '#4ade80' : '#f87171' }}>{hero.winRate}%</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">KDA</p>
              <p className="text-2xl font-black" style={{ color }}>{hero.kda.toFixed(2)}</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Games</p>
              <p className="text-2xl font-black text-white">{hero.games}</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Wins</p>
              <p className="text-2xl font-black text-emerald-400">{hero.wins}</p>
            </div>
          </div>
        </div>

        {/* Win rate ring */}
        <div className="shrink-0 hidden lg:block">
          <CircularProgress value={hero.winRate} max={100} color={hero.winRate >= 50 ? '#4ade80' : '#f87171'} label="Win Rate" size={100} strokeWidth={6} sublabel="%" />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 px-8 lg:px-10 py-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sword size={14} className="text-white/20" />
          <span className="text-xs text-white/30">{hero.kills} kills · {hero.deaths} deaths · {hero.assists} assists</span>
        </div>
        <div className="h-1.5 w-32 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(hero.kda / 10) * 100}%`, background: color, boxShadow: `0 0 10px ${color}60` }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// HERO GRID CARD (Redesigned - no horizontal scroll)
// ─────────────────────────────────────────────────────────

function HeroGridCard({ hero, color, index }: { hero: HeroStat; color: string; index: number }) {
  const tier = getMasteryTier(hero.games, hero.winRate, hero.kda);
  const [hovered, setHovered] = useState(false);

  return (
    <div 
      className="group relative rounded-2xl border border-white/10 bg-[#0d0d18] overflow-hidden hover:border-white/25 transition-all duration-300"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ boxShadow: hovered ? `0 0 30px ${tier.color}15` : 'none' }}
    >
      {/* Top bar with tier */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-white/20">#{index + 1}</span>
          <span className="text-xs font-bold" style={{ color: tier.color }}>{tier.tier} Tier</span>
        </div>
        <MasteryBadge tier={tier.tier} level={tier.level} color={tier.color} />
      </div>

      {/* Hero image area */}
      <div className="relative h-40 overflow-hidden">
        {hero.imageUrl ? (
          <Image src={hero.imageUrl} alt={hero.hero} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1e293b] to-[#0f172a]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d18] via-transparent to-transparent" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${tier.color}10, transparent)` }} />

        {/* Hero name overlay */}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-xl font-black uppercase tracking-tight text-white">{hero.hero}</h3>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-3">
        {/* Win rate bar */}
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Win Rate</span>
            <span className="text-xs font-black" style={{ color: hero.winRate >= 50 ? '#4ade80' : '#f87171' }}>{hero.winRate}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-700"
              style={{ 
                width: `${hero.winRate}%`, 
                background: hero.winRate >= 50 ? '#4ade80' : '#f87171',
                boxShadow: `0 0 8px ${hero.winRate >= 50 ? '#4ade80' : '#f87171'}40`
              }} 
            />
          </div>
        </div>

        {/* KDA bar */}
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">KDA Ratio</span>
            <span className="text-xs font-black" style={{ color }}>{hero.kda.toFixed(2)}</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-700"
              style={{ 
                width: `${Math.min((hero.kda / 10) * 100, 100)}%`, 
                background: color,
                boxShadow: `0 0 8px ${color}40`
              }} 
            />
          </div>
        </div>

        {/* Bottom stats */}
        <div className="pt-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Gamepad2Icon size={12} className="text-white/20" />
            <span className="text-white/40 font-bold">{hero.games} games</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy size={12} className="text-emerald-400/60" />
            <span className="text-emerald-400/80 font-bold">{hero.wins} wins</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// HERO STATS TABLE (Compact inline)
// ─────────────────────────────────────────────────────────

function HeroSortHeader({
  label,
  sortKey,
  sortBy,
  onSort,
}: {
  label: string;
  sortKey: 'games' | 'winRate' | 'kda' | 'kills';
  sortBy: string;
  onSort: (key: 'games' | 'winRate' | 'kda' | 'kills') => void;
}) {
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold transition-colors ${sortBy === sortKey ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
    >
      {label}
      <ChevronDown size={10} className={`transition-transform ${sortBy === sortKey ? 'rotate-180' : ''}`} />
    </button>
  );
}

function HeroStatsTable({ heroes, color, sortBy, onSort }: { 
  heroes: HeroStat[]; 
  color: string; 
  sortBy: string;
  onSort: (key: 'games' | 'winRate' | 'kda' | 'kills') => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d18] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left"><span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Hero</span></th>
              <th className="px-4 py-3 text-center"><HeroSortHeader label="Games" sortKey="games" sortBy={sortBy} onSort={onSort} /></th>
              <th className="px-4 py-3 text-center"><HeroSortHeader label="Win %" sortKey="winRate" sortBy={sortBy} onSort={onSort} /></th>
              <th className="px-4 py-3 text-center"><HeroSortHeader label="KDA" sortKey="kda" sortBy={sortBy} onSort={onSort} /></th>
              <th className="px-4 py-3 text-center"><HeroSortHeader label="Kills" sortKey="kills" sortBy={sortBy} onSort={onSort} /></th>
              <th className="px-4 py-3 text-center"><span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Tier</span></th>
            </tr>
          </thead>
          <tbody>
            {heroes.map((hero, i) => {
              const tier = getMasteryTier(hero.games, hero.winRate, hero.kda);
              return (
                <tr key={hero.hero} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0">
                        {hero.imageUrl ? (
                          <Image src={hero.imageUrl} alt={hero.hero} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#1e293b]" />
                        )}
                      </div>
                      <span className="font-bold text-white text-sm">{hero.hero}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-white/60">{hero.games}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-black ${hero.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {hero.winRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-black" style={{ color }}>{hero.kda.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center text-sm text-white/40">{hero.kills}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black uppercase" style={{ background: `${tier.color}15`, color: tier.color }}>
                      {tier.tier}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MATCH CARD (Enhanced)
// ─────────────────────────────────────────────────────────

function MatchCard({ game, index, color }: { game: RecentGame; index: number; color: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      className={`group relative rounded-[20px] border transition-all duration-300 overflow-hidden cursor-pointer ${
        game.won ? 'border-emerald-500/20 hover:border-emerald-400/50' : 'border-red-500/20 hover:border-red-400/50'
      }`}
      style={{ background: game.won ? 'rgba(16, 185, 129, 0.03)' : 'rgba(239, 68, 68, 0.03)' }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${game.won ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ boxShadow: `0 0 10px ${game.won ? '#10b981' : '#ef4444'}` }} />

      <div className="p-5 flex items-center gap-5">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0 group-hover:scale-105 transition-transform">
          {game.imageUrl ? (
            <Image src={game.imageUrl} alt={game.hero} fill className="object-cover" />
          ) : (
            <div className="w-full h-full bg-[#111827]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <span className="absolute bottom-1 left-1 text-[9px] font-black text-white/80 uppercase">{game.hero.slice(0, 3)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-black text-white">{game.hero}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
              game.won ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
              {game.won ? 'VICTORY' : 'DEFEAT'}
            </span>
            {game.isMvp && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                MVP
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1"><Clock size={10} /> {game.date.split('T')[0]}</span>
            {game.vsTeam && <span className="flex items-center gap-1"><Swords size={10} /> vs {game.vsTeam}</span>}
            <span className="flex items-center gap-1"><Activity size={10} /> KDA {game.kda.toFixed(2)}</span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 text-2xl font-black">
            <span className="text-emerald-400">{game.kills}</span>
            <span className="text-white/20 text-lg">/</span>
            <span className="text-red-400">{game.deaths}</span>
            <span className="text-white/20 text-lg">/</span>
            <span className="text-cyan-400">{game.assists}</span>
          </div>
          <div className="mt-1 flex items-center justify-end gap-2">
            {game.maniacs > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-orange-400">
                <Flame size={10} /> {game.maniacs}
              </span>
            )}
            {game.savages > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                <Skull size={10} /> {game.savages}
              </span>
            )}
          </div>
        </div>

        <div className={`shrink-0 text-white/20 group-hover:text-white/60 transition-all ${expanded ? 'rotate-90' : ''}`}>
          <ChevronRight size={18} />
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 pt-0 border-t border-white/5">
          <div className="pt-4 grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Kill Share</p>
              <p className="text-lg font-black mt-1" style={{ color }}>{((game.kills / (game.kills + game.assists || 1)) * 100).toFixed(0)}%</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">KDA Ratio</p>
              <p className="text-lg font-black mt-1 text-cyan-400">{game.kda.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Game Impact</p>
              <p className="text-lg font-black mt-1 text-amber-400">{game.isMvp ? 'HIGH' : 'MED'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Match ID</p>
              <p className="text-lg font-black mt-1 text-white/60">#{game.matchId.slice(-4)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────

export default function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'heroes' | 'matches'>('overview');
  const [matchFilter, setMatchFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [heroSort, setHeroSort] = useState<'games' | 'winRate' | 'kda' | 'kills'>('games');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    fetch(`/api/players/${id}/stats`)
      .then((r) => r.json())
      .then((j) => setData(j.data ?? j))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <main className="min-h-screen bg-[#050508] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Crosshair size={20} className="text-cyan-400" />
          </div>
        </div>
        <p className="text-white/40 uppercase tracking-[0.5em] text-xs font-black animate-pulse">Loading Profile</p>
      </div>
    </main>
  );

  if (!data?.player) return (
    <main className="min-h-screen bg-[#050508] flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-8xl font-black text-white/5">404</h1>
        <p className="mt-4 text-white/40 uppercase tracking-[0.4em] text-sm font-bold">Player Not Found</p>
        <p className="mt-2 text-white/20 text-sm">This agent has gone dark</p>
      </div>
    </main>
  );

  const { player, stats, heroBreakdown, recentGames, hasData } = data;
  const roleCfg = getRoleCfg(player.role);

  const filteredMatches = matchFilter === 'all' ? recentGames : 
    matchFilter === 'wins' ? recentGames.filter(g => g.won) : 
    recentGames.filter(g => !g.won);

  const sortedHeroes = [...heroBreakdown].sort((a, b) => {
    if (heroSort === 'games') return b.games - a.games;
    if (heroSort === 'winRate') return b.winRate - a.winRate;
    if (heroSort === 'kda') return b.kda - a.kda;
    return b.kills - a.kills;
  });

  return (
    <main className="min-h-screen bg-[#050508] text-white overflow-x-hidden relative selection:bg-cyan-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1400px] h-[800px] rounded-full opacity-30" 
          style={{ background: `radial-gradient(ellipse, ${roleCfg.hexColor}20, transparent 70%)`, filter: 'blur(100px)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-20" 
          style={{ background: `radial-gradient(circle, ${roleCfg.hexColor}15, transparent 70%)`, filter: 'blur(80px)' }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[size:100%_4px] opacity-30 pointer-events-none" />
      </div>

      <div className="relative z-10">
        <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#050508]/80 backdrop-blur-xl">
          <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/leaderboard" className="group flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center group-hover:border-white/30 transition-all">
                <ChevronLeft size={16} />
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-black">Back to</p>
                <p className="text-xs font-bold text-white/60">Leaderboard</p>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              {player.team && (
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03]">
                  {player.team.logo && (
                    <div className="w-7 h-7 rounded-lg overflow-hidden relative">
                      <Image src={player.team.logo} alt="" fill className="object-cover" />
                    </div>
                  )}
                  <span className="text-sm font-black text-white/80">{player.team.name}</span>
                  <span className="text-[10px] font-bold text-white/30 px-1.5 py-0.5 rounded bg-white/5">{player.team.tag}</span>
                </div>
              )}
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 8px #34d399' }} />
            </div>
          </div>
        </nav>

        <div className="max-w-[1600px] mx-auto px-6 pb-20">
          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ═══════════════ DESKTOP PLAYER BANNER ═══════════════════ */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <section className="mt-6 relative">
            <div className="relative rounded-[32px] overflow-hidden border border-white/10 bg-[#08080f]">

              {/* === DESKTOP LAYOUT (lg+) === */}
              <div className="hidden lg:block">
                <div className="relative min-h-[520px] flex">

                  {/* LEFT PANEL — Player Info */}
                  <div className="relative z-20 w-[55%] p-10 xl:p-14 flex flex-col justify-between">

                    {/* Top meta */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div 
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-xl"
                        style={{ borderColor: `${roleCfg.hexColor}50`, background: `${roleCfg.hexColor}12` }}
                      >
                        <span style={{ color: roleCfg.hexColor }}>{roleCfg.icon}</span>
                        <span className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: roleCfg.hexColor }}>
                          {player.role}
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: roleCfg.hexColor, boxShadow: `0 0 8px ${roleCfg.hexColor}` }} />
                      </div>

                      {player.team && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
                          {player.team.logo && (
                            <div className="w-5 h-5 rounded-md overflow-hidden relative">
                              <Image src={player.team.logo} alt="" fill className="object-cover" />
                            </div>
                          )}
                          <span className="text-xs font-black text-white/70">{player.team.tag}</span>
                        </div>
                      )}

                      {player.region && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04]">
                          <Target size={12} className="text-white/30" />
                          <span className="text-xs font-bold text-white/40">{player.region}</span>
                        </div>
                      )}
                    </div>

                    {/* Center content */}
                    <div className="space-y-5 py-8">
                      <h1 
                        className="text-[5rem] xl:text-[6.5rem] font-black uppercase tracking-[-0.04em] leading-[0.9]"
                        style={{ 
                          background: `linear-gradient(180deg, #ffffff 0%, ${roleCfg.hexColor}50 100%)`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {player.ign}
                      </h1>

                      {player.realName && (
                        <p className="text-lg text-white/25 font-medium tracking-wide">{player.realName}</p>
                      )}

                      {player.headline && (
                        <p className="max-w-md text-white/35 leading-relaxed text-sm">{player.headline}</p>
                      )}
                    </div>

                    {/* Stat pills */}
                    {stats && (
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
                          <HexBadge color={roleCfg.hexColor} size="sm">{stats.overallKda.toFixed(1)}</HexBadge>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">KDA</p>
                            <p className="text-sm font-black text-white/80">{stats.avgKills.toFixed(1)} / {stats.avgDeaths.toFixed(1)} / {stats.avgAssists.toFixed(1)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] backdrop-blur-xl">
                          <div className="w-10 h-10 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <TrendingUp size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Win Rate</p>
                            <p className="text-xl font-black text-emerald-400">{stats.winRate}%</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] backdrop-blur-xl">
                          <div className="w-10 h-10 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-400">
                            <Crown size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">MVP</p>
                            <p className="text-xl font-black text-amber-400">{stats.mvpCount}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
                          <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/40">
                            <Gamepad2 size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Matches</p>
                            <p className="text-xl font-black text-white/70">{stats.totalGames}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT PANEL — Full Player Image */}
                  <div className="relative z-10 w-[45%] flex items-end justify-center">
                    {/* Background glow behind player */}
                    <div 
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full opacity-20 blur-[100px]"
                      style={{ background: `radial-gradient(circle, ${roleCfg.hexColor}, transparent 70%)` }}
                    />

                    {/* Player image — full height, no cropping */}
                    <div className="relative w-full h-full flex items-end justify-center">
                      {player.photo ? (
                        <div className="relative w-full h-[90%] mt-auto">
                          <Image 
                            src={player.photo} 
                            alt={player.ign} 
                            fill 
                            priority 
                            className="object-contain object-bottom" 
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-t from-[#1e293b] to-transparent" />
                      )}
                    </div>

                    {/* Right side info cards */}
                    <div className="absolute top-8 right-8 flex flex-col items-end gap-4">
                      {/* Rank */}
                      {player.rankBadge && (
                        <div className="relative">
                          <div 
                            className="absolute -inset-2 rounded-2xl opacity-40 blur-xl"
                            style={{ background: `radial-gradient(circle, ${roleCfg.hexColor}, transparent 70%)` }}
                          />
                          <div className="relative w-24 h-24 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-2 flex items-center justify-center">
                            <Image src={player.rankBadge} alt="Rank" fill className="object-contain p-3" />
                          </div>
                        </div>
                      )}

                      {/* Signature Hero */}
                      {player.signatureHero && (
                        <div className="px-4 py-3 rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl text-right">
                          <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-black">Signature</p>
                          <p className="text-base font-black text-white mt-1">{player.signatureHero}</p>
                        </div>
                      )}

                      {/* Live */}
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06]">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 6px #34d399' }} />
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400/80">Active</span>
                      </div>
                    </div>

                    {/* Gradient overlay from left panel */}
                    <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#08080f] to-transparent" />
                  </div>
                </div>

                {/* Bottom stat bar */}
                {stats && (
                  <div className="relative z-20 px-10 xl:px-14 pb-8 pt-4 border-t border-white/5">
                    <div className="grid grid-cols-6 gap-4">
                      {[
                        { label: 'Total Kills', value: stats.totalKills, color: '#ef4444', icon: <Sword size={14} /> },
                        { label: 'Total Deaths', value: stats.totalDeaths, color: '#f87171', icon: <Skull size={14} /> },
                        { label: 'Total Assists', value: stats.totalAssists, color: '#06b6d4', icon: <Shield size={14} /> },
                        { label: 'Maniacs', value: stats.maniacs, color: '#f97316', icon: <Flame size={14} /> },
                        { label: 'Savages', value: stats.savages, color: '#dc2626', icon: <Sword size={14} /> },
                        { label: 'Aggression', value: `${stats.killPressure.toFixed(0)}%`, color: roleCfg.hexColor, icon: <Zap size={14} /> },
                      ].map((stat, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stat.color}15`, color: stat.color }}>
                            {stat.icon}
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-white/25 font-bold">{stat.label}</p>
                            <p className="text-sm font-black" style={{ color: stat.color }}>{stat.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* === MOBILE LAYOUT (below lg) === */}
              <div className="lg:hidden">
                {/* Background layers */}
                <div className="absolute inset-0">
                  {player.photo ? (
                    <Image 
                      src={player.photo} 
                      alt={player.ign} 
                      fill 
                      priority 
                      className="object-cover object-top scale-110 opacity-40" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#0f172a] to-[#1e1b4b]" />
                  )}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#08080f_80%)]" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${roleCfg.hexColor}20 0%, transparent 50%)` }} />
                  <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#08080f] to-transparent" />
                  <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#08080f]/80 to-transparent" />
                </div>

                <div className="relative z-10 p-6 md:p-8">
                  {/* Meta */}
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <div 
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-xl"
                      style={{ borderColor: `${roleCfg.hexColor}50`, background: `${roleCfg.hexColor}12` }}
                    >
                      <span style={{ color: roleCfg.hexColor }}>{roleCfg.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: roleCfg.hexColor }}>{player.role}</span>
                    </div>
                    {player.team && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04]">
                        <span className="text-[10px] font-black text-white/60">{player.team.tag}</span>
                      </div>
                    )}
                  </div>

                  {/* IGN */}
                  <h1 
                    className="text-5xl md:text-6xl font-black uppercase tracking-[-0.04em] leading-[0.9] mb-2"
                    style={{ 
                      background: `linear-gradient(180deg, #ffffff 0%, ${roleCfg.hexColor}50 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {player.ign}
                  </h1>

                  {player.realName && <p className="text-sm text-white/25 mb-4">{player.realName}</p>}
                  {player.headline && <p className="text-sm text-white/35 mb-6 max-w-sm">{player.headline}</p>}

                  {/* Stats row */}
                  {stats && (
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03]">
                        <HexBadge color={roleCfg.hexColor} size="sm">{stats.overallKda.toFixed(1)}</HexBadge>
                        <span className="text-xs font-bold text-white/60">KDA</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04]">
                        <TrendingUp size={14} className="text-emerald-400" />
                        <span className="text-sm font-black text-emerald-400">{stats.winRate}%</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.04]">
                        <Crown size={14} className="text-amber-400" />
                        <span className="text-sm font-black text-amber-400">{stats.mvpCount}</span>
                      </div>
                    </div>
                  )}

                  {/* Signature + Rank */}
                  <div className="flex items-center gap-3">
                    {player.rankBadge && (
                      <div className="relative w-16 h-16 rounded-xl border border-white/10 bg-black/40 p-2">
                        <Image src={player.rankBadge} alt="Rank" fill className="object-contain p-1" />
                      </div>
                    )}
                    {player.signatureHero && (
                      <div className="px-4 py-2 rounded-xl border border-white/10 bg-black/40">
                        <p className="text-[9px] uppercase tracking-wider text-white/30 font-black">Signature</p>
                        <p className="text-sm font-black text-white">{player.signatureHero}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile bottom stats */}
                {stats && (
                  <div className="relative z-10 px-6 md:px-8 pb-6 pt-2 border-t border-white/5">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Kills', value: stats.totalKills, color: '#ef4444' },
                        { label: 'Deaths', value: stats.totalDeaths, color: '#f87171' },
                        { label: 'Assists', value: stats.totalAssists, color: '#06b6d4' },
                      ].map((stat, i) => (
                        <div key={i} className="text-center py-2">
                          <p className="text-[9px] uppercase tracking-wider text-white/25 font-bold">{stat.label}</p>
                          <p className="text-lg font-black" style={{ color: stat.color }}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Accent lines */}
              <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${roleCfg.hexColor}, transparent)` }} />
            </div>
          </section>
          {/* TAB NAVIGATION */}
          <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2">
            {(['overview', 'heroes', 'matches'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all duration-300 border ${
                  activeTab === tab 
                    ? 'border-white/20 bg-white/10 text-white' 
                    : 'border-transparent text-white/30 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                {tab === 'overview' && <span className="flex items-center gap-2"><ScanLine size={14} /> Overview</span>}
                {tab === 'heroes' && <span className="flex items-center gap-2"><Layers size={14} /> Heroes</span>}
                {tab === 'matches' && <span className="flex items-center gap-2"><List size={14} /> Matches</span>}
              </button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="mt-8 space-y-8">
              {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="col-span-2 lg:col-span-1 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 flex flex-col items-center justify-center gap-3 hover:border-white/20 transition-all">
                    <CircularProgress 
                      value={stats.overallKda} 
                      max={10} 
                      color={roleCfg.hexColor} 
                      label="Combat Rating" 
                      size={140} 
                      strokeWidth={6}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 flex flex-col items-center justify-center gap-3 hover:border-white/20 transition-all">
                    <CircularProgress 
                      value={stats.winRate} 
                      max={100} 
                      color="#10b981" 
                      label="Win Rate" 
                      sublabel="%"
                      size={140} 
                      strokeWidth={6}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-2 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black uppercase tracking-wider text-white/60">Performance Radar</h3>
                      <Radar size={14} className="text-white/20" />
                    </div>
                    <div className="flex justify-center">
                      <RadarChart 
                        stats={{
                          kda: stats.overallKda,
                          winRate: stats.winRate,
                          killPressure: stats.killPressure,
                          avgKills: stats.avgKills,
                          avgAssists: stats.avgAssists,
                        }} 
                        color={roleCfg.hexColor} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {stats && (
                <div className="grid lg:grid-cols-[1fr_1.5fr] gap-6">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white/60 mb-6 flex items-center gap-2">
                      <Award size={16} /> Career Stats
                    </h3>
                    <TrophyCase stats={stats} color={roleCfg.hexColor} />
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white/60 mb-6 flex items-center gap-2">
                      <Activity size={16} /> Recent Form
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Sparkline 
                          data={recentGames.slice(0, 10).map(g => g.kda)} 
                          color={roleCfg.hexColor} 
                          height={60}
                        />
                      </div>
                      <div className="flex gap-1.5">
                        {recentGames.slice(0, 10).map((g, i) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className={`w-3 h-8 rounded-full ${g.won ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ opacity: 0.6 + (i / 10) * 0.4 }} />
                            <span className="text-[8px] text-white/20">{i + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-white/40">
                      <span>Last 10 matches</span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Win
                        <span className="w-2 h-2 rounded-full bg-red-500 ml-2" /> Loss
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {stats && (
                <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-white/60">Aggression Index</h3>
                      <p className="text-xs text-white/30 mt-1">Kill pressure and combat engagement metric</p>
                    </div>
                    <span className="text-3xl font-black" style={{ color: roleCfg.hexColor }}>{stats.killPressure.toFixed(1)}%</span>
                  </div>
                  <div className="h-4 rounded-full bg-white/5 overflow-hidden relative">
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.1)_50%,transparent)] animate-pulse" />
                    <div 
                      className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
                      style={{ 
                        width: `${stats.killPressure}%`, 
                        background: `linear-gradient(90deg, ${roleCfg.hexColor}, ${roleCfg.accentLight})`,
                        boxShadow: `0 0 20px ${roleCfg.hexColor}60`
                      }}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] animate-[shimmer_2s_infinite]" />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between text-[10px] uppercase tracking-wider text-white/20 font-bold">
                    <span>Passive</span>
                    <span>Balanced</span>
                    <span>Aggressive</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ═══════════════ REDESIGNED HEROES TAB ═══════════════════ */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'heroes' && heroBreakdown.length > 0 && (
            <section className="mt-8 space-y-8">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-black">Champion Pool</p>
                  <h2 className="text-3xl font-black tracking-tight mt-1">Hero Mastery</h2>
                  <p className="text-sm text-white/30 mt-1">{heroBreakdown.length} heroes mastered · Sorted by {heroSort === 'games' ? 'games played' : heroSort === 'winRate' ? 'win rate' : heroSort === 'kda' ? 'KDA ratio' : 'total kills'}</p>
                </div>

                <div className="flex items-center gap-3">
                  {/* View toggle */}
                  <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.02] p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
                    >
                      <Grid3X3 size={14} />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all ${viewMode === 'table' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
                    >
                      <List size={14} />
                    </button>
                  </div>

                  {/* Sort */}
                  <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
                    {(['games', 'winRate', 'kda', 'kills'] as const).map(sort => (
                      <button
                        key={sort}
                        onClick={() => setHeroSort(sort)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                          heroSort === sort 
                            ? 'bg-white/10 text-white border border-white/10' 
                            : 'text-white/30 hover:text-white/60'
                        }`}
                      >
                        {sort === 'games' ? 'Games' : sort === 'winRate' ? 'Win %' : sort === 'kda' ? 'KDA' : 'Kills'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Signature Hero (First in sorted list) */}
              {sortedHeroes.length > 0 && (
                <SignatureHeroShowcase hero={sortedHeroes[0]} color={roleCfg.hexColor} />
              )}

              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedHeroes.slice(1).map((hero, i) => (
                    <HeroGridCard 
                      key={hero.hero} 
                      hero={hero} 
                      color={roleCfg.hexColor}
                      index={i + 1}
                    />
                  ))}
                </div>
              )}

              {/* Table View */}
              {viewMode === 'table' && (
                <HeroStatsTable 
                  heroes={sortedHeroes} 
                  color={roleCfg.hexColor}
                  sortBy={heroSort}
                  onSort={setHeroSort}
                />
              )}
            </section>
          )}

          {/* MATCHES TAB */}
          {activeTab === 'matches' && recentGames.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-black">Battle Log</p>
                  <h2 className="text-3xl font-black tracking-tight mt-1">Match History</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {recentGames.slice(0, 15).map((g, i) => (
                      <div key={i} className={`w-2 h-6 rounded-full ${g.won ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ opacity: 0.3 + (i / 15) * 0.7 }} />
                    ))}
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
                    {(['all', 'wins', 'losses'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setMatchFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                          matchFilter === f ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {filteredMatches.map((game, i) => (
                  <MatchCard key={i} game={game} index={i} color={roleCfg.hexColor} />
                ))}
              </div>

              {filteredMatches.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-white/20 text-lg font-bold">No matches found</p>
                  <p className="text-white/10 text-sm mt-2">Try adjusting your filters</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </main>
  );
}