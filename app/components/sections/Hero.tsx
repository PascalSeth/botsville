'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { motion, useMotionValue, useTransform, useSpring, animate, cubicBezier } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Trophy, ChevronRight } from 'lucide-react';

// ── Mock data ──────────────────────────────────────────────
const TOP_TEAMS = [
  { rank: 1, name: 'CERUS AL EGAN', points: '10145' },
  { rank: 2, name: 'AD57 AUY',      points: '10003' },
  { rank: 3, name: 'AEDF AJAY',     points: '9045'  },
];

// ── Animation variants ─────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.8, ease: cubicBezier(0.22, 1, 0.36, 1), delay },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (delay = 0) => ({
    opacity: 1,
    transition: { duration: 0.9, ease: cubicBezier(0.22, 1, 0.36, 1), delay },
  }),
};

const slideRight = {
  hidden: { opacity: 0, x: 60 },
  visible: (delay = 0) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.9, ease: cubicBezier(0.22, 1, 0.36, 1), delay },
  }),
};

// ── Animated number counter ────────────────────────────────
const AnimatedNumber = ({ value }: { value: string }) => {
  const [display, setDisplay] = useState('0');
  const num = parseInt(value.replace(/\D/g, ''), 10);
  useEffect(() => {
    const controls = animate(0, num, {
      duration: 1.6, ease: 'easeOut', delay: 0.8,
      onUpdate: v => setDisplay(Math.round(v).toLocaleString()),
    });
    return controls.stop;
  }, [num]);
  return <span>{display}</span>;
};

// ── Orb Effect ─────────────────────────────────────────────
const OrbEffect = () => (
  <>
    <motion.div
      className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full pointer-events-none"
      style={{ background: 'radial-gradient(circle, rgba(30,80,200,0.18) 0%, transparent 70%)', filter: 'blur(40px)' }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full pointer-events-none"
      style={{ background: 'radial-gradient(circle, rgba(220,120,0,0.12) 0%, transparent 70%)', filter: 'blur(50px)' }}
      animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
    />
  </>
);

// ── Scanline overlay ───────────────────────────────────────
const ScanlineOverlay = () => (
  <div
    className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03]"
    style={{
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 3px)',
      backgroundSize: '100% 3px',
    }}
  />
);

// ── Desktop floating hero character (mouse parallax) ───────
const HeroCharacter = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [6, -6]);
  const rotateY = useTransform(mouseX, [-300, 300], [-6, 6]);
  const springRotateX = useSpring(rotateX, { stiffness: 60, damping: 20 });
  const springRotateY = useSpring(rotateY, { stiffness: 60, damping: 20 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - window.innerWidth / 2);
      mouseY.set(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="absolute bottom-0 left-0 h-full w-[260px] sm:w-[320px] md:w-[400px] lg:w-[460px] pointer-events-none select-none z-10"
      initial={{ opacity: 0, x: -80, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 1.1, ease: cubicBezier(0.22, 1, 0.36, 1), delay: 0.2 }}
      style={{ rotateX: springRotateX, rotateY: springRotateY, perspective: 1000 }}
    >
      <motion.div
        className="w-full h-full relative"
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 h-6 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(232,160,0,0.5) 0%, transparent 70%)', filter: 'blur(8px)' }}
          animate={{ opacity: [0.4, 0.9, 0.4], scaleX: [0.8, 1.1, 0.8] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <Image
          src="/stunchou.png" alt="MLBB Hero" fill
          className="object-contain object-bottom drop-shadow-[0_0_40px_rgba(232,160,0,0.3)]"
          priority
        />
      </motion.div>
    </motion.div>
  );
};

// ── Hero text ──────────────────────────────────────────────
const HeroText = ({ mobile = false }: { mobile?: boolean }) => (
  <div className={`flex flex-col items-start gap-4 ${mobile ? '' : 'z-20'}`}>
    <motion.div
      variants={fadeUp} initial="hidden" animate="visible" custom={mobile ? 0.1 : 0.3}
      className="flex items-center gap-2"
    >
      <span className="w-6 h-[2px] bg-[#e8a000]" />
      <span className="text-[#e8a000] text-[10px] font-bold uppercase tracking-[0.25em]">
        Season 4 · Live Now
      </span>
    </motion.div>

    <motion.h1
      variants={fadeUp} initial="hidden" animate="visible" custom={mobile ? 0.2 : 0.45}
      className={`font-black text-white leading-[1.0] tracking-tight uppercase ${mobile ? 'text-4xl sm:text-5xl' : 'text-4xl sm:text-5xl lg:text-6xl'}`}
      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
    >
      GHANA
      <br />
      <span className="text-transparent" style={{ WebkitTextStroke: '2px rgba(232,160,0,0.8)' }}>MLBB</span>
      <br />
      <span className="text-white">BE AGENDA</span>
    </motion.h1>

    {!mobile && (
      <motion.p
        variants={fadeUp} initial="hidden" animate="visible" custom={0.6}
        className="text-gray-400 text-sm max-w-xs leading-relaxed hidden sm:block"
      >
        Ghana&apos;s premier Mobile Legends competition. Compete, rise, and claim the crown.
      </motion.p>
    )}

    <motion.div
      variants={fadeUp} initial="hidden" animate="visible" custom={mobile ? 0.3 : 0.75}
      className="flex flex-wrap gap-3"
    >
      <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
        <Button
          variant="outline"
          className="relative overflow-hidden border-[#e8a000] text-[#e8a000] hover:text-black font-bold uppercase tracking-widest px-5 py-2 text-xs sm:text-sm group transition-colors duration-300"
        >
          <span className="absolute inset-0 bg-[#e8a000] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          <Link href="register-team" className="relative z-10">REGISTER TEAM</Link>
        </Button>
      </motion.div>
      <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
        <Button
          variant="secondary"
          className="text-white/60 hover:text-white font-semibold uppercase tracking-widest px-4 py-2 text-xs sm:text-sm transition-colors"
        >
          View Brackets →
        </Button>
      </motion.div>
    </motion.div>
  </div>
);

// ── Team row ───────────────────────────────────────────────
const TeamRow = ({ rank, name, points, index }: { rank: number; name: string; points: string; index: number }) => (
  <motion.div
    variants={fadeUp} initial="hidden" animate="visible" custom={0.9 + index * 0.12}
    className="flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.07] last:border-0 group cursor-default"
  >
    <div className="flex items-center gap-3">
      <span className="text-[#e8a000] font-black text-xs w-4 tabular-nums">{rank}</span>
      <div className="w-7 h-7 rounded bg-white/10 overflow-hidden relative shrink-0 ring-1 ring-white/10 group-hover:ring-[#e8a000]/40 transition-all">
        <Image src="/mlbb_logo.png" alt={name} fill className="object-cover" />
      </div>
      <span className="text-white/80 text-[11px] font-semibold uppercase tracking-wider group-hover:text-white transition-colors truncate">
        {name}
      </span>
    </div>
    <span className="text-[#e8a000] text-xs font-black tabular-nums shrink-0">
      <AnimatedNumber value={points} />
    </span>
  </motion.div>
);

// ── Top teams panel ────────────────────────────────────────
const TopTeamsPanel = ({ compact = false }: { compact?: boolean }) => (
  <motion.div
    variants={slideRight} initial="hidden" animate="visible" custom={0.6}
    className={`
      bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden shrink-0 z-20
      shadow-[0_0_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]
      ${compact ? 'w-full' : 'w-full max-w-[260px] sm:max-w-[280px]'}
    `}
  >
    <div className="flex items-center justify-between px-4 py-3 bg-white/[0.04] border-b border-white/10">
      <div>
        <p className="text-[9px] text-[#e8a000]/70 uppercase tracking-[0.2em] font-bold">Top Teams</p>
        <p className="text-white font-black text-sm uppercase tracking-wide mt-0.5">Ghana</p>
      </div>
      <motion.div
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        <Image src="/mlbb_logo.png" alt="MLBB Logo" width={28} height={28} className="object-contain" />
      </motion.div>
    </div>
    <div className="px-4 py-1">
      {TOP_TEAMS.map((team, i) => (
        <TeamRow key={team.rank} {...team} index={i} />
      ))}
    </div>
    <motion.div variants={fadeIn} initial="hidden" animate="visible" custom={1.3} className="px-4 pb-3 pt-1">
      <button className="w-full text-[10px] text-white/40 hover:text-[#e8a000] uppercase tracking-widest font-bold transition-colors py-1">
        View Full Leaderboard →
      </button>
    </motion.div>
  </motion.div>
);

// ── Mobile Hero (< md) ─────────────────────────────────────
// Full-bleed character art + gradient overlay, text pinned to bottom
const MobileHero = () => (
  <section className="md:hidden relative w-full overflow-hidden bg-[#060a14]">

    {/* ── Act 1: Cinematic character panel ── */}
    <div className="relative w-full h-[62vw] min-h-[260px] max-h-[340px]">
      {/* BG image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&q=80"
          alt="" fill className="object-cover object-center" priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060a14]/90 via-[#060a14]/50 to-[#060a14]/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060a14] via-transparent to-[#060a14]/60" />
      </div>
      <ScanlineOverlay />
      <OrbEffect />

      {/* Hero character — centred, tall, fills the frame */}
      <motion.div
        className="absolute bottom-0 right-0 w-[58%] h-[110%] pointer-events-none select-none"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: cubicBezier(0.22, 1, 0.36, 1), delay: 0.15 }}
      >
        <motion.div
          className="relative w-full h-full"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Ground glow */}
          <motion.div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-5 rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(232,160,0,0.55) 0%, transparent 70%)', filter: 'blur(6px)' }}
            animate={{ opacity: [0.3, 0.8, 0.3], scaleX: [0.8, 1.15, 0.8] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <Image
            src="/stunchou.png" alt="MLBB Hero" fill
            className="object-contain object-bottom drop-shadow-[0_0_30px_rgba(232,160,0,0.35)]"
            priority
          />
        </motion.div>
      </motion.div>

      {/* Season badge — top left */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="absolute top-4 left-4 flex items-center gap-1.5"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
        </span>
        <span className="text-[#e8a000] text-[9px] font-black tracking-[0.2em] uppercase">Season 4 · Live</span>
      </motion.div>
    </div>

    {/* ── Act 2: Text + CTA ── */}
    <div className="relative px-5 pt-4 pb-5 bg-[#060a14]">
      {/* Gold accent left border */}
      <div className="absolute left-0 top-4 bottom-5 w-0.5 bg-gradient-to-b from-[#e8a000] via-[#e8a000]/40 to-transparent" />

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: cubicBezier(0.22, 1, 0.36, 1), delay: 0.25 }}
        className="font-black text-white leading-[1.0] tracking-tight uppercase text-[2.6rem] sm:text-5xl"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        GHANA
        <br />
        <span className="text-transparent" style={{ WebkitTextStroke: '2px rgba(232,160,0,0.85)' }}>MLBB</span>
        <br />
        BE AGENDA
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="text-gray-500 text-xs leading-relaxed mt-2 mb-4 max-w-[280px]"
      >
        Ghana&apos;s premier Mobile Legends competition. Compete, rise, claim the crown.
      </motion.p>

      {/* CTA row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="flex gap-2 flex-wrap"
      >
        <Link
          href="register-team"
          className="relative overflow-hidden flex items-center gap-1.5 border border-[#e8a000] text-[#e8a000] font-black uppercase tracking-[0.12em] px-4 py-2.5 text-[11px] group transition-colors duration-300"
        >
          <span className="absolute inset-0 bg-[#e8a000] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          <span className="relative z-10 group-hover:text-black transition-colors duration-300">Register Team</span>
          <ChevronRight size={11} className="relative z-10 group-hover:text-black transition-colors duration-300" />
        </Link>
        <button className="text-white/50 hover:text-white font-semibold uppercase tracking-widest px-3 py-2.5 text-[11px] transition-colors">
          Brackets →
        </button>
      </motion.div>
    </div>

    {/* ── Act 3: Leaderboard strip ── */}
    <div className="px-4 pb-5">
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={11} className="text-[#e8a000]" />
        <p className="text-[#e8a000]/70 text-[9px] tracking-[0.2em] uppercase font-black">Top Teams · Ghana</p>
      </div>

      {/* Horizontal scrollable team chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TOP_TEAMS.map((team, i) => (
          <motion.div
            key={team.rank}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
            className="flex items-center gap-2 bg-black/40 border border-white/[0.08] px-3 py-2 shrink-0"
          >
            <span className="text-[#e8a000] font-black text-[10px] w-3 tabular-nums">{team.rank}</span>
            <div className="w-5 h-5 rounded bg-white/10 overflow-hidden relative shrink-0">
              <Image src="/mlbb_logo.png" alt={team.name} fill className="object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="text-white text-[10px] font-bold uppercase tracking-wide leading-none">{team.name}</span>
              <span className="text-[#e8a000] text-[9px] font-black tabular-nums">
                <AnimatedNumber value={team.points} />
              </span>
            </div>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center shrink-0"
        >
          <Link href="/leaderboard" className="text-white/30 hover:text-[#e8a000] text-[9px] uppercase tracking-widest font-bold px-3 whitespace-nowrap transition-colors">
            All →
          </Link>
        </motion.div>
      </div>
    </div>

    {/* Bottom fade */}
    <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#060a14] to-transparent pointer-events-none" />
  </section>
);

// ── Desktop Hero (≥ md) ────────────────────────────────────
const DesktopHero = () => (
  <section className="hidden md:flex relative w-full min-h-[380px] h-[55vw] max-h-[520px] md:max-h-[480px] overflow-hidden items-center">
    {/* Background */}
    <div className="absolute inset-0 z-0">
      <Image
        src="https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1600&q=80"
        alt="Background" fill className="object-cover object-center scale-105" priority
      />
      <motion.div
        className="absolute inset-0"
        animate={{ scale: [1.05, 1.12] }}
        transition={{ duration: 18, ease: 'linear', repeat: Infinity, repeatType: 'reverse' }}
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1600&q=80')",
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#060a14]/95 via-[#060a14]/65 to-[#060a14]/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#060a14] via-transparent to-[#060a14]/50" />
    </div>

    <OrbEffect />
    <ScanlineOverlay />

    <motion.div
      className="absolute top-0 bottom-0 left-[38%] w-px pointer-events-none"
      style={{ background: 'linear-gradient(to bottom, transparent, rgba(232,160,0,0.15), transparent)' }}
      initial={{ scaleY: 0, opacity: 0 }}
      animate={{ scaleY: 1, opacity: 1 }}
      transition={{ duration: 1.2, delay: 0.4, ease: cubicBezier(0.22, 1, 0.36, 1) }}
    />

    <HeroCharacter />

    <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6">
      <div className="hidden md:block w-[300px] lg:w-[380px] shrink-0" />
      <HeroText />
      <div className="hidden lg:block">
        <TopTeamsPanel />
      </div>
    </div>

    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#060a14] to-transparent pointer-events-none z-20" />
  </section>
);

// ── Main Export ────────────────────────────────────────────
export const Hero = () => (
  <>
    <MobileHero />
    <DesktopHero />
  </>
);