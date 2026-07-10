'use client';

import Image from 'next/image';
import { motion, animate, cubicBezier, useAnimationFrame } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ChevronRight } from 'lucide-react';
import { useHero } from '../../contexts/HeroContext';
import { getThumbnailUrl, getHeroImageUrl } from '@/lib/image-utils';

// ─────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────
const TEAMS = [
  { rank: 1, name: 'CERUS AL EGAN', points: 10145, logo: '/mlbb_logo.png' },
  { rank: 2, name: 'AD57 AUY',       points: 10003, logo: '/mlbb_logo.png' },
  { rank: 3, name: 'AEDF AJAY',      points:  9045, logo: '/mlbb_logo.png' },
  { rank: 4, name: 'NOVA STRIKE',    points:  8870, logo: '/mlbb_logo.png' },
  { rank: 5, name: 'LEGION GH',      points:  8610, logo: '/mlbb_logo.png' },
  { rank: 6, name: 'DARK PACT',      points:  8200, logo: '/mlbb_logo.png' },
];

const EASE = cubicBezier(0.22, 1, 0.36, 1);

type TickerTeam = {
  rank: number;
  name: string;
  points: number;
  logo: string;
};

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

// ─────────────────────────────────────────────────────────────
// ANIMATED NUMBER
// ─────────────────────────────────────────────────────────────
const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState('0');
  useEffect(() => {
    const c = animate(0, value, {
      duration: 1.8, ease: 'easeOut', delay: 0.8,
      onUpdate: v => setDisplay(Math.round(v).toLocaleString()),
    });
    return c.stop;
  }, [value]);
  return <>{display}</>;
};

// ─────────────────────────────────────────────────────────────
// TEXT SCRAMBLE EFFECT
// ─────────────────────────────────────────────────────────────
const TextScramble = ({ text }: { text: string }) => {
  const [display, setDisplay] = useState(text);
  const chars = '!@#$%^&*()_+~`|}{[]:;?><,./-=';

  useEffect(() => {
    let active = true;
    let iteration = 0;
    const interval = setInterval(() => {
      if (!active) return;
      setDisplay(() => {
        return text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            if (index < iteration) {
              return text[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('');
      });
      
      if (iteration >= text.length) {
        clearInterval(interval);
      }
      iteration += 1 / 3;
    }, 25);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [text]);

  return <span className="font-mono">{display}</span>;
};

// ─────────────────────────────────────────────────────────────
// 3D HOLOGRAPHIC PEDESTAL
// ─────────────────────────────────────────────────────────────
const HolographicPedestal = () => (
  <div className="absolute bottom-[5%] left-[4%] md:left-[8%] w-[42vw] max-w-[550px] aspect-[2/1] z-[5] pointer-events-none overflow-visible">
    {/* Glowing perspective line grid */}
    <div 
      className="absolute inset-0 border-t border-cyan-500/25 transition-all duration-1000"
      style={{
        background: `
          linear-gradient(rgba(6, 182, 212, 0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(6, 182, 212, 0.06) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
        transform: 'perspective(280px) rotateX(60deg) translateY(-25%)',
        boxShadow: '0 0 80px rgba(6, 182, 212, 0.2) inset, 0 0 40px rgba(232, 160, 0, 0.1) inset',
      }}
    />
    
    {/* Outer pulsing ring */}
    <motion.div 
      className="absolute inset-x-10 bottom-0 h-10 border border-cyan-500/30 rounded-full"
      style={{
        transform: 'perspective(280px) rotateX(60deg) translateY(45%)',
        boxShadow: '0 0 35px rgba(6, 182, 212, 0.25)',
      }}
      animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.9, 0.5] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    />
    
    {/* Inner spinning dashed ring */}
    <motion.div 
      className="absolute inset-x-20 bottom-1 h-6 border-2 border-dashed rounded-full"
      style={{
        borderColor: 'rgba(232, 160, 0, 0.5)',
        transform: 'perspective(280px) rotateX(60deg) translateY(45%)',
        boxShadow: '0 0 20px rgba(232, 160, 0, 0.15)',
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
    />

    {/* Rising digital data pulses */}
    <div className="absolute inset-0 flex justify-center items-end overflow-hidden">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute w-[50%] h-[1px] bg-cyan-400/40"
          style={{
            transform: 'perspective(280px) rotateX(60deg)',
            filter: 'blur(1px) drop-shadow(0 0 8px #06b6d4)',
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -70, opacity: [0, 0.75, 0] }}
          transition={{ duration: 3, delay: i * 0.9, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// CYBERPUNK HUD OVERLAYS & VIGNETTES
// ─────────────────────────────────────────────────────────────
const CyberHudReadout = ({ heroName, isGlitching }: { heroName: string; isGlitching: boolean }) => (
  <div className="absolute left-[3%] top-[25%] z-20 hidden lg:flex flex-col gap-3 font-mono text-[9px] text-cyan-400/70 pointer-events-none select-none">
    <div className="flex items-center gap-2 border border-cyan-500/25 bg-[#050812]/85 px-2.5 py-1 backdrop-blur-sm rounded">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
      <span>LIVE SHOWCASE</span>
    </div>
    
    <div className="flex flex-col gap-1 border border-white/5 bg-[#050812]/60 px-3 py-2 backdrop-blur-sm rounded">
      <div className="text-white/40 text-[8px] uppercase">SELECTED HERO:</div>
      <div className="text-[10px] font-black uppercase text-[#e8a000] tracking-wider">
        {isGlitching ? 'SCRAMBLING...' : <TextScramble text={heroName} />}
      </div>
      <div className="text-white/30 text-[7px] mt-1 border-t border-white/5 pt-1">
        POSITION: MAIN STAGE
      </div>
    </div>
    
    <div className="flex flex-col gap-1 mt-2">
      <span className="text-[7px] text-white/30">Tap portrait to switch hero</span>
      <div className="w-24 h-1 bg-cyan-500/15 rounded overflow-hidden">
        <motion.div 
          className="h-full bg-cyan-400"
          animate={{ width: ['0%', '100%', '0%'] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  </div>
);

const StageOverlays = () => (
  <>
    {/* Retro Grid background watermark */}
    <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.06]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    />
    {/* Scanlines */}
    <div className="absolute inset-0 pointer-events-none z-[2] opacity-[0.016]"
      style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,#fff 2px,#fff 3px)', backgroundSize: '100% 3px' }} />
    {/* Film grain */}
    <div className="absolute inset-0 pointer-events-none z-[2] mix-blend-overlay opacity-[0.05]"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '200px' }} />
    {/* Radial vignette */}
    <div className="absolute inset-0 pointer-events-none z-[2]"
      style={{ background: 'radial-gradient(ellipse 85% 85% at 50% 45%, transparent 20%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0.95) 100%)' }} />
    {/* Bottom-to-top gradient */}
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-[3]"
      style={{ height: '50%', background: 'linear-gradient(to top, rgba(5,8,18,1) 0%, rgba(5,8,18,0.85) 45%, transparent 100%)' }} />
    {/* Subtle top darkening */}
    <div className="absolute top-0 left-0 right-0 pointer-events-none z-[2]"
      style={{ height: '20%', background: 'linear-gradient(to bottom, rgba(5,8,18,0.75) 0%, transparent 100%)' }} />
  </>
);

// ─────────────────────────────────────────────────────────────
// BACKLIGHTS
// ─────────────────────────────────────────────────────────────
const OrbField = () => (
  <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
    {/* Main backlight behind character */}
    <motion.div className="absolute rounded-full"
      style={{ top: '15%', left: '30%', width: '60%', height: '70%',
        background: 'radial-gradient(ellipse, rgba(6,182,212,0.22) 0%, rgba(6,182,212,0.06) 45%, transparent 70%)', filter: 'blur(60px)' }}
      animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
    {/* Gold glow from below */}
    <motion.div className="absolute rounded-full"
      style={{ bottom: '-10%', left: '25%', width: '50%', height: '40%',
        background: 'radial-gradient(ellipse, rgba(232,160,0,0.18) 0%, transparent 65%)', filter: 'blur(50px)' }}
      animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.95, 1.05, 0.95] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }} />
  </div>
);

// ─────────────────────────────────────────────────────────────
// WATERMARK TEXT
// ─────────────────────────────────────────────────────────────
const GhostTitle = () => (
  <div className="absolute inset-0 z-[4] flex items-center justify-center pointer-events-none select-none overflow-hidden">
    <motion.div
      initial={{ opacity: 0, scale: 1.08 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.6, delay: 0.6, ease: EASE }}
      className="font-black uppercase text-center leading-none"
      style={{
        fontFamily: '"Anton", "Barlow Condensed", sans-serif',
        fontSize: 'clamp(100px, 20vw, 290px)',
        letterSpacing: '-0.04em',
        WebkitTextStroke: '1px rgba(6,182,212,0.12)',
        color: 'transparent',
        lineHeight: 0.85,
        whiteSpace: 'nowrap',
      }}>
      MLBB
    </motion.div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// HERO CHARACTER
// ─────────────────────────────────────────────────────────────
const HeroCharacter = ({ 
  heroImage, 
  heroName,
  isGlitching, 
  onClick 
}: { 
  heroImage: string; 
  heroName: string;
  isGlitching: boolean; 
  onClick?: () => void;
}) => {
  return (
    <motion.div
      className="absolute bottom-0 left-[6%] md:left-[10%] z-[30] pointer-events-auto select-none cursor-pointer"
      style={{
        width: 'clamp(280px, 38vw, 550px)',
        height: '92%',
      }}
      role="button"
      tabIndex={0}
      aria-label={`Showcase ${heroName}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && onClick) {
          event.preventDefault();
          onClick();
        }
      }}
      initial={{ opacity: 0, y: 80, scale: 0.94 }}
      animate={{ 
        opacity: isGlitching ? [0.4, 0.95, 0.3, 1] : 1, 
        y: 0, 
        scale: isGlitching ? [0.95, 1.06, 0.98, 1] : 1,
        skewX: isGlitching ? [-6, 8, -4, 0] : 0,
        filter: isGlitching 
          ? 'hue-rotate(75deg) contrast(140%) saturate(160%) drop-shadow(-6px 0 #ff00ff) drop-shadow(6px 0 #00ffff)' 
          : 'drop-shadow(0 0 50px rgba(6,182,212,0.38)) drop-shadow(0 0 100px rgba(232,160,0,0.22))',
      }}
      transition={{ 
        duration: isGlitching ? 0.35 : 1.4, 
        ease: EASE 
      }}
    >
      <motion.div
        className="relative w-full h-full"
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}>
        {/* Shadow base glow */}
        <motion.div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full"
          style={{ width: '48%', height: 24, background: 'radial-gradient(ellipse, rgba(6,182,212,0.6) 0%, transparent 70%)', filter: 'blur(12px)' }}
          animate={{ opacity: [0.35, 0.85, 0.35], scaleX: [0.75, 1.1, 0.75] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }} />
        <Image
          src={heroImage} alt={heroName} fill
          className="object-contain object-bottom"
          priority />
      </motion.div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// PAGE HEADER
// ─────────────────────────────────────────────────────────────
const TopBar = () => (
  <motion.div
    className="absolute top-0 left-0 right-0 z-[10] flex items-center justify-between px-6 md:px-10 py-5"
    initial={{ opacity: 0, y: -16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.4, duration: 0.7, ease: EASE }}>
    <Link href="/" className="group flex items-center gap-3">
      <span
        className="text-white font-black uppercase text-lg tracking-wider"
        style={{ fontFamily: '"Anton", "Barlow Condensed", sans-serif', letterSpacing: '0.08em' }}>
        BEAGENDA
      </span>
      <span className="hidden sm:inline border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 font-mono text-[8px] px-2 py-0.5 rounded tracking-widest uppercase">
        TOURNAMENT MODE
      </span>
    </Link>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────
// HIGH-TECH RETRO COMMAND PANEL (STATS)
// ─────────────────────────────────────────────────────────────
const CyberTerminalPanel = ({
  stats,
  onRegisterClick,
  hasTeam = false,
  autoShowcaseActive,
  toggleAutoShowcase,
  mobile = false,
}: {
  stats: HeroPanelStats;
  onRegisterClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  hasTeam?: boolean;
  autoShowcaseActive: boolean;
  toggleAutoShowcase: () => void;
  mobile?: boolean;
}) => {
  return (
    <div 
      className={`flex flex-col h-full border border-cyan-500/25 bg-[#050812]/80 backdrop-blur-md rounded-lg overflow-hidden relative ${
        mobile ? 'w-full px-3 py-3 gap-2.5' : 'w-[200px]'
      }`}
      style={{
        boxShadow: '0 0 35px rgba(6, 182, 212, 0.08), inset 0 0 15px rgba(6, 182, 212, 0.04)',
      }}
    >
      {/* Corner crosshairs */}
      <div className="absolute top-1.5 left-1.5 text-cyan-400/40 font-mono text-[8px]">+</div>
      <div className="absolute top-1.5 right-1.5 text-cyan-400/40 font-mono text-[8px]">+</div>
      <div className="absolute bottom-1.5 left-1.5 text-cyan-400/40 font-mono text-[8px]">+</div>
      <div className="absolute bottom-1.5 right-1.5 text-cyan-400/40 font-mono text-[8px]">+</div>
      
      {/* Diagnostic Header */}
      {!mobile && (
        <div className="border-b border-cyan-500/20 px-3.5 py-2 bg-cyan-950/20 flex items-center justify-between">
          <span className="font-mono text-[8px] text-cyan-400 tracking-[0.16em] uppercase">TOURNAMENT STATS</span>
          <div className="flex items-center gap-1">
            <span className={`w-1 h-1 rounded-full ${autoShowcaseActive ? 'bg-green-500 animate-pulse' : 'bg-gold-500'}`} style={{ backgroundColor: autoShowcaseActive ? '#10b981' : '#e8a000' }} />
            <span className="font-mono text-[7px] text-white/50">
              {autoShowcaseActive ? 'AUTO' : 'LOCK'}
            </span>
          </div>
        </div>
      )}

      {/* Stats List */}
      <div className={`flex flex-col justify-around gap-2 px-3.5 ${mobile ? 'py-1' : 'flex-1 py-3'}`}>
        {[
          { label: 'SEASON', value: stats.season, blocks: 4 },
          { label: 'TEAMS', value: stats.teams, blocks: 6 },
          { label: 'PLAYERS', value: stats.players, blocks: 8 },
          { label: 'PRIZE POOL', value: stats.prize, blocks: 10, isGold: true },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-1">
            <div className="flex justify-between items-baseline">
              <span className="font-mono text-[7px] text-white/30 tracking-wider uppercase">{s.label}</span>
              <span className="font-black text-xs uppercase text-white" style={{ fontFamily: '"Anton", "Barlow Condensed", sans-serif', color: s.isGold ? '#e8a000' : '#fff' }}>
                {s.value}
              </span>
            </div>
            
            {/* Custom cyber segments */}
            <div className="flex gap-[2px] h-[5px]">
              {Array.from({ length: 10 }).map((_, idx) => {
                const isLit = idx < s.blocks;
                return (
                  <div
                    key={idx}
                    className="flex-1 rounded-sm transition-all duration-300"
                    style={{
                      backgroundColor: isLit 
                        ? (s.isGold ? '#e8a000' : '#06b6d4') 
                        : 'rgba(255,255,255,0.06)',
                      boxShadow: isLit 
                        ? `0 0 5px ${s.isGold ? '#e8a00077' : '#06b6d477'}` 
                        : 'none',
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Cycle Showcase controls */}
      {!mobile && (
        <div className="px-3.5 py-1.5 border-t border-cyan-500/10 flex items-center justify-between">
          <span className="font-mono text-[7px] text-white/30 uppercase">AUTO ROTATION</span>
          <button
            onClick={toggleAutoShowcase}
            className="px-2 py-0.5 text-[7px] font-mono border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors cursor-pointer"
          >
            {autoShowcaseActive ? 'PAUSE' : 'RESUME'}
          </button>
        </div>
      )}

      {/* CTA Trigger */}
      {hasTeam ? (
        <Link
          href="/my-team"
          className="group relative flex items-center justify-center gap-1 py-2.5 px-3 font-black uppercase text-center transition-all duration-300 select-none overflow-hidden"
          style={{ background: 'linear-gradient(90deg, #a8a8a8 0%, #d4d4d4 100%)', color: '#000', letterSpacing: '0.14em', fontSize: '8px' }}
        >
          <span className="relative z-10 flex items-center gap-1 font-mono text-[8px] font-black">
            MY TEAM
            <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </Link>
      ) : (
        <Link
          href="/register-team"
          onClick={onRegisterClick}
          className="group relative flex items-center justify-center gap-1 py-3 px-3 font-black uppercase text-center transition-all duration-300 select-none overflow-hidden border-t border-gold-500/30"
          style={{ background: 'linear-gradient(90deg, #e8a000 0%, #ffb700 100%)', color: '#000', letterSpacing: '0.14em', fontSize: '8px' }}
        >
          <div className="absolute top-0 left-0 w-full h-[1px] bg-white/50 animate-pulse" />
          <span className="relative z-10 flex items-center gap-1 font-mono text-[8px] font-black">
            REGISTER TEAM
            <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
          <div className="absolute inset-0 bg-white/25 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </Link>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ARCADE SELECTION GRID STRIP
// ─────────────────────────────────────────────────────────────
const ArcadeSelectorDeck = ({
  heroes,
  activeKey,
  selectedKey,
  onSelectHero,
  onLockHero,
  isSaving,
}: {
  heroes: HeroCatalogItem[];
  activeKey: string | null;
  selectedKey: string | null;
  onSelectHero: (hero: HeroCatalogItem) => void;
  onLockHero: (hero: HeroCatalogItem) => void;
  isSaving: boolean;
}) => {
  return (
    <div className="relative w-full border-t border-cyan-500/20 bg-[#04060d]/90 backdrop-blur-md px-6 py-2.5 flex flex-col gap-1.5 z-[40]">
      {/* Grid label row */}
      <div className="flex items-center justify-between font-mono text-[8px]">
        <div className="flex items-center gap-2 text-cyan-400">
          <span>[CHOOSE HERO]</span>
          <span className="text-white/30">|</span>
          <span className="text-white/40">Tap hero to preview, select lock to save</span>
        </div>
        <div className="text-[#e8a000]">
          HEROES: {heroes.length}
        </div>
      </div>

      {/* Slots scroll area */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {heroes.map((hero, idx) => {
          const isCurrentActive = activeKey === hero.key;
          const isLockedFavorite = selectedKey === hero.key;
          
          return (
            <div
              key={hero.id}
              className="flex flex-col gap-1 shrink-0 relative group"
            >
              {/* Card button */}
              <button
                type="button"
                onClick={() => onSelectHero(hero)}
                className={`relative w-20 aspect-[4/5] rounded overflow-hidden border-2 transition-all duration-300 flex flex-col items-center justify-end ${
                  isCurrentActive 
                    ? 'border-cyan-400 scale-[1.02] shadow-[0_0_10px_rgba(6,182,212,0.35)]' 
                    : 'border-white/10 hover:border-white/25'
                }`}
              >
                {/* Crop Image */}
                <div className="absolute inset-0 bg-[#070b1d]">
                  <Image
                    src={getThumbnailUrl(hero.imageUrl)}
                    alt={hero.name}
                    fill
                    className="object-cover object-top opacity-85 group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Scanlines overlay on portrait */}
                  <div className="absolute inset-0 pointer-events-none opacity-20"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 1px,#000 1px,#000 2px)', backgroundSize: '100% 2px' }} />
                  {/* Vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                </div>
                
                {/* Locks indicator */}
                <div className="absolute top-1 left-1 flex flex-col gap-0.5 pointer-events-none">
                  {isLockedFavorite && (
                    <div className="bg-[#e8a000] text-black font-mono text-[6px] font-black px-0.5 py-0.2 rounded-sm uppercase tracking-wide">
                      FAV
                    </div>
                  )}
                </div>

                {/* Index marker */}
                <div className="absolute top-1 right-1 font-mono text-[7px] text-white/30">
                  {String(idx + 1).padStart(2, '0')}
                </div>

                {/* Hero Name Tag */}
                <div className="relative z-10 w-full bg-black/80 px-1 py-0.5 text-center border-t border-white/5">
                  <p className="font-mono text-[7px] font-bold tracking-wide uppercase truncate text-white group-hover:text-cyan-300">
                    {hero.name}
                  </p>
                </div>
              </button>

              {/* Lock as profile favorite indicator click */}
              {isCurrentActive && !isLockedFavorite && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLockHero(hero);
                  }}
                  className="absolute -top-1 -right-1 z-20 w-4 h-4 rounded-full bg-[#e8a000] hover:bg-[#ffb700] text-black flex items-center justify-center cursor-pointer shadow-[0_0_8px_#e8a000] border-none outline-none"
                  title="Save favorite hero to your profile"
                >
                  <svg className="w-2.5 h-2.5 fill-black" viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// TEAM Standings Rankings Ticker
// ─────────────────────────────────────────────────────────────
const TeamTicker = () => {
  const [tickerTeams, setTickerTeams] = useState<TickerTeam[]>(TEAMS);
  const trackRef = useRef<HTMLDivElement>(null);
  const xRef = useRef(0);

  useEffect(() => {
    const loadTickerTeams = async () => {
      try {
        const response = await fetch('/api/leaderboards/teams?limit=8', { cache: 'no-store' });
        if (!response.ok) return;

        const data = await response.json();
        const standings = Array.isArray(data?.standings) ? data.standings : [];

        const mappedTeams: TickerTeam[] = standings
          .map((standing: { rank?: number; points?: number; team?: { name?: string; logo?: string } }, index: number) => ({
            rank: typeof standing?.rank === 'number' ? standing.rank : index + 1,
            name: typeof standing?.team?.name === 'string' && standing.team.name.trim().length > 0
              ? standing.team.name
              : `Team ${index + 1}`,
            points: typeof standing?.points === 'number' ? standing.points : 0,
            logo: typeof standing?.team?.logo === 'string' && standing.team.logo.trim().length > 0
              ? standing.team.logo
              : '/mlbb_logo.png',
          }))
          .filter((team: TickerTeam) => team.name.length > 0);

        if (mappedTeams.length > 0) {
          setTickerTeams(mappedTeams);
        }
      } catch {
        // Keep fallback teams
      }
    };

    loadTickerTeams().catch(() => undefined);
  }, []);

  const tickerDupe = [...tickerTeams, ...tickerTeams];

  useAnimationFrame(() => {
    const t = trackRef.current;
    if (!t) return;
    xRef.current -= 0.45;
    if (Math.abs(xRef.current) >= t.scrollWidth / 2) xRef.current = 0;
    t.style.transform = `translateX(${xRef.current}px)`;
  });

  return (
    <div className="flex-1 overflow-hidden"
      style={{ maskImage: 'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)' }}>
      <div ref={trackRef} className="flex gap-2 py-2 pr-3 will-change-transform" style={{ width: 'max-content' }}>
        {tickerDupe.map((team, i) => (
          <div key={i}
            className="group flex items-center gap-3 px-4 py-2 shrink-0 rounded-md transition-colors duration-200 cursor-default"
            style={{
              minWidth: 200,
              border: '1px solid rgba(6,182,212,0.12)',
              background: 'rgba(5,8,18,0.4)',
            }}>
            <div
              className="w-5 h-5 rounded flex items-center justify-center shrink-0"
              style={{
                background: team.rank <= 3 ? '#e8a000' : 'rgba(6,182,212,0.15)',
                color: team.rank <= 3 ? '#000' : 'rgba(6,182,212,0.8)',
              }}>
              <span className="text-[9px] font-black tabular-nums leading-none">{team.rank}</span>
            </div>
            <div className="relative w-6 h-6 rounded shrink-0 overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <Image src={getThumbnailUrl(team.logo)} alt={team.name} fill className="object-cover" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[9px] font-black uppercase tracking-wider"
                style={{ color: 'rgba(255,255,255,0.85)', fontFamily: '"Anton", "Barlow Condensed", sans-serif' }}>
                {team.name}
              </span>
              <span className="text-[8px] font-bold tabular-nums mt-0.5"
                style={{ color: team.rank <= 3 ? '#e8a000' : 'rgba(6,182,212,0.6)' }}>
                <AnimatedNumber value={team.points} /> PTS
              </span>
            </div>
            <span className="ml-auto text-[8px] font-mono"
              style={{ color: team.rank <= 3 ? '#e8a000' : 'rgba(255,255,255,0.25)' }}>
              RANK {team.rank}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TickerBar = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    className="relative flex overflow-hidden shrink-0"
    style={{
      height: 52,
      borderTop: '1px solid rgba(6,182,212,0.15)',
      borderBottom: '1px solid rgba(6,182,212,0.08)',
      background: 'linear-gradient(180deg, rgba(4,6,14,0.96) 0%, rgba(2,4,12,0.95) 100%)',
      backdropFilter: 'blur(15px)',
    }}
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.7, ease: EASE }}>
    
    {/* Diagonal caution lines on the far edges */}
    <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
      style={{
        backgroundImage: 'repeating-linear-gradient(45deg, #e8a000, #e8a000 10px, transparent 10px, transparent 20px)',
      }} 
    />

    {/* Gold label header */}
    <div className="relative flex items-center gap-2.5 px-4 shrink-0"
      style={{ background: '#e8a000', minWidth: 150 }}>
      <Image src="/mlbb_logo.png" alt="logo" width={18} height={18} className="object-contain brightness-0 shrink-0" />
      <div className="flex flex-col leading-none">
        <span className="text-[6px] font-black tracking-[0.25em] uppercase text-black/50 font-mono">LEADERBOARD</span>
        <span className="text-[10px] font-black uppercase tracking-wide text-black font-mono">TOP TEAMS LIVE</span>
      </div>
      <svg viewBox="0 0 30 100" preserveAspectRatio="none"
        className="absolute right-0 translate-x-full top-0 h-full w-[24px]" style={{ color: '#e8a000' }}>
        <polygon points="30,0 30,100 0,100" fill="currentColor" />
      </svg>
    </div>
    <TeamTicker />
  </motion.div>
);

// ─────────────────────────────────────────────────────────────
// AUTH CHECKS / MODALS
// ─────────────────────────────────────────────────────────────
const LoginRequiredModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close login required modal"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-cyan-500/25 bg-[#05070f] p-6 sm:p-7 shadow-[0_0_60px_rgba(6,182,212,0.15)]">
        <h2 className="text-white font-black text-base tracking-[0.14em] uppercase mb-2 font-mono">LOGIN REQUIRED</h2>
        <p className="text-white/60 text-xs tracking-wide leading-relaxed mb-6 font-mono">
          Please log in to register your tournament team.
        </p>

        <div className="flex items-center gap-2.5">
          <Link
            href="/login?callbackUrl=/register-team"
            onClick={onClose}
            className="flex-1 bg-[#e8a000] text-black text-[9px] font-black tracking-[0.18em] uppercase py-3.5 text-center font-mono hover:bg-[#ffb700] transition-colors rounded">
            LOG IN
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-white/20 text-white text-[9px] font-black tracking-[0.18em] uppercase py-3.5 hover:bg-white/5 transition-colors cursor-pointer rounded font-mono">
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// DESKTOP HERO
// ─────────────────────────────────────────────────────────────
const DesktopHero = ({
  heroImage,
  heroName,
  heroCatalog,
  activeKey,
  selectedKey,
  onSelectHero,
  onLockHero,
  isSaving,
  isGlitching,
  stats,
  onRegisterClick,
  hasTeam = false,
  autoShowcaseActive,
  toggleAutoShowcase,
}: {
  heroImage: string;
  heroName: string;
  heroCatalog: HeroCatalogItem[];
  activeKey: string | null;
  selectedKey: string | null;
  onSelectHero: (hero: HeroCatalogItem) => void;
  onLockHero: (hero: HeroCatalogItem) => void;
  isSaving: boolean;
  isGlitching: boolean;
  stats: HeroPanelStats;
  onRegisterClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  hasTeam?: boolean;
  autoShowcaseActive: boolean;
  toggleAutoShowcase: () => void;
}) => (
  <section className="hidden md:flex flex-col w-full overflow-hidden" style={{ background: '#03050c' }}>
    {/* Viewport stage */}
    <div className="relative flex-1" style={{ height: '74vh', minHeight: 440, maxHeight: 660 }}>
      {/* Background Atmosphere Video */}
      <div className="absolute inset-0 z-0">
        <video autoPlay loop muted playsInline preload="metadata"
          className="w-full h-full object-cover object-center scale-[1.04] opacity-40">
          <source src="/gif/heros.mp4" type="video/mp4" />
        </video>
        {/* Darkening tint */}
        <div className="absolute inset-0 bg-[#03050c]/80 mix-blend-multiply" />
      </div>

      <OrbField />
      <StageOverlays />
      <GhostTitle />
      <HolographicPedestal />
      <CyberHudReadout heroName={heroName} isGlitching={isGlitching} />
      
      <HeroCharacter 
        heroImage={heroImage} 
        heroName={heroName}
        isGlitching={isGlitching} 
        onClick={() => {}}
      />
      
      <TopBar />
      
      {/* Side command stats panel */}
      <div className="absolute right-6 md:right-8 top-1/2 -translate-y-1/2 z-[10] h-[75%] max-h-[360px]">
        <CyberTerminalPanel 
          stats={stats} 
          onRegisterClick={onRegisterClick} 
          hasTeam={hasTeam}
          autoShowcaseActive={autoShowcaseActive}
          toggleAutoShowcase={toggleAutoShowcase}
        />
      </div>
    </div>

    {/* Selection grid sitting above the ticker */}
    <ArcadeSelectorDeck
      heroes={heroCatalog}
      activeKey={activeKey}
      selectedKey={selectedKey}
      onSelectHero={onSelectHero}
      onLockHero={onLockHero}
      isSaving={isSaving}
    />

    <TickerBar delay={1.1} />
  </section>
);

// ─────────────────────────────────────────────────────────────
// MOBILE HERO
// ─────────────────────────────────────────────────────────────
const MobileHero = ({
  heroImage,
  heroName,
  heroCatalog,
  activeKey,
  selectedKey,
  onSelectHero,
  onLockHero,
  isSaving,
  isGlitching,
  stats,
  onRegisterClick,
  hasTeam = false,
  autoShowcaseActive,
  toggleAutoShowcase,
}: {
  heroImage: string;
  heroName: string;
  heroCatalog: HeroCatalogItem[];
  activeKey: string | null;
  selectedKey: string | null;
  onSelectHero: (hero: HeroCatalogItem) => void;
  onLockHero: (hero: HeroCatalogItem) => void;
  isSaving: boolean;
  isGlitching: boolean;
  stats: HeroPanelStats;
  onRegisterClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  hasTeam?: boolean;
  autoShowcaseActive: boolean;
  toggleAutoShowcase: () => void;
}) => (
  <section className="md:hidden flex flex-col w-full overflow-hidden" style={{ background: '#03050c' }}>
    {/* Stage */}
    <div className="relative overflow-hidden" style={{ height: '70vw', minHeight: 220, maxHeight: 320 }}>
      <div className="absolute inset-0 z-0">
        <video autoPlay loop muted playsInline preload="metadata" className="w-full h-full object-cover opacity-45">
          <source src="/gif/heros.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[#03050c]/85 mix-blend-multiply" />
      </div>

      <OrbField />
      <StageOverlays />

      {/* Ghost title */}
      <div className="absolute inset-0 z-[4] flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 1.6, delay: 0.5 }}
          className="font-black uppercase"
          style={{
            fontFamily: '"Anton", "Barlow Condensed", sans-serif',
            fontSize: 'clamp(90px, 24vw, 150px)',
            letterSpacing: '-0.04em',
            WebkitTextStroke: '1px rgba(6,182,212,0.12)',
            color: 'transparent',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}>
          MLBB
        </motion.div>
      </div>

      {/* 3D Floor deck mobile */}
      <div 
        className="absolute bottom-[-15%] left-[5%] w-[90%] h-[40%] pointer-events-none z-[5]"
        style={{
          background: `
            linear-gradient(rgba(6, 182, 212, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          transform: 'perspective(200px) rotateX(60deg)',
          boxShadow: '0 0 40px rgba(6, 182, 212, 0.15) inset',
        }}
      />

      {/* Character centered */}
      <HeroCharacter 
        heroImage={heroImage} 
        heroName={heroName}
        isGlitching={isGlitching}
        onClick={() => {}}
      />

      {/* Mobile top bar */}
      <div className="absolute top-0 left-0 right-0 z-[10] flex items-center justify-between px-4 py-4">
        <Link href="/" className="group">
          <span
            className="text-white font-black uppercase text-sm tracking-widest"
            style={{ fontFamily: '"Anton", "Barlow Condensed", sans-serif', letterSpacing: '0.08em' }}>
            BEAGENDA
          </span>
        </Link>
        
        {/* Blinking showcase status indicator */}
        <div className="flex items-center gap-1 bg-[#050812]/80 border border-cyan-500/20 px-2 py-0.5 rounded font-mono text-[7px] text-cyan-400">
          <span className="w-1 h-1 rounded-full bg-green-500 animate-ping" />
          <span>LIVE Showcase</span>
        </div>
      </div>
      
      {/* Floating HUD info mobile */}
      <div className="absolute left-4 bottom-4 z-20 font-mono text-[8px] text-[#e8a000] pointer-events-none bg-black/60 px-1.5 py-0.5 rounded border border-white/5">
        HERO: {heroName}
      </div>
    </div>

    {/* Mobile selector strip */}
    <ArcadeSelectorDeck
      heroes={heroCatalog}
      activeKey={activeKey}
      selectedKey={selectedKey}
      onSelectHero={onSelectHero}
      onLockHero={onLockHero}
      isSaving={isSaving}
    />

    {/* Stats commands below */}
    <div className="px-4 py-3 bg-[#03050c] flex flex-col gap-2">
      <div className="flex items-center justify-between font-mono text-[7px] text-white/40 pb-1 border-b border-white/5">
        <span>[TOURNAMENT STATS]</span>
        <button 
          onClick={toggleAutoShowcase}
          className="text-cyan-400 font-bold uppercase tracking-wider"
        >
          CYCLE: {autoShowcaseActive ? 'AUTO ON' : 'LOCKED'} (TAP TO SWITCH)
        </button>
      </div>
      <CyberTerminalPanel 
        mobile 
        stats={stats} 
        onRegisterClick={onRegisterClick} 
        hasTeam={hasTeam}
        autoShowcaseActive={autoShowcaseActive}
        toggleAutoShowcase={toggleAutoShowcase}
      />
    </div>

    <TickerBar delay={0.9} />
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
  
  // Custom redesign states for retro auto-change
  const [activeCatalogIndex, setActiveCatalogIndex] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);
  const [autoShowcaseActive, setAutoShowcaseActive] = useState(true);
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());

  const [panelStats, setPanelStats] = useState<HeroPanelStats>({
    season: 'S4',
    teams: '6',
    players: '120+',
    prize: '₵12.8K',
  });

  // 1. Fetching Stats
  useEffect(() => {
    const loadPanelStats = async () => {
      try {
        const [leaderboardResponse, teamsResponse] = await Promise.all([
          fetch('/api/leaderboards/teams?limit=50', { cache: 'no-store' }),
          fetch('/api/teams?limit=50', { cache: 'no-store' }),
        ]);

        const leaderboardData = leaderboardResponse.ok ? await leaderboardResponse.json() : null;
        const teamsData = teamsResponse.ok ? await teamsResponse.json() : null;

        const standings = Array.isArray(leaderboardData?.standings) ? leaderboardData.standings : [];
        const teams = Array.isArray(teamsData?.teams) ? teamsData.teams : [];

        const seasonName: string | undefined = leaderboardData?.season?.name;
        const seasonText = seasonName && typeof seasonName === 'string'
          ? seasonName
          : 'ACTIVE';

        const teamsCount = Number(leaderboardData?.pagination?.total ?? teams.length ?? 0);
        const playersCount = teams.reduce((total: number, team: { _count?: { players?: number } }) => {
          const count = typeof team?._count?.players === 'number' ? team._count.players : 0;
          return total + count;
        }, 0);

        const topPrize = standings.reduce((maxValue: number, standing: { team?: { totalPrizeMoney?: number } }) => {
          const prize = Number(standing?.team?.totalPrizeMoney ?? 0);
          return Number.isFinite(prize) ? Math.max(maxValue, prize) : maxValue;
        }, 0);

        setPanelStats({
          season: seasonText,
          teams: String(teamsCount || 0),
          players: playersCount > 0 ? `${playersCount}+` : '0',
          prize: topPrize > 0 ? `₵${Math.round(topPrize).toLocaleString()}` : '₵0',
        });
      } catch {
        // Keep fallback panel stats
      }
    };

    loadPanelStats().catch(() => undefined);
  }, []);

  // 2. Fetching Team authentication profile
  useEffect(() => {
    if (!isAuthenticated) {
      setHasTeam(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/api/my-team');
        if (!resp.ok) {
          if (!cancelled) setHasTeam(false);
          return;
        }
        const data = await resp.json();
        const present = Boolean(data && (data.id || data.team || data.teamId || (Array.isArray(data.players) && data.players.length > 0)));
        if (!cancelled) setHasTeam(present);
      } catch {
        if (!cancelled) setHasTeam(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // 3. Synchronize initial selected favorite index once catalog is loaded
  useEffect(() => {
    if (heroCatalog.length > 0 && selectedKey) {
      const idx = heroCatalog.findIndex((h) => h.key === selectedKey);
      if (idx !== -1) {
        setActiveCatalogIndex(idx);
      }
    }
  }, [heroCatalog, selectedKey]);

  // 4. Auto-showcase interval cycle
  useEffect(() => {
    if (heroCatalog.length <= 1) return;

    const interval = setInterval(() => {
      // Rotate only if auto-showcase is active AND user has been idle for 12 seconds
      const isIdle = Date.now() - lastInteractionTime > 12000;
      if (autoShowcaseActive && isIdle) {
        // Glitch trigger
        setIsGlitching(true);
        setActiveCatalogIndex((prev) => (prev + 1) % heroCatalog.length);
        
        setTimeout(() => {
          setIsGlitching(false);
        }, 400);
      }
    }, 7000); // cycle every 7 seconds

    return () => clearInterval(interval);
  }, [heroCatalog, autoShowcaseActive, lastInteractionTime]);

  // Active hero selections
  const activeHero = useMemo(() => {
    if (heroCatalog.length === 0) return null;
    return heroCatalog[activeCatalogIndex] || heroCatalog[0];
  }, [heroCatalog, activeCatalogIndex]);

  const activeImage = getHeroImageUrl(activeHero?.imageUrl || '/stunchou.png');
  const activeName = activeHero?.name || 'CHOU';
  const activeKey = activeHero?.key || null;

  // Interactivity triggers
  const handleSelectHero = (hero: HeroCatalogItem) => {
    const idx = heroCatalog.findIndex((h) => h.key === hero.key);
    if (idx !== -1) {
      setIsGlitching(true);
      setActiveCatalogIndex(idx);
      setLastInteractionTime(Date.now()); // reset idle interaction timestamp
      
      setTimeout(() => {
        setIsGlitching(false);
      }, 400);
    }
  };

  const handleLockFavorite = async (hero: HeroCatalogItem) => {
    try {
      setIsSavingHero(true);
      await selectHero(hero);
    } catch {
      // ignore
    } finally {
      setIsSavingHero(false);
    }
  };

  const handleRegisterClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (status === 'authenticated') return;
    if (status === 'unauthenticated') {
      event.preventDefault();
      setIsLoginModalOpen(true);
    }
  };

  const toggleAutoShowcase = () => {
    setAutoShowcaseActive((prev) => !prev);
    setLastInteractionTime(Date.now()); // reset timestamp
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@700;800;900&display=swap');
      `}</style>
      
      {loading || heroCatalog.length === 0 ? (
        <section className="relative min-h-[420px] w-full bg-[#03050c] overflow-hidden flex items-center justify-center font-mono text-cyan-400 text-xs tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping mr-2" />
          LOADING HERO SHOWCASE...
        </section>
      ) : (
        <>
          <MobileHero
            heroImage={activeImage}
            heroName={activeName}
            heroCatalog={heroCatalog}
            activeKey={activeKey}
            selectedKey={selectedKey}
            onSelectHero={handleSelectHero}
            onLockHero={handleLockFavorite}
            isSaving={isSavingHero}
            isGlitching={isGlitching}
            stats={panelStats}
            onRegisterClick={handleRegisterClick}
            hasTeam={hasTeam}
            autoShowcaseActive={autoShowcaseActive}
            toggleAutoShowcase={toggleAutoShowcase}
          />
          <DesktopHero
            heroImage={activeImage}
            heroName={activeName}
            heroCatalog={heroCatalog}
            activeKey={activeKey}
            selectedKey={selectedKey}
            onSelectHero={handleSelectHero}
            onLockHero={handleLockFavorite}
            isSaving={isSavingHero}
            isGlitching={isGlitching}
            stats={panelStats}
            onRegisterClick={handleRegisterClick}
            hasTeam={hasTeam}
            autoShowcaseActive={autoShowcaseActive}
            toggleAutoShowcase={toggleAutoShowcase}
          />
          <LoginRequiredModal
            open={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
          />
        </>
      )}
    </>
  );
};