'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, ArrowRight, Radio, User, LogOut,
  Settings, ChevronDown, Users, Shield, Bell, Zap, Trophy,
  Swords, Globe, Newspaper, BarChart3, ChevronRight, Star
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

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
      { label: 'Tournaments', href: '/tournaments', desc: 'Active & upcoming events', icon: Trophy },
      { label: 'Leaderboard', href: '/leaderboard', desc: 'Top ranked players & teams', icon: BarChart3 },
      { label: 'Polls', href: '/polls', desc: 'Community votes & predictions', icon: Star },
    ],
  },
  {
    label: 'Social',
    icon: Users,
    color: '#e8a000',
    items: [
      { label: 'Teams', href: '/teams', desc: 'Browse & join squads', icon: Users },
      { label: 'Community', href: '/community', desc: 'Forums & discussions', icon: Globe },
      { label: 'News', href: '/news', desc: 'Latest esports updates', icon: Newspaper },
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

// ── Animated grid background ───────────────────────────────
const GridBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div
      className="absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(232,160,0,0.8) 1px, transparent 1px),
          linear-gradient(90deg, rgba(232,160,0,0.8) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        maskImage: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.6) 50%, transparent)',
      }}
    />
    <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-[#e8a000]/6 blur-3xl" />
    <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#ff4d4d]/5 blur-3xl" />
  </div>
);

// ── Floating particles ─────────────────────────────────────
const Particles = () =>
  Array.from({ length: 12 }, (_, i) => (
    <motion.div
      key={i}
      className="absolute w-px h-px rounded-full pointer-events-none"
      style={{
        left: `${8 + i * 7.5}%`,
        top: '50%',
        background: i % 3 === 0 ? '#e8a000' : i % 3 === 1 ? '#ff4d4d' : '#fff',
        boxShadow: `0 0 ${i % 2 === 0 ? 4 : 2}px ${i % 3 === 0 ? '#e8a000' : i % 3 === 1 ? '#ff4d4d' : '#fff'}`,
      }}
      animate={{ y: ['0px', '-20px', '0px'], opacity: [0.15, 0.7, 0.15], scale: [1, i % 2 === 0 ? 3 : 2, 1] }}
      transition={{ duration: 3 + (i % 5) * 0.7, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
    />
  ));

// ── Scanline sweep ─────────────────────────────────────────
const Scanline = () => (
  <motion.div
    className="absolute inset-y-0 w-0.5 pointer-events-none"
    style={{ background: 'linear-gradient(to bottom, transparent, rgba(232,160,0,0.35), transparent)' }}
    animate={{ left: ['-2px', '101%'] }}
    transition={{ duration: 6, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
  />
);

// ── Ticker Bar ─────────────────────────────────────────────
const TickerBar = ({ onClose }: { onClose: () => void }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setIndex((i) => (i + 1) % TICKER_MESSAGES.length), 4000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="relative bg-[#050508] border-b border-[#e8a000]/12 px-4 py-1.5 flex items-center justify-between overflow-hidden">
      <motion.div
        className="absolute inset-y-0 w-1/4 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(232,160,0,0.05), transparent)' }}
        animate={{ x: ['-100%', '500%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
      <div className="flex items-center gap-2 shrink-0">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
        </span>
        <span className="text-[#e8a000] font-black text-[9px] tracking-[0.25em] uppercase">Live</span>
        <div className="w-px h-3 bg-white/10 mx-1" />
      </div>
      <div className="flex-1 text-center overflow-hidden mx-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25 }}
            className="text-[10px] text-[#888] tracking-wide"
          >
            {TICKER_MESSAGES[index]}
          </motion.p>
        </AnimatePresence>
      </div>
      <button onClick={onClose} className="text-[#666] hover:text-[#e8a000] transition-colors shrink-0">
        <X size={11} />
      </button>
    </div>
  );
};

// ── Logo ───────────────────────────────────────────────────
const Logo = () => (
  <Link href="/" className="flex items-center gap-3 group relative">
    <div className="relative">
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,160,0,0.35) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <Image
        src="/mlbb_logobg.png"
        alt="BotsVille"
        width={40}
        height={40}
        className="object-contain relative z-10 group-hover:scale-105 transition-transform duration-300"
      />
    </div>
    <div className="hidden sm:flex flex-col leading-none">
      <span
        className="text-[15px] font-black tracking-widest uppercase text-white"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", textShadow: '0 0 24px rgba(232,160,0,0.5)' }}
      >
        Bots<span className="text-[#e8a000]">Ville</span>
      </span>
      <span className="text-[7.5px] tracking-[0.32em] uppercase text-[#7a7a7a] font-semibold">Esports Hub</span>
    </div>
  </Link>
);

// ── Mega Menu Popover ──────────────────────────────────────
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
      <button
        className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-bold tracking-[0.14em] uppercase transition-all duration-200 ${
          isActive ? 'text-white' : 'text-white hover:text-white'
        }`}
      >
        {/* Underline */}
        <motion.div
          className="absolute bottom-0 left-1/2 h-px"
          style={{
            translateX: '-50%',
            background: `linear-gradient(90deg, transparent, ${item.color}, transparent)`,
          }}
          animate={{ width: isActive ? '80%' : '0%' }}
          transition={{ duration: 0.2 }}
        />
        {/* HUD corner brackets when active */}
        {isActive && (
          <>
            <span className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l" style={{ borderColor: item.color + '80' }} />
            <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r" style={{ borderColor: item.color + '80' }} />
          </>
        )}
        <Icon size={11} style={{ color: isActive ? item.color : "white" }} />
        <span
          className="transition-colors duration-200 text-[11px]"
          style={{ color: isActive ? item.color : "white" }}
        >
          {item.label}
        </span>
        <ChevronDown
          size={10}
          className={`transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`}
          style={{ color: isActive ? item.color : undefined }}
        />
      </button>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 10, scaleY: 0.88 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: 10, scaleY: 0.88 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'top center' }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 z-80"
          >
            <div
              className="relative bg-[#07070d] border border-white/[0.07] overflow-hidden"
              style={{
                boxShadow: `0 30px 70px rgba(0,0,0,0.9), 0 0 0 1px ${item.color}18, inset 0 1px 0 rgba(255,255,255,0.04)`,
              }}
            >
              {/* Top gradient accent */}
              <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${item.color}, transparent)` }} />
              {/* Corner brackets */}
              <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: item.color }} />
              <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: item.color }} />
              <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: item.color + '40' }} />
              <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: item.color + '40' }} />

              {/* Header */}
              <div className="px-4 pt-3 pb-2.5 flex items-center gap-2 border-b border-white/5">
                <Icon size={11} style={{ color: item.color }} />
                <span className="text-[9px] font-black tracking-[0.3em] uppercase" style={{ color: item.color }}>
                  {item.label}
                </span>
              </div>

              {/* Sub-links */}
              <div className="p-2">
                {item.items.map((sub, i) => {
                  const SubIcon = sub.icon;
                  return (
                    <motion.div
                      key={sub.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.055 }}
                    >
                      <Link
                        href={sub.href}
                        className="group/item relative flex items-center gap-3 px-3 py-2.5 overflow-hidden hover:bg-white/3 transition-all duration-150"
                      >
                        {/* Left border reveal */}
                        <motion.div
                          className="absolute left-0 top-0 bottom-0 w-0.5"
                          style={{ background: `linear-gradient(to bottom, transparent, ${item.color}, transparent)` }}
                          initial={{ scaleY: 0 }}
                          whileHover={{ scaleY: 1 }}
                          transition={{ duration: 0.15 }}
                        />
                        <div
                          className="w-7 h-7 flex items-center justify-center shrink-0"
                          style={{ background: `${item.color}12`, border: `1px solid ${item.color}20` }}
                        >
                          <SubIcon size={12} style={{ color: item.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-white/70 group-hover/item:text-white transition-colors truncate">
                            {sub.label}
                          </p>
                          <p className="text-[9px] text-[#5f5f5f] group-hover/item:text-[#8a8a8a] transition-colors">
                            {sub.desc}
                          </p>
                        </div>
                        <ArrowRight
                          size={10}
                          className="text-[#2a2a2a] group-hover/item:text-[#e8a000] group-hover/item:translate-x-0.5 transition-all shrink-0"
                        />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Bottom glow */}
              <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${item.color}30, transparent)` }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Search Overlay ─────────────────────────────────────────
const SearchOverlay = ({ onClose }: { onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scaleX: 0.97 }}
    animate={{ opacity: 1, scaleX: 1 }}
    exit={{ opacity: 0, scaleX: 0.97 }}
    transition={{ duration: 0.15 }}
    className="absolute inset-0 z-50 flex items-center px-5"
    style={{ background: 'rgba(5,5,10,0.98)', backdropFilter: 'blur(20px)' }}
  >
    <Zap size={13} className="text-[#e8a000] mr-3 shrink-0" />
    <input
      autoFocus
      type="text"
      placeholder="Search teams, tournaments, players..."
      className="flex-1 bg-transparent text-white text-sm tracking-wide placeholder:text-[#666] outline-none font-medium"
    />
    <div className="flex items-center gap-2 ml-4">
      <span className="hidden sm:flex items-center text-[9px] text-[#2a2a2a] border border-[#1a1a1a] px-1.5 py-0.5 tracking-widest">
        ESC
      </span>
      <button onClick={onClose} className="text-[#666] hover:text-[#e8a000] transition-colors">
        <X size={16} />
      </button>
    </div>
  </motion.div>
);

// ── Mobile Menu ────────────────────────────────────────────
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
      initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
      animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
      exit={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-60 flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at top left, #0e0a02 0%, #070710 40%, #050508 100%)' }}
    >
      {/* Animated BG grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(232,160,0,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(232,160,0,0.8) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-[#e8a000]/6 blur-[100px]" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-[#ff4d4d]/5 blur-[100px]" />
      </div>

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-5 py-4 border-b border-white/5">
        <Logo />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center border border-white/8 text-[#555] hover:text-[#e8a000] hover:border-[#e8a000]/40 transition-all"
        >
          <X size={14} />
        </motion.button>
      </div>

      {/* Live strip */}
      <div className="relative flex items-center gap-2 px-5 py-2 bg-[#e8a000]/[0.035] border-b border-[#e8a000]/8 overflow-hidden">
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(232,160,0,0.04), transparent)' }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        <Radio size={9} className="text-[#e8a000] animate-pulse shrink-0" />
        <p className="text-[#666] text-[10px] tracking-wide truncate">
          Season 4 Qualifier — Register your squad now
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-5 pt-6 pb-4" style={{ scrollbarWidth: 'none' }}>
        <p className="text-[#222] text-[8px] tracking-[0.3em] uppercase font-black mb-4">Menu</p>

        {NAV_ITEMS.map((group) => {
          const GroupIcon = group.icon;
          const expanded = expandedGroup === group.label;

          return (
            <div key={group.label} className="mb-0.5">
              <button
                onClick={() => setExpandedGroup(expanded ? null : group.label)}
                className="group w-full flex items-center justify-between py-3.5 border-b border-white/4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-7 h-7 flex items-center justify-center"
                    style={{ background: `${group.color}12`, border: `1px solid ${group.color}22` }}
                  >
                    <GroupIcon size={12} style={{ color: group.color }} />
                  </span>
                  <span className="text-white font-black text-sm tracking-[0.06em] uppercase group-hover:text-[#e8a000] transition-colors">
                    {group.label}
                  </span>
                </div>
                <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight size={13} style={{ color: expanded ? group.color : '#2a2a2a' }} />
                </motion.div>
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="pl-4 py-2 ml-3.5 mt-1 mb-2 border-l-2"
                      style={{ borderColor: group.color + '30' }}
                    >
                      {group.items.map((sub) => {
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sub.label}
                            href={sub.href}
                            onClick={onClose}
                            className="group/sub flex items-center gap-3 py-2.5 text-[#666] hover:text-white transition-colors"
                          >
                            <SubIcon size={11} className="transition-colors group-hover/sub:text-[#e8a000]" />
                            <span className="text-sm font-semibold tracking-wider uppercase">{sub.label}</span>
                            <ArrowRight
                              size={10}
                              className="ml-auto text-[#222] group-hover/sub:text-[#e8a000] group-hover/sub:translate-x-0.5 transition-all"
                            />
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Account */}
        <div className="mt-8">
          <p className="text-[#222] text-[8px] tracking-[0.3em] uppercase font-black mb-4">Account</p>
          {isLoggedIn ? (
            <div className="space-y-0.5">
              <div
                className="flex items-center gap-3 p-3 border border-[#e8a000]/15 mb-4"
                style={{ background: 'linear-gradient(135deg, rgba(232,160,0,0.07) 0%, transparent 100%)' }}
              >
                <div className="w-8 h-8 bg-[#e8a000]/15 flex items-center justify-center">
                  <User size={13} className="text-[#e8a000]" />
                </div>
                <div>
                  <p className="text-white font-black text-sm leading-none">{user?.ign}</p>
                  <p className="text-[#444] text-[9px] uppercase tracking-wider mt-0.5">{user?.role || 'Player'}</p>
                </div>
              </div>
              {[
                { href: '/profile', icon: Settings, label: 'Profile Settings' },
                { href: '/my-team', icon: Users, label: 'My Team' },
              ].map((lnk) => (
                <Link
                  key={lnk.href}
                  href={lnk.href}
                  onClick={onClose}
                  className="flex items-center gap-3 py-2.5 text-[#444] hover:text-white text-xs font-bold tracking-widest uppercase transition-colors"
                >
                  <lnk.icon size={11} />
                  {lnk.label}
                </Link>
              ))}
              {user?.role && (
                <Link
                  href={DASHBOARD_HREF}
                  onClick={onClose}
                  className="flex items-center gap-3 py-2.5 text-[#e8a000] hover:text-[#ffb800] text-xs font-bold tracking-widest uppercase transition-colors"
                >
                  <Shield size={11} />
                  Admin Dashboard
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-3 py-2.5 text-[#444] hover:text-red-400 text-xs font-bold tracking-widest uppercase transition-colors w-full"
              >
                <LogOut size={11} />
                Logout
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {[
                { href: '/login', label: 'Login' },
                { href: '/register-team', label: 'Register Team' },
              ].map((lnk) => (
                <Link
                  key={lnk.href}
                  href={lnk.href}
                  onClick={onClose}
                  className="flex items-center gap-3 py-2.5 text-[#444] hover:text-[#e8a000] text-xs font-bold tracking-widest uppercase transition-colors"
                >
                  <ArrowRight size={11} />
                  {lnk.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Bottom CTA */}
      <div className="relative px-5 py-5 border-t border-white/4">
        {isLoggedIn ? (
          <p className="text-[#333] text-[10px] tracking-[0.2em] uppercase text-center">
            Welcome back, <span className="text-[#e8a000]">{user?.ign}</span>
          </p>
        ) : (
          <>
            <Link
              href="/login"
              onClick={onClose}
              className="relative block w-full text-center text-black font-black text-[11px] tracking-[0.2em] uppercase py-4 overflow-hidden group"
              style={{ background: 'linear-gradient(135deg, #e8a000, #f0a900)' }}
            >
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)', transform: 'skewX(-15deg)' }}
                initial={{ x: '-100%' }}
                whileHover={{ x: '200%' }}
                transition={{ duration: 0.6 }}
              />
              <span className="relative flex items-center justify-center gap-2">
                <Zap size={12} /> Register Your Team →
              </span>
            </Link>
            <p className="text-[#1e1e1e] text-[9px] tracking-[0.15em] uppercase text-center mt-2">
              Season 5 · Registration Open
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
};

// ── User Dropdown ──────────────────────────────────────────
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-2 px-2.5 py-1.5 border border-[#e8a000]/18 hover:border-[#e8a000]/50 transition-all overflow-hidden group"
        style={{ background: 'linear-gradient(135deg, rgba(232,160,0,0.07) 0%, transparent 100%)' }}
      >
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(232,160,0,0.07), transparent)' }}
          initial={{ x: '-100%' }}
          whileHover={{ x: '200%' }}
          transition={{ duration: 0.5 }}
        />
        <div className="w-5 h-5 bg-[#e8a000]/15 flex items-center justify-center shrink-0">
          <User size={10} className="text-[#e8a000]" />
        </div>
        <span className="text-white font-bold text-[11px] tracking-wider">{user.ign}</span>
        <ChevronDown
          size={10}
          className={`text-[#444] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scaleY: 0.93 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.93 }}
            transition={{ duration: 0.15 }}
            style={{
              transformOrigin: 'top',
              boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(232,160,0,0.12)',
            }}
            className="absolute right-0 top-full mt-1.5 w-48 bg-[#07070d] border border-white/6 z-80 overflow-hidden"
          >
            <div className="h-px w-full bg-linear-to-r from-transparent via-[#e8a000] to-transparent" />
            <div className="px-3 py-2.5 border-b border-white/5">
              <p className="text-white font-black text-xs">{user.ign}</p>
              <p className="text-[#7a7a7a] text-[9px] uppercase tracking-wider">{user.role || 'Player'}</p>
            </div>
            {[
              { href: '/profile', icon: Settings, label: 'Profile Settings' },
              { href: '/my-team', icon: Users, label: 'My Team' },
            ].map((lnk) => (
              <Link
                key={lnk.href}
                href={lnk.href}
                onClick={() => setIsOpen(false)}
                className="group/lnk flex items-center gap-2.5 px-3 py-2 text-[#777] hover:text-white hover:bg-white/3 text-[11px] transition-all"
              >
                <lnk.icon size={11} className="group-hover/lnk:text-[#e8a000] transition-colors" />
                {lnk.label}
              </Link>
            ))}
            {user.role && (
              <Link
                href={DASHBOARD_HREF}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-[#e8a000] hover:text-[#ffb800] hover:bg-[#e8a000]/2.5 text-[11px] transition-all"
              >
                <Shield size={11} />
                Admin Dashboard
              </Link>
            )}
            <div className="border-t border-white/4">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[#777] hover:text-red-400 hover:bg-red-500/5 text-[11px] transition-all"
              >
                <LogOut size={11} />
                Logout
              </button>
            </div>
            <div className="h-px w-full bg-linear-to-r from-transparent via-[#e8a000]/25 to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Notification Bell ──────────────────────────────────────
const formatTime = (createdAt: string) => {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

const NotificationBell = ({ isLoggedIn }: { isLoggedIn: boolean }) => {
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
    const iv = setInterval(() => void fetchNotifications(), 30000);
    return () => clearInterval(iv);
  }, [fetchNotifications, isLoggedIn]);

  useEffect(() => { if (isOpen) void fetchNotifications(); }, [fetchNotifications, isOpen]);

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
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="relative w-8 h-8 flex items-center justify-center text-[#8a8a8a] hover:text-[#e8a000] transition-colors"
      >
        <Bell size={14} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 px-0.5 bg-[#e8a000] text-[8px] font-black text-black flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scaleY: 0.93 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.93 }}
            transition={{ duration: 0.15 }}
            style={{
              transformOrigin: 'top',
              boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(232,160,0,0.12)',
            }}
            className="absolute right-0 top-full mt-1.5 w-72 bg-[#07070d] border border-white/6 z-80 overflow-hidden"
          >
            <div className="h-px w-full bg-linear-to-r from-transparent via-[#e8a000] to-transparent" />
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Bell size={10} className="text-[#e8a000]" />
                <span className="text-[10px] font-black tracking-[0.25em] uppercase text-white">Alerts</span>
                {unreadCount > 0 && (
                  <span className="text-[8px] font-bold bg-[#e8a000]/15 text-[#e8a000] px-1.5 py-0.5">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button
                onClick={markAll}
                disabled={unreadCount === 0}
                className="text-[9px] font-bold uppercase tracking-wider text-[#777] hover:text-[#e8a000] disabled:opacity-25 transition-colors"
              >
                Mark all read
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {loading && !notifications.length ? (
                <div className="flex justify-center py-8">
                  <motion.div
                    className="w-4 h-4 border-2 border-[#e8a000]/20 border-t-[#e8a000] rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              ) : !notifications.length ? (
                <div className="flex flex-col items-center py-8 gap-2">
                  <Bell size={18} className="text-[#1e1e1e]" />
                  <p className="text-[10px] text-[#2a2a2a]">No notifications yet</p>
                </div>
              ) : (
                notifications.map((item) => {
                  const inner = (
                    <div
                      className={`flex gap-3 px-4 py-3 border-b border-white/3.5 hover:bg-white/2.5 transition-colors ${
                        !item.read ? 'bg-[#e8a000]/2.5' : ''
                      }`}
                    >
                      <span
                        className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${item.read ? 'bg-[#222]' : 'bg-[#e8a000]'}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white/75 truncate">{item.title}</p>
                        <p className="text-[10px] text-[#8a8a8a] line-clamp-2 leading-relaxed mt-0.5">{item.message}</p>
                        <p className="text-[9px] text-[#2a2a2a] mt-1">{formatTime(item.createdAt)}</p>
                      </div>
                    </div>
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
            <div className="h-px w-full bg-linear-to-r from-transparent via-[#e8a000]/20 to-transparent" />
          </motion.div>
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Defer heavier animated layers until after mount to avoid initial flicker
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimateReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ⌘K shortcut
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

      <AnimatePresence>
        {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} session={session} />}
      </AnimatePresence>

      <header
        className="sticky top-0 left-0 right-0 z-70 transition-all duration-500 overflow-x-clip"
        style={{
          background: scrolled ? 'rgba(5,5,10,0.96)' : 'rgba(7,7,13,1)',
          backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
          boxShadow: scrolled
            ? '0 1px 0 rgba(232,160,0,0.18), 0 20px 60px rgba(0,0,0,0.6)'
            : 'none',
        }}
      >
        {/* Top accent line */}
        <div className="h-px w-full bg-linear-to-r from-transparent via-[#e8a000] to-transparent opacity-70" />

        {/* Ticker — no enter animation to prevent mount flicker */}
        {tickerOpen && (
          <TickerBar onClose={() => setTickerOpen(false)} />
        )}

        {/* Main bar */}
        <nav className="relative h-15 flex items-center justify-between px-4 sm:px-6 gap-4 border-b border-white/4 overflow-x-clip overflow-y-visible">
          {/* Background animations (deferred until after mount to prevent initial flicker) */}
          {animateReady && (
            <>
              <GridBackground />
              <Particles />
              <Scanline />
            </>
          )}

          {/* Search overlay */}
          <AnimatePresence>
            {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
          </AnimatePresence>

          {/* Logo */}
          <div className="relative z-10">
            <Logo />
          </div>

          {/* Desktop mega-menu nav */}
          <div className="hidden lg:flex items-center absolute left-1/2 -translate-x-1/2 z-20">
            {NAV_ITEMS.map((item) => (
              <NavMegaMenu
                key={item.label}
                item={item}
                isActive={activeMenu === item.label}
                onMouseEnter={() => handleMenuEnter(item.label)}
                onMouseLeave={handleMenuLeave}
              />
            ))}
          </div>

          {/* Right controls */}
          <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 ml-auto">
            {!isLoading && <NotificationBell isLoggedIn={isLoggedIn} />}

            {/* Search pill — desktop */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 h-7 px-2.5 border border-white/6 text-[#3a3a3a] hover:text-[#e8a000] hover:border-[#e8a000]/25 text-[10px] tracking-widest transition-all"
            >
              <Search size={11} />
              <span className="hidden lg:block font-bold uppercase">Search</span>
              <kbd className="hidden lg:flex items-center text-[8px] text-[#2a2a2a] border border-[#181818] px-1 py-0.5">
                ⌘K
              </kbd>
            </button>
            {/* Search icon only — mobile */}
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden w-8 h-8 flex items-center justify-center text-[#3a3a3a] hover:text-[#e8a000] transition-colors"
            >
              <Search size={13} />
            </button>

            <div className="hidden lg:block w-px h-4 bg-white/6" />

            {/* Auth section — desktop (hidden while session loads to avoid flash) */}
            {isLoading ? (
              <div className="hidden lg:block w-20 h-7" />
            ) : isLoggedIn ? (
              <UserDropdown user={user!} onLogout={() => signOut({ callbackUrl: '/' })} />
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#8a8a8a] hover:text-white transition-colors px-2"
                >
                  Login
                </Link>
                <Link
                  href="/login"
                  className="relative overflow-hidden group flex items-center gap-1.5 px-4 py-2.25 text-[10px] font-black tracking-[0.18em] uppercase text-black"
                  style={{ background: 'linear-gradient(135deg, #e8a000, #f0a900)' }}
                >
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                      transform: 'skewX(-15deg)',
                    }}
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '200%' }}
                    transition={{ duration: 0.5 }}
                  />
                  <Zap size={10} className="relative" />
                  <span className="relative">Register</span>
                </Link>
              </div>
            )}

            {/* Animated hamburger — mobile */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMenuOpen(prev => !prev)}
              className="lg:hidden relative w-8 h-8 flex flex-col items-center justify-center gap-1.25 border border-white/[0.07] text-[#8a8a8a] hover:text-[#e8a000] hover:border-[#e8a000]/35 transition-all overflow-hidden group"
            >
              <span className="w-4 h-px bg-current group-hover:w-5 transition-all duration-200" />
              <span className="w-3 h-px bg-[#e8a000]" />
              <span className="w-4 h-px bg-current group-hover:w-2 transition-all duration-200" />
            </motion.button>
          </div>
        </nav>

        {/* Bottom accent */}
        <div className="h-px w-full bg-linear-to-r from-transparent via-[#e8a000]/12 to-transparent" />
      </header>
    </>
  );
};