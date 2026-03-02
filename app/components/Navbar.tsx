'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronRight, Menu, ArrowRight, Radio } from 'lucide-react';

// ── Ticker messages ────────────────────────────────────────
const TICKER_MESSAGES = [
  '🔴 LIVENOW: Betwife Seuam 1 Registration OPEN! Cash Prize: 9,060 GHS',
  '⚔️  Season 4 Qualifier begins in 3 days — Register your squad',
  '🏆  Top Team: CERUS AL EGAN leads with 10,145 pts',
  '🎮  New tournament bracket drops Friday — Stay tuned',
];

// ── Nav items ──────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Tournaments', href: '/tournaments' },
  { label: 'Teams',       href: '/teams'       },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'News',        href: '/news'        },
];

// ── TickerBar ──────────────────────────────────────────────
const TickerBar = ({ onClose }: { onClose: () => void }) => {
  const [index, setIndex]   = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % TICKER_MESSAGES.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative bg-[#0a0a0f] border-b border-[#e8a000]/20 px-4 py-1.5 flex items-center justify-between overflow-hidden">
      {/* Scan shimmer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="ticker-scan" />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="text-[#e8a000] font-black text-[10px] tracking-[0.2em] uppercase">Live</span>
      </div>

      <div className="flex-1 text-center overflow-hidden mx-4">
        <p
          className="text-[11px] text-[#aaa] tracking-wide transition-all duration-400"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-6px)' }}
        >
          {TICKER_MESSAGES[index]}
        </p>
      </div>

      <button onClick={onClose} className="text-[#FFFF] hover:text-[#e8a000] transition-colors shrink-0" aria-label="Dismiss">
        <X size={12} />
      </button>
    </div>
  );
};

// ── Logo ───────────────────────────────────────────────────
const Logo = ({ light = false }: { light?: boolean }) => (
  <Link href="/" className="flex items-center gap-3 group">
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-[#e8a000]/0 group-hover:bg-[#e8a000]/20 blur-md transition-all duration-500" />
      <Image
        src="/mlbb_logobg.png"
        alt="BotsVille"
        width={44}
        height={44}
        className={`object-contain relative z-10 group-hover:scale-105 transition-transform duration-300 ${light ? 'brightness-0 invert' : ''}`}
      />
    </div>
  </Link>
);

// ── Search overlay ─────────────────────────────────────────
const SearchOverlay = ({ onClose }: { onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="absolute inset-0 z-50 bg-[#0d0d14]/97 backdrop-blur-md flex items-center px-6 lg:px-8"
  >
    <ChevronRight size={16} className="text-[#e8a000] mr-3 shrink-0" />
    <input
      autoFocus
      type="text"
      placeholder="Search teams, tournaments, players..."
      className="flex-1 bg-transparent text-white text-sm tracking-wide placeholder:text-[#444] outline-none"
    />
    <button onClick={onClose} className="text-[#555] hover:text-white transition-colors ml-4">
      <X size={18} />
    </button>
  </motion.div>
);

// ── Full-screen mobile menu ────────────────────────────────
const MobileMenu = ({ onClose }: { onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: -16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -16 }}
    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    className="fixed inset-0 z-[60] bg-[#07070d] flex flex-col overflow-y-auto"
  >
    {/* Menu top bar */}
    <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
      <Logo />
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className="w-9 h-9 flex items-center justify-center border border-white/10 text-[#666] hover:text-white hover:border-[#e8a000]/40 transition-all"
      >
        <X size={16} />
      </motion.button>
    </div>

    {/* Live ticker strip inside menu */}
    <div className="flex items-center gap-2 px-5 py-2.5 bg-[#e8a000]/[0.04] border-b border-[#e8a000]/10">
      <Radio size={10} className="text-[#e8a000] animate-pulse shrink-0" />
      <p className="text-[#888] text-[10px] tracking-wide truncate">Season 4 Qualifier — Register your squad now</p>
    </div>

    {/* Primary nav links */}
    <nav className="flex-1 px-5 pt-8 pb-6">
      <p className="text-[#333] text-[8px] tracking-[0.25em] uppercase font-black mb-5">Navigation</p>
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 + i * 0.07, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Link
              href={item.href}
              onClick={onClose}
              className="group flex items-center justify-between py-4 border-b border-white/[0.05] hover:border-[#e8a000]/30 transition-colors"
            >
              <span className="text-white font-black text-2xl tracking-[0.08em] uppercase group-hover:text-[#e8a000] transition-colors duration-200">
                {item.label}
              </span>
              <ArrowRight size={16} className="text-[#2a2a2a] group-hover:text-[#e8a000] group-hover:translate-x-1 transition-all duration-200" />
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Secondary links */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.35 }}
        className="mt-8"
      >
        <p className="text-[#333] text-[8px] tracking-[0.25em] uppercase font-black mb-4">Account</p>
        <div className="flex flex-col gap-3">
          <Link href="/login" onClick={onClose} className="flex items-center gap-3 text-[#666] hover:text-white text-sm font-bold tracking-widest uppercase transition-colors">
            <ArrowRight size={12} /> Login
          </Link>
          <Link href="/register-team" onClick={onClose} className="flex items-center gap-3 text-[#666] hover:text-[#e8a000] text-sm font-bold tracking-widest uppercase transition-colors">
            <ArrowRight size={12} /> Register Team
          </Link>
        </div>
      </motion.div>
    </nav>

    {/* CTA at bottom */}
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="px-5 pb-8 pt-4 border-t border-white/[0.05]"
    >
      <Link
        href="/register-team"
        onClick={onClose}
        className="block w-full bg-[#e8a000] hover:bg-[#ffb800] text-black text-[11px] font-black tracking-[0.2em] uppercase text-center py-4 transition-colors duration-200"
      >
        Register Your Team →
      </Link>
      <p className="text-[#2a2a2a] text-[9px] tracking-[0.15em] uppercase text-center mt-3">Season 5 · Registration Open</p>
    </motion.div>
  </motion.div>
);

// ── Main Navbar ────────────────────────────────────────────
export const Navbar = () => {
  const [scrolled,    setScrolled]    = useState(false);
  const [tickerOpen,  setTickerOpen]  = useState(true);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');

        @keyframes scanMove {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%);  }
        }
        .ticker-scan {
          position: absolute; top: 0; left: 0;
          width: 25%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(232,160,0,0.06), transparent);
          animation: scanMove 4s linear infinite;
        }
      `}</style>

      {/* Full-screen mobile menu */}
      <AnimatePresence>
        {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
      </AnimatePresence>

      <header
        className="sticky top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(10,10,15,0.97)' : 'rgba(13,13,20,1)',
          boxShadow: scrolled ? '0 0 40px rgba(0,0,0,0.6)' : 'none',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
        }}
      >
        {/* Top accent line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#e8a000]/60 to-transparent" />

        {/* Ticker */}
        <AnimatePresence>
          {tickerOpen && (
            <motion.div
              initial={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <TickerBar onClose={() => setTickerOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main nav bar */}
        <nav className="relative border-b border-white/[0.06] px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left accent line */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-[#e8a000]/20 via-transparent to-transparent pointer-events-none" />

          {/* Search overlay (spans full nav bar) */}
          <AnimatePresence>
            {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
          </AnimatePresence>

          {/* Logo */}
          <Logo />

          {/* Desktop center nav */}
          <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.label}
                href={item.href}
                className="relative px-4 py-2 text-[12px] font-semibold tracking-[0.15em] uppercase text-[#888] hover:text-white transition-colors duration-200 group"
              >
                {item.label}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-0 group-hover:w-4/5 bg-[#e8a000] transition-all duration-300" />
              </Link>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">

            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="w-8 h-8 flex items-center justify-center text-[#666] hover:text-[#e8a000] transition-colors"
              aria-label="Search"
            >
              <Search size={15} />
            </button>

            {/* Divider — desktop only */}
            <div className="hidden lg:block w-px h-4 bg-white/10" />

            {/* Login — desktop only */}
            <Link href="/login" className="hidden lg:block text-[11px] font-semibold tracking-[0.15em] uppercase text-[#888] hover:text-white transition-colors px-2">
              Login
            </Link>

            {/* Register CTA — desktop only */}
            <Link
              href="/login"
              className="hidden lg:block relative group px-4 py-2 text-[11px] font-black tracking-[0.15em] uppercase text-black bg-[#e8a000] hover:bg-[#ffb800] transition-colors duration-200 overflow-hidden"
            >
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-white/20 skew-x-12 transition-transform duration-500" />
              <span className="relative">Register</span>
            </Link>

            {/* Hamburger — mobile/tablet only */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMenuOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center border border-white/[0.08] text-[#888] hover:text-white hover:border-[#e8a000]/40 transition-all"
              aria-label="Open menu"
            >
              <Menu size={17} />
            </motion.button>
          </div>
        </nav>

        {/* Bottom accent line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#e8a000]/20 to-transparent" />
      </header>
    </>
  );
};