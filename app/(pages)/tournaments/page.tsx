'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, cubicBezier } from 'framer-motion';
import {
  Calendar, Clock, Users, Trophy, ChevronRight, X,
  CheckCircle, AlertCircle, Swords, Lock, MapPin,
  Flame, Star, ArrowRight, Shield, Crown, Zap,
} from 'lucide-react';

const ease = cubicBezier(0.22, 1, 0.36, 1);
const fadeUp = {
  hidden:  { opacity: 0, y: 40 },
  visible: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.8, ease, delay: d } }),
};

const Scanlines = ({ opacity = 0.025 }: { opacity?: number }) => (
  <div className="absolute inset-0 pointer-events-none z-[1]"
    style={{ opacity, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,#fff 2px,#fff 3px)', backgroundSize: '100% 3px' }} />
);

const OrbEffect = ({ color = '#e8a000' }: { color?: string }) => (
  <>
    <motion.div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full pointer-events-none"
      style={{ background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`, filter: 'blur(40px)' }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
    <motion.div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full pointer-events-none"
      style={{ background: 'radial-gradient(circle, rgba(30,80,200,0.15) 0%, transparent 70%)', filter: 'blur(50px)' }}
      animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }} />
  </>
);

const REGISTERED_TEAMS = [
  'CERUS AL EGAN', 'AD57 AUY', 'AEDF AJAY',
  'YACD3 SQUAD', 'PHANTOM LORDS', 'VENOM RISING',
];

type TStatus = 'open' | 'closed' | 'upcoming';

// ── Utility to format date consistently (no SSR mismatch) ──
const formatDate = (date: Date): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekday = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${weekday} ${day} ${month} ${year}`;
};

// ── Data ───────────────────────────────────────────────────
const TOURNAMENTS = [
  {
    id: 'apl-s6', name: 'APL SEASON 6', subtitle: 'Accra Premier League',
    format: '5v5 · Double Elimination', location: 'Accra, GH · Online',
    date: new Date(Date.now() + 14 * 86400000 + 6 * 3600000),
    slots: 16, filled: 9, status: 'open' as TStatus, color: '#e8a000',
    tags: ['APL', 'S6', 'IESF Qualifier'], hero: '/stunchou.png',
    banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1400&q=80',
    rules: ['Min. 5 registered players per team', 'MLBB patch 1.8.x only', 'Ghana residents only', 'Team must be registered on platform'],
    description: 'The flagship Ghana MLBB tournament. Top 2 qualify for IESF Africa.',
  },
  {
    id: 'afl-s5-2', name: 'AFL SEASON 5.2', subtitle: 'Accra Fighting League',
    format: '5v5 · Single Elimination', location: 'Kumasi, GH · Online',
    date: new Date(Date.now() + 28 * 86400000 + 3 * 3600000),
    slots: 12, filled: 5, status: 'open' as TStatus, color: '#4a90d9',
    tags: ['AFL', 'S5.2'], hero: '/stunchou.png',
    banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1400&q=80',
    rules: ['Min. 5 registered players per team', 'MLBB patch 1.8.x only', 'Open to all Ghana teams'],
    description: 'The fighting league returns. Fast-paced single elim action.',
  },
  {
    id: 'iesf-qual', name: 'IESF AFRICA', subtitle: 'International Qualifier',
    format: '5v5 · Round Robin + Finals', location: 'Accra, GH · LAN',
    date: new Date(Date.now() + 45 * 86400000),
    slots: 8, filled: 8, status: 'closed' as TStatus, color: '#9b59b6',
    tags: ['IESF', 'International', 'LAN'], hero: '/stunchou.png',
    banner: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=1400&q=80',
    rules: ['Top 8 APL teams only', 'LAN attendance required', 'MLBB official ruleset'],
    description: "Ghana's path to the IESF World Esports Championships.",
  },
  {
    id: 'open-cup', name: 'GHANA OPEN CUP', subtitle: 'Open Invitational',
    format: '5v5 · Swiss + Playoffs', location: 'Online',
    date: new Date(Date.now() + 60 * 86400000),
    slots: 32, filled: 11, status: 'upcoming' as TStatus, color: '#27ae60',
    tags: ['Open', 'Invitational'], hero: '/stunchou.png',
    banner: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=1400&q=80',
    rules: ['Open to all teams', 'MLBB patch current', 'Min. 5 players'],
    description: 'Open doors for every squad in Ghana. Swiss format, anyone can win.',
  },
];

const PAST = [
  {
    id: 'apl-s5', name: 'APL SEASON 5', date: 'Jan 15 – Feb 10, 2025',
    color: '#e8a000', banner: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=800&q=80',
    podium: [
      { place: 1, team: 'CERUS AL EGAN', tag: 'CAE',  score: '8-0' },
      { place: 2, team: 'AD57 AUY',      tag: 'AD57', score: '6-2' },
      { place: 3, team: 'AEDF AJAY',     tag: 'AJAY', score: '5-3' },
    ],
  },
  {
    id: 'afl-s5-1', name: 'AFL SEASON 5.1', date: 'Nov 3 – Nov 28, 2024',
    color: '#4a90d9', banner: 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=800&q=80',
    podium: [
      { place: 1, team: 'AD57 AUY',       tag: 'AD57', score: '7-1' },
      { place: 2, team: 'CERUS AL EGAN',   tag: 'CAE',  score: '5-3' },
      { place: 3, team: 'PHANTOM LORDS',   tag: 'PHXL', score: '4-4' },
    ],
  },
  {
    id: 'open-2024', name: 'GHANA OPEN 2024', date: 'Sep 1 – Sep 14, 2024',
    color: '#27ae60', banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
    podium: [
      { place: 1, team: 'CERUS AL EGAN', tag: 'CAE',  score: '9-1' },
      { place: 2, team: 'YACD3 SQUAD',   tag: 'YCD3', score: '7-3' },
      { place: 3, team: 'VENOM RISING',  tag: 'VNMR', score: '6-4' },
    ],
  },
];

// ── Countdown ─────────────────────────────────────────────────
function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, over: true };
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
      over: false,
    };
  };
  const [tick, setTick] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTick(calc()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return tick;
}

const CountdownDisplay = ({ target, color }: { target: Date; color: string }) => {
  const t = useCountdown(target);
  if (t.over) return <span className="text-[#e84040] text-[10px] font-black tracking-widest uppercase">Registration Closed</span>;
  return (
    <div className="flex items-end gap-1.5">
      {[{ v: t.d, l: 'Days' }, { v: t.h, l: 'Hrs' }, { v: t.m, l: 'Min' }, { v: t.s, l: 'Sec' }].map(({ v, l }, i) => (
        <React.Fragment key={l}>
          <div className="flex flex-col items-center bg-black/50 border border-white/10 px-2.5 py-1.5 min-w-[44px]">
            <span className="font-black text-2xl leading-none tabular-nums" style={{ color, fontFamily: "'Barlow Condensed', sans-serif" }}>
              {String(v).padStart(2, '0')}
            </span>
            <span className="text-[7px] tracking-[0.15em] uppercase text-[#333] mt-0.5">{l}</span>
          </div>
          {i < 3 && <span className="text-[#333] font-black text-xl mb-1.5">:</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

// ── Registration modal ────────────────────────────────────────
const RegisterModal = ({ t: tournament, onClose }: { t: typeof TOURNAMENTS[0]; onClose: () => void }) => {
  const [team,    setTeam]    = useState<string | null>(null);
  const [agreed,  setAgreed]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const canSubmit = team && agreed && !loading;
  const submit = () => {
    if (!canSubmit) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setDone(true); }, 1800);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center"
      onClick={onClose}>
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.45, ease }}
        className="relative w-full sm:max-w-lg bg-[#07070d] border-t sm:border overflow-hidden max-h-[94dvh] sm:max-h-[88vh] flex flex-col sm:mx-4"
        style={{ borderColor: `${tournament.color}35` }}
        onClick={e => e.stopPropagation()}>

        <div className="relative h-40 sm:h-48 shrink-0 overflow-hidden">
          <Image src={tournament.banner} alt="" fill className="object-cover brightness-20" />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at bottom left, ${tournament.color}40, transparent 60%)` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(125deg, ${tournament.color}18, transparent 50%)` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07070d] to-transparent" />
          <Scanlines />
          <OrbEffect color={tournament.color} />

          <motion.div
            className="absolute bottom-0 right-4 h-[130%] w-28 sm:w-36 pointer-events-none select-none"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease }}>
            <motion.div className="relative w-full h-full"
              animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}>
              <motion.div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-4 rounded-full"
                style={{ background: `radial-gradient(ellipse, ${tournament.color}60 0%, transparent 70%)`, filter: 'blur(6px)' }}
                animate={{ opacity: [0.3, 0.8, 0.3], scaleX: [0.8, 1.1, 0.8] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }} />
              <Image src={tournament.hero} alt="" fill
                className="object-contain object-bottom drop-shadow-[0_0_24px_rgba(232,160,0,0.4)]" />
            </motion.div>
          </motion.div>

          <button onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 bg-black/70 border border-white/10 flex items-center justify-center text-[#555] hover:text-white transition-colors z-10">
            <X size={13} />
          </button>

          <div className="absolute bottom-3 left-4">
            <p className="text-[8px] tracking-[0.3em] uppercase font-black mb-0.5" style={{ color: `${tournament.color}90` }}>Register Your Team</p>
            <h2 className="text-white font-black text-2xl uppercase leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {tournament.name}
            </h2>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 flex flex-col gap-5">
          <AnimatePresence>
            {done && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-10 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="w-16 h-16 border-2 border-[#27ae60] flex items-center justify-center">
                  <CheckCircle size={32} className="text-[#27ae60]" />
                </motion.div>
                <div>
                  <p className="text-white font-black text-2xl uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Squad Registered!</p>
                  <p className="text-[#444] text-[11px] mt-1.5 tracking-wide leading-relaxed">
                    <span className="font-bold" style={{ color: tournament.color }}>{team}</span> is now registered for {tournament.name}. Confirmation incoming.
                  </p>
                </div>
                <button onClick={onClose}
                  className="px-8 py-2.5 font-black text-[11px] tracking-[0.25em] uppercase bg-[#e8a000] text-black hover:bg-[#ffb800] transition-colors">
                  Let&apos;s Go
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!done && <>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Date',     val: tournament.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
                { label: 'Format',   val: tournament.format },
                { label: 'Location', val: tournament.location },
                { label: 'Slots',    val: `${tournament.filled}/${tournament.slots} filled` },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.03] border border-white/[0.05] px-3 py-2">
                  <p className="text-[8px] tracking-widest uppercase text-[#333] mb-0.5">{s.label}</p>
                  <p className="text-white text-[11px] font-bold">{s.val}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-[#444] text-[9px] tracking-[0.3em] uppercase font-black mb-2">Select Your Team</p>
              <div className="flex flex-col gap-1">
                {REGISTERED_TEAMS.map(tm => (
                  <motion.button key={tm} onClick={() => setTeam(tm)} whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-between px-3 py-2.5 border text-left transition-all duration-150 relative overflow-hidden group"
                    style={team === tm
                      ? { borderColor: `${tournament.color}60`, background: `${tournament.color}10` }
                      : { borderColor: 'rgba(255,255,255,0.06)', background: 'transparent' }
                    }>
                    {team !== tm && (
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: `linear-gradient(90deg, ${tournament.color}08, transparent)` }} />
                    )}
                    <span className="font-black text-xs uppercase tracking-wide relative"
                      style={{ color: team === tm ? 'white' : '#555', fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {tm}
                    </span>
                    {team === tm && <CheckCircle size={12} style={{ color: tournament.color }} />}
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[#444] text-[9px] tracking-[0.3em] uppercase font-black mb-2">Requirements</p>
              <div className="bg-white/[0.02] border border-white/[0.05] p-3 flex flex-col gap-1.5">
                {tournament.rules.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: tournament.color }} />
                    <p className="text-[#555] text-[10px] tracking-wide">{r}</p>
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div onClick={() => setAgreed(!agreed)}
                className="w-4 h-4 border shrink-0 mt-0.5 flex items-center justify-center transition-all cursor-pointer"
                style={agreed ? { borderColor: tournament.color, background: tournament.color } : { borderColor: '#2a2a2a' }}>
                {agreed && <CheckCircle size={10} className="text-black" />}
              </div>
              <span className="text-[#444] text-[10px] leading-relaxed tracking-wide group-hover:text-[#666] transition-colors">
                I am an authorised representative of this team and agree to Ghana Nagends tournament rules and MLBB community guidelines.
              </span>
            </label>

            <motion.button
              onClick={submit} disabled={!canSubmit} whileTap={{ scale: 0.98 }}
              className="relative w-full py-3 font-black text-[11px] tracking-[0.25em] uppercase overflow-hidden transition-all group disabled:opacity-30 disabled:cursor-not-allowed"
              style={canSubmit ? { background: tournament.color, color: '#000' } : { background: '#111', color: '#333', border: '1px solid #222' }}>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-white/20 skew-x-12 transition-transform duration-500 pointer-events-none" />
              <span className="relative flex items-center justify-center gap-2">
                {loading
                  ? <motion.div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full"
                      animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }} />
                  : !team ? 'Select a team first'
                  : !agreed ? 'Agree to rules first'
                  : <><span>Lock In Your Squad</span><Zap size={12} /></>
                }
              </span>
            </motion.button>
          </>}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ══════════════════════════════════════════════════════════
// FEATURED HERO CARD
// ══════════════════════════════════════════════════════════
const FeaturedCard = ({ t, onRegister }: { t: typeof TOURNAMENTS[0]; onRegister: () => void }) => {
  const tick   = useCountdown(t.date);
  const isFull = t.filled >= t.slots;
  const isOpen = t.status === 'open' && !isFull;

  const mouseX  = useMotionValue(0);
  const mouseY  = useMotionValue(0);
  const rotX    = useTransform(mouseY, [-300, 300], [4, -4]);
  const rotY    = useTransform(mouseX, [-300, 300], [-4, 4]);
  const sRotX   = useSpring(rotX, { stiffness: 60, damping: 20 });
  const sRotY   = useSpring(rotY, { stiffness: 60, damping: 20 });
  const charX   = useTransform(mouseX, [-500, 500], [-18, 18]);
  const charY   = useTransform(mouseY, [-500, 500], [-10, 10]);
  const sCharX  = useSpring(charX, { stiffness: 40, damping: 18 });
  const sCharY  = useSpring(charY, { stiffness: 40, damping: 18 });

  const ref = useRef<HTMLDivElement>(null);
  const handleMouse = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mouseX.set(e.clientX - r.left - r.width / 2);
    mouseY.set(e.clientY - r.top - r.height / 2);
  };
  const resetMouse = () => { mouseX.set(0); mouseY.set(0); };

  return (
    <motion.div
      ref={ref} onMouseMove={handleMouse} onMouseLeave={resetMouse}
      style={{ rotateX: sRotX, rotateY: sRotY, perspective: 1200 }}
      className="relative w-full overflow-hidden bg-[#07070d] border border-white/[0.08]"
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease }}>

      <div className="absolute inset-0 z-0 overflow-hidden">
        <motion.div className="absolute inset-0"
          animate={{ scale: [1.05, 1.12] }} transition={{ duration: 18, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}>
          <Image src={t.banner} alt="" fill className="object-cover brightness-25" />
        </motion.div>
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at bottom left, ${t.color}40, transparent 55%)` }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${t.color}18, transparent 50%)` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07070d]/95 via-[#07070d]/50 to-[#07070d]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070d] via-transparent to-[#07070d]/50" />
      </div>

      <motion.div className="absolute top-0 bottom-0 left-[55%] w-px pointer-events-none hidden lg:block"
        style={{ background: `linear-gradient(to bottom, transparent, ${t.color}18, transparent)` }}
        initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.4, ease }} />

      <Scanlines />
      <OrbEffect color={t.color} />

      <motion.div
        style={{ x: sCharX, y: sCharY }}
        className="absolute bottom-0 right-0 lg:right-[8%] h-[110%] w-[42%] sm:w-[36%] lg:w-[28%] pointer-events-none select-none z-10"
        initial={{ opacity: 0, x: 60, scale: 0.92 }} animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 1.1, ease, delay: 0.3 }}>
        <motion.div className="relative w-full h-full"
          animate={{ y: [0, -16, 0] }} transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}>
          <motion.div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 h-8 rounded-full"
            style={{ background: `radial-gradient(ellipse, ${t.color}60 0%, transparent 70%)`, filter: 'blur(10px)' }}
            animate={{ opacity: [0.3, 0.9, 0.3], scaleX: [0.8, 1.15, 0.8] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }} />
          <Image src={t.hero} alt="Tournament Hero" fill
            className="object-contain object-bottom drop-shadow-[0_0_48px_rgba(232,160,0,0.45)]" priority />
        </motion.div>
      </motion.div>

      <div className="relative z-20 px-6 sm:px-10 py-8 sm:py-12 flex flex-col gap-6 lg:max-w-[58%]">
        <div className="flex items-center gap-2 flex-wrap">
          {t.status === 'open' && !isFull && (
            <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
              className="flex items-center gap-1.5 bg-black/60 border border-[#27ae60]/50 px-2.5 py-1 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#27ae60]" />
              <span className="text-[#27ae60] text-[9px] font-black tracking-widest uppercase">Registration Open</span>
            </motion.span>
          )}
          {isFull && (
            <span className="flex items-center gap-1.5 bg-black/60 border border-[#e84040]/40 px-2.5 py-1">
              <Lock size={8} className="text-[#e84040]" /><span className="text-[#e84040] text-[9px] font-black tracking-widest uppercase">Full</span>
            </span>
          )}
          {t.status === 'upcoming' && (
            <span className="flex items-center gap-1.5 bg-black/60 border border-[#555]/40 px-2.5 py-1">
              <Clock size={8} className="text-[#555]" /><span className="text-[#555] text-[9px] font-black tracking-widest uppercase">Opens Soon</span>
            </span>
          )}
          {t.tags.map(tag => (
            <span key={tag} className="text-[8px] font-black tracking-widest uppercase px-2 py-1"
              style={{ color: t.color, background: `${t.color}15`, border: `1px solid ${t.color}30` }}>{tag}</span>
          ))}
        </div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0.2}>
          <p className="text-[9px] tracking-[0.4em] uppercase font-black mb-2" style={{ color: `${t.color}90` }}>{t.subtitle}</p>
          <h2 className="font-black uppercase leading-none text-white"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', letterSpacing: '-0.02em' }}>
            {t.name}
          </h2>
          <div className="mt-3 h-0.5 w-24" style={{ background: `linear-gradient(90deg, ${t.color}, transparent)` }} />
          <p className="text-[#555] text-sm mt-3 leading-relaxed max-w-xs">{t.description}</p>
        </motion.div>

        <div className="flex flex-col gap-1.5">
          {[
            { icon: <Swords size={9} />, val: t.format },
            { icon: <MapPin size={9} />, val: t.location },
            { icon: <Calendar size={9} />, val: formatDate(t.date) },
          ].map(m => (
            <div key={m.val} className="flex items-center gap-2">
              <span style={{ color: `${t.color}80` }}>{m.icon}</span>
              <span className="text-[#666] text-[11px] tracking-wide">{m.val}</span>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[8px] tracking-[0.2em] uppercase text-[#333]">Slots Filled</span>
            <span className="text-[10px] font-black font-mono" style={{ color: t.color }}>{t.filled}/{t.slots}</span>
          </div>
          <div className="h-1 w-full max-w-xs bg-white/[0.06] overflow-hidden">
            <motion.div className="h-full" style={{ background: t.color }}
              initial={{ width: 0 }} animate={{ width: `${(t.filled / t.slots) * 100}%` }}
              transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }} />
          </div>
        </div>

        <div>
          <p className="text-[8px] tracking-[0.25em] uppercase text-[#333] mb-2">Starts In</p>
          <CountdownDisplay target={t.date} color={t.color} />
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={isOpen ? onRegister : undefined} disabled={!isOpen}
            className="relative overflow-hidden flex items-center gap-2 font-black text-[11px] tracking-[0.2em] uppercase px-6 py-3 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
            style={isOpen ? { background: t.color, color: '#000' } : { border: '1px solid #222', color: '#333', background: 'transparent' }}>
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-white/25 skew-x-12 transition-transform duration-500 pointer-events-none" />
            <span className="relative">{t.status === 'closed' || isFull ? 'Registration Full' : t.status === 'upcoming' ? 'Coming Soon' : 'Register Now'}</span>
            {isOpen && <ArrowRight size={13} className="relative" />}
          </motion.button>
          {isOpen && (
            <span className="text-[#333] text-[9px] tracking-widest uppercase">
              {t.slots - t.filled} slot{t.slots - t.filled !== 1 ? 's' : ''} left
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Small sidebar card ────────────────────────────────────────
const SmallCard = ({ t, active, onSelect, onRegister, index }: {
  t: typeof TOURNAMENTS[0]; active: boolean;
  onSelect: () => void; onRegister: () => void; index: number;
}) => {
  const isFull = t.filled >= t.slots;
  const isOpen = t.status === 'open' && !isFull;
  const tick   = useCountdown(t.date);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      onClick={onSelect}
      className="group relative cursor-pointer border overflow-hidden transition-all duration-300"
      style={{ borderColor: active ? `${t.color}50` : 'rgba(255,255,255,0.06)', background: active ? `${t.color}0a` : 'transparent' }}>
      <div className="absolute left-0 top-0 bottom-0 w-0.5 transition-all" style={{ background: active ? t.color : 'transparent' }} />

      <div className="relative h-16 overflow-hidden shrink-0">
        <Image src={t.banner} alt="" fill className="object-cover brightness-20 group-hover:brightness-30 transition-all duration-500" />
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at left, ${t.color}30, transparent 60%)` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#08080e]/90" />
        <Scanlines />
        <div className="absolute top-2 right-2">
          {isOpen
            ? <motion.div className="w-1.5 h-1.5 rounded-full bg-[#27ae60]"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
            : <div className="w-1.5 h-1.5 rounded-full bg-[#333]" />
          }
        </div>
        <div className="absolute bottom-1 right-2 pointer-events-none select-none">
          <span className="font-black text-3xl leading-none" style={{ color: `${t.color}0c`, fontFamily: "'Barlow Condensed', sans-serif" }}>
            {t.name.split(' ')[0]}
          </span>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2">
        <div>
          <p className="text-[7px] tracking-[0.3em] uppercase mb-0.5" style={{ color: `${t.color}70` }}>{t.subtitle}</p>
          <p className="text-white font-black text-sm uppercase leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{t.name}</p>
        </div>
        {!tick.over && (
          <div className="flex items-center gap-1.5">
            <Clock size={8} style={{ color: `${t.color}80` }} />
            <span className="text-[#444] text-[9px] font-mono">{tick.d}d {String(tick.h).padStart(2,'0')}h {String(tick.m).padStart(2,'0')}m</span>
          </div>
        )}
        <div className="h-0.5 w-full bg-white/[0.05]">
          <div className="h-full transition-all" style={{ width: `${(t.filled/t.slots)*100}%`, background: t.color }} />
        </div>
        <button
          onClick={e => { e.stopPropagation(); if (isOpen) onRegister(); }}
          disabled={!isOpen}
          className="w-full py-1.5 font-black text-[9px] tracking-[0.2em] uppercase border transition-all disabled:opacity-30"
          style={isOpen
            ? { borderColor: `${t.color}50`, color: t.color, background: `${t.color}10` }
            : { borderColor: '#1a1a1a', color: '#333', background: 'transparent' }
          }>
          {t.status === 'closed' || isFull ? 'Full' : t.status === 'upcoming' ? 'Soon' : 'Register →'}
        </button>
      </div>
    </motion.div>
  );
};

// ── Past card ─────────────────────────────────────────────────
const PastCard = ({ t, index }: { t: typeof PAST[0]; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.08 }}
    className="group relative border border-white/[0.05] hover:border-white/[0.12] bg-[#09090f] overflow-hidden transition-all duration-300">
    <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: t.color }} />
    <div className="relative h-32 overflow-hidden">
      <Image src={t.banner} alt="" fill className="object-cover brightness-25 group-hover:brightness-35 group-hover:scale-105 transition-all duration-500" />
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at bottom left, ${t.color}35, transparent 60%)` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#09090f] to-transparent" />
      <Scanlines />
      <OrbEffect color={t.color} />
      <Trophy size={18} className="absolute top-3 left-4" style={{ color: t.color }} />
      <div className="absolute bottom-2 right-3 pointer-events-none select-none">
        <span className="font-black text-5xl leading-none" style={{ color: `${t.color}0d`, fontFamily: "'Barlow Condensed', sans-serif" }}>
          {t.name.split(' ').slice(-1)[0]}
        </span>
      </div>
    </div>
    <div className="p-4">
      <p className="text-[8px] tracking-[0.3em] uppercase mb-0.5 text-[#333]">{t.date}</p>
      <h3 className="text-white font-black text-2xl uppercase leading-none mb-3" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{t.name}</h3>
      <div className="h-px w-full bg-white/[0.04] mb-3" />
      <div className="flex flex-col gap-2">
        {t.podium.map(p => (
          <div key={p.place} className="flex items-center gap-3">
            <span className="text-lg w-6 shrink-0">{['🥇','🥈','🥉'][p.place - 1]}</span>
            <span className="font-black text-sm uppercase flex-1 truncate"
              style={{ color: p.place === 1 ? 'white' : '#444', fontFamily: "'Barlow Condensed', sans-serif" }}>{p.team}</span>
            <span className="text-[#2a2a2a] text-[10px] font-mono shrink-0">{p.score}</span>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

// ══════════════════════════════════════════════════════════
// PAGE HEADER
// Large hero image dominates the right side like a background
// ══════════════════════════════════════════════════════════
const PageHeader = () => {
  return (
    <div className="relative overflow-hidden border-b border-white/[0.05]" style={{ minHeight: '420px' }}>

      {/* ── Dark bg + faint Ken Burns banner ── */}
      <div className="absolute inset-0">
        <motion.div className="absolute inset-0"
          animate={{ scale: [1.03, 1.08] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}>
          <Image src={TOURNAMENTS[0].banner} alt="" fill className="object-cover brightness-[0.1]" />
        </motion.div>
        {/* Strong dark-to-transparent gradient from left so text is readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080e] via-[#08080e]/85 to-transparent" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 60%, #e8a00010, transparent 55%)' }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '50px 50px' }} />
      </div>
      <Scanlines opacity={0.02} />
      <OrbEffect />

      {/* ══ LARGE HERO IMAGE — covers the entire right side, bleeds to edge ══
          This container handles the initial entrance animation (Slide In).   */}
      <motion.div
        className="absolute top-0 right-0 bottom-0 w-[62%] sm:w-[58%] lg:w-[52%] pointer-events-none select-none z-[2]"
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.1, ease, delay: 0.2 }}
      >
        {/* ══ FLOAT WRAPPER — Handles the idle floating animation ══ */}
        <motion.div
          className="absolute inset-0"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* The image — object-right-bottom so the character stands at the right edge */}
          <Image
            src="/heroes/brody.png"
            alt=""
            fill
            className="object-cover object-top"
            style={{ filter: 'drop-shadow(-50px 0 90px rgba(232,160,0,0.10))' }}
            priority
          />
          {/* Ambient ground glow (Moves with the character) */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-44 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 65% 100%, rgba(232,160,0,0.16) 0%, transparent 62%)' }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        {/* Static Overlays (Do not float) — Ensure edges stay masked */}
        {/* Left-edge fade — key to blending into the text area */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080e] via-[#08080e]/40 to-transparent" />
        {/* Bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080e] via-transparent to-transparent" />
        {/* Top fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#08080e]/60 via-transparent to-transparent" />
      </motion.div>

      {/* Hairline vertical accent at the image's left fade boundary */}
      <motion.div className="hidden md:block absolute top-0 bottom-0 left-[44%] sm:left-[46%] lg:left-[50%] w-px pointer-events-none z-[3]"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(232,160,0,0.08), transparent)' }}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
        transition={{ duration: 1.4, delay: 0.5, ease }} />

      {/* ── Content — left side ── */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-14 sm:py-20 flex flex-col justify-center" style={{ minHeight: '420px' }}>
        <div className="max-w-lg">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0.1}
            className="flex items-center gap-2 mb-4">
            <span className="w-6 h-0.5 bg-[#e8a000]" />
            <span className="text-[#e8a000] text-[9px] font-black tracking-[0.4em] uppercase">Ghana MLBB · Season 5</span>
          </motion.div>

          <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={0.2}
            className="font-black uppercase leading-none text-white"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(3rem, 7vw, 5.5rem)', letterSpacing: '-0.02em' }}>
            TOURNAMENT<br />
            <span style={{ WebkitTextStroke: '2px #e8a000', color: 'transparent' }}>HUB</span>
          </motion.h1>

          <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={0.35}
            className="text-[#444] text-sm mt-4 tracking-wide leading-relaxed max-w-sm">
            Register · Compete · Champion ·{' '}
            <span className="font-bold" style={{ color: '#27ae60' }}>
              {TOURNAMENTS.filter(t => t.status === 'open' && t.filled < t.slots).length} open now
            </span>
          </motion.p>

          {/* Quick stats */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0.45}
            className="flex items-center gap-8 mt-6">
            {[
              { label: 'Upcoming', val: TOURNAMENTS.length,                                                color: '#e8a000' },
              { label: 'Open',     val: TOURNAMENTS.filter(t => t.status === 'open' && t.filled < t.slots).length, color: '#27ae60' },
              { label: 'Past',     val: PAST.length,                                                        color: '#4a90d9' },
            ].map(s => (
              <div key={s.label} className="flex flex-col gap-0.5">
                <span className="font-black text-3xl font-mono leading-none"
                  style={{ color: s.color, fontFamily: "'Barlow Condensed', sans-serif" }}>{s.val}</span>
                <span className="text-[#2a2a2a] text-[8px] tracking-[0.2em] uppercase">{s.label}</span>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0.55}
            className="flex gap-3 mt-8 flex-wrap">
            <motion.a href="#upcoming" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              className="relative overflow-hidden flex items-center gap-2 border border-[#e8a000] text-[#e8a000] font-black uppercase tracking-[0.15em] px-5 py-2.5 text-[11px] group transition-colors duration-300">
              <span className="absolute inset-0 bg-[#e8a000] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 group-hover:text-black transition-colors duration-300">Browse Tournaments</span>
              <ChevronRight size={12} className="relative z-10 group-hover:text-black transition-colors duration-300" />
            </motion.a>
            <motion.a href="#past" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              className="text-[#444] hover:text-white font-black uppercase tracking-widest px-4 py-2.5 text-[11px] transition-colors">
              Past Results →
            </motion.a>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e8a000]/20 to-transparent" />
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function TournamentsPage() {
  const [featured,    setFeatured]    = useState(TOURNAMENTS[0]);
  const [registering, setRegistering] = useState<typeof TOURNAMENTS[0] | null>(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&display=swap');
        ::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>

      <main className="min-h-screen bg-[#08080e]">
        <PageHeader />

        {/* ── UPCOMING ── */}
        <div id="upcoming" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0.1}
            className="flex items-center gap-3 mb-8">
            <Flame size={14} className="text-[#e8a000]" />
            <span className="text-[#e8a000] text-[9px] font-black tracking-[0.4em] uppercase">Upcoming Tournaments</span>
            <div className="flex-1 h-px bg-white/[0.04]" />
          </motion.div>

          {/* Desktop: featured + sidebar */}
          <div className="hidden lg:grid grid-cols-[1fr_280px] xl:grid-cols-[1fr_320px] gap-4">
            <FeaturedCard t={featured} onRegister={() => setRegistering(featured)} />
            <div className="flex flex-col gap-2">
              {TOURNAMENTS.map((t, i) => (
                <SmallCard key={t.id} t={t} index={i}
                  active={featured.id === t.id}
                  onSelect={() => setFeatured(t)}
                  onRegister={() => setRegistering(t)} />
              ))}
            </div>
          </div>

          {/* Mobile/tablet */}
          <div className="lg:hidden flex flex-col gap-4">
            {TOURNAMENTS.map((t, i) => (
              <FeaturedCard key={t.id} t={t} onRegister={() => setRegistering(t)} />
            ))}
          </div>

          <div className="mt-8 border border-[#e8a000]/15 bg-[#e8a000]/[0.04] px-4 py-3 flex items-start gap-3">
            <AlertCircle size={13} className="text-[#e8a000] shrink-0 mt-0.5" />
            <p className="text-[#555] text-[11px] leading-relaxed tracking-wide">
              Team must have minimum 5 active players on Ghana Nagends platform. Registrations reviewed within 24h. Contact admins via Discord for disputes.
            </p>
          </div>
        </div>

        {/* ── PAST ── */}
        <div id="past" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
          <div className="border-t border-white/[0.04] pt-10 mb-8">
            <motion.div className="flex items-center gap-3">
              <Trophy size={14} className="text-[#e8a000]" />
              <span className="text-[#e8a000] text-[9px] font-black tracking-[0.4em] uppercase">Past Results</span>
              <div className="flex-1 h-px bg-white/[0.04]" />
              <span className="text-[#222] text-[9px] tracking-widest uppercase">{PAST.length} completed</span>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PAST.map((t, i) => <PastCard key={t.id} t={t} index={i} />)}
          </div>

          <div className="mt-8 flex items-center justify-between border border-white/[0.04] px-4 py-3">
            <p className="text-[#222] text-[10px] tracking-widest uppercase">Full bracket history & VODs available on request</p>
            <ChevronRight size={11} className="text-[#222]" />
          </div>
        </div>

        <AnimatePresence>
          {registering && <RegisterModal t={registering} onClose={() => setRegistering(null)} />}
        </AnimatePresence>
      </main>
    </>
  );
}