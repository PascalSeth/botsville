'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useHero } from '../../contexts/HeroContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, Trophy, ChevronRight, X,
  CheckCircle, AlertCircle, Swords, Lock, MapPin,
  Flame, ArrowRight, Zap, Loader2, Share2, Shield, Users
} from 'lucide-react';

// Floating animation for hero image
const floatingHeroStyle: React.CSSProperties = {
  animation: 'hero-float 3.5s ease-in-out infinite',
};

// Add keyframes for floating effect
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes hero-float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-18px); }
      100% { transform: translateY(0px); }
    }
  `;
  document.head.appendChild(style);
}

const Scanlines = ({ opacity = 0.025 }: { opacity?: number }) => (
  <div className="absolute inset-0 pointer-events-none z-[1]"
    style={{ opacity, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,#fff 2px,#fff 3px)', backgroundSize: '100% 3px' }} />
);

const OrbEffect = ({ color = '#e8a000' }: { color?: string }) => (
  <>
    <div className="absolute top-1/4 left-1/3 w-[32rem] h-[32rem] rounded-full pointer-events-none"
      style={{
        background: `radial-gradient(circle, ${color}15 0%, ${color}08 40%, transparent 70%)`,
      }} />
    <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full pointer-events-none"
      style={{
        background: 'radial-gradient(circle, rgba(30,80,200,0.10) 0%, rgba(30,80,200,0.04) 40%, transparent 65%)',
      }} />
  </>
);

type TStatus = 'OPEN' | 'CLOSED' | 'UPCOMING' | 'COMPLETED' | 'LIVE' | 'ONGOING';

type Tournament = {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  format: string;
  location: string;
  date: string;
  registrationDeadline?: string;
  slots: number;
  filled?: number;
  status: TStatus;
  color?: string | null;
  tags?: string[];
  heroImage?: string | null;
  banner?: string | null;
  image?: string | null; // Compatibility with legacy field
  rules?: string[];
  season?: { id: string; name: string } | null;
};

type ApiResponse = {
  tournaments: Tournament[];
  pagination: { total: number; limit: number; skip: number };
};

const getRegistrationStatus = (tournament: Tournament): { canRegister: boolean; label: string; color: string } => {
  const filled = tournament.filled || 0;
  const isFull = filled >= tournament.slots;
  const deadlineDate = tournament.registrationDeadline ? new Date(tournament.registrationDeadline) : new Date(tournament.date);
  const isPastDeadline = Date.now() > deadlineDate.getTime();

  if (tournament.status === 'COMPLETED') return { canRegister: false, label: 'Tournament Completed', color: 'text-gray-500 border-gray-500/30 bg-gray-500/10' };
  if (isFull) return { canRegister: false, label: 'Tournament Full', color: 'text-red-500 border-red-500/30 bg-red-500/10' };
  if (isPastDeadline) return { canRegister: false, label: 'Registration Closed', color: 'text-red-500 border-red-500/30 bg-red-500/10' };

  // If we're here, it's not completed, not full, and before deadline
  return { canRegister: true, label: 'Registration Open', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
};

const canRegisterTournament = (tournament: Tournament): boolean => {
  return getRegistrationStatus(tournament).canRegister;
};

const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Countdown Hook ─────────────────────────────────────────────────
function useCountdown(target: Date) {
  const calc = useCallback(() => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, over: true };
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
      over: false,
    };
  }, [target]);
  const [tick, setTick] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTick(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return tick;
}

const CountdownDisplay = ({ target, color }: { target: string; color?: string }) => {
  const t = useCountdown(new Date(target));
  const displayColor = color || '#e8a000';
  if (t.over) return <span className="text-red-500 text-[10px] font-black tracking-widest uppercase">Registration Closed</span>;
  return (
    <div className="flex items-end gap-1.5">
      {[{ v: t.d, l: 'Days' }, { v: t.h, l: 'Hrs' }, { v: t.m, l: 'Min' }, { v: t.s, l: 'Sec' }].map(({ v, l }, i) => (
        <React.Fragment key={l}>
          <div className="flex flex-col items-center bg-white/5 border border-white/10 px-3 py-2 min-w-[50px] rounded-xl">
            <span className="font-black text-2xl leading-none tabular-nums text-white">
              {String(v).padStart(2, '0')}
            </span>
            <span className="text-[7px] tracking-[0.2em] uppercase text-[#555] mt-1">{l}</span>
          </div>
          {i < 3 && <span className="text-white/20 font-black text-xl mb-3">:</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

// ── Registration modal ────────────────────────────────────────
const RegisterModal = ({ t: tournament, onClose }: { t: Tournament; onClose: () => void }) => {
  const [team,    setTeam]    = useState<string | null>(null);
  const [agreed,  setAgreed]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [isCaptain, setIsCaptain] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [registeredTeams, setRegisteredTeams] = useState<string[]>([]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const [teamResponse, registrationResponse] = await Promise.all([
          fetch('/api/my-team'),
          fetch(`/api/tournaments/${tournament.id}/register`),
        ]);
        const teamData = await teamResponse.json();
        const registrationData = await registrationResponse.json();
        if (teamResponse.ok && teamData?.name) {
          setRegisteredTeams([teamData.name]);
          setIsCaptain(Boolean(teamData.isCaptain));
          if (Boolean(teamData.isCaptain)) setTeam(teamData.name);
        }
        if (registrationResponse.ok && registrationData?.registered) {
          setAlreadyRegistered(true);
          if (registrationData?.registrationStatus) setRegistrationStatus(String(registrationData.registrationStatus));
        }
      } catch (e) {}
    };
    fetchTeams();
  }, [tournament.id]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const canSubmit = isCaptain && team && agreed && !loading && !alreadyRegistered;
  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || 'Failed to register');
        setLoading(false);
        return;
      }
      setDone(true);
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const accentColor = tournament.color || '#e8a000';

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl bg-[#08080d] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-48 shrink-0 overflow-hidden">
          <img src={tournament.banner || tournament.image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80'} alt="" className="w-full h-full object-cover brightness-[0.2]" />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at bottom left, ${accentColor}40, transparent 60%)` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08080d] via-transparent to-transparent" />
          <Scanlines />
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-xl bg-black/50 border border-white/10 text-white hover:bg-white/10 transition-colors z-10"><X size={18} /></button>
          <div className="absolute bottom-6 left-8">
            <p className="text-[10px] tracking-[0.3em] uppercase font-black mb-2" style={{ color: accentColor }}>Team Registration</p>
            <h2 className="text-white font-black text-3xl uppercase tracking-tighter leading-none">{tournament.name}</h2>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-8 space-y-8 scrollbar-hide">
          {done ? (
            <div className="flex flex-col items-center gap-6 py-12 text-center">
              <CheckCircle size={64} className="text-emerald-400" />
              <div className="space-y-2">
                <p className="text-white font-black text-3xl uppercase tracking-tighter leading-none">Registration Complete</p>
                <p className="text-[#555] text-xs font-medium">Your team has been successfully registered.</p>
              </div>
              <button onClick={onClose} className="px-10 py-4 bg-[#e8a000] text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#ffb800] transition-all">Close</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Date', val: formatDate(tournament.date), icon: Calendar },
                  { label: 'Format', val: tournament.format.replace(/_/g, ' '), icon: Swords },
                  { label: 'Capacity', val: `${tournament.filled || 0}/${tournament.slots}`, icon: Users },
                  { label: 'Domain', val: tournament.location || 'Online', icon: MapPin },
                ].map(s => (
                  <div key={s.label} className="bg-white/[0.03] border border-white/[0.05] p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1.5 opacity-40">
                      <s.icon size={12} className="text-[#e8a000]" />
                      <p className="text-[8px] tracking-widest uppercase font-black">{s.label}</p>
                    </div>
                    <p className="text-white text-[10px] font-black uppercase tracking-wide">{s.val}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#555] block">Select Team</label>
                {registeredTeams.length > 0 ? (
                  <div className="space-y-2">
                    {registeredTeams.map(tm => (
                      <button key={tm} onClick={() => setTeam(tm)} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        team === tm ? 'bg-[#e8a000]/10 border-[#e8a000] text-white' : 'bg-white/[0.02] border-white/5 text-[#555] hover:bg-white/[0.05]'
                      }`}>
                        <span className="font-black text-[11px] uppercase tracking-widest">{tm}</span>
                        {team === tm && <CheckCircle size={14} className="text-[#e8a000]" />}
                      </button>
                    ))}
                    {!isCaptain && <p className="text-[9px] text-red-400 font-black uppercase flex items-center gap-2 mt-2"><AlertCircle size={12} /> Captaincy authority required</p>}
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center">
                    <p className="text-[10px] text-[#555] font-black uppercase mb-3">No active squads found</p>
                    <Link href="/register-team" className="text-[#e8a000] text-[10px] font-black uppercase tracking-widest hover:underline">Establish New Team →</Link>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <div onClick={() => setAgreed(!agreed)} className={`w-5 h-5 rounded-lg border shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                    agreed ? 'bg-[#e8a000] border-[#e8a000]' : 'border-white/10 group-hover:border-white/20'
                  }`}>
                    {agreed && <CheckCircle size={12} className="text-black" />}
                  </div>
                  <span className="text-[#444] text-[10px] leading-relaxed font-bold group-hover:text-[#666] transition-colors uppercase tracking-tight">Accept tournament protocol and community guidelines.</span>
                </label>
                <button onClick={submit} disabled={!canSubmit} className="w-full py-5 bg-[#e8a000] text-black font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-[#ffb800] transition-all disabled:opacity-20 flex items-center justify-center gap-3">
                   {loading ? <Loader2 size={16} className="animate-spin" /> : <><Shield size={16} /> Register Now</>}
                </button>
              </div>

              {alreadyRegistered && (
                <div className="p-4 rounded-2xl bg-[#e8a000]/10 border border-[#e8a000]/30 text-[#e8a000] text-[9px] font-black uppercase tracking-widest text-center">
                  You are already registered for this tournament.
                </div>
              )}

              {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-[9px] font-black uppercase text-center">{error}</div>}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ── Featured Hero Card ─────────────────────────────────────────
const FeaturedCard = ({ t, onRegister, selectedHeroImage }: { t: Tournament; onRegister: () => void; selectedHeroImage?: string | null; }) => {
  const color = t.color || '#e8a000';
  const filled = t.filled ?? 0;
  const regStatus = getRegistrationStatus(t);
  const bannerSrc = t.banner || t.image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80';
  const heroSrc = selectedHeroImage || t.heroImage || bannerSrc;

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative w-full overflow-hidden bg-[#0a0a0f] border border-white/5 rounded-[2.5rem] shadow-2xl">
      <div className="absolute inset-0 z-0">
        <img src={bannerSrc} alt="" className="w-full h-full object-cover brightness-[0.15]" />
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 30% 50%, ${color}20, transparent 70%)` }} />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
      </div>

      <div className="absolute top-0 bottom-0 left-[55%] w-px bg-white/5 hidden lg:block" />
      <Scanlines opacity={0.05} />

      <div className="absolute bottom-0 right-0 lg:right-[5%] h-[115%] w-[45%] pointer-events-none select-none z-10">
        <div className="relative w-full h-full">
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-64 h-12 rounded-full bg-[#e8a000] opacity-20 blur-3xl" />
          <img src={heroSrc} alt="" className="w-full h-full object-contain object-bottom drop-shadow-[0_0_60px_rgba(232,160,0,0.3)]" style={floatingHeroStyle} />
        </div>
      </div>

      <div className="relative z-20 p-10 lg:p-20 flex flex-col gap-8 lg:max-w-2xl">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${regStatus.color}`}>
            {regStatus.label}
          </span>
          {t.tags?.map(tag => (
            <span key={tag} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest">{tag}</span>
          ))}
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-black text-[#e8a000] uppercase tracking-[0.4em]">{t.subtitle || 'Championship Event'}</p>
          <h2 className="text-7xl font-black text-white uppercase tracking-tighter leading-[0.85]">{t.name}</h2>
          <div className="h-1 w-24 bg-[#e8a000] mt-6" />
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-4">
          {[
            { icon: Swords, label: 'Mode', val: t.format.replace(/_/g, ' ') },
            { icon: MapPin, label: 'Domain', val: t.location || 'Online' },
            { icon: Calendar, label: 'Launch', val: formatDate(t.date) },
            { icon: Users, label: 'Load', val: `${filled}/${t.slots}` },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-white/5 text-[#e8a000]"><Icon size={16} /></div>
                <div>
                  <p className="text-[9px] font-black text-[#444] uppercase tracking-widest">{stat.label}</p>
                  <p className="text-[11px] font-bold text-white uppercase">{stat.val}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-4 pt-4">
          <p className="text-[10px] font-black text-[#333] uppercase tracking-[0.3em]">Registration Ends In</p>
          <CountdownDisplay target={t.registrationDeadline || t.date} />
        </div>

        <div className="flex items-center gap-4 pt-6">
          <button onClick={onRegister} disabled={!regStatus.canRegister} className="px-12 py-5 bg-[#e8a000] text-black font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-[#ffb800] transition-all shadow-2xl shadow-[#e8a000]/20 flex items-center gap-3 active:scale-[0.98] disabled:opacity-20">
            {regStatus.canRegister ? <><Zap size={16} /> Register</> : <><Lock size={16} /> {regStatus.label}</>}
          </button>
          <Link href={`/tournaments/${t.id}`} className="px-12 py-5 bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-white/10 transition-all">
            More Details
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

// ── Small Gallery Card ─────────────────────────────────────────
const SmallCard = ({ t, active, onSelect, onRegister }: { t: Tournament; active: boolean; onSelect: () => void; onRegister: () => void; }) => {
  const color = t.color || '#e8a000';
  const regStatus = getRegistrationStatus(t);
  const bannerSrc = t.banner || t.image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80';

  return (
    <motion.button onClick={onSelect} className={`relative group w-full p-6 rounded-3xl border transition-all text-left overflow-hidden ${
      active ? 'bg-white/[0.04] border-[#e8a000]' : 'bg-transparent border-white/5 hover:border-white/20'
    }`}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <img src={bannerSrc} alt="" className="w-full h-full object-cover brightness-[0.05]" />
      </div>
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${regStatus.color}`}>
            {regStatus.label.split(' ')[regStatus.label.split(' ').length - 1]}
          </div>
          <p className="text-[10px] font-black font-mono text-white/20">#{t.id.split('-')[0]}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[8px] font-black text-[#e8a000] uppercase tracking-[0.3em]">{t.subtitle || 'Arena Championship'}</p>
          <h3 className="text-xl font-black text-white uppercase tracking-tighter group-hover:text-[#e8a000] transition-colors">{t.name}</h3>
        </div>
        <div className="flex items-center justify-between border-t border-white/5 pt-4">
           <div className="flex items-center gap-2 text-[#555] text-[10px] font-bold">
             <Calendar size={12} /> {new Date(t.date).toLocaleDateString()}
           </div>
           <ArrowRight size={16} className={`text-[#333] group-hover:text-[#e8a000] transition-all ${active ? 'translate-x-1 text-[#e8a000]' : ''}`} />
        </div>
      </div>
    </motion.button>
  );
};

// ── Past Tournament Card ───────────────────────────────────────
const PastCard = ({ t }: { t: Tournament }) => (
  <Link href={`/tournaments/${t.id}`} className="group relative bg-[#0a0a0f] border border-white/5 rounded-3xl overflow-hidden hover:border-[#e8a000]/30 transition-all">
    <div className="relative h-48 overflow-hidden">
      <img src={t.banner || t.image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80'} alt="" className="w-full h-full object-cover brightness-[0.2] transition-transform group-hover:scale-105 duration-700" />
      <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0f] via-transparent to-transparent" />
      <Trophy size={20} className="absolute top-6 left-6 text-[#e8a000]" />
    </div>
    <div className="p-8 space-y-4">
      <div className="space-y-1">
        <p className="text-[8px] font-black text-[#555] uppercase tracking-[0.4em]">{new Date(t.date).toLocaleDateString()}</p>
        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{t.name}</h3>
      </div>
      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-[9px] font-black uppercase text-[#444] tracking-widest">Archive Sealed</span>
        <ChevronRight size={16} className="text-[#333] group-hover:text-[#e8a000] transition-all group-hover:translate-x-1" />
      </div>
    </div>
  </Link>
);

// ── Page Header ───────────────────────────────────────────────
const PageHeader = ({ upcomingCount = 0, openCount = 0, pastCount = 0 }: { upcomingCount?: number; openCount?: number; pastCount?: number }) => (
  <div className="relative h-[600px] overflow-hidden border-b border-white/5 flex flex-col justify-center">
    <div className="absolute inset-0 z-0">
      <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&q=80" alt="" className="w-full h-full object-cover brightness-[0.08]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#05050a] via-[#05050a]/80 to-transparent" />
      <Scanlines opacity={0.03} />
      <OrbEffect />
    </div>

    <div className="absolute top-0 right-0 bottom-0 w-[55%] pointer-events-none select-none z-10 hidden lg:block">
      <div className="relative w-full h-full">
        <img src="/heroes/brody.png" alt="" className="w-full h-full object-contain object-top" style={{ ...floatingHeroStyle, filter: 'drop-shadow(-40px 0 60px rgba(232,160,0,0.1))' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05050a] via-[#05050a]/40 to-transparent" />
      </div>
    </div>

    <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-14 flex flex-col justify-center h-full w-full">
       <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="max-w-2xl space-y-8">
          <div className="flex items-center gap-3">
             <div className="w-8 h-1 bg-[#e8a000]" />
             <p className="text-[#e8a000] text-[10px] font-black uppercase tracking-[0.4em]">Botsville · Official Tournaments</p>
          </div>
          <h1 className="text-[clamp(4rem,10vw,8rem)] font-black text-white uppercase tracking-tighter leading-[0.85]">
            TOURNAMENT<br />
            <span className="text-transparent" style={{ WebkitTextStroke: '2px #e8a000' }}>LIST</span>
          </h1>
          <p className="text-[#555] text-lg font-medium tracking-wide max-w-md">
            Find the next match for your team. Join open tournaments or view past results.
          </p>

          <div className="flex items-center gap-12 pt-4">
             {[
               { l: 'Upcoming', v: upcomingCount, c: '#e8a000' },
               { l: 'Open', v: openCount, c: '#27ae60' },
               { l: 'Past', v: pastCount, c: '#4a90d9' }
             ].map(s => (
               <div key={s.l} className="space-y-1">
                 <p className="text-4xl font-black text-white font-mono leading-none" style={{ color: s.c }}>{s.v}</p>
                 <p className="text-[9px] font-black text-[#333] uppercase tracking-[0.3em]">{s.l}</p>
               </div>
             ))}
          </div>

          <div className="flex items-center gap-4 pt-8">
             <a href="#active" className="px-10 py-5 bg-[#e8a000] text-black font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-[#ffb800] transition-all flex items-center gap-3 active:scale-[0.98]">
                View All <ChevronRight size={16} />
             </a>
             <a href="#past" className="px-10 py-5 text-[#444] hover:text-white font-black text-[10px] uppercase tracking-[0.3em] transition-all">
                Past Tournaments →
             </a>
          </div>
       </motion.div>
    </div>
  </div>
);

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [pastTournaments, setPastTournaments] = useState<Tournament[]>([]);
  const [featured, setFeatured] = useState<Tournament | null>(null);
  const [registering, setRegistering] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const { heroImage: selectedHeroImage } = useHero();

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch('/api/tournaments?limit=100');
        const data: ApiResponse = await response.json();
        if (data.tournaments && Array.isArray(data.tournaments)) {
          const upcoming = data.tournaments.filter(t => ['OPEN', 'UPCOMING', 'LIVE', 'ONGOING'].includes(t.status));
          const past = data.tournaments.filter(t => t.status === 'COMPLETED');

          // Sort upcoming tournaments: open for registration ones first
          const sortedUpcoming = [...upcoming].sort((a, b) => {
            const aOpen = canRegisterTournament(a);
            const bOpen = canRegisterTournament(b);
            if (aOpen && !bOpen) return -1;
            if (!aOpen && bOpen) return 1;
            return 0;
          });

          setTournaments(sortedUpcoming);
          setPastTournaments(past);
          if (sortedUpcoming.length > 0) setFeatured(sortedUpcoming[0]);
        }
      } catch (error) {} finally { setLoading(false); }
    };
    fetchTournaments();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#05050a] gap-4">
      <Loader2 size={32} className="animate-spin text-[#e8a000]" />
      <p className="text-[10px] font-black uppercase text-[#444] tracking-[0.4em]">Querying Archive Registry...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05050a] selection:bg-[#e8a000]/30 overflow-x-hidden">
      <AnimatePresence>
        {registering && <RegisterModal t={registering} onClose={() => setRegistering(null)} />}
      </AnimatePresence>

      <PageHeader upcomingCount={tournaments.length} openCount={tournaments.filter(t => canRegisterTournament(t)).length} pastCount={pastTournaments.length} />

      <main className="max-w-7xl mx-auto px-6 lg:px-14 py-24 space-y-32">
        {/* Active Deployment Segment */}
        <section id="active" className="space-y-12">
           <div className="flex items-center justify-between">
              <div className="space-y-2">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-1 bg-[#e8a000]" />
                    <h2 className="text-[10px] font-black text-[#e8a000] uppercase tracking-[0.4em]">Featured</h2>
                 </div>
                 <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Open <span className="text-[#e8a000]">Tournaments</span></h2>
              </div>
              <div className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-[#555] uppercase tracking-widest flex items-center gap-2">
                 <Shield size={14} className="text-[#e8a000]" /> Botsville Secured
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3">
                 {featured && <FeaturedCard t={featured} onRegister={() => setRegistering(featured)} selectedHeroImage={selectedHeroImage} />}
              </div>
              <div className="lg:col-span-1 space-y-4 max-h-[700px] overflow-y-auto scrollbar-hide pr-2">
                 <p className="text-[9px] font-black text-[#333] uppercase tracking-[0.3em] px-2 mb-4">All Tournaments</p>
                 {tournaments.map(t => (
                   <SmallCard key={t.id} t={t} active={featured?.id === t.id} onSelect={() => setFeatured(t)} onRegister={() => setRegistering(t)} />
                 ))}
              </div>
           </div>
        </section>

        {/* Global History Segment */}
        <section id="past" className="space-y-12">
           <div className="flex items-center gap-3">
              <div className="w-10 h-1 bg-[#e8a000]" />
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Past <span className="text-[#e8a000]">Tournaments</span></h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {pastTournaments.length > 0 ? (
                pastTournaments.map(t => <PastCard key={t.id} t={t} />)
              ) : (
                <div className="col-span-full py-24 text-center border border-dashed border-white/10 rounded-[3rem]">
                   <Clock size={48} className="text-[#1a1a1a] mx-auto mb-6" />
                   <p className="text-[10px] font-black text-[#444] uppercase tracking-[0.3em]">No Historic Records Available</p>
                </div>
              )}
           </div>
        </section>
      </main>
    </div>
  );
}