'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, X, ChevronRight } from 'lucide-react';

// ── Ticker messages ────────────────────────────────────────
const TICKER_MESSAGES = [
  '🔴 LIVENOW: Betwife Seuam 1 Registration OPEN! Cash Prize: 9,060 GHS',
  '⚔️  Season 4 Qualifier begins in 3 days — Register your squad',
  '🏆  Top Team: CERUS AL EGAN leads with 10,145 pts',
  '🎮  New tournament bracket drops Friday — Stay tuned',
];

// ── TickerBar ──────────────────────────────────────────────
const TickerBar = () => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % TICKER_MESSAGES.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (closed) return null;

  return (
    <div className="relative bg-[#0a0a0f] border-b border-[#e8a000]/20 px-4 py-1.5 flex items-center justify-between overflow-hidden">
      {/* Animated scan line */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="ticker-scan" />
      </div>

      {/* Left — live dot */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="text-[#e8a000] font-black text-[10px] tracking-[0.2em] uppercase">Live</span>
      </div>

      {/* Center — rotating message */}
      <div className="flex-1 text-center overflow-hidden mx-4">
        <p
          className="text-[11px] text-[#aaa] tracking-wide transition-all duration-400"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(-6px)',
          }}
        >
          {TICKER_MESSAGES[index]}
        </p>
      </div>

      {/* Right — close */}
      <button
        onClick={() => setClosed(true)}
        className="text-[#555] hover:text-[#e8a000] transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
};

// ── Logo ───────────────────────────────────────────────────
const Logo = () => (
  <Link href="/" className="flex items-center gap-3 group">
    <div className="relative">
      {/* Glow ring on hover */}
      <div className="absolute inset-0 rounded-full bg-[#e8a000]/0 group-hover:bg-[#e8a000]/20 blur-md transition-all duration-500" />
      <Image
        src="/mlbb_logobg.png"
        alt="BotsVille"
        width={48}
        height={48}
        className="object-contain relative z-10 group-hover:scale-105 transition-transform duration-300"
      />
    </div>
    
  </Link>
);

// ── Nav items ──────────────────────────────────────────────
const NAV_ITEMS = ['Tournaments', 'Teams', 'Leaderboard', 'News'];

const NavCenter = () => (
  <nav className="hidden lg:flex items-center gap-1">
    {NAV_ITEMS.map((item) => (
      <Link
        key={item}
        href={`/${item.toLowerCase()}`}
        className="relative px-4 py-2 text-[12px] font-semibold tracking-[0.15em] uppercase text-[#888] hover:text-white transition-colors duration-200 group"
      >
        {item}
        {/* Underline accent */}
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-0 group-hover:w-4/5 bg-[#e8a000] transition-all duration-300" />
      </Link>
    ))}
  </nav>
);

// ── Search overlay ─────────────────────────────────────────
const SearchOverlay = ({ onClose }: { onClose: () => void }) => (
  <div className="absolute inset-0 z-50 bg-[#0d0d14]/95 backdrop-blur-md flex items-center px-8 animate-fadeIn">
    <ChevronRight size={16} className="text-[#e8a000] mr-3 shrink-0" />
    <input
      autoFocus
      type="text"
      placeholder="Search teams, tournaments, players..."
      className="flex-1 bg-transparent text-white text-sm tracking-wide placeholder:text-[#444] outline-none border-none"
    />
    <button onClick={onClose} className="text-[#555] hover:text-white transition-colors ml-4">
      <X size={18} />
    </button>
  </div>
);

// ── NavRight ───────────────────────────────────────────────
const NavRight = () => {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex items-center gap-3">
      {/* Search */}
      <button
        onClick={() => setSearchOpen(true)}
        className="w-8 h-8 flex items-center justify-center text-[#666] hover:text-[#e8a000] transition-colors"
        aria-label="Search"
      >
        <Search size={15} />
      </button>

      {/* Divider */}
      <div className="w-px h-4 bg-white/10" />

      {/* Login */}
      <Link
        href="/login"
        className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#888] hover:text-white transition-colors px-2"
      >
        Login
      </Link>

      {/* Register CTA */}
      <Link
        href="/register"
        className="relative group px-4 py-2 text-[11px] font-black tracking-[0.15em] uppercase text-black bg-[#e8a000] hover:bg-[#ffb800] transition-colors duration-200 overflow-hidden"
      >
        {/* Shine sweep */}
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-white/20 skew-x-12 transition-transform duration-500" />
        <span className="relative">Register</span>
      </Link>

      {/* Search overlay */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </div>
  );
};

// ── Main Navbar ────────────────────────────────────────────
export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* Inject keyframes + font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap');

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease forwards; }

        @keyframes scanMove {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .ticker-scan {
          position: absolute;
          top: 0; left: 0;
          width: 25%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(232,160,0,0.06), transparent);
          animation: scanMove 4s linear infinite;
        }

        /* Corner clip on register button */
        .clip-corner {
          clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
        }
      `}</style>

      <header
        className="sticky top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? 'rgba(10,10,15,0.97)'
            : 'rgba(13,13,20,1)',
          boxShadow: scrolled ? '0 0 40px rgba(0,0,0,0.6)' : 'none',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
        }}
      >
        {/* Top accent line */}
        <div className="h-px w-full bg-linear-to-r from-transparent via-[#e8a000]/60 to-transparent" />

        <TickerBar />

        {/* Main nav */}
        <nav className="relative border-b border-white/[0.06] px-6 h-16 flex items-center justify-between gap-4">
          {/* Left grid lines decoration */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-linear-to-b from-[#e8a000]/20 via-transparent to-transparent pointer-events-none" />

          <Logo />
          <NavCenter />
          <NavRight />
        </nav>

        {/* Bottom accent line */}
        <div className="h-px w-full bg-linear-to-r from-transparent via-[#e8a000]/20 to-transparent" />
      </header>
    </>
  );
};