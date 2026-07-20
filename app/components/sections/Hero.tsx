'use client';

import Image from 'next/image';
import { motion, AnimatePresence, animate, useAnimationFrame } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ChevronRight, Shield, Users, Trophy, Zap, Play, Lock } from 'lucide-react';
import { useHero } from '../../contexts/HeroContext';
import { getThumbnailUrl, getHeroImageUrl } from '@/lib/image-utils';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type HeroCatalogItem = {
  id: string;
  key: string;
  name: string;
  imageUrl: string;
};

type HeroPanelStats = {
  season: string;
  teams: string;
  players: string;
  prize: string;
};

type TickerTeam = {
  rank: number;
  name: string;
  points: number;
  logo: string;
};

const TEAMS: TickerTeam[] = [
  { rank: 1, name: 'CERUS AL EGAN', points: 10145, logo: '/mlbb_logo.png' },
  { rank: 2, name: 'AD57 AUY', points: 10003, logo: '/mlbb_logo.png' },
  { rank: 3, name: 'AEDF AJAY', points: 9045, logo: '/mlbb_logo.png' },
  { rank: 4, name: 'NOVA STRIKE', points: 8870, logo: '/mlbb_logo.png' },
  { rank: 5, name: 'LEGION GH', points: 8610, logo: '/mlbb_logo.png' },
  { rank: 6, name: 'DARK PACT', points: 8200, logo: '/mlbb_logo.png' },
];

// ─────────────────────────────────────────────────────────────
// ANIMATED COUNTER
// ─────────────────────────────────────────────────────────────
const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState('0');
  useEffect(() => {
    const c = animate(0, value, {
      duration: 2, ease: 'easeOut', delay: 1,
      onUpdate: v => setDisplay(Math.round(v).toLocaleString()),
    });
    return c.stop;
  }, [value]);
  return <>{display}</>;
};

// ─────────────────────────────────────────────────────────────
// TEAM TICKER
// ─────────────────────────────────────────────────────────────
const TeamTicker = () => {
  const [tickerTeams, setTickerTeams] = useState<TickerTeam[]>(TEAMS);
  const trackRef = useRef<HTMLDivElement>(null);
  const xRef = useRef(0);

  useEffect(() => {
    fetch('/api/leaderboards/teams?limit=8', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const standings = Array.isArray(data?.standings) ? data.standings : [];
        const mapped: TickerTeam[] = standings.map((s: { rank?: number; points?: number; team?: { name?: string; logo?: string } }, i: number) => ({
          rank: s?.rank ?? i + 1,
          name: s?.team?.name || `Team ${i + 1}`,
          points: s?.points ?? 0,
          logo: s?.team?.logo || '/mlbb_logo.png',
        })).filter((t: TickerTeam) => t.name.length > 0);
        if (mapped.length > 0) setTickerTeams(mapped);
      })
      .catch(() => undefined);
  }, []);

  const dupe = [...tickerTeams, ...tickerTeams];

  useAnimationFrame(() => {
    const t = trackRef.current;
    if (!t) return;
    xRef.current -= 0.5;
    if (Math.abs(xRef.current) >= t.scrollWidth / 2) xRef.current = 0;
    t.style.transform = `translateX(${xRef.current}px)`;
  });

  return (
    <div className="flex-1 overflow-hidden"
      style={{ maskImage: 'linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)' }}>
      <div ref={trackRef} className="flex gap-3 will-change-transform" style={{ width: 'max-content' }}>
        {dupe.map((team, i) => (
          <div key={i} className="flex items-center gap-2.5 px-4 py-2 shrink-0 rounded-sm"
            style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.3)', minWidth: 190 }}>
            <span
              className="w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-black shrink-0"
              style={{ background: team.rank <= 3 ? '#e8a000' : 'rgba(255,255,255,0.08)', color: team.rank <= 3 ? '#000' : 'rgba(255,255,255,0.5)' }}>
              {team.rank}
            </span>
            <div className="relative w-5 h-5 rounded-sm overflow-hidden shrink-0">
              <Image src={getThumbnailUrl(team.logo)} alt={team.name} fill className="object-cover" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wide text-white/80 truncate flex-1">{team.name}</span>
            <span className="text-[9px] font-mono shrink-0" style={{ color: team.rank <= 3 ? '#e8a000' : 'rgba(255,255,255,0.3)' }}>
              <AnimatedNumber value={team.points} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// HERO SELECTOR DOCK
// ─────────────────────────────────────────────────────────────
const HeroDock = ({
  heroes, activeKey, selectedKey, onSelectHero, onLockHero, isSaving,
}: {
  heroes: HeroCatalogItem[];
  activeKey: string | null;
  selectedKey: string | null;
  onSelectHero: (h: HeroCatalogItem) => void;
  onLockHero: (h: HeroCatalogItem) => void;
  isSaving: boolean;
}) => (
  <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
    {heroes.map((hero, idx) => {
      const isActive = activeKey === hero.key;
      const isFav = selectedKey === hero.key;
      return (
        <div
          key={hero.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelectHero(hero)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectHero(hero); }}
          className="relative shrink-0 group cursor-pointer"
          style={{ width: 72, aspectRatio: '3/4' }}
        >
          {/* Frame */}
          <div className="absolute inset-0 rounded overflow-hidden transition-all duration-300"
            style={{
              border: isActive ? '2px solid #e8a000' : '2px solid rgba(255,255,255,0.08)',
              boxShadow: isActive ? '0 0 16px rgba(232,160,0,0.5)' : 'none',
            }}>
            <Image
              src={getThumbnailUrl(hero.imageUrl)}
              alt={hero.name}
              fill
              className="object-cover object-top transition-transform duration-500 group-hover:scale-110"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            {/* Active glow */}
            {isActive && (
              <div className="absolute inset-0 bg-[#e8a000]/10" />
            )}
          </div>

          {/* Favorite badge */}
          {isFav && (
            <div className="absolute top-1 left-1 z-10 bg-[#e8a000] rounded-sm px-0.5"
              style={{ fontSize: 6, fontWeight: 900, color: '#000', letterSpacing: '0.1em' }}>
              FAV
            </div>
          )}

          {/* Index */}
          <div className="absolute top-1 right-1 z-10 font-mono text-[8px] text-white/30">
            {String(idx + 1).padStart(2, '0')}
          </div>

          {/* Name */}
          <div className="absolute bottom-0 left-0 right-0 z-10 px-1 pb-1 text-center">
            <p className="text-[7px] font-black uppercase tracking-wide text-white/90 truncate leading-none">{hero.name}</p>
          </div>

          {/* Lock button */}
          {isActive && !isFav && (
            <button
              type="button"
              disabled={isSaving}
              onClick={(e) => { e.stopPropagation(); onLockHero(hero); }}
              title="Save as favorite"
              className="absolute -top-1.5 -right-1.5 z-20 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer border-none outline-none"
              style={{ background: '#e8a000', boxShadow: '0 0 8px #e8a000' }}
            >
              <Lock size={9} className="text-black" />
            </button>
          )}
        </div>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────
// LOGIN MODAL
// ─────────────────────────────────────────────────────────────
const LoginRequiredModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-[#e8a000]/30 bg-[#06060e] p-6 shadow-[0_0_60px_rgba(232,160,0,0.1)]">
        <h2 className="text-white font-black text-sm tracking-widest uppercase mb-2">LOGIN REQUIRED</h2>
        <p className="text-white/50 text-xs tracking-wide leading-relaxed mb-5">Please log in to register your tournament team.</p>
        <div className="flex gap-2.5">
          <Link href="/login?callbackUrl=/register-team" onClick={onClose}
            className="flex-1 bg-[#e8a000] text-black text-[9px] font-black tracking-widest uppercase py-3 text-center rounded hover:bg-[#ffb700] transition-colors">
            LOG IN
          </Link>
          <button type="button" onClick={onClose}
            className="flex-1 border border-white/15 text-white text-[9px] font-black tracking-widest uppercase py-3 hover:bg-white/5 transition-colors cursor-pointer rounded">
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// STAT CHIP
// ─────────────────────────────────────────────────────────────
const StatChip = ({ icon, label, value, gold = false, delay = 0 }: {
  icon: React.ReactNode; label: string; value: string; gold?: boolean; delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    className="flex items-center gap-2.5 px-3 py-2 rounded-lg backdrop-blur-md"
    style={{
      background: gold ? 'rgba(232,160,0,0.12)' : 'rgba(255,255,255,0.05)',
      border: gold ? '1px solid rgba(232,160,0,0.3)' : '1px solid rgba(255,255,255,0.08)',
    }}
  >
    <span style={{ color: gold ? '#e8a000' : 'rgba(255,255,255,0.5)' }}>{icon}</span>
    <div className="flex flex-col leading-none">
      <span className="text-[8px] uppercase tracking-widest font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      <span className="text-sm font-black uppercase tracking-wide mt-0.5" style={{ color: gold ? '#e8a000' : '#fff' }}>{value}</span>
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────
// DESKTOP HERO  — Arena Broadcast
// ─────────────────────────────────────────────────────────────
const DesktopHero = ({
  heroImage, heroName, heroCatalog, activeKey, selectedKey,
  onSelectHero, onLockHero, isSaving, isGlitching, stats,
  onRegisterClick, hasTeam, autoShowcaseActive, toggleAutoShowcase,
}: {
  heroImage: string; heroName: string; heroCatalog: HeroCatalogItem[];
  activeKey: string | null; selectedKey: string | null;
  onSelectHero: (h: HeroCatalogItem) => void; onLockHero: (h: HeroCatalogItem) => void;
  isSaving: boolean; isGlitching: boolean; stats: HeroPanelStats;
  onRegisterClick: (e: MouseEvent<HTMLAnchorElement>) => void;
  hasTeam: boolean; autoShowcaseActive: boolean; toggleAutoShowcase: () => void;
}) => (
  <section className="hidden md:block relative w-full overflow-hidden" style={{ background: '#020408', minHeight: '100vh' }}>

    {/* ── FULL-BLEED VIDEO ── */}
    <div className="absolute inset-0 z-0">
      <video autoPlay loop muted playsInline preload="metadata"
        className="w-full h-full object-cover object-center"
        style={{ opacity: 0.75 }}>
        <source src="/vid/hero.mp4" type="video/mp4" />
      </video>
      {/* Gradient fade: left-side content area darkens, right stays bright */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, rgba(2,4,8,0.92) 0%, rgba(2,4,8,0.55) 40%, rgba(2,4,8,0.1) 70%, rgba(2,4,8,0.0) 100%)' }} />
      {/* Bottom gradient into rest of page */}
      <div className="absolute bottom-0 left-0 right-0 h-40"
        style={{ background: 'linear-gradient(to bottom, transparent 0%, #020408 100%)' }} />
      {/* Top fade for navbar blend */}
      <div className="absolute top-0 left-0 right-0 h-32"
        style={{ background: 'linear-gradient(to bottom, rgba(2,4,8,0.6) 0%, transparent 100%)' }} />
    </div>


    {/* ── CONTENT LAYER ── */}
    <div className="relative z-10 flex flex-col justify-between min-h-screen pt-24 pb-0">

      {/* === TOP SECTION: two-column row === */}
      <div className="px-12 xl:px-20 flex items-center gap-0 mt-8 flex-1">

        {/* LEFT: Text content */}
        <div className="flex flex-col gap-7 flex-1 min-w-0">

          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex items-center gap-2.5"
          >
            <span className="flex items-center gap-1.5 text-[10px] font-mono font-black tracking-widest uppercase px-3 py-1.5 rounded"
              style={{ background: 'rgba(232,160,0,0.15)', border: '1px solid rgba(232,160,0,0.35)', color: '#e8a000' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#e8a000] animate-pulse" />
              GHANA ESPORTS LIVE
            </span>
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">BOTSVILLE.GG</span>
          </motion.div>

          {/* Main title */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="font-black uppercase leading-none text-white"
              style={{
                fontFamily: '"Barlow Condensed", "Anton", sans-serif',
                fontSize: 'clamp(56px, 6vw, 100px)',
                letterSpacing: '-0.02em',
                lineHeight: 0.92,
                textShadow: '0 0 80px rgba(232,160,0,0.25)',
              }}
            >
              GHANA&apos;S #1<br />
              <span style={{
                background: 'linear-gradient(90deg, #e8a000 0%, #ffcc44 50%, #e8a000 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                MLBB ARENA
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.7 }}
              className="mt-4 text-sm xl:text-base font-medium leading-relaxed max-w-sm"
              style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.01em' }}
            >
              Compete, climb the ranks, and claim glory in Mobile Legends tournaments across Ghana.
            </motion.p>
          </div>

          {/* Stat chips row */}
          <div className="flex flex-wrap gap-2.5">
            <StatChip icon={<Trophy size={14} />} label="Season" value={stats.season} gold delay={0.65} />
            <StatChip icon={<Shield size={14} />} label="Teams" value={stats.teams} delay={0.75} />
            <StatChip icon={<Users size={14} />} label="Players" value={stats.players} delay={0.85} />
            <StatChip icon={<Zap size={14} />} label="Prize Pool" value={stats.prize} gold delay={0.95} />
          </div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.6 }}
            className="flex items-center gap-3"
          >
            {hasTeam ? (
              <Link href="/my-team"
                className="group flex items-center gap-2 px-7 py-3.5 font-black uppercase tracking-widest text-sm rounded transition-all duration-300 hover:scale-[1.03]"
                style={{ background: 'linear-gradient(90deg, #e8a000, #ffb700)', color: '#000' }}>
                MY TEAM <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <Link href="/register-team" onClick={onRegisterClick}
                className="group flex items-center gap-2 px-7 py-3.5 font-black uppercase tracking-widest text-sm rounded transition-all duration-300 hover:scale-[1.03]"
                style={{ background: 'linear-gradient(90deg, #e8a000, #ffb700)', color: '#000' }}>
                REGISTER TEAM <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
            <Link href="/tournaments"
              className="group flex items-center gap-2 px-7 py-3.5 font-black uppercase tracking-widest text-sm rounded transition-all duration-300 hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)' }}>
              <Play size={14} /> VIEW TOURNAMENTS
            </Link>
          </motion.div>
        </div>

        {/* RIGHT: Hero character */}
        <div className="shrink-0 self-stretch flex items-center" style={{ width: 'clamp(280px, 34vw, 520px)' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={heroImage}
              className="relative w-full h-full pointer-events-none select-none"
              style={{ minHeight: 320 }}
              initial={{ opacity: 0, x: 30, scale: 0.96 }}
              animate={{
                opacity: isGlitching ? [0.5, 1, 0.3, 1] : 1,
                x: 0,
                scale: isGlitching ? [0.97, 1.04, 0.99, 1] : 1,
                filter: isGlitching
                  ? 'drop-shadow(-4px 0 #ff00ff) drop-shadow(4px 0 #00ffff) hue-rotate(60deg)'
                  : 'drop-shadow(0 0 60px rgba(232,160,0,0.3)) drop-shadow(0 0 120px rgba(232,160,0,0.12))',
              }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: isGlitching ? 0.3 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="relative w-full h-full"
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Image
                  src={heroImage} alt={heroName} fill
                  className="object-contain object-center"
                  priority
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      {/* === BOTTOM SECTION: Selector + Ticker === */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.7 }}
        className="mt-auto"
      >
        {/* Hero name + active hero label */}
        <div className="px-12 xl:px-20 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/30">[HERO SELECT]</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={heroName}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.25 }}
                className="text-xs font-black uppercase tracking-widest"
                style={{ color: isGlitching ? '#ff00ff' : '#e8a000', fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.15em' }}
              >
                {heroName}
              </motion.span>
            </AnimatePresence>
          </div>
          <button
            onClick={toggleAutoShowcase}
            className="flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-widest px-2.5 py-1 rounded transition-colors cursor-pointer"
            style={{
              border: '1px solid rgba(255,255,255,0.1)',
              color: autoShowcaseActive ? '#10b981' : 'rgba(255,255,255,0.35)',
              background: 'rgba(0,0,0,0.3)',
            }}
          >
            <span className="w-1 h-1 rounded-full" style={{ background: autoShowcaseActive ? '#10b981' : 'rgba(255,255,255,0.3)' }} />
            {autoShowcaseActive ? 'AUTO' : 'PAUSED'}
          </button>
        </div>

        {/* Selector strip */}
        <div className="px-12 xl:px-20 pb-4">
          <HeroDock
            heroes={heroCatalog} activeKey={activeKey} selectedKey={selectedKey}
            onSelectHero={onSelectHero} onLockHero={onLockHero} isSaving={isSaving}
          />
        </div>

        {/* Ticker bar */}
        <div className="flex items-stretch overflow-hidden"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(12px)',
            height: 48,
          }}>
          {/* Label */}
          <div className="flex items-center gap-2.5 px-5 shrink-0"
            style={{ background: '#e8a000', minWidth: 160 }}>
            <Image src="/mlbb_logo.png" alt="logo" width={16} height={16} className="object-contain brightness-0 shrink-0" />
            <div className="flex flex-col leading-none">
              <span className="text-[6px] font-black tracking-widest uppercase text-black/50 font-mono">LEADERBOARD</span>
              <span className="text-[10px] font-black uppercase tracking-wide text-black font-mono">TOP TEAMS</span>
            </div>
            <svg viewBox="0 0 30 100" preserveAspectRatio="none"
              className="absolute right-0 translate-x-full top-0 h-full w-6" style={{ color: '#e8a000', position: 'relative' }}>
              <polygon points="30,0 30,100 0,100" fill="currentColor" />
            </svg>
          </div>
          <TeamTicker />
        </div>
      </motion.div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────
// MOBILE HERO  — Arena Broadcast (compact)
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// MOBILE HERO  — Arena Broadcast (compact)
// ─────────────────────────────────────────────────────────────
const MobileHero = ({
  heroImage, heroName, heroCatalog, activeKey, selectedKey,
  onSelectHero, onLockHero, isSaving, isGlitching, stats,
  onRegisterClick, hasTeam, autoShowcaseActive, toggleAutoShowcase,
}: {
  heroImage: string; heroName: string; heroCatalog: HeroCatalogItem[];
  activeKey: string | null; selectedKey: string | null;
  onSelectHero: (h: HeroCatalogItem) => void; onLockHero: (h: HeroCatalogItem) => void;
  isSaving: boolean; isGlitching: boolean; stats: HeroPanelStats;
  onRegisterClick: (e: MouseEvent<HTMLAnchorElement>) => void;
  hasTeam: boolean; autoShowcaseActive: boolean; toggleAutoShowcase: () => void;
}) => (
  <section className="md:hidden relative w-full overflow-hidden flex flex-col" style={{ background: '#020408' }}>

    {/* ── VIDEO STAGE (top) ── */}
    <div className="relative w-full" style={{ height: '45vw', minHeight: 180, maxHeight: 280 }}>
      <video autoPlay loop muted playsInline preload="metadata"
        className="absolute inset-0 w-full h-full object-cover object-center"
        style={{ opacity: 0.8 }}>
        <source src="/vid/hero.mp4" type="video/mp4" />
      </video>

      {/* Overlays */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(2,4,8,0.3) 0%, rgba(2,4,8,0.05) 40%, rgba(2,4,8,0.85) 100%)' }} />

      {/* Top status */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[9px] font-mono font-black tracking-widest uppercase px-2.5 py-1 rounded"
          style={{ background: 'rgba(232,160,0,0.2)', border: '1px solid rgba(232,160,0,0.4)', color: '#e8a000' }}>
          <span className="w-1 h-1 rounded-full bg-[#e8a000] animate-pulse" />
          LIVE
        </span>
        <button
          onClick={toggleAutoShowcase}
          className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest px-2 py-1 rounded cursor-pointer"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: autoShowcaseActive ? '#10b981' : 'rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.4)' }}
        >
          <span className="w-1 h-1 rounded-full" style={{ background: autoShowcaseActive ? '#10b981' : 'rgba(255,255,255,0.2)' }} />
          {autoShowcaseActive ? 'AUTO' : 'PAUSED'}
        </button>
      </div>
    </div>

    {/* ── CONTENT BELOW VIDEO ── */}
    <div className="flex flex-col gap-4 px-4 pt-4 pb-0" style={{ background: '#020408' }}>

      {/* Title + Hero image row — vertically centered */}
      <div className="flex items-center gap-4">
        {/* Title on the left */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex-1 font-black uppercase leading-none text-white"
          style={{
            fontFamily: '"Barlow Condensed", "Anton", sans-serif',
            fontSize: 'clamp(32px, 10vw, 52px)',
            letterSpacing: '-0.02em',
            lineHeight: 0.93,
          }}
        >
          GHANA&apos;S #1<br />
          <span style={{
            background: 'linear-gradient(90deg, #e8a000, #ffcc44)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            MLBB ARENA
          </span>
        </motion.h1>

        {/* Hero image on the right — centered with headline */}
        <AnimatePresence mode="wait">
          <motion.div
            key={heroImage}
            className="relative shrink-0 pointer-events-none select-none"
            style={{ width: 'clamp(110px, 28vw, 180px)', aspectRatio: '3.5/4' }}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{
              opacity: isGlitching ? [0.4, 1, 0.3, 1] : 1,
              x: 0,
              scale: isGlitching ? [0.97, 1.05, 0.98, 1] : 1,
              filter: isGlitching
                ? 'drop-shadow(-3px 0 #ff00ff) drop-shadow(3px 0 #00ffff)'
                : 'drop-shadow(0 0 20px rgba(232,160,0,0.4))',
            }}
            exit={{ opacity: 0, x: 10, scale: 0.95 }}
            transition={{ duration: isGlitching ? 0.25 : 0.5 }}
          >
            <motion.div
              className="relative w-full h-full"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image
                src={heroImage} alt={heroName} fill
                className="object-contain object-center"
                priority
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Hero name below title */}
      <div className="flex items-center gap-2">
        <span className="text-[8px] font-mono uppercase tracking-widest text-white/25">[HERO SELECT]</span>
        <AnimatePresence mode="wait">
          <motion.p
            key={heroName}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[10px] font-mono font-black uppercase tracking-widest"
            style={{ color: isGlitching ? '#ff00ff' : '#e8a000' }}
          >
            {heroName}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Stat chips — 2x2 grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatChip icon={<Trophy size={12} />} label="Season" value={stats.season} gold delay={0.4} />
        <StatChip icon={<Shield size={12} />} label="Teams" value={stats.teams} delay={0.45} />
        <StatChip icon={<Users size={12} />} label="Players" value={stats.players} delay={0.5} />
        <StatChip icon={<Zap size={12} />} label="Prize Pool" value={stats.prize} gold delay={0.55} />
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
        className="flex gap-2.5"
      >
        {hasTeam ? (
          <Link href="/my-team"
            className="flex-1 flex items-center justify-center gap-1.5 py-3 font-black uppercase tracking-widest text-xs rounded"
            style={{ background: 'linear-gradient(90deg,#e8a000,#ffb700)', color: '#000' }}>
            MY TEAM <ChevronRight size={13} />
          </Link>
        ) : (
          <Link href="/register-team" onClick={onRegisterClick}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 font-black uppercase tracking-widest text-xs rounded"
            style={{ background: 'linear-gradient(90deg,#e8a000,#ffb700)', color: '#000' }}>
            REGISTER <ChevronRight size={13} />
          </Link>
        )}
        <Link href="/tournaments"
          className="flex items-center justify-center gap-1.5 px-4 py-3 font-black uppercase tracking-widest text-xs rounded"
          style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
          <Play size={12} />
        </Link>
      </motion.div>

      {/* Hero dock label */}
      <div className="flex items-center gap-2 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="text-[8px] font-mono uppercase tracking-widest text-white/25">[HERO SELECT]</span>
      </div>

      {/* Hero dock */}
      <HeroDock
        heroes={heroCatalog} activeKey={activeKey} selectedKey={selectedKey}
        onSelectHero={onSelectHero} onLockHero={onLockHero} isSaving={isSaving}
      />

      {/* Ticker */}
      <div className="flex items-stretch overflow-hidden -mx-4"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.5)',
          height: 44,
        }}>
        <div className="flex items-center gap-2 px-3 shrink-0"
          style={{ background: '#e8a000', minWidth: 100 }}>
          <Image src="/mlbb_logo.png" alt="logo" width={14} height={14} className="object-contain brightness-0 shrink-0" />
          <span className="text-[8px] font-black uppercase tracking-wide text-black font-mono">TOP TEAMS</span>
        </div>
        <TeamTicker />
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────
// EXPORT MAIN
// ─────────────────────────────────────────────────────────────
export const Hero = () => {
  const { loading, heroCatalog, selectedKey, selectHero } = useHero();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const [hasTeam, setHasTeam] = useState(false);
  const [isSavingHero, setIsSavingHero] = useState(false);
  const [activeCatalogIndex, setActiveCatalogIndex] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);
  const [autoShowcaseActive, setAutoShowcaseActive] = useState(true);
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());

  const [panelStats, setPanelStats] = useState<HeroPanelStats>({
    season: 'S4', teams: '6', players: '120+', prize: '₵12.8K',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/leaderboards/teams?limit=50', { cache: 'no-store' }),
      fetch('/api/teams?limit=50', { cache: 'no-store' }),
    ]).then(async ([lr, tr]) => {
      const ld = lr.ok ? await lr.json() : null;
      const td = tr.ok ? await tr.json() : null;
      const standings = Array.isArray(ld?.standings) ? ld.standings : [];
      const teams = Array.isArray(td?.teams) ? td.teams : [];
      const seasonName: string | undefined = ld?.season?.name;
      const teamsCount = Number(ld?.pagination?.total ?? teams.length ?? 0);
      const playersCount = teams.reduce((t: number, team: { _count?: { players?: number } }) =>
        t + (typeof team?._count?.players === 'number' ? team._count.players : 0), 0);
      const topPrize = standings.reduce((m: number, s: { team?: { totalPrizeMoney?: number } }) => {
        const p = Number(s?.team?.totalPrizeMoney ?? 0);
        return Number.isFinite(p) ? Math.max(m, p) : m;
      }, 0);
      setPanelStats({
        season: seasonName && typeof seasonName === 'string' ? seasonName : 'ACTIVE',
        teams: String(teamsCount || 0),
        players: playersCount > 0 ? `${playersCount}+` : '0',
        prize: topPrize > 0 ? `₵${Math.round(topPrize).toLocaleString()}` : '₵0',
      });
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) { setHasTeam(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/api/my-team');
        if (!resp.ok) { if (!cancelled) setHasTeam(false); return; }
        const data = await resp.json();
        if (!cancelled) setHasTeam(Boolean(data && (data.id || data.team || data.teamId || (Array.isArray(data.players) && data.players.length > 0))));
      } catch { if (!cancelled) setHasTeam(false); }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  useEffect(() => {
    if (heroCatalog.length > 0 && selectedKey) {
      const idx = heroCatalog.findIndex(h => h.key === selectedKey);
      if (idx !== -1) setActiveCatalogIndex(idx);
    }
  }, [heroCatalog, selectedKey]);

  useEffect(() => {
    if (heroCatalog.length <= 1) return;
    const interval = setInterval(() => {
      const isIdle = Date.now() - lastInteractionTime > 10000;
      if (autoShowcaseActive && isIdle) {
        setIsGlitching(true);
        setActiveCatalogIndex(prev => (prev + 1) % heroCatalog.length);
        setTimeout(() => setIsGlitching(false), 350);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [heroCatalog, autoShowcaseActive, lastInteractionTime]);

  const activeHero = useMemo(() =>
    heroCatalog.length === 0 ? null : heroCatalog[activeCatalogIndex] || heroCatalog[0],
    [heroCatalog, activeCatalogIndex]);

  const activeImage = getHeroImageUrl(activeHero?.imageUrl || '/stunchou.png');
  const activeName = activeHero?.name || 'CHOU';
  const activeKey = activeHero?.key || null;

  const handleSelectHero = (hero: HeroCatalogItem) => {
    const idx = heroCatalog.findIndex(h => h.key === hero.key);
    if (idx !== -1) {
      setIsGlitching(true);
      setActiveCatalogIndex(idx);
      setLastInteractionTime(Date.now());
      setTimeout(() => setIsGlitching(false), 350);
    }
  };

  const handleLockFavorite = async (hero: HeroCatalogItem) => {
    try { setIsSavingHero(true); await selectHero(hero); }
    catch { /* ignore */ }
    finally { setIsSavingHero(false); }
  };

  const handleRegisterClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (status === 'unauthenticated') { e.preventDefault(); setIsLoginModalOpen(true); }
  };

  const toggleAutoShowcase = () => {
    setAutoShowcaseActive(p => !p);
    setLastInteractionTime(Date.now());
  };

  const sharedProps = {
    heroImage: activeImage, heroName: activeName, heroCatalog,
    activeKey, selectedKey, onSelectHero: handleSelectHero,
    onLockHero: handleLockFavorite, isSaving: isSavingHero,
    isGlitching, stats: panelStats, onRegisterClick: handleRegisterClick,
    hasTeam, autoShowcaseActive, toggleAutoShowcase,
  };

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&display=swap');`}</style>

      {loading || heroCatalog.length === 0 ? (
        <section className="relative w-full overflow-hidden flex items-center justify-center"
          style={{ background: '#020408', minHeight: '100vh' }}>
          <div className="absolute inset-0">
            <video autoPlay loop muted playsInline preload="metadata"
              className="w-full h-full object-cover" style={{ opacity: 0.4 }}>
              <source src="/vid/hero.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-[#020408]/60" />
          </div>
          <div className="relative z-10 flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase"
            style={{ color: '#e8a000' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#e8a000] animate-pulse" />
            LOADING ARENA...
          </div>
        </section>
      ) : (
        <>
          <MobileHero {...sharedProps} />
          <DesktopHero {...sharedProps} />
          <LoginRequiredModal open={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        </>
      )}
    </>
  );
};