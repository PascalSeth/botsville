'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { Eye, Bell, Radio } from 'lucide-react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useInView,
  type MotionValue,
} from 'framer-motion';

// ── Data ───────────────────────────────────────────────────
const MATCHES = [
  {
    id: 1,
    time: '14:00',
    elapsed: '38:22',
    teamA: { name: 'Kryptonite',    tag: 'KRP', logo: '⚡' },
    teamB: { name: 'Phoenix Force', tag: 'PHX', logo: '🔥' },
    status: 'LIVE',
    scoreA: 4,
    scoreB: 3,
    stage: 'Grand Finals · Map 2',
  },
  {
    id: 2,
    time: '16:00',
    elapsed: null,
    teamA: { name: 'Scarlet Knights', tag: 'SKN', logo: '🛡️' },
    teamB: { name: 'Viper Squad',     tag: 'VPR', logo: '🐍' },
    status: 'UPCOMING',
    scoreA: null,
    scoreB: null,
    stage: 'Semi Finals · Bo3',
  },
  {
    id: 3,
    time: '18:30',
    elapsed: null,
    teamA: { name: 'Omega Gaming', tag: 'OMG', logo: '🌀' },
    teamB: { name: 'Titan Crew',   tag: 'TCW', logo: '⚔️' },
    status: 'UPCOMING',
    scoreA: null,
    scoreB: null,
    stage: 'Semi Finals · Bo3',
  },
];

// ── Live badge ─────────────────────────────────────────────
const LiveBadge = () => (
  <span className="inline-flex items-center gap-1.5 bg-red-600/10 border border-red-500/30 text-red-400 text-[9px] font-black tracking-[0.2em] uppercase px-2 py-1">
    <span className="relative flex h-1.5 w-1.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
    </span>
    Live
  </span>
);

// ── MOBILE card (< lg) ─────────────────────────────────────
const MobileMatchCard = ({ match, index }: { match: typeof MATCHES[0]; index: number }) => {
  const isLive = match.status === 'LIVE';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileTap={{ scale: 0.985 }}
      className={`
        relative overflow-hidden cursor-pointer border
        ${isLive
          ? 'bg-[#e8a000]/5 border-[#e8a000]/35'
          : 'bg-[#0f0f15] border-white/7'
        }
      `}
    >
      {/* Live pulsing top bar */}
      {isLive && (
        <motion.div
          className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-[#e8a000] to-transparent"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="p-4">
        {/* Top row: stage + time/badge + action */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isLive ? <LiveBadge /> : (
              <span className="text-[#e8a000]/70 text-[9px] tracking-[0.15em] uppercase font-bold">{match.time}</span>
            )}
            <span className="text-[#444] text-[9px] tracking-[0.12em] uppercase">{match.stage}</span>
          </div>
          {isLive ? (
            <motion.button
              whileTap={{ scale: 0.92 }}
              className="flex items-center gap-1.5 bg-[#e8a000] text-black text-[9px] font-black tracking-[0.15em] uppercase px-3 py-1.5"
            >
              <Eye size={9} />
              Watch
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.92 }}
              className="flex items-center gap-1.5 border border-white/10 text-[#555] text-[9px] font-black tracking-[0.15em] uppercase px-3 py-1.5"
            >
              <Bell size={9} />
              Remind
            </motion.button>
          )}
        </div>

        {/* Teams vs score — big and bold */}
        <div className="flex items-center gap-3">
          {/* Team A */}
          <div className="flex-1 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/6 border border-white/10 flex items-center justify-center text-base shrink-0">
              {match.teamA.logo}
            </div>
            <span className="text-white font-black text-sm tracking-wide uppercase leading-tight">
              {match.teamA.name}
            </span>
          </div>

          {/* Score / VS */}
          <div className="shrink-0 flex flex-col items-center">
            {isLive ? (
              <div className="flex items-center gap-2 bg-[#0d0d12] border border-[#e8a000]/25 px-3 py-1.5">
                <span className="text-white font-black text-xl font-mono leading-none">{match.scoreA}</span>
                <span className="text-[#333] text-sm font-mono">:</span>
                <span className="text-white font-black text-xl font-mono leading-none">{match.scoreB}</span>
              </div>
            ) : (
              <div className="px-3">
                <span className="text-[#2a2a2a] font-black text-[10px] tracking-[0.3em] uppercase">VS</span>
              </div>
            )}
            {isLive && (
              <span className="text-[#666] font-mono text-[9px] mt-1">{match.elapsed}</span>
            )}
          </div>

          {/* Team B */}
          <div className="flex-1 flex items-center gap-2.5 justify-end">
            <span className="text-white font-black text-sm tracking-wide uppercase leading-tight text-right">
              {match.teamB.name}
            </span>
            <div className="w-8 h-8 bg-white/6 border border-white/10 flex items-center justify-center text-base shrink-0">
              {match.teamB.logo}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ── DESKTOP row (≥ lg) ─────────────────────────────────────
const DesktopMatchRow = ({ match, index }: { match: typeof MATCHES[0]; index: number }) => {
  const isLive = match.status === 'LIVE';
  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: index * 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ scale: 1.006 }}
      className={`
        group relative flex items-stretch gap-0 border transition-colors duration-300 cursor-pointer
        ${isLive
          ? 'bg-[#e8a000]/4 border-[#e8a000]/30 hover:border-[#e8a000]/60'
          : 'bg-[#0f0f15] border-white/5 hover:border-white/12 hover:bg-white/2'
        }
      `}
    >
      {isLive && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#e8a000]"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Time */}
      <div className="shrink-0 w-24 xl:w-28 flex flex-col justify-center gap-1 px-4 xl:px-5 py-4 border-r border-white/5">
        {isLive ? (
          <>
            <LiveBadge />
            <span className="text-[#666] font-mono text-[9px] tracking-wide mt-1">{match.elapsed}</span>
          </>
        ) : (
          <>
            <span className="text-white font-black font-mono text-lg xl:text-xl tracking-tight leading-none">{match.time}</span>
            <span className="text-[#e8a000]/60 text-[9px] tracking-[0.12em] uppercase mt-0.5">Upcoming</span>
          </>
        )}
      </div>

      {/* Stage + Teams */}
      <div className="flex-1 flex flex-col justify-center gap-2 px-5 xl:px-6 py-4 min-w-0">
        <p className="text-[#555] text-[9px] tracking-[0.18em] uppercase leading-none">
          {match.stage}
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/6 border border-white/10 flex items-center justify-center text-base shrink-0">
              {match.teamA.logo}
            </div>
            <span className="text-white font-black text-sm xl:text-base tracking-wide uppercase whitespace-nowrap">
              {match.teamA.name}
            </span>
          </div>

          <div className="shrink-0">
            {isLive ? (
              <div className="flex items-center gap-2 bg-[#0d0d12] border border-[#e8a000]/20 px-3 py-1">
                <span className="text-white font-black text-lg font-mono leading-none">{match.scoreA}</span>
                <span className="text-[#444] text-xs">:</span>
                <span className="text-white font-black text-lg font-mono leading-none">{match.scoreB}</span>
              </div>
            ) : (
              <span className="text-[#2a2a2a] font-black text-[9px] tracking-[0.25em] uppercase px-1">VS</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 xl:w-7 xl:h-7 bg-white/6 border border-white/10 flex items-center justify-center text-sm shrink-0">
              {match.teamB.logo}
            </div>
            <span className="text-white font-black text-sm xl:text-base tracking-wide uppercase whitespace-nowrap">
              {match.teamB.name}
            </span>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="shrink-0 flex items-center px-4 xl:px-5 border-l border-white/5">
        {isLive ? (
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 bg-[#e8a000] hover:bg-[#ffb800] text-black text-[10px] font-black tracking-[0.15em] uppercase px-4 py-2 transition-colors duration-200"
          >
            <Eye size={11} />
            Watch
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 border border-white/10 hover:border-[#e8a000]/50 text-[#666] hover:text-[#e8a000] text-[10px] font-black tracking-[0.15em] uppercase px-4 py-2 transition-all duration-200"
          >
            <Bell size={11} />
            Remind
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

// ── Floating Hero (desktop only) ───────────────────────────
const FloatingHero = ({
  src, alt, side, glowColor, glowPos, mouseX, mouseY,
}: {
  src: string; alt: string; side: 'left' | 'right';
  glowColor: string; glowPos: string;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}) => {
  const factor = side === 'left' ? -1 : 1;
  const rawX = useTransform(mouseX, [-0.5, 0.5], [factor * -12, factor * 12]);
  const rawY = useTransform(mouseY, [-0.5, 0.5], [-8, 8]);
  const springX = useSpring(rawX, { stiffness: 60, damping: 18 });
  const springY = useSpring(rawY, { stiffness: 60, damping: 18 });

  return (
    <motion.div
      aria-hidden="true"
      className={`
        hidden lg:block
        absolute bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} z-0 pointer-events-none select-none
        lg:w-60 lg:h-95
        xl:w-70 xl:h-110
      `}
      style={{ x: springX, y: springY, scaleX: side === 'left' ? -1 : -1 }}
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: side === 'left' ? 0.1 : 0.25 }}
    >
      <motion.div
        className="relative w-full h-full"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: side === 'left' ? 4.2 : 3.8, repeat: Infinity, ease: 'easeInOut', delay: side === 'left' ? 0 : 0.8 }}
      >
        <Image
          src={src} alt={alt} fill
          className="object-contain object-bottom"
          style={{
            maskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
            filter: `drop-shadow(0 0 30px ${glowColor}) drop-shadow(0 0 60px ${glowColor})`,
          }}
        />
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-8 rounded-full blur-xl"
          style={{ background: glowColor }}
          animate={{ opacity: [0.25, 0.55, 0.25], scaleX: [0.85, 1.1, 0.85] }}
          transition={{ duration: side === 'left' ? 4.2 : 3.8, repeat: Infinity, ease: 'easeInOut', delay: side === 'left' ? 0 : 0.8 }}
        />
      </motion.div>
      <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_${side},${glowPos},transparent_70%)]`} />
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 h-0.5 rounded-full"
          style={{ background: glowColor, left: `${20 + i * 18}%`, bottom: `${15 + (i % 2) * 20}%` }}
          animate={{ y: [0, -(20 + i * 10), 0], opacity: [0, 0.9, 0], scale: [0.5, 1.5, 0.5] }}
          transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
        />
      ))}
    </motion.div>
  );
};

// ── Mobile hero banner (< lg) ──────────────────────────────
// Two heroes face each other in a cinematic strip at the top of the section
const MobileHeroBanner = () => (
  <div className="lg:hidden relative h-36 sm:h-44 overflow-hidden bg-[#080810]">
    {/* Left hero */}
    <motion.div
      className="absolute bottom-0 left-0 w-35 sm:w-45 h-full pointer-events-none"
      style={{ scaleX: -1 }}
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="relative w-full h-full"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Image
          src="/heroes/freya.png" alt="" fill
          className="object-contain object-bottom"
          style={{
            maskImage: 'linear-gradient(to top, black 50%, transparent 100%)',
            filter: 'drop-shadow(0 0 20px rgba(232,64,64,0.6))',
          }}
        />
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-5 rounded-full blur-lg bg-red-500"
          animate={{ opacity: [0.3, 0.6, 0.3], scaleX: [0.8, 1.1, 0.8] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </motion.div>

    {/* Right hero */}
    <motion.div
      className="absolute bottom-0 right-0 w-35 sm:w-45 h-full pointer-events-none"
      style={{ scaleX: -1 }}

      initial={{ x: 30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
    >
      <motion.div
        className="relative w-full h-full"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.7, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      >
        <Image
          src="/heroes/seiya.png" alt="" fill
          className="object-contain object-bottom"
          style={{
            maskImage: 'linear-gradient(to top, black 50%, transparent 100%)',
            filter: 'drop-shadow(0 0 20px rgba(74,144,217,0.6))',
          }}
        />
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-5 rounded-full blur-lg bg-blue-500"
          animate={{ opacity: [0.3, 0.6, 0.3], scaleX: [0.8, 1.1, 0.8] }}
          transition={{ duration: 3.7, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
        />
      </motion.div>
    </motion.div>

    {/* Centre VS clash glow */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,160,0,0.08),transparent_65%)]" />
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-full bg-linear-to-t from-[#e8a000]/20 to-transparent" />

    {/* Bottom fade into section */}
    <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-[#0a0a0f] to-transparent" />
  </div>
);

// ── Main Export ────────────────────────────────────────────
export const MatchSchedule = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-60px' });

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  return (
    <section
      id="schedule"
      ref={sectionRef}
      className="relative bg-[#0a0a0f] overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Mobile hero banner — only on < lg ── */}
      <MobileHeroBanner />

      {/* ── Desktop floating heroes — only on lg+ ── */}
      <FloatingHero
        src="/heroes/freya.png" alt="" side="left"
        glowColor="rgba(232,64,64,0.55)" glowPos="rgba(232,64,64,0.12)"
        mouseX={mouseX} mouseY={mouseY}
      />
      <FloatingHero
        src="/heroes/seiya.png" alt="" side="right"
        glowColor="rgba(74,144,217,0.55)" glowPos="rgba(74,144,217,0.12)"
        mouseX={mouseX} mouseY={mouseY}
      />

      {/* Bottom shimmer line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#e84040]/30 via-[#e8a000]/30 to-[#4a90d9]/30 pointer-events-none" />

      {/* ── Content ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">

        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-4 lg:mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-white font-black text-xs sm:text-sm tracking-[0.2em] uppercase border-l-2 border-[#e8a000] pl-3">
              Match Schedule
            </h2>
            <span className="flex items-center gap-1.5 text-[#e8a000] text-[9px] tracking-[0.15em] uppercase">
              <Radio size={10} className="animate-pulse" />
              1 Live now
            </span>
          </div>
          <a href="#" className="text-[#444] hover:text-[#e8a000] text-[10px] tracking-[0.15em] uppercase transition-colors">
            Full Schedule →
          </a>
        </motion.div>

        {/* ── MOBILE: cards stack ── */}
        <div className="flex flex-col gap-2 lg:hidden">
          {MATCHES.map((match, i) => (
            <MobileMatchCard key={match.id} match={match} index={i} />
          ))}
        </div>

        {/* ── DESKTOP: table rows with padding for heroes ── */}
        <div className="hidden lg:block">
          <motion.div
            className="flex items-center mb-2"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <div className="w-24 xl:w-28 shrink-0 text-[#333] text-[9px] uppercase tracking-widest px-4 xl:px-5">Time</div>
            <div className="flex-1 text-[#333] text-[9px] uppercase tracking-widest px-5 xl:px-6">Stage · Teams</div>
            <div className="shrink-0 text-right text-[#333] text-[9px] uppercase tracking-widest px-4 xl:px-5">Action</div>
          </motion.div>

          <div className="flex flex-col gap-1.5 lg:px-50 xl:px-60">
            {MATCHES.map((match, i) => (
              <DesktopMatchRow key={match.id} match={match} index={i} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};