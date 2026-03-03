'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
// import { motion, AnimatePresence, cubicBezier } from 'framer-motion';
import {
  Calendar, Clock, Trophy, ChevronRight, X,
  CheckCircle, AlertCircle, Swords, Lock, MapPin,
  Flame, ArrowRight, Zap,
} from 'lucide-react';

// const ease = cubicBezier(0.22, 1, 0.36, 1);

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

type TStatus = 'OPEN' | 'CLOSED' | 'UPCOMING' | 'COMPLETED';

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
  rules?: string[];
  season?: { id: string; name: string } | null;
};

type ApiResponse = {
  tournaments: Tournament[];
  pagination: { total: number; limit: number; skip: number };
};

type HeroCatalogItem = {
  key: string;
  imageUrl: string;
};

const canRegisterTournament = (tournament: Tournament): boolean => {
  const filled = tournament.filled || 0;
  const isFull = filled >= tournament.slots;
  const acceptsRegistrations = tournament.status === 'OPEN' || tournament.status === 'UPCOMING';
  const deadline = tournament.registrationDeadline ? new Date(tournament.registrationDeadline) : new Date(tournament.date);
  const beforeDeadline = Date.now() <= deadline.getTime();
  return acceptsRegistrations && beforeDeadline && !isFull;
};

// ── Utility to format date consistently (no SSR mismatch) ──
const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekday = days[dateObj.getDay()];
  const day = dateObj.getDate();
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${weekday} ${day} ${month} ${year}`;
};

// ── Countdown ─────────────────────────────────────────────────
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
  if (t.over) return <span className="text-[#e84040] text-[10px] font-black tracking-widest uppercase">Registration Closed</span>;
  return (
    <div className="flex items-end gap-1.5">
      {[{ v: t.d, l: 'Days' }, { v: t.h, l: 'Hrs' }, { v: t.m, l: 'Min' }, { v: t.s, l: 'Sec' }].map(({ v, l }, i) => (
        <React.Fragment key={l}>
          <div className="flex flex-col items-center bg-black/50 border border-white/10 px-2.5 py-1.5 min-w-[44px]">
            <span className="font-black text-2xl leading-none tabular-nums" style={{ color: displayColor, fontFamily: "'Barlow Condensed', sans-serif" }}>
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
    // Fetch user's teams
    const fetchTeams = async () => {
      try {
        const [teamResponse, registrationResponse] = await Promise.all([
          fetch('/api/my-team'),
          fetch(`/api/tournaments/${tournament.id}/register`),
        ]);

        const teamData = await teamResponse.json();
        const registrationData = await registrationResponse.json();

        if (!teamResponse.ok) {
          return;
        }

        if (teamData?.name && typeof teamData.name === 'string') {
          setRegisteredTeams([teamData.name]);
          setIsCaptain(Boolean(teamData.isCaptain));
          if (Boolean(teamData.isCaptain)) {
            setTeam(teamData.name);
          }
        }

        if (registrationResponse.ok && registrationData?.registered) {
          setAlreadyRegistered(true);
          if (registrationData?.registrationStatus) {
            setRegistrationStatus(String(registrationData.registrationStatus));
          }
        }
      } catch (error) {
        console.error('Failed to fetch user teams:', error);
      }
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
        setError(data?.error || 'Failed to register for tournament');
        setLoading(false);
        return;
      }

      setDone(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to register for tournament');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center"
      onClick={onClose}>
      <div
        className="relative w-full sm:max-w-lg bg-[#07070d] border-t sm:border overflow-hidden max-h-[94dvh] sm:max-h-[88vh] flex flex-col sm:mx-4"
        style={{ borderColor: `${(tournament.color || '#e8a000')}35` }}
        onClick={e => e.stopPropagation()}>

        <div className="relative h-40 sm:h-48 shrink-0 overflow-hidden">
          <Image src={tournament.banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1400&q=80'} alt="" fill className="object-cover brightness-20" />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at bottom left, ${(tournament.color || '#e8a000')}40, transparent 60%)` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(125deg, ${(tournament.color || '#e8a000')}18, transparent 50%)` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07070d] to-transparent" />
          <Scanlines />

          <div
            className="absolute bottom-0 right-4 h-[130%] w-28 sm:w-36 pointer-events-none select-none">
            <div className="relative w-full h-full">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-4 rounded-full"
                style={{
                  background: `radial-gradient(ellipse, ${(tournament.color || '#e8a000')}60 0%, transparent 70%)`,
                  filter: 'blur(6px)',
                }} />
              <Image src={tournament.heroImage || '/stunchou.png'} alt="" fill
                className="object-contain object-bottom drop-shadow-[0_0_24px_rgba(232,160,0,0.4)]" />
            </div>
          </div>

          <button onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 bg-black/70 border border-white/10 flex items-center justify-center text-[#555] hover:text-white transition-colors z-10">
            <X size={13} />
          </button>

          <div className="absolute bottom-3 left-4">
            <p className="text-[8px] tracking-[0.3em] uppercase font-black mb-0.5" style={{ color: `${(tournament.color || '#e8a000')}90` }}>Register Your Team</p>
            <h2 className="text-white font-black text-2xl uppercase leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {tournament.name}
            </h2>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 flex flex-col gap-5">
          {done && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="w-16 h-16 border-2 border-[#27ae60] flex items-center justify-center">
                <CheckCircle size={32} className="text-[#27ae60]" />
              </div>
              <div>
                <p className="text-white font-black text-2xl uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Squad Registered!</p>
                <p className="text-[#444] text-[11px] mt-1.5 tracking-wide leading-relaxed">
                  <span className="font-bold" style={{ color: (tournament.color || '#e8a000') }}>{team}</span> is now registered for {tournament.name}. Confirmation incoming.
                </p>
              </div>
              <button onClick={onClose}
                className="px-8 py-2.5 font-black text-[11px] tracking-[0.25em] uppercase bg-[#e8a000] text-black hover:bg-[#ffb800] transition-colors">
                Let&apos;s Go
              </button>
            </div>
          )}

          {!done && <>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Date',     val: new Date(tournament.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
                { label: 'Format',   val: tournament.format },
                { label: 'Location', val: tournament.location },
                { label: 'Slots',    val: `${tournament.filled || 0}/${tournament.slots} filled` },
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
                {registeredTeams.length > 0 ? registeredTeams.map(tm => (
                  <button key={tm} onClick={() => setTeam(tm)}
                    className="flex items-center justify-between px-3 py-2.5 border text-left transition-all duration-150 relative overflow-hidden group"
                    style={team === tm
                      ? { borderColor: `${(tournament.color || '#e8a000')}60`, background: `${(tournament.color || '#e8a000')}10` }
                      : { borderColor: 'rgba(255,255,255,0.06)', background: 'transparent' }
                    }>
                    {team !== tm && (
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: `linear-gradient(90deg, ${(tournament.color || '#e8a000')}08, transparent)` }} />
                    )}
                    <span className="font-black text-xs uppercase tracking-wide relative"
                      style={{ color: team === tm ? 'white' : '#555', fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {tm}
                    </span>
                    {team === tm && <CheckCircle size={12} style={{ color: (tournament.color || '#e8a000') }} />}
                  </button>
                )) : (
                  <div className="px-3 py-2.5 text-[11px] text-[#666]">No teams registered. <a href="/register-team" className="text-[#e8a000] hover:underline">Create one</a></div>
                )}
              </div>
              {registeredTeams.length > 0 && !isCaptain && (
                <p className="text-[10px] text-[#e84040] mt-2">Only team captains can register for tournaments.</p>
              )}
            </div>

            <div>
              <p className="text-[#444] text-[9px] tracking-[0.3em] uppercase font-black mb-2">Requirements</p>
              <div className="bg-white/[0.02] border border-white/[0.05] p-3 flex flex-col gap-1.5">
                {(tournament.rules && tournament.rules.length > 0) ? tournament.rules.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: (tournament.color || '#e8a000') }} />
                    <p className="text-[#555] text-[10px] tracking-wide">{r}</p>
                  </div>
                )) : (
                  <p className="text-[#555] text-[10px] tracking-wide">No specific rules listed.</p>
                )}
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div onClick={() => setAgreed(!agreed)}
                className="w-4 h-4 border shrink-0 mt-0.5 flex items-center justify-center transition-all cursor-pointer"
                style={agreed ? { borderColor: (tournament.color || '#e8a000'), background: (tournament.color || '#e8a000') } : { borderColor: '#2a2a2a' }}>
                {agreed && <CheckCircle size={10} className="text-black" />}
              </div>
              <span className="text-[#444] text-[10px] leading-relaxed tracking-wide group-hover:text-[#666] transition-colors">
                I am an authorised representative of this team and agree to Botsville tournament rules and MLBB community guidelines.
              </span>
            </label>

            <button
              onClick={submit} disabled={!canSubmit}
              className="relative w-full py-3 font-black text-[11px] tracking-[0.25em] uppercase overflow-hidden transition-all group disabled:opacity-30 disabled:cursor-not-allowed"
              style={canSubmit ? { background: (tournament.color || '#e8a000'), color: '#000' } : { background: '#111', color: '#333', border: '1px solid #222' }}>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-white/20 skew-x-12 transition-transform duration-500 pointer-events-none" />
              <span className="relative flex items-center justify-center gap-2">
                {loading
                  ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  : !team ? 'Select a team first'
                  : !isCaptain ? 'Captain required'
                  : alreadyRegistered ? 'Already registered'
                  : !agreed ? 'Agree to rules first'
                  : <><span>Lock In Your Squad</span><Zap size={12} /></>
                }
              </span>
            </button>

            {alreadyRegistered && (
              <div className="bg-[#e8a000]/10 border border-[#e8a000]/30 px-3 py-2 text-[#e8a000] text-[11px] tracking-wide">
                Your team is already registered{registrationStatus ? ` (${registrationStatus})` : ""}.
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 px-3 py-2 text-red-300 text-[11px] tracking-wide">
                {error}
              </div>
            )}
          </>}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// FEATURED HERO CARD
// ══════════════════════════════════════════════════════════
const FeaturedCard = ({
  t,
  onRegister,
  selectedHeroImage,
}: {
  t: Tournament;
  onRegister: () => void;
  selectedHeroImage?: string | null;
}) => {
  const color = t.color || '#e8a000';
  const filled = t.filled ?? 0;
  const slotsLeft = Math.max(t.slots - filled, 0);
  const isFull = filled >= t.slots;
  const isOpen = canRegisterTournament(t);
  const bannerSrc = t.banner && t.banner.trim().length > 0
    ? t.banner
    : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1400&q=80';
  const heroSrc = selectedHeroImage && selectedHeroImage.trim().length > 0
    ? selectedHeroImage
    : t.heroImage && t.heroImage.trim().length > 0
    ? t.heroImage
    : bannerSrc;

  return (
    <div
      className="relative w-full overflow-hidden bg-[#07070d] border border-white/[0.08]">

      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0">
          <Image src={bannerSrc} alt="" fill className="object-cover brightness-25" />
        </div>
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at bottom left, ${color}40, transparent 55%)` }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${color}18, transparent 50%)` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07070d]/95 via-[#07070d]/50 to-[#07070d]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070d] via-transparent to-[#07070d]/50" />
      </div>

      <div className="absolute top-0 bottom-0 left-[55%] w-px pointer-events-none hidden lg:block"
        style={{ background: `linear-gradient(to bottom, transparent, ${color}18, transparent)` }} />

      <Scanlines />

      <div
        className="absolute bottom-0 right-0 lg:right-[8%] h-[110%] w-[42%] sm:w-[36%] lg:w-[28%] pointer-events-none select-none z-10">
        <div className="relative w-full h-full">
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 h-8 rounded-full"
            style={{
              background: `radial-gradient(ellipse, ${color}60 0%, transparent 70%)`,
              filter: 'blur(10px)',
            }} />
          <Image src={heroSrc} alt="Tournament Hero" fill
            className="object-contain object-bottom drop-shadow-[0_0_48px_rgba(232,160,0,0.45)]" priority />
        </div>
      </div>

      <div className="relative z-20 px-6 sm:px-10 py-8 sm:py-12 flex flex-col gap-6 lg:max-w-[58%]">
        <div className="flex items-center gap-2 flex-wrap">
          {t.status === 'OPEN' && !isFull && (
            <span
              className="flex items-center gap-1.5 bg-black/60 border border-[#27ae60]/50 px-2.5 py-1 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#27ae60]" />
              <span className="text-[#27ae60] text-[9px] font-black tracking-widest uppercase">Registration Open</span>
            </span>
          )}
          {isFull && (
            <span className="flex items-center gap-1.5 bg-black/60 border border-[#e84040]/40 px-2.5 py-1">
              <Lock size={8} className="text-[#e84040]" /><span className="text-[#e84040] text-[9px] font-black tracking-widest uppercase">Full</span>
            </span>
          )}
          {t.status === 'UPCOMING' && !isOpen && (
            <span className="flex items-center gap-1.5 bg-black/60 border border-[#555]/40 px-2.5 py-1">
              <Clock size={8} className="text-[#555]" /><span className="text-[#555] text-[9px] font-black tracking-widest uppercase">Opens Soon</span>
            </span>
          )}
          {(t.tags || []).map(tag => (
            <span key={tag} className="text-[8px] font-black tracking-widest uppercase px-2 py-1"
              style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>{tag}</span>
          ))}
        </div>

        <div>
          <p className="text-[9px] tracking-[0.4em] uppercase font-black mb-2" style={{ color: `${color}90` }}>{t.subtitle}</p>
          <h2 className="font-black uppercase leading-none text-white"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', letterSpacing: '-0.02em' }}>
            {t.name}
          </h2>
          <div className="mt-3 h-0.5 w-24" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
          <p className="text-[#555] text-sm mt-3 leading-relaxed max-w-xs">{t.description}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          {[
            { icon: <Swords size={9} />, val: t.format },
            { icon: <MapPin size={9} />, val: t.location },
            { icon: <Calendar size={9} />, val: formatDate(t.date) },
          ].map(m => (
            <div key={m.val} className="flex items-center gap-2">
              <span style={{ color: `${color}80` }}>{m.icon}</span>
              <span className="text-[#666] text-[11px] tracking-wide">{m.val}</span>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[8px] tracking-[0.2em] uppercase text-[#333]">Slots Filled</span>
            <span className="text-[10px] font-black font-mono" style={{ color }}>{filled}/{t.slots}</span>
          </div>
          <div className="h-1 w-full max-w-xs bg-white/[0.06] overflow-hidden">
            <div className="h-full" style={{ background: color, width: `${Math.min((filled / t.slots) * 100, 100)}%` }} />
          </div>
        </div>

        <div>
          <p className="text-[8px] tracking-[0.25em] uppercase text-[#333] mb-2">Starts In</p>
          <CountdownDisplay target={t.date} color={color} />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={isOpen ? onRegister : undefined} disabled={!isOpen}
            className="relative overflow-hidden flex items-center gap-2 font-black text-[11px] tracking-[0.2em] uppercase px-6 py-3 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
            style={isOpen ? { background: '#e8a000', color: '#000' } : { border: '1px solid #222', color: '#333', background: 'transparent' }}>
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-white/25 skew-x-12 transition-transform duration-500 pointer-events-none" />
            <span className="relative">{isOpen ? 'Register Now' : (t.status === 'CLOSED' || isFull ? 'Registration Full' : 'Coming Soon')}</span>
            {isOpen && <ArrowRight size={13} className="relative" />}
          </button>
          {isOpen && (
            <span className="text-[#333] text-[9px] tracking-widest uppercase">
              {slotsLeft} slot{slotsLeft !== 1 ? 's' : ''} left
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Small sidebar card ────────────────────────────────────────
const SmallCard = ({ t, active, onSelect, onRegister, index }: {
  t: Tournament; active: boolean;
  onSelect: () => void; onRegister: () => void; index: number;
}) => {
  const color = t.color || '#e8a000';
  const filled = t.filled ?? 0;
  const isFull = filled >= t.slots;
  const isOpen = canRegisterTournament(t);
  const tick   = useCountdown(new Date(t.date));
  const bannerSrc = t.banner && t.banner.trim().length > 0
    ? t.banner
    : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80';

  return (
    <div
      onClick={onSelect}
      className="group relative cursor-pointer border overflow-hidden transition-all duration-300"
      style={{ borderColor: active ? `${color}50` : 'rgba(255,255,255,0.06)', background: active ? `${color}0a` : 'transparent' }}>
      <div className="absolute left-0 top-0 bottom-0 w-0.5 transition-all" style={{ background: active ? color : 'transparent' }} />

      <div className="relative h-16 overflow-hidden shrink-0">
        <Image src={bannerSrc} alt="" fill className="object-cover brightness-20 group-hover:brightness-30 transition-all duration-500" />
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at left, ${color}30, transparent 60%)` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#08080e]/90" />
        <div className="absolute top-2 right-2">
          {isOpen
            ? <div className="w-1.5 h-1.5 rounded-full bg-[#27ae60]" />
            : <div className="w-1.5 h-1.5 rounded-full bg-[#333]" />
          }
        </div>
        <div className="absolute bottom-1 right-2 pointer-events-none select-none">
          <span className="font-black text-3xl leading-none" style={{ color: `${color}0c`, fontFamily: "'Barlow Condensed', sans-serif" }}>
            {t.name.split(' ')[0]}
          </span>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2">
        <div>
          <p className="text-[7px] tracking-[0.3em] uppercase mb-0.5" style={{ color: `${color}70` }}>{t.subtitle}</p>
          <p className="text-white font-black text-sm uppercase leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{t.name}</p>
        </div>
        {!tick.over && (
          <div className="flex items-center gap-1.5">
            <Clock size={8} style={{ color: `${color}80` }} />
            <span className="text-[#444] text-[9px] font-mono">{tick.d}d {String(tick.h).padStart(2,'0')}h {String(tick.m).padStart(2,'0')}m</span>
          </div>
        )}
        <div className="h-0.5 w-full bg-white/[0.05]">
          <div className="h-full transition-all" style={{ width: `${Math.min((filled/t.slots)*100, 100)}%`, background: color }} />
        </div>
        <button
          onClick={e => { e.stopPropagation(); if (isOpen) onRegister(); }}
          disabled={!isOpen}
          className="w-full py-1.5 font-black text-[9px] tracking-[0.2em] uppercase border transition-all disabled:opacity-30"
          style={isOpen
            ? { borderColor: '#e8a000', color: '#000', background: '#e8a000' }
            : { borderColor: '#1a1a1a', color: '#333', background: 'transparent' }
          }>
          {isOpen ? 'Register →' : (t.status === 'CLOSED' || isFull ? 'Full' : 'Soon')}
        </button>
      </div>
    </div>
  );
};

// ── Past card ─────────────────────────────────────────────────
const PastCard = ({ t, index }: { t: Tournament; index: number }) => (
  <div
    className="group relative border border-white/[0.05] hover:border-white/[0.12] bg-[#09090f] overflow-hidden transition-all duration-300">
    <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: (t.color || '#e8a000') }} />
    <div className="relative h-32 overflow-hidden">
      <Image src={t.banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80'} alt="" fill className="object-cover brightness-25 group-hover:brightness-35 group-hover:scale-105 transition-all duration-500" />
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at bottom left, ${(t.color || '#e8a000')}35, transparent 60%)` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#09090f] to-transparent" />
      <Trophy size={18} className="absolute top-3 left-4" style={{ color: (t.color || '#e8a000') }} />
      <div className="absolute bottom-2 right-3 pointer-events-none select-none">
        <span className="font-black text-5xl leading-none" style={{ color: `${(t.color || '#e8a000')}0d`, fontFamily: "'Barlow Condensed', sans-serif" }}>
          {t.name.split(' ').slice(-1)[0]}
        </span>
      </div>
    </div>
    <div className="p-4">
      <p className="text-[8px] tracking-[0.3em] uppercase mb-0.5 text-[#333]">{new Date(t.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</p>
      <h3 className="text-white font-black text-2xl uppercase leading-none mb-3" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{t.name}</h3>
      <div className="h-px w-full bg-white/[0.04] mb-3" />
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#666] uppercase tracking-wide">Completed Tournament</span>
        <span className="px-2 py-1 bg-white/5 text-[#e8a000] text-[9px] font-black">View Details</span>
      </div>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════
// PAGE HEADER
// Large hero image dominates the right side like a background
// ══════════════════════════════════════════════════════════
const PageHeader = ({ upcomingCount = 0, openCount = 0, pastCount = 0 }: { upcomingCount?: number; openCount?: number; pastCount?: number }) => {
  return (
    <div className="relative overflow-hidden border-b border-white/[0.05]" style={{ minHeight: '420px' }}>

      {/* ── Dark bg + faint Ken Burns banner ── */}
      <div className="absolute inset-0">
        <div className="absolute inset-0">
          <Image src={'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&q=80'} alt="" fill className="object-cover brightness-[0.1]" />
        </div>
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
      <div
        className="absolute top-0 right-0 bottom-0 w-[62%] sm:w-[58%] lg:w-[52%] pointer-events-none select-none z-[2]"
      >
        <div className="absolute inset-0">
          <Image
            src="/heroes/brody.png"
            alt=""
            fill
            className="object-cover object-top"
            style={{ filter: 'drop-shadow(-50px 0 90px rgba(232,160,0,0.10))' }}
            priority
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-44 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 65% 100%, rgba(232,160,0,0.16) 0%, transparent 62%)',
            }}
          />
        </div>

        {/* Static Overlays (Do not float) — Ensure edges stay masked */}
        {/* Left-edge fade — key to blending into the text area */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080e] via-[#08080e]/40 to-transparent" />
        {/* Bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080e] via-transparent to-transparent" />
        {/* Top fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#08080e]/60 via-transparent to-transparent" />
      </div>

      {/* Hairline vertical accent at the image's left fade boundary */}
      <div className="hidden md:block absolute top-0 bottom-0 left-[44%] sm:left-[46%] lg:left-[50%] w-px pointer-events-none z-[3]"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(232,160,0,0.08), transparent)' }} />

      {/* ── Content — left side ── */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-14 sm:py-20 flex flex-col justify-center" style={{ minHeight: '420px' }}>
        <div className="max-w-lg">
          <div
            className="flex items-center gap-2 mb-4">
            <span className="w-6 h-0.5 bg-[#e8a000]" />
            <span className="text-[#e8a000] text-[9px] font-black tracking-[0.4em] uppercase">Ghana MLBB · Season 5</span>
          </div>

          <h1
            className="font-black uppercase leading-none text-white"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(3rem, 7vw, 5.5rem)', letterSpacing: '-0.02em' }}>
            TOURNAMENT<br />
            <span style={{ WebkitTextStroke: '2px #e8a000', color: 'transparent' }}>HUB</span>
          </h1>

          <p
            className="text-[#444] text-sm mt-4 tracking-wide leading-relaxed max-w-sm">
            Register · Compete · Champion ·{' '}
            <span className="font-bold" style={{ color: '#27ae60' }}>
              {openCount} open now
            </span>
          </p>

          {/* Quick stats */}
          <div
            className="flex items-center gap-8 mt-6">
            {[
              { label: 'Upcoming', val: upcomingCount,                                                color: '#e8a000' },
              { label: 'Open',     val: openCount, color: '#27ae60' },
              { label: 'Past',     val: pastCount,                                                        color: '#4a90d9' },
            ].map(s => (
              <div key={s.label} className="flex flex-col gap-0.5">
                <span className="font-black text-3xl font-mono leading-none"
                  style={{ color: s.color, fontFamily: "'Barlow Condensed', sans-serif" }}>{s.val}</span>
                <span className="text-[#2a2a2a] text-[8px] tracking-[0.2em] uppercase">{s.label}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div
            className="flex gap-3 mt-8 flex-wrap">
            <a href="#upcoming"
              className="relative overflow-hidden flex items-center gap-2 border border-[#e8a000] text-[#e8a000] font-black uppercase tracking-[0.15em] px-5 py-2.5 text-[11px] group transition-colors duration-300 hover:scale-[1.04] active:scale-[0.97]">
              <span className="absolute inset-0 bg-[#e8a000] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 group-hover:text-black transition-colors duration-300">Browse Tournaments</span>
              <ChevronRight size={12} className="relative z-10 group-hover:text-black transition-colors duration-300" />
            </a>
            <a href="#past"
              className="text-[#444] hover:text-white font-black uppercase tracking-widest px-4 py-2.5 text-[11px] transition-colors">
              Past Results →
            </a>
          </div>
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
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [pastTournaments, setPastTournaments] = useState<Tournament[]>([]);
  const [featured, setFeatured] = useState<Tournament | null>(null);
  const [registering, setRegistering] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHeroImage, setSelectedHeroImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSelectedHeroImage = async () => {
      try {
        const [catalogResponse, profileResponse] = await Promise.all([
          fetch('/api/heroes/catalog', { cache: 'no-store' }),
          fetch('/api/users/profile', { cache: 'no-store' }),
        ]);

        if (!catalogResponse.ok || !profileResponse.ok) {
          return;
        }

        const [catalogData, profileData] = await Promise.all([
          catalogResponse.json(),
          profileResponse.json(),
        ]);

        const heroes: HeroCatalogItem[] = Array.isArray(catalogData?.heroes) ? catalogData.heroes : [];
        const favoriteHeroKey = typeof profileData?.favoriteHero === 'string' ? profileData.favoriteHero : null;

        if (!favoriteHeroKey || heroes.length === 0) {
          return;
        }

        const selected = heroes.find((hero) => hero.key === favoriteHeroKey);
        if (selected?.imageUrl) {
          setSelectedHeroImage(selected.imageUrl);
        }
      } catch (error) {
        console.error('Failed to fetch selected hero image:', error);
      }
    };

    fetchSelectedHeroImage();
  }, []);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch('/api/tournaments?limit=100');
        const data: ApiResponse = await response.json();
        
        if (data.tournaments && Array.isArray(data.tournaments)) {
          const upcoming = data.tournaments.filter(t => ['OPEN', 'UPCOMING'].includes(t.status));
          const past = data.tournaments.filter(t => t.status === 'COMPLETED');
          
          setTournaments(upcoming);
          setPastTournaments(past);
          
          if (upcoming.length > 0) {
            setFeatured(upcoming[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch tournaments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&display=swap');
        ::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>

      <main className="min-h-screen bg-[#08080e]">
        <PageHeader 
          upcomingCount={tournaments.length} 
          openCount={tournaments.filter((t) => canRegisterTournament(t)).length}
          pastCount={pastTournaments.length}
        />

        {/* ── UPCOMING ── */}
        <div id="upcoming" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div
            className="flex items-center gap-3 mb-8">
            <Flame size={14} className="text-[#e8a000]" />
            <span className="text-[#e8a000] text-[9px] font-black tracking-[0.4em] uppercase">Upcoming Tournaments</span>
            <div className="flex-1 h-px bg-white/[0.04]" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-[#e8a000]/20 border-t-[#e8a000] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[#666] text-sm tracking-wide uppercase">Loading tournaments...</p>
              </div>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#666] text-sm tracking-wide uppercase">No upcoming tournaments at this time.</p>
            </div>
          ) : (
            <>
              {/* Desktop: featured + sidebar */}
              <div className="hidden lg:grid grid-cols-[1fr_280px] xl:grid-cols-[1fr_320px] gap-4">
                {featured && (
                  <FeaturedCard
                    t={featured}
                    onRegister={() => setRegistering(featured)}
                    selectedHeroImage={selectedHeroImage}
                  />
                )}
                <div className="flex flex-col gap-2">
                  {tournaments.map((t, i) => (
                    <SmallCard key={t.id} t={t} index={i}
                      active={featured?.id === t.id}
                      onSelect={() => setFeatured(t)}
                      onRegister={() => setRegistering(t)} />
                  ))}
                </div>
              </div>

              {/* Mobile/tablet */}
              <div className="lg:hidden flex flex-col gap-4">
                {tournaments.map((t, i) => (
                  <FeaturedCard
                    key={t.id}
                    t={t}
                    onRegister={() => setRegistering(t)}
                    selectedHeroImage={selectedHeroImage}
                  />
                ))}
              </div>
            </>
          )}

          <div className="mt-8 border border-[#e8a000]/15 bg-[#e8a000]/[0.04] px-4 py-3 flex items-start gap-3">
            <AlertCircle size={13} className="text-[#e8a000] shrink-0 mt-0.5" />
            <p className="text-[#555] text-[11px] leading-relaxed tracking-wide">
              Team must have minimum 5 active players on Botsville platform. Registrations reviewed within 24h. Contact admins via Discord for disputes.
            </p>
          </div>
        </div>

        {/* ── PAST ── */}
        {pastTournaments.length > 0 && (
          <div id="past" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
            <div className="border-t border-white/[0.04] pt-10 mb-8">
              <div className="flex items-center gap-3">
                <Trophy size={14} className="text-[#e8a000]" />
                <span className="text-[#e8a000] text-[9px] font-black tracking-[0.4em] uppercase">Past Results</span>
                <div className="flex-1 h-px bg-white/[0.04]" />
                <span className="text-[#222] text-[9px] tracking-widest uppercase">{pastTournaments.length} completed</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastTournaments.map((t, i) => <PastCard key={t.id} t={t} index={i} />)}
            </div>

            <div className="mt-8 flex items-center justify-between border border-white/[0.04] px-4 py-3">
              <p className="text-[#222] text-[10px] tracking-widest uppercase">Full bracket history & VODs available on request</p>
              <ChevronRight size={11} className="text-[#222]" />
            </div>
          </div>
        )}

        {/* AnimatePresence removed for static rendering */}
          {registering && <RegisterModal t={registering} onClose={() => setRegistering(null)} />}
        {/* AnimatePresence removed for static rendering */}
      </main>
    </>
  );
}