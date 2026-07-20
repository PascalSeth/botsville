'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, useScroll, useMotionValueEvent, useSpring } from 'framer-motion';
import {
  Search, X, ArrowRight, Radio, User, LogOut,
  Settings, ChevronDown, Users, Shield, Bell, Zap, Trophy,
  Swords, Globe, Newspaper, BarChart3, ChevronRight, Star, Medal, Volume2
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { subscribeToUserNotifications, unsubscribeFromChannel } from '@/lib/socket-client';

// ── Constants ──────────────────────────────────────────────
const TICKER_MESSAGES = [
  '🔴 LIVENOW: Betwife Seuam 1 Registration OPEN! Cash Prize: 9,060 GHS',
  '⚔️  Season 4 Qualifier begins in 3 days — Register your squad',
  '🏆  Top Team: CERUS AL EGAN leads with 10,145 pts',
  '🎮  New tournament bracket drops Friday — Stay tuned',
];

const DASHBOARD_HREF = '/dashboard';

const NAV_ITEMS = [
  {
    label: 'Compete',
    icon: Swords,
    color: '#ff4d4d',
    items: [
      { label: 'Challenge Arena', href: '/challenge-arena', desc: 'Issue & accept squad scrim battles', icon: Swords },
      { label: 'Tournaments', href: '/tournaments', desc: 'Active & upcoming events', icon: Trophy },
      { label: 'My Team', href: '/my-team', desc: 'Manage your squad & roster', icon: Shield },
      { label: 'Teams', href: '/teams', desc: 'Browse & join squads', icon: Users },
    ],
  },
  {
    label: 'Rankings',
    icon: BarChart3,
    color: '#e8a000',
    items: [
      { label: 'Leaderboard', href: '/leaderboard', desc: 'Top ranked players & squads', icon: BarChart3 },
      { label: 'Awards', href: '/awards', desc: 'Vote for best role players', icon: Medal },
      { label: 'Polls', href: '/polls', desc: 'Community votes & predictions', icon: Star },
      { label: 'Scrim Vault', href: '/scrim-vault', desc: 'Watch live streamed scrims', icon: Radio },
    ],
  },
  {
    label: 'Community',
    icon: Globe,
    color: '#7c3aed',
    items: [
      { label: 'News', href: '/news', desc: 'Latest esports updates', icon: Newspaper },
      { label: 'Meet the Pros', href: '/pros', desc: 'Vote for the next interview', icon: Volume2 },
      { label: 'Community Hub', href: '/community', desc: 'Forums & discussions', icon: Globe },
    ],
  },
];

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  read: boolean;
  createdAt: string;
};

// ── Scroll Progress Bar (top of page) ──────────────────────
const ScrollProgressBar = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 25, restDelta: 0.001 });

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
      {/* Glow shadow layer */}
      <motion.div
        style={{ scaleX, originX: 0 }}
        className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#ff4d4d] via-[#e8a000] to-[#ff4d4d] opacity-50 blur-[3px]"
      />
      {/* Front sharp layer */}
      <motion.div
        style={{ scaleX, originX: 0 }}
        className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#e8a000] via-[#ff4d4d] to-[#e8a000] shadow-[0_0_8px_rgba(232,160,0,0.8)]"
      />
    </div>
  );
};

// ── Animated Background Canvas ─────────────────────────────
const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; alpha: number; color: string;
      pulse: number; pulseSpeed: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = 120;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    for (let i = 0; i < 25; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
        color: Math.random() > 0.5 ? '#e8a000' : '#ff4d4d',
        pulse: 0,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      particles.forEach((p, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(232, 160, 0, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      // Draw particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        const pulseSize = p.size + Math.sin(p.pulse) * 0.5;
        const pulseAlpha = p.alpha + Math.sin(p.pulse) * 0.1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, pulseAlpha));
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseSize * 3, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulseSize * 3);
        gradient.addColorStop(0, p.color + '40');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.globalAlpha = Math.max(0, Math.min(1, pulseAlpha * 0.3));
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none opacity-60"
      style={{ height: '100%', width: '100%' }}
    />
  );
};

// ── Neon Grid Background ───────────────────────────────────
const NeonGrid = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Perspective grid */}
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(232,160,0,0.5) 1px, transparent 1px),
          linear-gradient(90deg, rgba(232,160,0,0.5) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        transform: 'perspective(500px) rotateX(60deg) translateY(-40px) scale(2)',
        transformOrigin: 'top center',
      }}
    />
    {/* Floating orbs */}
    <motion.div
      className="absolute -top-20 left-[20%] w-64 h-64 rounded-full"
      style={{
        background: 'radial-gradient(circle, rgba(232,160,0,0.08) 0%, transparent 70%)',
      }}
      animate={{
        y: [0, 20, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute -top-10 right-[15%] w-48 h-48 rounded-full"
      style={{
        background: 'radial-gradient(circle, rgba(255,77,77,0.06) 0%, transparent 70%)',
      }}
      animate={{
        y: [0, -15, 0],
        scale: [1, 1.15, 1],
      }}
      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
    />
  </div>
);



// ── Ticker Bar with Marquee ────────────────────────────────
const TickerBar = ({ onClose }: { onClose: () => void }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setIndex((i) => (i + 1) % TICKER_MESSAGES.length), 4000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="relative overflow-hidden border-b border-white/[0.06]" style={{ background: 'rgba(3,3,8,0.95)' }}>
      <div className="absolute inset-0 bg-gradient-to-r from-[#e8a000]/5 via-transparent to-[#e8a000]/5 animate-pulse" />
      <div className="relative flex items-center justify-between px-4 py-2">
        {/* Live indicator */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          </span>
          <span className="text-[#ff4d4d] font-black text-[9px] tracking-[0.3em] uppercase" style={{ textShadow: '0 0 10px rgba(255,77,77,0.5)' }}>
            Live
          </span>
          <div className="w-px h-3 bg-white/10 mx-1" />
        </div>

        {/* Message */}
        <div className="flex-1 text-center overflow-hidden mx-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-[10px] text-[#a0a0a0] tracking-wide font-medium"
            >
              {TICKER_MESSAGES[index]}
            </motion.p>
          </AnimatePresence>
        </div>

        <button
          onClick={onClose}
          className="text-[#444] hover:text-[#e8a000] transition-colors shrink-0 hover:rotate-90 duration-300"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

// ── Logo with Glow ─────────────────────────────────────────
const Logo = () => (
  <Link href="/" className="flex items-center gap-3 group relative">
    <motion.div
      className="relative"
      whileHover={{ scale: 1.08 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-[-8px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(232,160,0,0.2) 0%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <Image
        src="/mlbb_logobg.png"
        alt="BotsVille"
        width={40}
        height={40}
        className="object-contain relative z-10 drop-shadow-[0_0_15px_rgba(232,160,0,0.3)]"
      />
    </motion.div>
    <div className="hidden sm:flex flex-col leading-none">
      <motion.span
        className="text-[16px] font-black tracking-widest uppercase text-white"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        whileHover={{ textShadow: '0 0 30px rgba(232,160,0,0.8), 0 0 60px rgba(232,160,0,0.4)' }}
      >
        Bots<span className="text-[#e8a000]">Ville</span>
      </motion.span>
      <span className="text-[7.5px] tracking-[0.35em] uppercase text-[#555] font-semibold mt-0.5">
        Esports Hub
      </span>
    </div>
  </Link>
);

// ── Mega Menu Popover (Redesigned) ─────────────────────────
const NavMegaMenu = ({
  item, isActive, onMouseEnter, onMouseLeave,
}: {
  item: typeof NAV_ITEMS[0];
  isActive: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) => {
  const Icon = item.icon;

  return (
    <div className="relative" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <motion.button
        className="relative flex items-center gap-2 px-5 py-3 text-sm font-bold tracking-[0.14em] uppercase transition-all duration-300"
        whileHover={{ y: -1 }}
      >
        {/* Shared sliding backdrop pill */}
        {isActive && (
          <motion.div
            layoutId="hover-pill"
            className="absolute inset-1 rounded-lg z-0 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${item.color}15, ${item.color}05)`,
              border: `1px solid ${item.color}25`,
              boxShadow: `0 0 15px ${item.color}10, inset 0 0 10px ${item.color}05`,
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 28,
            }}
          />
        )}

        {/* Animated underline */}
        <motion.div
          className="absolute bottom-0 left-1/2 h-[2px] rounded-full z-10"
          style={{
            translateX: '-50%',
            background: `linear-gradient(90deg, transparent, ${item.color}, transparent)`,
            boxShadow: `0 0 10px ${item.color}40`,
          }}
          animate={{
            width: isActive ? '70%' : '0%',
            opacity: isActive ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* HUD corner brackets */}
        <AnimatePresence>
          {isActive && (
            <>
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute top-1 left-1 w-2 h-2 border-t border-l z-10"
                style={{ borderColor: item.color }}
              />
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute top-1 right-1 w-2 h-2 border-t border-r z-10"
                style={{ borderColor: item.color }}
              />
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute bottom-1 left-1 w-2 h-2 border-b border-l z-10"
                style={{ borderColor: item.color + '60' }}
              />
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute bottom-1 right-1 w-2 h-2 border-b border-r z-10"
                style={{ borderColor: item.color + '60' }}
              />
            </>
          )}
        </AnimatePresence>

        <motion.div
          animate={{ rotate: isActive ? [0, -10, 10, 0] : 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <Icon size={12} style={{ color: isActive ? item.color : '#888' }} />
        </motion.div>
        <span
          className="transition-colors duration-300 text-[11px] font-black relative z-10"
          style={{ color: isActive ? item.color : '#aaa' }}
        >
          {item.label}
        </span>
        <motion.div
          animate={{ rotate: isActive ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          <ChevronDown size={10} style={{ color: isActive ? item.color : '#555' }} />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 16, scale: 0.95, filter: 'blur(8px)' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              transformOrigin: 'top center',
              backdropFilter: 'blur(24px) saturate(180%)',
            }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[280px] z-80"
          >
            <div
              className="relative overflow-hidden rounded-xl border border-white/[0.08]"
              style={{
                background: 'rgba(10,10,18,0.85)',
                boxShadow: `
                  0 30px 80px rgba(0,0,0,0.8),
                  0 0 0 1px ${item.color}15,
                  inset 0 1px 0 rgba(255,255,255,0.05),
                  0 0 40px ${item.color}08
                `,
              }}
            >
              {/* Top gradient glow */}
              <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${item.color}, transparent)` }} />

              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-xl" style={{ borderColor: item.color }} />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-xl" style={{ borderColor: item.color }} />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l rounded-bl-xl" style={{ borderColor: item.color + '40' }} />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r rounded-br-xl" style={{ borderColor: item.color + '40' }} />

              {/* Header */}
              <div className="px-5 pt-4 pb-3 flex items-center gap-2.5 border-b border-white/[0.04]">
                <Icon size={12} style={{ color: item.color }} />
                <span className="text-[9px] font-black tracking-[0.3em] uppercase" style={{ color: item.color }}>
                  {item.label}
                </span>
              </div>

              {/* Sub-links */}
              <div className="p-2.5">
                {item.items.map((sub, i) => {
                  const SubIcon = sub.icon;
                  return (
                    <motion.div
                      key={sub.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.3 }}
                    >
                      <Link
                        href={sub.href}
                        className="group/item relative flex items-center gap-3.5 px-3.5 py-3 rounded-lg overflow-hidden hover:bg-white/[0.04] transition-all duration-200"
                      >
                        {/* Left border reveal */}
                        <motion.div
                          className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full"
                          style={{ background: item.color }}
                          initial={{ scaleY: 0, opacity: 0 }}
                          whileHover={{ scaleY: 1, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        />
                        <div
                          className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg"
                          style={{
                            background: `${item.color}10`,
                            border: `1px solid ${item.color}20`,
                            boxShadow: `0 0 12px ${item.color}10`,
                          }}
                        >
                          <SubIcon size={13} style={{ color: item.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-white/80 group-hover/item:text-white transition-colors truncate">
                            {sub.label}
                          </p>
                          <p className="text-[9px] text-[#555] group-hover/item:text-[#777] transition-colors mt-0.5">
                            {sub.desc}
                          </p>
                        </div>
                        <motion.div
                          initial={{ x: 0, opacity: 0 }}
                          whileHover={{ x: 3, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ArrowRight size={11} className="text-[#333] group-hover/item:text-[#e8a000] transition-colors shrink-0" />
                        </motion.div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Bottom glow line */}
              <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${item.color}30, transparent)` }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Search Overlay (Redesigned) ────────────────────────────
const SearchOverlay = ({ onClose }: { onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
    animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
    transition={{ duration: 0.3 }}
    className="absolute inset-0 z-50 flex items-center px-6"
    style={{ background: 'rgba(3,3,8,0.97)' }}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="flex items-center w-full max-w-2xl mx-auto gap-4"
    >
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Zap size={16} className="text-[#e8a000]" />
      </motion.div>
      <input
        autoFocus
        type="text"
        placeholder="Search teams, tournaments, players..."
        className="flex-1 bg-transparent text-white text-lg tracking-wide placeholder:text-[#333] outline-none font-medium"
      />
      <div className="flex items-center gap-3">
        <motion.span
          className="hidden sm:flex items-center text-[10px] text-[#333] border border-[#1a1a1a] px-2 py-1 rounded tracking-widest font-mono"
          whileHover={{ borderColor: '#e8a00040', color: '#e8a000' }}
        >
          ESC
        </motion.span>
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          className="text-[#444] hover:text-[#e8a000] transition-colors"
        >
          <X size={20} />
        </motion.button>
      </div>
    </motion.div>
  </motion.div>
);

// ── Mobile Menu (Redesigned) ───────────────────────────────
const MobileMenu = ({
  onClose,
  session,
}: {
  onClose: () => void;
  session: { user?: { id?: string; ign?: string; role?: string | null } } | null;
}) => {
  const isLoggedIn = !!session?.user?.id;
  const user = session?.user;
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[90] flex flex-col overflow-hidden"
      style={{ background: 'rgba(3,3,8,0.98)' }}
    >
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(232,160,0,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(232,160,0,0.8) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <motion.div
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-[#e8a000]/5 blur-[120px]"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-[#ff4d4d]/4 blur-[120px]"
          animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-6 py-5 border-b border-white/[0.04]">
        <Logo />
        <motion.button
          whileTap={{ scale: 0.85, rotate: 90 }}
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center border border-white/10 rounded-lg text-[#555] hover:text-[#e8a000] hover:border-[#e8a000]/40 transition-all"
        >
          <X size={16} />
        </motion.button>
      </div>

      {/* Live strip */}
      <div className="relative flex items-center gap-3 px-6 py-3 bg-[#e8a000]/[0.03] border-b border-[#e8a000]/[0.06] overflow-hidden">
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(232,160,0,0.03), transparent)',
          }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        <Radio size={10} className="text-[#e8a000] animate-pulse shrink-0" />
        <p className="text-[#555] text-[11px] tracking-wide truncate">
          Season 4 Qualifier — Register your squad now
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-6 pt-8 pb-6" style={{ scrollbarWidth: 'none' }}>
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-[#222] text-[9px] tracking-[0.3em] uppercase font-black mb-5"
        >
          Navigation
        </motion.p>

        {NAV_ITEMS.map((group, groupIdx) => {
          const GroupIcon = group.icon;
          const expanded = expandedGroup === group.label;

          return (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIdx * 0.1 }}
              className="mb-1"
            >
              <motion.button
                onClick={() => setExpandedGroup(expanded ? null : group.label)}
                className="group w-full flex items-center justify-between py-4 border-b border-white/[0.04]"
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3.5">
                  <motion.span
                    className="w-9 h-9 flex items-center justify-center rounded-lg"
                    style={{
                      background: `${group.color}10`,
                      border: `1px solid ${group.color}20`,
                    }}
                    whileHover={{ boxShadow: `0 0 20px ${group.color}20` }}
                  >
                    <GroupIcon size={14} style={{ color: group.color }} />
                  </motion.span>
                  <span className="text-white font-black text-sm tracking-[0.06em] uppercase group-hover:text-[#e8a000] transition-colors">
                    {group.label}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: expanded ? 90 : 0 }}
                  transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                >
                  <ChevronRight size={14} style={{ color: expanded ? group.color : '#222' }} />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div
                      className="pl-4 py-3 ml-4 mt-2 mb-2 border-l-2 space-y-1"
                      style={{ borderColor: group.color + '25' }}
                    >
                      {group.items.map((sub, subIdx) => {
                        const SubIcon = sub.icon;
                        return (
                          <motion.div
                            key={sub.label}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: subIdx * 0.05 }}
                          >
                            <Link
                              href={sub.href}
                              onClick={onClose}
                              className="group/sub flex items-center gap-3 py-3 px-3 rounded-lg text-[#555] hover:text-white hover:bg-white/[0.03] transition-all"
                            >
                              <SubIcon size={12} className="transition-colors group-hover/sub:text-[#e8a000]" />
                              <span className="text-sm font-bold tracking-wider uppercase">{sub.label}</span>
                              <ArrowRight
                                size={10}
                                className="ml-auto text-[#1a1a1a] group-hover/sub:text-[#e8a000] group-hover/sub:translate-x-1 transition-all"
                              />
                            </Link>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* Account */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10"
        >
          <p className="text-[#1a1a1a] text-[9px] tracking-[0.3em] uppercase font-black mb-5">Account</p>
          {isLoggedIn ? (
            <div className="space-y-1">
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-3 p-4 rounded-xl border border-[#e8a000]/15 mb-5"
                style={{ background: 'linear-gradient(135deg, rgba(232,160,0,0.06) 0%, transparent 100%)' }}
              >
                <div className="w-10 h-10 bg-[#e8a000]/15 rounded-lg flex items-center justify-center">
                  <User size={15} className="text-[#e8a000]" />
                </div>
                <div>
                  <p className="text-white font-black text-sm leading-none">{user?.ign}</p>
                  <p className="text-[#444] text-[10px] uppercase tracking-wider mt-1">{user?.role || 'Player'}</p>
                </div>
              </motion.div>
              {[
                { href: '/settings', icon: Settings, label: 'Profile Settings' },
                { href: '/my-team', icon: Users, label: 'My Team' },
              ].map((lnk, i) => (
                <motion.div
                  key={lnk.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                >
                  <Link
                    href={lnk.href}
                    onClick={onClose}
                    className="flex items-center gap-3 py-3 px-3 rounded-lg text-[#444] hover:text-white hover:bg-white/[0.03] text-xs font-bold tracking-widest uppercase transition-all"
                  >
                    <lnk.icon size={12} />
                    {lnk.label}
                  </Link>
                </motion.div>
              ))}
              {user?.role && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Link
                    href={DASHBOARD_HREF}
                    onClick={onClose}
                    className="flex items-center gap-3 py-3 px-3 rounded-lg text-[#e8a000] hover:text-[#ffb800] hover:bg-[#e8a000]/[0.03] text-xs font-bold tracking-widest uppercase transition-all"
                  >
                    <Shield size={12} />
                    Admin Dashboard
                  </Link>
                </motion.div>
              )}
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 }}
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-3 py-3 px-3 rounded-lg text-[#444] hover:text-red-400 hover:bg-red-500/[0.03] text-xs font-bold tracking-widest uppercase transition-colors w-full"
              >
                <LogOut size={12} />
                Logout
              </motion.button>
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { href: '/login', label: 'Login' },
                { href: '/register-team', label: 'Register Team' },
              ].map((lnk, i) => (
                <motion.div
                  key={lnk.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                >
                  <Link
                    href={lnk.href}
                    onClick={onClose}
                    className="flex items-center gap-3 py-3 px-3 rounded-lg text-[#444] hover:text-[#e8a000] hover:bg-white/[0.02] text-xs font-bold tracking-widest uppercase transition-all"
                  >
                    <ArrowRight size={12} />
                    {lnk.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </nav>

      {/* Bottom CTA */}
      <div className="relative px-6 py-6 border-t border-white/[0.04]">
        {isLoggedIn ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[#222] text-[11px] tracking-[0.2em] uppercase text-center"
          >
            Welcome back, <span className="text-[#e8a000] font-bold">{user?.ign}</span>
          </motion.p>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Link
              href="/login"
              onClick={onClose}
              className="relative block w-full text-center text-black font-black text-xs tracking-[0.2em] uppercase py-4 rounded-xl overflow-hidden group"
              style={{ background: 'linear-gradient(135deg, #e8a000, #f0a900)' }}
            >
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', transform: 'skewX(-15deg)' }}
                initial={{ x: '-100%' }}
                whileHover={{ x: '200%' }}
                transition={{ duration: 0.7 }}
              />
              <span className="relative flex items-center justify-center gap-2">
                <Zap size={14} /> Register Your Team →
              </span>
            </Link>
            <p className="text-[#1a1a1a] text-[10px] tracking-[0.15em] uppercase text-center mt-3">
              Season 5 · Registration Open
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// ── User Dropdown (Redesigned) ─────────────────────────────
const UserDropdown = ({
  user,
  onLogout,
}: {
  user: { id?: string; ign?: string; role?: string | null };
  onLogout: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-[#e8a000]/15 hover:border-[#e8a000]/40 transition-all overflow-hidden group"
        style={{
          background: 'linear-gradient(135deg, rgba(232,160,0,0.06) 0%, rgba(232,160,0,0.02) 100%)',
        }}
      >
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(232,160,0,0.08), transparent)' }}
          initial={{ x: '-100%' }}
          whileHover={{ x: '200%' }}
          transition={{ duration: 0.6 }}
        />
        <div className="w-6 h-6 bg-[#e8a000]/15 rounded-md flex items-center justify-center shrink-0">
          <User size={11} className="text-[#e8a000]" />
        </div>
        <span className="text-white font-bold text-[11px] tracking-wider hidden sm:block">{user.ign}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown size={10} className="text-[#444]" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, scale: 0.95, filter: 'blur(8px)' }}
            transition={{ duration: 0.2 }}
            style={{
              transformOrigin: 'top right',
              backdropFilter: 'blur(20px) saturate(180%)',
              boxShadow: '0 25px 70px rgba(0,0,0,0.9), 0 0 0 1px rgba(232,160,0,0.1), 0 0 30px rgba(0,0,0,0.5)',
            }}
            className="absolute right-0 top-full mt-2 w-52 bg-[rgba(10,10,18,0.9)] border border-white/[0.06] rounded-xl z-80 overflow-hidden"
          >
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#e8a000] to-transparent" />
            <div className="px-4 py-3 border-b border-white/[0.04]">
              <p className="text-white font-black text-xs">{user.ign}</p>
              <p className="text-[#555] text-[9px] uppercase tracking-wider mt-0.5">{user.role || 'Player'}</p>
            </div>
            {[
              { href: '/settings', icon: Settings, label: 'Profile Settings' },
              { href: '/my-team', icon: Users, label: 'My Team' },
            ].map((lnk) => (
              <Link
                key={lnk.href}
                href={lnk.href}
                onClick={() => setIsOpen(false)}
                className="group/lnk flex items-center gap-2.5 px-4 py-2.5 text-[#666] hover:text-white hover:bg-white/[0.03] text-[11px] transition-all"
              >
                <lnk.icon size={11} className="group-hover/lnk:text-[#e8a000] transition-colors" />
                {lnk.label}
              </Link>
            ))}
            {user.role && (
              <Link
                href={DASHBOARD_HREF}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[#e8a000] hover:text-[#ffb800] hover:bg-[#e8a000]/[0.03] text-[11px] transition-all"
              >
                <Shield size={11} />
                Admin Dashboard
              </Link>
            )}
            <div className="border-t border-white/[0.04]">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#666] hover:text-red-400 hover:bg-red-500/[0.03] text-[11px] transition-all"
              >
                <LogOut size={11} />
                Logout
              </button>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#e8a000]/20 to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Notification Bell (Redesigned) ─────────────────────────
const formatTime = (createdAt: string) => {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

const NotificationBell = ({ isLoggedIn, userId }: { isLoggedIn: boolean; userId?: string | null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      setLoading(true);
      const res = await fetch('/api/notifications?limit=8', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.pagination?.unreadCount ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) { setNotifications([]); setUnreadCount(0); return; }
    void fetchNotifications();
    const iv = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void fetchNotifications();
      }
    }, 60000);
    return () => clearInterval(iv);
  }, [fetchNotifications, isLoggedIn]);

  useEffect(() => { if (isOpen) void fetchNotifications(); }, [fetchNotifications, isOpen]);

  useEffect(() => {
    if (!isLoggedIn || !userId) return;

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const fireDesktopNotif = (item: NotificationItem) => {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.visibilityState !== 'visible'
      ) {
        const notif = new Notification(item.title, {
          body: item.message,
          icon: '/mlbb_logo.png',
          badge: '/mlbb_logo.png',
          tag: 'notif-' + item.id,
        });
        notif.onclick = () => {
          window.focus();
          if (item.linkUrl) window.location.href = item.linkUrl;
          notif.close();
        };
      }
    };

    const handleNew = (payload: unknown) => {
      const item = payload as NotificationItem;
      if (!item?.id) return;
      setNotifications(prev => prev.some(n => n.id === item.id) ? prev : [item, ...prev.slice(0, 7)]);
      setUnreadCount(prev => prev + 1);
      fireDesktopNotif(item);
    };

    subscribeToUserNotifications(userId, handleNew);

    return () => {
      unsubscribeFromChannel(`user:${userId}`);
    };
  }, [isLoggedIn, userId]);

  const markRead = async (id: string) => {
    setNotifications((p) => p.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((p) => Math.max(0, p - 1));
    try {
      await fetch('/api/notifications', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [id] }),
      });
    } catch { /* optimistic */ }
  };

  const markAll = async () => {
    setNotifications((p) => p.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
    } catch { /* optimistic */ }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen((p) => !p)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-[#666] hover:text-[#e8a000] transition-colors border border-transparent hover:border-[#e8a000]/20"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-gradient-to-r from-[#e8a000] to-[#ff9500] text-[8px] font-black text-black flex items-center justify-center rounded-full shadow-[0_0_8px_rgba(232,160,0,0.5)]"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[79] md:hidden backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.95, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, scale: 0.95, filter: 'blur(8px)' }}
              transition={{ duration: 0.2 }}
              style={{
                transformOrigin: 'top',
                backdropFilter: 'blur(20px) saturate(180%)',
                boxShadow: '0 25px 70px rgba(0,0,0,0.9), 0 0 0 1px rgba(232,160,0,0.1)',
              }}
              className="fixed md:absolute left-4 right-4 md:left-auto md:right-0 top-20 md:top-full md:mt-2 md:w-80 bg-[rgba(10,10,18,0.92)] border border-white/[0.06] rounded-xl z-[80] overflow-hidden"
            >
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#e8a000] to-transparent" />
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                  <Bell size={11} className="text-[#e8a000]" />
                  <span className="text-[10px] font-black tracking-[0.25em] uppercase text-white">Alerts</span>
                  {unreadCount > 0 && (
                    <span className="text-[8px] font-bold bg-[#e8a000]/15 text-[#e8a000] px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button
                  onClick={markAll}
                  disabled={unreadCount === 0}
                  className="text-[9px] font-bold uppercase tracking-wider text-[#555] hover:text-[#e8a000] disabled:opacity-20 transition-colors"
                >
                  Mark all read
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                {loading && !notifications.length ? (
                  <div className="flex justify-center py-10">
                    <motion.div
                      className="w-5 h-5 border-2 border-[#e8a000]/20 border-t-[#e8a000] rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                ) : !notifications.length ? (
                  <div className="flex flex-col items-center py-10 gap-3">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Bell size={20} className="text-[#1a1a1a]" />
                    </motion.div>
                    <p className="text-[11px] text-[#222]">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((item, i) => {
                    const inner = (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex gap-3 px-5 py-3.5 border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors ${!item.read ? 'bg-[#e8a000]/[0.02]' : ''}`}
                      >
                        <motion.span
                          className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${item.read ? 'bg-[#1a1a1a]' : 'bg-[#e8a000] shadow-[0_0_6px_rgba(232,160,0,0.5)]'}`}
                          animate={!item.read ? { scale: [1, 1.3, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-white/80 truncate">{item.title}</p>
                          <p className="text-[10px] text-[#666] line-clamp-2 leading-relaxed mt-0.5">{item.message}</p>
                          <p className="text-[9px] text-[#222] mt-1">{formatTime(item.createdAt)}</p>
                        </div>
                      </motion.div>
                    );

                    return item.linkUrl ? (
                      <Link
                        key={item.id}
                        href={item.linkUrl}
                        onClick={() => { void markRead(item.id); setIsOpen(false); }}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button key={item.id} onClick={() => void markRead(item.id)} className="w-full text-left">
                        {inner}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[#e8a000]/20 to-transparent" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main Navbar ────────────────────────────────────────────
export const Navbar = () => {
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [tickerOpen, setTickerOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [animateReady, setAnimateReady] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLoading = status === 'loading';
  const isLoggedIn = status === 'authenticated' && !!session?.user?.id;
  const user = session?.user;

  // Scroll tracking for navbar transformation
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest: number) => {
    setScrolled(latest > 20);
  });

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimateReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === 'Escape') { setSearchOpen(false); setActiveMenu(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleMenuEnter = (label: string) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setActiveMenu(label);
  };
  const handleMenuLeave = () => {
    leaveTimer.current = setTimeout(() => setActiveMenu(null), 160);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
      `}</style>

      <ScrollProgressBar />

      <AnimatePresence>
        {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} session={session} />}
      </AnimatePresence>

      <motion.header
        className="fixed top-0 left-0 right-0 z-[70] w-full flex flex-col items-center pointer-events-none"
      >
        {/* Ticker */}
        <AnimatePresence>
          {!scrolled && tickerOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full pointer-events-auto"
            >
              <TickerBar onClose={() => setTickerOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Morphing HUD Capsule Container */}
        <motion.div
          animate={{
            width: scrolled ? '94%' : '100%',
            maxWidth: scrolled ? '1280px' : '100%',
            marginTop: scrolled ? '12px' : '0px',
            borderRadius: scrolled ? '20px' : '0px',
            backgroundColor: scrolled ? 'rgba(6,6,12,0.85)' : 'rgba(5,5,12,0.0)',
            borderColor: scrolled ? 'rgba(232, 160, 0, 0.22)' : 'rgba(255,255,255,0.0)',
            boxShadow: scrolled
              ? '0 20px 45px -15px rgba(0,0,0,0.85), 0 0 25px rgba(232,160,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)'
              : 'none',
          }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          style={{
            backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
            borderStyle: 'solid',
            borderWidth: scrolled ? '1px' : '0px',
          }}
          className="relative pointer-events-auto w-full overflow-visible transition-colors"
        >
          {/* Subtle Top neon glow stripe when scrolled */}
          {scrolled && (
            <div className="absolute top-0 left-0 right-0 h-[1.5px] overflow-hidden rounded-t-[20px]">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#e8a000] to-transparent opacity-80" />
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ff4d4d] to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          )}

          {/* Cyber HUD Corner Brackets when scrolled */}
          {scrolled && (
            <>
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#e8a000] opacity-80 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#e8a000] opacity-80 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#ff4d4d] opacity-80 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#ff4d4d] opacity-80 rounded-br-lg" />
            </>
          )}

          {/* Main bar */}
          <nav className="relative h-16 flex items-center justify-between px-5 sm:px-8 gap-4 overflow-visible">
            {/* Background effects */}
            {animateReady && scrolled && (
              <>
                <AnimatedBackground />
                <NeonGrid />
              </>
            )}

          {/* Search overlay */}
          <AnimatePresence>
            {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
          </AnimatePresence>

          {/* Logo */}
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Logo />
          </motion.div>

          {/* Desktop mega-menu nav */}
          <motion.div
            className="hidden lg:flex items-center justify-center gap-1 xl:gap-4 z-20 mx-auto"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {NAV_ITEMS.map((item) => (
              <NavMegaMenu
                key={item.label}
                item={item}
                isActive={activeMenu === item.label}
                onMouseEnter={() => handleMenuEnter(item.label)}
                onMouseLeave={handleMenuLeave}
              />
            ))}
          </motion.div>

          {/* Right controls */}
          <motion.div
            className="relative z-10 flex items-center gap-2 sm:gap-3 ml-auto"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {!isLoading && <NotificationBell isLoggedIn={isLoggedIn} userId={user?.id} />}

            {/* Search pill — desktop */}
            <motion.button
              onClick={() => setSearchOpen(true)}
              whileHover={{ scale: 1.02, borderColor: 'rgba(232,160,0,0.3)' }}
              whileTap={{ scale: 0.98 }}
              className="hidden sm:flex items-center gap-2.5 h-8 px-3 rounded-lg border border-white/[0.06] text-[#333] hover:text-[#e8a000] text-[10px] tracking-widest transition-all"
            >
              <Search size={12} />
              <span className="hidden lg:block font-bold uppercase">Search</span>
              <kbd className="hidden lg:flex items-center text-[8px] text-[#222] border border-[#181818] px-1.5 py-0.5 rounded font-mono">
                ⌘K
              </kbd>
            </motion.button>

            {/* Search icon — mobile */}
            <motion.button
              onClick={() => setSearchOpen(true)}
              whileTap={{ scale: 0.9 }}
              className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[#333] hover:text-[#e8a000] transition-colors border border-transparent hover:border-white/[0.06]"
            >
              <Search size={14} />
            </motion.button>

            <div className="hidden lg:block w-px h-5 bg-white/[0.06]" />

            {/* Auth section */}
            {isLoading ? (
              <div className="hidden lg:block w-20 h-8 rounded-lg bg-white/[0.03] animate-pulse" />
            ) : isLoggedIn ? (
              <UserDropdown user={user!} onLogout={() => signOut({ callbackUrl: '/' })} />
            ) : (
              <div className="flex items-center gap-2">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/login"
                    className="flex items-center gap-1.5 h-8 px-3.5 text-[10px] font-black tracking-[0.18em] uppercase text-[#777] border border-white/[0.06] hover:text-white hover:border-[#e8a000]/30 transition-all rounded-lg"
                  >
                    <User size={11} className="lg:hidden" />
                    <span className="hidden sm:inline">Login</span>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/login"
                    className="relative overflow-hidden group flex items-center gap-1.5 h-8 px-4 text-[10px] font-black tracking-[0.18em] uppercase text-black rounded-lg"
                    style={{ background: 'linear-gradient(135deg, #e8a000, #f0a900)' }}
                  >
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                        transform: 'skewX(-15deg)',
                      }}
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '200%' }}
                      transition={{ duration: 0.6 }}
                    />
                    <Zap size={10} className="relative shrink-0" />
                    <span className="relative hidden sm:inline">Register</span>
                    <span className="relative sm:hidden">Join</span>
                  </Link>
                </motion.div>
              </div>
            )}

            {/* Animated hamburger — mobile */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => setMenuOpen(prev => !prev)}
              className="lg:hidden relative w-9 h-9 flex flex-col items-center justify-center gap-[5px] border border-white/[0.06] rounded-lg text-[#666] hover:text-[#e8a000] hover:border-[#e8a000]/30 transition-all overflow-hidden group"
            >
              <motion.span
                className="w-4 h-[1.5px] bg-current rounded-full"
                animate={menuOpen ? { rotate: 45, y: 3.5 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.3 }}
              />
              <motion.span
                className="w-3 h-[1.5px] bg-[#e8a000] rounded-full"
                animate={menuOpen ? { opacity: 0, x: 10 } : { opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              />
              <motion.span
                className="w-4 h-[1.5px] bg-current rounded-full"
                animate={menuOpen ? { rotate: -45, y: -3.5 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </motion.div>
          </nav>
        </motion.div>
      </motion.header>
    </>
  );
};