'use client';

import Image from 'next/image';
import {
  motion,
  animate,
  cubicBezier,
  useAnimationFrame,
} from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ChevronRight } from 'lucide-react';
import { useHero } from '../../contexts/HeroContext';

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
// STAGE OVERLAYS
// ─────────────────────────────────────────────────────────────
const StageOverlays = () => (
  <>
    {/* Scanlines */}
    <div className="absolute inset-0 pointer-events-none z-[2] opacity-[0.018]"
      style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,#fff 2px,#fff 3px)', backgroundSize: '100% 3px' }} />
    {/* Film grain */}
    <div className="absolute inset-0 pointer-events-none z-[2] mix-blend-overlay opacity-[0.06]"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '200px' }} />
    {/* Radial vignette — strongest at edges */}
    <div className="absolute inset-0 pointer-events-none z-[2]"
      style={{ background: 'radial-gradient(ellipse 85% 85% at 50% 45%, transparent 25%, rgba(0,0,0,0.65) 80%, rgba(0,0,0,0.92) 100%)' }} />
    {/* Bottom-to-top gradient — feeds into info band */}
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-[3]"
      style={{ height: '45%', background: 'linear-gradient(to top, rgba(5,8,18,1) 0%, rgba(5,8,18,0.85) 40%, transparent 100%)' }} />
    {/* Subtle top darkening */}
    <div className="absolute top-0 left-0 right-0 pointer-events-none z-[2]"
      style={{ height: '20%', background: 'linear-gradient(to bottom, rgba(5,8,18,0.7) 0%, transparent 100%)' }} />
  </>
);

// ─────────────────────────────────────────────────────────────
// ORB LIGHT FIELD
// ─────────────────────────────────────────────────────────────
const OrbField = () => (
  <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
    {/* Main backlight behind character */}
    <motion.div className="absolute rounded-full"
      style={{ top: '10%', left: '50%', transform: 'translateX(-50%)', width: '70%', height: '80%',
        background: 'radial-gradient(ellipse, rgba(20,55,200,0.28) 0%, rgba(20,55,200,0.08) 45%, transparent 70%)', filter: 'blur(60px)' }}
      animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} />
    {/* Gold glow from below */}
    <motion.div className="absolute rounded-full"
      style={{ bottom: '-15%', left: '50%', transform: 'translateX(-50%)', width: '60%', height: '50%',
        background: 'radial-gradient(ellipse, rgba(232,160,0,0.22) 0%, transparent 65%)', filter: 'blur(50px)' }}
      animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.06, 0.95] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }} />
    {/* Side rim — left */}
    <motion.div className="absolute rounded-full"
      style={{ top: '20%', left: '-10%', width: '40%', height: '60%',
        background: 'radial-gradient(circle, rgba(100,0,200,0.1) 0%, transparent 65%)', filter: 'blur(70px)' }}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }} />
    {/* Side rim — right */}
    <motion.div className="absolute rounded-full"
      style={{ top: '20%', right: '-10%', width: '40%', height: '60%',
        background: 'radial-gradient(circle, rgba(200,80,0,0.1) 0%, transparent 65%)', filter: 'blur(70px)' }}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 4 }} />
  </div>
);

// ─────────────────────────────────────────────────────────────
// GHOST TITLE WATERMARK — sits behind character
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
        fontSize: 'clamp(100px, 22vw, 320px)',
        letterSpacing: '-0.04em',
        WebkitTextStroke: '1px rgba(232,160,0,0.18)',
        color: 'transparent',
        lineHeight: 0.85,
        whiteSpace: 'nowrap',
      }}>
      MLBB
    </motion.div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// HERO CHARACTER — centered, float only
// ─────────────────────────────────────────────────────────────
const HeroCharacter = ({ heroImage, onClick }: { heroImage: string; onClick?: () => void }) => {
  return (
    <motion.div
      className="absolute bottom-0  left-0 z-[30] pointer-events-auto select-none cursor-pointer"
      style={{
        width: 'clamp(300px, 42vw, 620px)',
        height: '95%',
      }}
      role="button"
      tabIndex={0}
      aria-label="Choose hero cutout"
      onClick={onClick}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && onClick) {
          event.preventDefault();
          onClick();
        }
      }}
      initial={{ opacity: 0, y: 80, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1.4, delay: 0.3, ease: EASE }}>
      <motion.div
        className="relative w-full h-full"
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
        {/* Ground shadow puddle */}
        <motion.div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full"
          style={{ width: '52%', height: 30, background: 'radial-gradient(ellipse, rgba(232,160,0,0.7) 0%, transparent 70%)', filter: 'blur(16px)' }}
          animate={{ opacity: [0.35, 0.9, 0.35], scaleX: [0.7, 1.1, 0.7] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
        <Image
          src={heroImage} alt="MLBB Hero" fill
          className="object-contain object-bottom-left"
          style={{ filter: 'drop-shadow(0 0 80px rgba(232,160,0,0.4)) drop-shadow(0 0 200px rgba(20,50,200,0.3))' }}
          priority />
      </motion.div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// TOP BAR — BEAGENDA + header actions (floats over stage)
// ─────────────────────────────────────────────────────────────
const TopBar = () => (
  <motion.div
    className="absolute top-0 left-0 right-0 z-[10] flex items-center justify-between px-6 md:px-10 py-5"
    initial={{ opacity: 0, y: -16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.4, duration: 0.7, ease: EASE }}>
    <Link href="/" className="group">
      <span
        className="text-white font-black uppercase text-lg"
        style={{ fontFamily: '"Anton", "Barlow Condensed", sans-serif', letterSpacing: '0.08em' }}>
        BEAGENDA
      </span>
    </Link>

  </motion.div>
);

// ─────────────────────────────────────────────────────────────
// HERO SIDE PANEL — right middle (stats + register)
// ─────────────────────────────────────────────────────────────
const HeroSidePanel = ({
  mobile = false,
  stats,
  onRegisterClick,
  hasTeam = false,
}: {
  mobile?: boolean;
  stats: HeroPanelStats;
  onRegisterClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  hasTeam?: boolean;
}) => (
  <motion.div
    className={`absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-[10] ${mobile ? 'w-[120px]' : 'w-[150px]'}`}
    initial={{ opacity: 0, x: 16 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.65, duration: 0.7, ease: EASE }}>
    <div
      className="flex flex-col"
      style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(5,8,18,0.52)', backdropFilter: 'blur(10px)' }}>
      {[
        { label: 'Season', value: stats.season },
        { label: 'Teams', value: stats.teams },
        { label: 'Players', value: stats.players },
        { label: 'Prize', value: stats.prize },
      ].map((s, i, arr) => (
        <div
          key={s.label}
          className={`flex flex-col items-center ${mobile ? 'py-2.5 px-2' : 'py-3 px-3'}`}
          style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
          <span
            className={`${mobile ? 'text-xs' : 'text-sm'} font-black text-white leading-none`}
            style={{ fontFamily: '"Anton", "Barlow Condensed", sans-serif' }}>
            {s.value}
          </span>
          <span className={`${mobile ? 'text-[7px]' : 'text-[8px]'} uppercase mt-0.5`} style={{ color: '#e8a000', letterSpacing: '0.22em' }}>
            {s.label}
          </span>
        </div>
      ))}

      {hasTeam ? (
        <Link
          href="/my-team"
          className={`${mobile ? 'px-2 py-2.5 text-[8px]' : 'px-3 py-3 text-[9px]'} font-black uppercase text-center`}
          style={{ background: '#a8a8a8', color: '#000', letterSpacing: '0.16em' }}>
          <span className="inline-flex items-center gap-1.5">
            My Team
            <ChevronRight size={mobile ? 10 : 11} />
          </span>
        </Link>
      ) : (
        <Link
          href="/register-team"
          onClick={onRegisterClick}
          className={`${mobile ? 'px-2 py-2.5 text-[8px]' : 'px-3 py-3 text-[9px]'} font-black uppercase text-center`}
          style={{ background: '#e8a000', color: '#000', letterSpacing: '0.16em' }}>
          <span className="inline-flex items-center gap-1.5">
            Register Team
            <ChevronRight size={mobile ? 10 : 11} />
          </span>
        </Link>
      )}
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────
// TICKER
// ─────────────────────────────────────────────────────────────
const TeamTicker = () => {
  const [tickerTeams, setTickerTeams] = useState<TickerTeam[]>(TEAMS);
  const trackRef = useRef<HTMLDivElement>(null);
  const xRef = useRef(0);

  useEffect(() => {
    const loadTickerTeams = async () => {
      try {
        const response = await fetch('/api/leaderboards/teams?limit=8', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

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
    xRef.current -= 0.48;
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
              minWidth: 220,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
            }}>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: team.rank <= 3 ? '#e8a000' : 'rgba(255,255,255,0.08)',
                color: team.rank <= 3 ? '#000' : 'rgba(255,255,255,0.7)',
              }}>
              <span className="text-[10px] font-black tabular-nums leading-none">{team.rank}</span>
            </div>
            <div className="relative w-8 h-8 rounded-md shrink-0 overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
              <Image src={team.logo} alt={team.name} fill className="object-cover" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-black uppercase"
                style={{ color: 'rgba(255,255,255,0.88)', fontFamily: '"Anton", "Barlow Condensed", sans-serif', letterSpacing: '0.1em' }}>
                {team.name}
              </span>
              <span className="text-[9px] font-bold tabular-nums mt-0.5"
                style={{ color: team.rank <= 3 ? '#e8a000' : 'rgba(255,255,255,0.62)' }}>
                <AnimatedNumber value={team.points} /> PTS
              </span>
            </div>
            <span className="ml-auto text-[9px] font-bold uppercase"
              style={{ color: team.rank <= 3 ? '#e8a000' : 'rgba(255,255,255,0.38)', letterSpacing: '0.16em' }}>
              #{team.rank}
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
      height: 62,
      borderTop: '1px solid rgba(255,255,255,0.08)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'linear-gradient(180deg, rgba(6,10,24,0.96) 0%, rgba(3,6,18,0.95) 100%)',
      backdropFilter: 'blur(20px)',
    }}
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.7, ease: EASE }}>
    <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(232,160,0,0.05) 0%, transparent 22%, transparent 78%, rgba(232,160,0,0.05) 100%)' }} />

    {/* Gold label */}
    <div className="relative flex items-center gap-3 px-5 shrink-0"
      style={{ background: '#e8a000', minWidth: 170 }}>
      <Image src="/mlbb_logo.png" alt="logo" width={22} height={22} className="object-contain brightness-0 shrink-0" />
      <div className="flex flex-col leading-none">
        <span className="text-[7px] font-black tracking-[0.3em] uppercase" style={{ color: 'rgba(0,0,0,0.45)' }}>Rankings</span>
        <span className="text-[11px] font-black uppercase tracking-wide text-black">Top Teams Live</span>
      </div>
      <svg viewBox="0 0 30 100" preserveAspectRatio="none"
        className="absolute right-0 translate-x-full top-0 h-full w-[30px]" style={{ color: '#e8a000' }}>
        <polygon points="30,0 30,100 0,100" fill="currentColor" />
      </svg>
    </div>
    <TeamTicker />
  </motion.div>
);

const HeroSelectionModal = ({
  open,
  heroes,
  search,
  selectedKey,
  isSaving,
  error,
  onClose,
  onSearchChange,
  onSelect,
}: {
  open: boolean;
  heroes: HeroCatalogItem[];
  search: string;
  selectedKey: string | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (hero: HeroCatalogItem) => void;
}) => {
  const filteredHeroes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return heroes;
    return heroes.filter((hero) =>
      hero.name.toLowerCase().includes(query) || hero.key.toLowerCase().includes(query)
    );
  }, [heroes, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close hero selector"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-2xl rounded-xl border border-white/15 bg-[#070b1d] p-4 md:p-5"
        style={{ boxShadow: '0 20px 70px rgba(0,0,0,0.45)' }}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-white font-black uppercase tracking-[0.16em] text-sm">Select Hero Cutout</h3>
          <button
            type="button"
            className="text-xs uppercase tracking-[0.12em] text-white/70 hover:text-white"
            onClick={onClose}>
            Close
          </button>
        </div>

        <input
          type="text"
          placeholder="Search heroes..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full mb-4 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#e8a000]"
        />

        {error && (
          <p className="text-[11px] text-red-300 mb-3 uppercase tracking-[0.08em]">{error}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[56vh] overflow-y-auto pr-1">
          {filteredHeroes.map((hero) => {
            const isActive = selectedKey === hero.key;
            return (
              <button
                key={hero.id}
                type="button"
                disabled={isSaving}
                onClick={() => onSelect(hero)}
                className="group rounded-lg border overflow-hidden text-left disabled:opacity-70"
                style={{
                  borderColor: isActive ? '#e8a000' : 'rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.03)',
                }}>
                <div className="relative aspect-[3/4]">
                  <Image src={hero.imageUrl} alt={hero.name} fill className="object-cover" />
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-[11px] font-black uppercase truncate" style={{ color: isActive ? '#e8a000' : 'rgba(255,255,255,0.9)' }}>
                    {hero.name}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const LoginRequiredModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close login required modal"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-white/15 bg-[#0a0a0f]">
        <div className="absolute inset-0">
          <Image src="/gif/chou.gif" alt="" fill className="object-cover opacity-25" />
          <div className="absolute inset-0 bg-[#05070f]/80" />
        </div>

        <div className="relative p-6 sm:p-7">
          <h2 className="text-white font-black text-lg tracking-[0.14em] uppercase mb-2">Login Required</h2>
          <p className="text-[#b3b3c2] text-xs tracking-wide leading-relaxed mb-6">
            You need to be logged in before you can register a team.
          </p>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login?callbackUrl=/register-team"
              onClick={onClose}
              className="flex-1 bg-[#e8a000] text-black text-[10px] font-black tracking-[0.18em] uppercase py-3 text-center">
              Login
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-white/20 text-white text-[10px] font-black tracking-[0.18em] uppercase py-3 hover:bg-white/5 transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// DESKTOP HERO
// Layout: full-viewport stage (video + character + ghost title)
//         → info band (title left / stats+cta right)
//         → ticker
// ─────────────────────────────────────────────────────────────
const DesktopHero = ({
  heroImage,
  onHeroClick,
  stats,
  onRegisterClick,
  hasTeam = false,
}: {
  heroImage: string;
  onHeroClick: () => void;
  stats: HeroPanelStats;
  onRegisterClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  hasTeam?: boolean;
}) => (
  <section className="hidden md:flex flex-col w-full overflow-hidden" style={{ background: '#050812' }}>
    {/* Stage */}
    <div className="relative flex-1" style={{ height: '78vh', minHeight: 440, maxHeight: 680 }}>
      {/* Video */}
      <div className="absolute inset-0 z-0">
        <video autoPlay loop muted playsInline preload="metadata"
          className="w-full h-full object-cover object-center scale-[1.06]">
          <source src="/gif/heros.mp4" type="video/mp4" />
        </video>
        {/* Desaturate + darken video heavily so it's pure atmosphere */}
        <div className="absolute inset-0" style={{ background: 'rgba(5,8,18,0.55)', mixBlendMode: 'multiply' }} />
      </div>

      <OrbField />
      <StageOverlays />
      <GhostTitle />
      <HeroCharacter heroImage={heroImage} onClick={onHeroClick} />
      <TopBar />
      <HeroSidePanel stats={stats} onRegisterClick={onRegisterClick} hasTeam={hasTeam} />
    </div>

    <TickerBar delay={1.1} />
  </section>
);

// ─────────────────────────────────────────────────────────────
// MOBILE HERO
// Full-bleed video+character top, title+CTA below, ticker last
// ─────────────────────────────────────────────────────────────
const MobileHero = ({
  heroImage,
  onHeroClick,
  stats,
  onRegisterClick,
  hasTeam = false,
}: {
  heroImage: string;
  onHeroClick: () => void;
  stats: HeroPanelStats;
  onRegisterClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  hasTeam?: boolean;
}) => (
  <section className="md:hidden flex flex-col w-full overflow-hidden" style={{ background: '#050812' }}>

    {/* Stage */}
    <div className="relative" style={{ height: '55vw', minHeight: 200, maxHeight: 300 }}>
      <div className="absolute inset-0 z-0">
        <video autoPlay loop muted playsInline preload="metadata" className="w-full h-full object-cover">
          <source src="/gif/heros.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0" style={{ background: 'rgba(5,8,18,0.55)', mixBlendMode: 'multiply' }} />
      </div>

      <OrbField />
      <StageOverlays />

      {/* Ghost title — mobile */}
      <div className="absolute inset-0 z-[4] flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 1.6, delay: 0.5 }}
          className="font-black uppercase"
          style={{
            fontFamily: '"Anton", "Barlow Condensed", sans-serif',
            fontSize: 'clamp(90px, 28vw, 160px)',
            letterSpacing: '-0.04em',
            WebkitTextStroke: '1px rgba(232,160,0,0.15)',
            color: 'transparent',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}>
          MLBB
        </motion.div>
      </div>

      {/* Character centered on mobile */}
      <motion.div
        className="absolute bottom-0 left-0 z-[30] pointer-events-auto select-none cursor-pointer"
        style={{ width: '72%', height: '90%' }}
        role="button"
        tabIndex={0}
        aria-label="Choose hero cutout"
        onClick={onHeroClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onHeroClick();
          }
        }}
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, delay: 0.25, ease: EASE }}>
        <motion.div className="relative w-full h-full" animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}>
          <motion.div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full"
            style={{ width: '45%', height: 18, background: 'radial-gradient(ellipse, rgba(232,160,0,0.7) 0%, transparent 70%)', filter: 'blur(10px)' }}
            animate={{ opacity: [0.3, 0.85, 0.3], scaleX: [0.7, 1.12, 0.7] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }} />
          <Image src={heroImage} alt="MLBB Hero" fill
            className="object-contain object-bottom-left"
            style={{ filter: 'drop-shadow(0 0 40px rgba(232,160,0,0.45)) drop-shadow(0 0 100px rgba(20,50,200,0.3))' }}
            priority />
        </motion.div>
      </motion.div>

      {/* Mobile top bar */}
      <div className="absolute top-0 left-0 right-0 z-[10] flex items-center justify-between px-4 py-4">
        <Link href="/" className="group">
          <span
            className="text-white font-black uppercase text-sm"
            style={{ fontFamily: '"Anton", "Barlow Condensed", sans-serif', letterSpacing: '0.08em' }}>
            BEAGENDA
          </span>
        </Link>
      </div>

      <HeroSidePanel mobile stats={stats} onRegisterClick={onRegisterClick} hasTeam={hasTeam} />
    </div>

    <TickerBar delay={0.9} />
  </section>
);

// ─────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────
export const Hero = () => {
  const { heroImage, loading, heroCatalog, selectedKey, selectHero } = useHero();
  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const [hasTeam, setHasTeam] = useState(false);
  const [heroSearch, setHeroSearch] = useState('');
  const [isSavingHero, setIsSavingHero] = useState(false);
  const [heroSelectionError, setHeroSelectionError] = useState<string | null>(null);
  const [panelStats, setPanelStats] = useState<HeroPanelStats>({
    season: 'S4',
    teams: '6',
    players: '120+',
    prize: '₵12.8K',
  });

  // hero data is provided by HeroContext (useHero)

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

  const handleSelectHero = async (hero: HeroCatalogItem) => {
    setHeroSelectionError(null);
    try {
      setIsSavingHero(true);
      await selectHero(hero);
    } catch {
      setHeroSelectionError('Could not save hero choice.');
    } finally {
      setIsSavingHero(false);
    }
  };

  const handleRegisterClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Only block navigation and show login modal when we know the user is unauthenticated.
    // If session is still loading, allow the navigation to proceed.
    if (status === 'authenticated') return;
    if (status === 'unauthenticated') {
      event.preventDefault();
      setIsLoginModalOpen(true);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@700;800;900&display=swap');
      `}</style>
      {loading ? (
        <>
          {/* Skeleton for DesktopHero */}
          <section className="relative min-h-[420px] w-full bg-[#0a0a0f] overflow-hidden">
            {/* Ghost title skeleton */}
            <div className="absolute inset-0 z-[4] flex items-center justify-center pointer-events-none select-none overflow-hidden">
              <div className="font-black uppercase animate-pulse"
                style={{
                  fontFamily: 'Anton, Barlow Condensed, sans-serif',
                  fontSize: 'clamp(100px, 22vw, 320px)',
                  letterSpacing: '-0.04em',
                  WebkitTextStroke: '1px #444',
                  color: 'transparent',
                  lineHeight: 0.85,
                  whiteSpace: 'nowrap',
                  background: 'linear-gradient(90deg, #222 25%, #333 50%, #222 75%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                }}>
                MLBB
              </div>
            </div>
            {/* Hero image skeleton */}
            <div className="absolute bottom-0 left-0 z-[30] pointer-events-auto select-none cursor-pointer animate-pulse"
              style={{ width: 'clamp(300px, 42vw, 620px)', height: '95%' }}>
              <div className="relative w-full h-full">
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#333] opacity-60" style={{ width: '52%', height: 30, filter: 'blur(16px)' }} />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#222] via-[#333] to-[#222]" />
              </div>
            </div>
            {/* Side panel skeleton */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 z-[10] w-[150px] flex flex-col gap-2 animate-pulse">
              <div className="h-10 bg-[#222] rounded mb-2" />
              <div className="h-10 bg-[#222] rounded mb-2" />
              <div className="h-10 bg-[#222] rounded mb-2" />
              <div className="h-10 bg-[#222] rounded mb-2" />
              <div className="h-9 bg-[#e8a000]/30 rounded mt-2" />
            </div>
          </section>
          {/* Skeleton for MobileHero (optional, can be similar or omitted if not needed) */}
        </>
      ) : (
        <>
          <MobileHero
            heroImage={heroImage || '/stunchou.png'}
            onHeroClick={() => setIsHeroModalOpen(true)}
            stats={panelStats}
            onRegisterClick={handleRegisterClick}
            hasTeam={hasTeam}
          />
          <DesktopHero
            heroImage={heroImage || '/stunchou.png'}
            onHeroClick={() => setIsHeroModalOpen(true)}
            stats={panelStats}
            onRegisterClick={handleRegisterClick}
            hasTeam={hasTeam}
          />
          <HeroSelectionModal
            open={isHeroModalOpen}
            heroes={heroCatalog}
            search={heroSearch}
            selectedKey={selectedKey}
            isSaving={isSavingHero}
            error={heroSelectionError}
            onClose={() => {
              setIsHeroModalOpen(false);
              setHeroSearch('');
              setHeroSelectionError(null);
            }}
            onSearchChange={setHeroSearch}
            onSelect={(hero) => {
              setIsHeroModalOpen(false);
              handleSelectHero(hero).catch(() => undefined);
            }}
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