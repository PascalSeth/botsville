'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar, MapPin, Trophy, Users, ChevronRight,
  Swords, Medal, Zap, AlertCircle,
  Share2, Heart, Loader2, Clock, 
  ChevronLeft, Layout, Shield, Target,
  Lock, ArrowRight, CheckCircle, X, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

type Standing = {
  rank: number;
  team: { id: string; name: string; tag: string; logo: string | null };
  wins: number;
  losses: number;
  points: number;
};

type TournamentRegistration = {
  id: string;
  seed: number | null;
  team: {
    id: string;
    name: string;
    tag: string;
    logo: string | null;
  };
};

type TournamentGroupTeam = {
  id: string;
  team: {
    id: string;
    name: string;
    tag: string;
    logo: string | null;
  };
};

type TournamentGroup = {
  id: string;
  name: string;
  teams: TournamentGroupTeam[];
};

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
  status: string;
  season?: { id: string; name: string } | null;
  image: string | null;
  banner?: string | null;
  heroImage?: string | null;
  prizePool?: string | null;
  rules?: string[];
  color?: string | null;
  registrations?: TournamentRegistration[];
  groups?: TournamentGroup[];
};

// Premium Glass Card Component
const GlassCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors shadow-2xl ${className}`}
  >
    {children}
  </motion.div>
);

const Scanlines = ({ opacity = 0.025 }: { opacity?: number }) => (
  <div className="absolute inset-0 pointer-events-none z-[1]"
    style={{ opacity, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,#fff 2px,#fff 3px)', backgroundSize: '100% 3px' }} />
);

// ── Registration modal ────────────────────────────────────────
const RegisterModal = ({ t: tournament, onClose }: { t: Tournament; onClose: () => void }) => {
  interface Player {
    role: string;
  }
  interface TeamData {
    name: string;
    logo: string | null;
    banner: string | null;
    isCaptain: boolean;
    players: Player[];
  }

  const [team,    setTeam]    = useState<string | null>(null);
  const [agreed,  setAgreed]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [isCaptain, setIsCaptain] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [registeredTeams, setRegisteredTeams] = useState<string[]>([]);
  const [teamData, setTeamData] = useState<TeamData | null>(null);

  useEffect(() => {
    // Fetch user's teams
    const fetchTeams = async () => {
      try {
        const [teamResponse, registrationResponse] = await Promise.all([
          fetch('/api/my-team'),
          fetch(`/api/tournaments/${tournament.id}/register`),
        ]);

        const teamJson = await teamResponse.json();
        const registrationData = await registrationResponse.json();

        if (teamResponse.ok && teamJson) {
          setTeamData(teamJson as TeamData);
          setRegisteredTeams([teamJson.name]);
          setIsCaptain(Boolean(teamJson.isCaptain));
          if (Boolean(teamJson.isCaptain)) {
            setTeam(teamJson.name);
          }
        }

        if (registrationResponse.ok && registrationData?.registered) {
          setAlreadyRegistered(true);
          if (registrationData?.registrationStatus) {
            setRegistrationStatus(String(registrationData.registrationStatus));
          }
        }
      } catch (e) {
        console.error("Fetch registration data error:", e);
      }
    };
    fetchTeams();
  }, [tournament.id]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Eligibility Checks
  const hasMinPlayers = (teamData?.players?.length || 0) >= 5;
  const roles = teamData?.players?.map((p: Player) => p.role) || [];
  const requiredRolesList = ['EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM'];
  const hasAllRoles = requiredRolesList.every(r => roles.includes(r));
  const hasBranding = Boolean(teamData?.logo && teamData?.banner);
  const isEligible = isCaptain && hasMinPlayers && hasAllRoles && hasBranding;

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

  const accentColor = tournament.color || '#e8a000';

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl bg-[#07070d] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-48 shrink-0 overflow-hidden">
          <img src={tournament.banner || tournament.image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80'} alt="" className="w-full h-full object-cover brightness-[0.2]" />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at bottom left, ${accentColor}40, transparent 60%)` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07070d] via-transparent to-transparent" />
          <Scanlines />
          
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-xl bg-black/50 border border-white/10 text-white hover:bg-white/10 transition-colors z-10"><X size={18} /></button>

          <div className="absolute bottom-6 left-8">
            <p className="text-[10px] tracking-[0.3em] uppercase font-black mb-2" style={{ color: accentColor }}>Register Team</p>
            <h2 className="text-white font-black text-3xl uppercase leading-none tracking-tighter">
              {tournament.name}
            </h2>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-8 space-y-8 scrollbar-hide">
          {done ? (
            <div className="flex flex-col items-center gap-6 py-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle size={40} className="text-emerald-400" />
              </div>
              <div className="space-y-2">
                <p className="text-white font-black text-3xl uppercase tracking-tighter">Registration Successful!</p>
                <p className="text-[#555] text-xs font-medium max-w-xs leading-relaxed">
                  <span className="text-white font-black">{team}</span> has been successfully registered for <span className="text-white font-black">{tournament.name}</span>.
                </p>
              </div>
              <button onClick={onClose} className="px-12 py-4 bg-[#e8a000] text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#ffb800] transition-all">Done</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Start Date', val: new Date(tournament.date).toLocaleDateString(), icon: Calendar },
                  { label: 'Location', val: tournament.location || 'Online', icon: MapPin },
                  { label: 'Format', val: tournament.format.replace(/_/g, ' '), icon: Swords },
                  { label: 'Teams', val: `${tournament.filled || 0}/${tournament.slots}`, icon: Users },
                ].map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="bg-white/[0.03] border border-white/[0.05] p-4 rounded-2xl">
                      <div className="flex items-center gap-2 mb-1.5 opacity-40">
                        <Icon size={12} className="text-[#e8a000]" />
                        <p className="text-[8px] tracking-widest uppercase font-black">{s.label}</p>
                      </div>
                      <p className="text-white text-[11px] font-black uppercase tracking-wide">{s.val}</p>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#555] block">Select Your Team</label>
                {registeredTeams.length > 0 ? (
                  <div className="space-y-2">
                    {registeredTeams.map(tm => (
                      <button key={tm} onClick={() => setTeam(tm)} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        team === tm ? 'bg-[#e8a000]/10 border-[#e8a000] text-white' : 'bg-white/[0.02] border-white/5 text-[#555] hover:bg-white/[0.05]'
                      }`}>
                        <div className="flex items-center gap-4">
                           <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-1">
                              {teamData?.logo ? <img src={teamData.logo} alt="" className="w-full h-full object-contain" /> : <Shield size={14} className="opacity-20" />}
                           </div>
                           <span className="font-black text-[11px] uppercase tracking-widest">{tm}</span>
                        </div>
                        {team === tm && <CheckCircle size={14} className="text-[#e8a000]" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center">
                    <p className="text-[10px] text-[#555] font-black uppercase tracking-widest mb-4">No Teams Found</p>
                    <Link href="/register-team" className="text-[#e8a000] text-[10px] font-black uppercase tracking-widest hover:underline">Create a Team →</Link>
                  </div>
                )}
              </div>

              {/* Eligibility Checklist */}
              {team && !alreadyRegistered && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#555] block">Eligibility Requirements</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Captain Authority', met: isCaptain, sub: 'Team owner permission' },
                      { label: 'Active Personnel', met: hasMinPlayers, sub: 'Min 5 players required' },
                      { label: 'Role Coverage', met: hasAllRoles, sub: 'All 5 roles occupied' },
                      { label: 'Visual Identity', met: hasBranding, sub: 'Logo & Banner uploaded' },
                    ].map((cond, i) => (
                      <div key={i} className={`p-4 rounded-2xl border transition-all ${cond.met ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                         <div className="flex items-center justify-between mb-1">
                            <p className={`text-[9px] font-black uppercase tracking-wider ${cond.met ? 'text-emerald-400' : 'text-red-400/80'}`}>{cond.label}</p>
                            {cond.met ? <CheckCircle size={12} className="text-emerald-400" /> : <AlertCircle size={12} className="text-red-400/50" />}
                         </div>
                         <p className="text-[8px] text-[#555] uppercase tracking-tighter">{cond.sub}</p>
                      </div>
                    ))}
                  </div>
                  {!isEligible && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                       <Zap size={14} className="text-[#e8a000] mt-0.5" />
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-white uppercase tracking-widest leading-tight">Requirement Unmet</p>
                          <p className="text-[8px] text-white/40 uppercase leading-relaxed">Ensure your team has a full roster and branding in the <Link href="/dashboard/my-team" className="text-[#e8a000] hover:underline">Team Dashboard</Link>.</p>
                       </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#555] block">Tournament Rules</label>
                 <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                   {(tournament.rules && tournament.rules.length > 0) ? tournament.rules.map((r, i) => (
                     <div key={i} className="flex gap-3 text-[10px] text-[#777] leading-relaxed">
                        <span className="text-[#e8a000]">•</span>
                        <p>{r}</p>
                     </div>
                   )) : <p className="text-[10px] text-[#444] italic">No specific rules listed.</p>}
                 </div>
              </div>

              <div className="space-y-6">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div onClick={() => setAgreed(!agreed)} className={`w-5 h-5 rounded-lg border shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                    agreed ? 'bg-[#e8a000] border-[#e8a000]' : 'border-white/10 group-hover:border-white/20'
                  }`}>
                    {agreed && <CheckCircle size={12} className="text-black" />}
                  </div>
                  <span className="text-[#555] text-[10px] leading-relaxed font-medium group-hover:text-[#777] transition-colors">
                    I agree to the tournament rules and community guidelines.
                  </span>
                </label>

                <button 
                  onClick={submit} 
                  disabled={!canSubmit || !isEligible} 
                  className="w-full py-5 bg-[#e8a000] text-black font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-[#ffb800] transition-all disabled:opacity-20 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(232,160,0,0.1)] active:scale-[0.98]"
                >
                   {loading ? <Loader2 size={16} className="animate-spin" /> : <><Shield size={16} /> Finalize Registration</>}
                </button>
              </div>

              {alreadyRegistered && (
                <div className="p-4 rounded-2xl bg-[#e8a000]/10 border border-[#e8a000]/30 text-[#e8a000] text-[9px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-3">
                  <CheckCircle size={14} /> You are already registered
                </div>
              )}

              {error && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-3">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
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

const getRegistrationStatus = (tournament: Tournament): { canRegister: boolean; label: string; color: string } => {
  const filled = tournament.filled || 0;
  const isFull = filled >= tournament.slots;
  const deadlineDate = tournament.registrationDeadline ? new Date(tournament.registrationDeadline) : new Date(tournament.date);
  const isPastDeadline = Date.now() > deadlineDate.getTime();

  if (tournament.status === 'COMPLETED') return { canRegister: false, label: 'Tournament Completed', color: 'text-gray-500 border-gray-500/30 bg-gray-500/10' };
  if (isFull) return { canRegister: false, label: 'Tournament Full', color: 'text-red-500 border-red-500/30 bg-red-500/10' };
  if (isPastDeadline) return { canRegister: false, label: 'Registration Closed', color: 'text-red-500 border-red-500/30 bg-red-500/10' };

  return { canRegister: true, label: 'Registration Open', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
};

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

// ── Competition Brief Component ────────────────────────────────
const CompetitionBrief = ({ delay = 0.4 }: { delay?: number }) => {
  const sections = [
    {
      title: 'Tournament Logistics',
      icon: Clock,
      items: [
        { label: 'Duration', val: '2 Weeks', sub: 'Intensity period' },
        { label: 'Match Days', val: 'Fri • Sat • Sun', sub: 'Weekend focus' },
        { label: 'Total Play Days', val: '6 Days', sub: 'Total engagement' },
      ]
    },
    {
      title: 'Tournament Format',
      icon: Layout,
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[#e8a000] text-[10px] font-black uppercase tracking-widest mb-2">Stage 1: Group Stage</p>
            <p className="text-white text-xs font-bold uppercase mb-2">Single Round Robin</p>
            <p className="text-white/50 text-[10px] leading-relaxed">All 8 teams play each other once. Guarantees equal evaluation opportunities and fair scouting data.</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[#e8a000] text-[10px] font-black uppercase tracking-widest mb-2">Stage 2: Playoffs</p>
            <p className="text-white text-xs font-bold uppercase mb-2">Single Elimination</p>
            <p className="text-white/50 text-[10px] leading-relaxed">Top 4 teams advance to the final showdown on Sunday.</p>
          </div>
        </div>
      )
    },
    {
      title: 'Match Specifications',
      icon: Target,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p className="text-white text-xs font-bold uppercase">Standard Matches</p>
              <p className="text-white/40 text-[9px] uppercase tracking-widest mt-1">Best of 3 (BO3)</p>
            </div>
            <Swords size={20} className="text-[#e8a000]" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#e8a000]/10 border border-[#e8a000]/30">
            <div>
              <p className="text-[#e8a000] text-xs font-bold uppercase">Grand Final</p>
              <p className="text-[#e8a000]/60 text-[9px] uppercase tracking-widest mt-1">Best of 5 (BO5)</p>
            </div>
            <Trophy size={20} className="text-[#e8a000]" />
          </div>
          <p className="text-[9px] text-white/30 italic px-2">BO3 allows for tactical adaptation and visible draft understanding for scouts.</p>
        </div>
      )
    },
    {
      title: 'Points & Rankings',
      icon: Medal,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
             <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-emerald-400 text-[10px] font-black uppercase">2-0 WIN: 3 PTS</p>
             </div>
             <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                <p className="text-emerald-300/80 text-[10px] font-black uppercase">2-1 WIN: 2 PTS</p>
             </div>
             <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-center">
                <p className="text-red-400/80 text-[10px] font-black uppercase">1-2 LOSS: 1 PT</p>
             </div>
             <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-center">
                <p className="text-red-400 text-[10px] font-black uppercase">0-2 LOSS: 0 PT</p>
             </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-[#555] uppercase tracking-widest px-1">Tie-Breakers</p>
            <div className="space-y-1">
              {['Head-to-head result', 'Game difference (W-L)', 'Total game wins'].map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] text-white/40 px-2 font-medium">
                   <span className="text-[#e8a000]">{i+1}.</span> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div id="brief" className="space-y-8 scroll-mt-24">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((s, i) => {
            const Icon = s.icon;
            return (
              <GlassCard key={i} delay={delay + (i * 0.1)}>
                 <div className="flex items-center gap-3 mb-6">
                   <div className="p-2 rounded-lg bg-[#e8a000]/10 text-[#e8a000]"><Icon size={18} /></div>
                   <h3 className="text-xs font-black text-white uppercase tracking-widest">{s.title}</h3>
                 </div>
                 {s.items ? (
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     {s.items.map((item, idx) => (
                       <div key={idx} className="space-y-1">
                          <p className="text-[8px] font-black text-[#555] uppercase tracking-widest">{item.label}</p>
                          <p className="text-xs font-black text-white uppercase">{item.val}</p>
                          <p className="text-[7px] text-white/30 uppercase tracking-tighter">{item.sub}</p>
                       </div>
                     ))}
                   </div>
                 ) : s.content}
              </GlassCard>
            );
          })}
       </div>

       <GlassCard delay={delay + 0.4}>
          <div className="flex items-center gap-3 mb-8">
             <div className="p-2 rounded-lg bg-[#e8a000]/10 text-[#e8a000]"><Calendar size={18} /></div>
             <h3 className="text-xs font-black text-white uppercase tracking-widest">Weekly Schedule Structure</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
             <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                   <p className="text-sm font-black text-white uppercase tracking-tighter">PHASE 1: Round Robin (Selection)</p>
                   <span className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-black text-white/40 uppercase tracking-widest">55 Matches</span>
                </div>
                <div className="space-y-6">
                   <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                      <p className="text-[10px] font-black text-[#e8a000] uppercase tracking-[0.2em]">WEEK 1 (Days 1–5)</p>
                      <p className="text-[11px] text-white/60 leading-relaxed uppercase">The initial evaluation surge. Matches 1–30 establish the foundational rankings for all 11 competing factions.</p>
                   </div>
                   <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                      <p className="text-[10px] font-black text-[#e8a000] uppercase tracking-[0.2em]">WEEK 2 (Days 6–9)</p>
                      <p className="text-[11px] text-white/60 leading-relaxed uppercase">Round Robin conclusion. Mid-week determination of the Elite Top 4 contenders.</p>
                   </div>
                </div>
             </div>

             <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                   <p className="text-sm font-black text-white uppercase tracking-tighter">PHASE 2: The Semi-Finals & Grand Final</p>
                   <span className="px-3 py-1 bg-[#e8a000]/20 rounded-lg text-[9px] font-black text-[#e8a000] uppercase tracking-widest">Day 10</span>
                </div>
                <div className="p-6 rounded-2xl bg-linear-to-br from-[#e8a000]/10 to-transparent border border-[#e8a000]/30 space-y-6 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Trophy size={48} />
                   </div>
                   <p className="text-sm font-black text-white uppercase tracking-tighter pt-2">THE CHAMPIONSHIP SUNDAY</p>
                   <div className="space-y-3">
                      {['SEMI-FINAL 1', 'SEMI-FINAL 2', 'GRAND FINAL'].map((stage, i) => (
                        <div key={stage} className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-[#e8a000]">
                           <span className="w-1.5 h-1.5 rounded-full bg-[#e8a000]" />
                           {stage}
                        </div>
                      ))}
                   </div>
                   <p className="text-[9px] text-[#e8a000]/60 uppercase tracking-widest leading-relaxed">Top 4 factions engage in a single-elimination gauntlet to determine the National Representatives.</p>
                </div>
             </div>
          </div>
       </GlassCard>
    </div>
  );
};

// ── Registered Teams Component ────────────────────────────────
const RegisteredTeams = ({ registrations = [], slots = 0, accentColor = '#e8a000', delay = 0.4 }: { registrations?: TournamentRegistration[]; slots?: number; accentColor?: string; delay?: number }) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: delay }
    }
  };

  const item = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, damping: 20 } }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 rounded-full bg-linear-to-b from-[#ff4b2b] via-[#e8a000] to-[rgb(16,185,129)]" />
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Contending <span style={{ color: accentColor }}>National Factions</span></h2>
            <p className="text-[10px] font-black text-[#555] uppercase tracking-widest mt-1">THE TOP 4 ADVANCE TO THE PLAYOFFS</p>
          </div>
        </div>
      </div>

      {registrations.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
          <Users size={40} className="mx-auto text-white/10 mb-4" />
          <p className="text-[10px] font-black uppercase text-[#333] tracking-[0.3em]">No Combatants Registered Yet</p>
        </div>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        >
          {registrations.map((reg, idx) => (
            <motion.div 
              key={reg.id}
              variants={item}
              className="group relative"
            >
              <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500 blur-sm" style={{ background: `linear-gradient(45deg, ${accentColor}40, transparent, ${accentColor}20)` }} />
              <div className={`relative aspect-square rounded-2xl bg-white/[0.03] border p-4 flex flex-col items-center justify-center text-center overflow-hidden hover:border-white/20 transition-all group ${
                idx < 4 ? 'border-[#e8a000]/30 shadow-[0_0_20px_rgba(232,160,0,0.05)]' : 'border-white/10 opacity-60 grayscale-[0.5]'
              }`}>
                <div className="absolute top-2 right-3 text-[10px] font-black text-white/5 group-hover:text-white/20 transition-colors font-mono tracking-tighter">
                   {idx < 4 ? 'QUALIFIED' : `#${String(reg.seed || idx + 1).padStart(2, '0')}`}
                </div>
                
                <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/5 p-2 mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-2xl">
                  {reg.team.logo ? (
                    <img src={reg.team.logo} alt={reg.team.name} className="w-full h-full object-contain" />
                  ) : (
                    <Shield size={24} className="text-white/10 group-hover:text-[#e8a000]/30 transition-colors" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <p className="text-[11px] font-black text-white uppercase truncate max-w-full px-2 group-hover:text-[#e8a000] transition-colors">{reg.team.name}</p>
                  <p className="text-[9px] font-black text-[#444] uppercase tracking-widest">{reg.team.tag}</p>
                </div>

                {/* Shimmer Effect */}
                <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-linear-to-r from-transparent via-white/[0.05] to-transparent pointer-events-none" />
              </div>
            </motion.div>
          ))}

          {/* Empty Slots */}
          {Array.from({ length: Math.max(0, slots - registrations.length) }).slice(0, 5).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square rounded-2xl bg-white/[0.01] border border-dashed border-white/5 flex items-center justify-center opacity-40">
               <div className="w-8 h-8 rounded-lg border border-white/5 border-dashed flex items-center justify-center">
                  <Plus size={16} className="text-white/5" />
               </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

// ── Groups Section ───────────────────────────────────────────
const GroupsSection = ({ groups = [], accentColor = '#e8a000', delay = 0.4 }: { groups?: TournamentGroup[]; accentColor?: string; delay?: number }) => {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-4">
        <div className="w-1.5 h-8 rounded-full bg-[#e8a000] shadow-[0_0_15px_#e8a00050]" />
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Faction <span style={{ color: accentColor }}>Distribution</span></h2>
          <p className="text-[10px] font-black text-[#666] uppercase tracking-[0.3em] mt-1">Official Group Seeding</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
        {groups.map((group, gIdx) => (
          <motion.div 
            key={group.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + (gIdx * 0.1) }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
               <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#e8a000]" />
                  <span className="text-sm font-black text-white uppercase tracking-widest">{group.name}</span>
               </div>
               <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{group.teams.length} Teams</span>
            </div>

            <div className="space-y-1">
              {group.teams.map((gt) => (
                <div key={gt.id} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/5">
                   <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 p-1.5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-500">
                      {gt.team.logo ? (
                        <img src={gt.team.logo} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <Shield size={16} className="text-white/10" />
                      )}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-black text-white/80 uppercase truncate group-hover:text-white transition-colors">{gt.team.name}</p>
                        <span className="text-[9px] font-mono text-[#e8a000]/50 group-hover:text-[#e8a000] transition-colors">[{gt.team.tag}]</span>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default function TournamentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/tournaments/${slug}`);
        if (!response.ok) throw new Error('Tournament not found');
        const data = await response.json();
        setTournament(data);
        try {
          const standingsRes = await fetch(`/api/tournaments/${data.id}/standings`);
          if (standingsRes.ok) {
            const standingsData = await standingsRes.json();
            setStandings(standingsData?.standings || []);
          }
        } catch {}
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tournament');
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#05050a] gap-4">
        <Loader2 size={32} className="animate-spin text-[#e8a000]" />
        <p className="text-[10px] font-black uppercase text-[#444] tracking-[0.4em]">Loading Details...</p>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05050a] p-12">
        <div className="text-center space-y-6">
          <AlertCircle size={48} className="mx-auto text-red-500/50" />
          <p className="text-white text-3xl font-black uppercase tracking-tighter">{error || 'Archive Not Found'}</p>
          <Link href="/tournaments" className="inline-block px-8 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">
            Return to Registry
          </Link>
        </div>
      </div>
    );
  }

  const isLive = tournament.status === 'LIVE' || tournament.status === 'ONGOING';
  const isCompleted = tournament.status === 'COMPLETED';
  const regStatus = getRegistrationStatus(tournament);

  return (
    <div className="min-h-screen bg-[#05050a] selection:bg-[#e8a000]/30 pb-20">
      <AnimatePresence>
        {showRegisterModal && <RegisterModal t={tournament} onClose={() => setShowRegisterModal(false)} />}
      </AnimatePresence>

      {/* Hero Header */}
      <div className="relative h-[500px] w-full overflow-hidden">
        { (tournament.banner || tournament.image) ? (
          <img src={tournament.banner || tournament.image || ''} alt="" className="w-full h-full object-cover opacity-40 blur-[2px] transition-all duration-1000" />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-[#1a1a2e] to-[#05050a]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-[#05050a]/80 to-transparent" />
        <Scanlines />
        
        <div className="absolute inset-x-0 bottom-0 max-w-6xl mx-auto px-6 pb-16 flex flex-col justify-end">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <Link href="/tournaments" className="group inline-flex items-center gap-3 text-[#e8a000] text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:gap-4">
                <ChevronLeft size={16} /> All Tournaments
              </Link>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${
                    isLive ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                    isCompleted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                    'bg-[#e8a000]/10 border-[#e8a000]/30 text-[#e8a000]'
                  }`}>
                    {tournament.status}
                  </div>
                  <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
                     <Trophy size={14} className="text-[#e8a000]" />
                     {tournament.format.replace(/_/g, ' ')}
                  </div>
                </div>
                <h1 className="text-7xl font-black text-white uppercase tracking-tighter leading-[0.9]">{tournament.name}</h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-8">
                  {tournament.subtitle && <p className="text-white/50 text-xl font-medium tracking-wide max-w-2xl">{tournament.subtitle}</p>}
                  {!isCompleted && !isLive && (
                    <div className="space-y-2">
                       <p className="text-[9px] font-black text-[#555] uppercase tracking-[0.2em]">Registration Ends In</p>
                       <CountdownDisplay target={tournament.registrationDeadline || tournament.date} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                 <button 
                   onClick={() => setShowRegisterModal(true)}
                   disabled={!regStatus.canRegister}
                   className="px-10 py-5 bg-[#e8a000] text-black font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-[#ffb800] transition-all shadow-2xl shadow-[#e8a000]/20 flex items-center gap-3 active:scale-[0.98] disabled:opacity-20"
                 >
                   {regStatus.canRegister ? <><Zap size={16} /> Register Now</> : <><Lock size={16} /> {regStatus.label}</>}
                 </button>
                 <button className="px-10 py-5 bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-white/10 transition-all flex items-center gap-3">
                   <Share2 size={16} className="text-[#e8a000]" /> Share
                 </button>
              </div>
           </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-10 relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Core Specifications */}
        <div className="lg:col-span-1 space-y-8">
           <GlassCard delay={0.2}>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-6 bg-[#e8a000] rounded-full" />
                <h2 className="text-xs font-black text-white uppercase tracking-widest leading-none">Tournament Details</h2>
              </div>
              <div className="space-y-6">
                 {[
                   { label: 'Start Date', val: new Date(tournament.date).toLocaleString(), icon: Calendar },
                   { label: 'Location', val: tournament.location || 'Online', icon: MapPin },
                   { label: 'Team Limit', val: `${tournament.slots} Teams`, icon: Users },
                   { label: 'Prize Pool', val: tournament.prizePool || 'TBA', icon: Trophy }
                 ].map((item, i) => {
                   const Icon = item.icon;
                   return (
                     <div key={i} className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-white/5 text-[#e8a000]"><Icon size={18} /></div>
                        <div>
                          <p className="text-[9px] font-black text-[#555] uppercase tracking-wider mb-1">{item.label}</p>
                          <p className="text-sm font-bold text-white uppercase tracking-wide">{item.val}</p>
                        </div>
                     </div>
                   );
                 })}
              </div>
           </GlassCard>

           {tournament.description && (
             <GlassCard delay={0.3}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-6 bg-[#e8a000] rounded-full" />
                  <h2 className="text-xs font-black text-white uppercase tracking-widest leading-none">Tournament Info</h2>
                </div>
                <p className="text-sm text-white/60 leading-relaxed font-medium">
                  {tournament.description}
                </p>
             </GlassCard>
           )}

           <div className="px-2 space-y-4">
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[#333] block">Quick Links</label>
              <div className="flex flex-col gap-2">
                 {[
                   { label: 'Bracket', icon: Trophy, path: 'bracket' },
                   { label: 'Rankings', icon: Medal, path: 'standings' },
                   { label: 'Awards', icon: Zap, path: 'awards', condition: isCompleted },
                   { label: 'Brief', icon: Layout, path: '#brief', isScroll: true }
                 ].filter(tab => tab.condition !== false).map((tab) => {
                    const Icon = tab.icon;
                    if (tab.isScroll) {
                      return (
                        <button key={tab.path} onClick={() => document.getElementById('brief')?.scrollIntoView({ behavior: 'smooth' })} className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-white/40 hover:text-[#e8a000] hover:border-[#e8a000]/30 transition-all group">
                           <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-white/5 text-white/20 group-hover:text-[#e8a000] group-hover:bg-[#e8a000]/10 transition-all"><Icon size={16} /></div>
                              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                           </div>
                           <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                        </button>
                      );
                    }
                    return (
                      <Link key={tab.path} href={`/tournaments/${slug}/${tab.path}`} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-white/40 hover:text-[#e8a000] hover:border-[#e8a000]/30 transition-all group">
                         <div className="flex items-center gap-3">
                            <Icon size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                         </div>
                         <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                    );
                  })}
              </div>
           </div>
        </div>

        {/* Right: Insights & Competition Brief */}
        <div className="lg:col-span-2 space-y-12">
           <CompetitionBrief />
           
           {/* New Groups Section */}
           {tournament.groups && tournament.groups.length > 0 && (
             <GroupsSection groups={tournament.groups} accentColor={tournament.color || '#e8a000'} />
           )}

           {/* Registered Teams Grid */}
           <RegisteredTeams 
             registrations={tournament.registrations} 
             slots={tournament.slots} 
             accentColor={tournament.color || '#e8a000'}
             delay={0.6}
           />

           {/* Standings Preview */}
           {standings.length > 0 && (
             <GlassCard delay={0.4}>
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-[#e8a000] rounded-full" />
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tighter">Current <span className="text-[#e8a000]">Rankings</span></h2>
                      <p className="text-[10px] font-black text-[#555] uppercase tracking-widest mt-1">Live Standings</p>
                    </div>
                  </div>
                  <Link href={`/tournaments/${slug}/standings`} className="text-[#e8a000] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                    View All <ChevronRight size={14} />
                  </Link>
                </div>

                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[9px] font-black uppercase tracking-[0.2em] text-[#333] border-b border-white/5">
                        <th className="pb-4 pr-4">Rank</th>
                        <th className="pb-4 pr-4">Team</th>
                        <th className="pb-4 pr-4 text-center">W</th>
                        <th className="pb-4 pr-4 text-center">L</th>
                        <th className="pb-4 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.slice(0, 5).map((s, idx) => (
                        <tr key={s.team.id} className="group border-b border-white/[0.03] last:border-0">
                          <td className="py-5 pr-4">
                            <span className="text-xl font-black text-[#e8a000]/50 group-hover:text-[#e8a000] font-mono transition-colors">#{s.rank}</span>
                          </td>
                          <td className="py-5 pr-4">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white/40">
                                 {s.team.logo ? <img src={s.team.logo} alt="" className="w-full h-full object-contain" /> : s.team.tag.substring(0,2)}
                               </div>
                               <span className="text-sm font-black text-white uppercase group-hover:text-[#e8a000] transition-colors">{s.team.name}</span>
                             </div>
                          </td>
                          <td className="py-5 pr-4 text-center text-xs font-bold text-emerald-400 font-mono italic">{s.wins}</td>
                          <td className="py-5 pr-4 text-center text-xs font-bold text-red-400 font-mono italic">{s.losses}</td>
                          <td className="py-5 text-right">
                             <span className="px-4 py-1.5 rounded-lg bg-[#e8a000]/10 text-[#e8a000] text-xs font-black font-mono tracking-widest">
                               {s.points} PTS
                             </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </GlassCard>
           )}

           {/* Rules Grid */}
           <GlassCard delay={0.5}>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-6 bg-[#e8a000] rounded-full" />
                <h2 className="text-xs font-black text-white uppercase tracking-widest">Tournament Rules</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tournament.rules && tournament.rules.length > 0 ? tournament.rules.map((rule, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-4">
                    <span className="text-[#e8a000] shrink-0 font-black">0{idx + 1}</span>
                    <p className="text-xs text-white/60 font-medium leading-relaxed">{rule}</p>
                  </div>
                )) : (
                  <div className="col-span-2 py-12 text-center text-[#333] font-black uppercase tracking-widest text-[10px] border border-dashed border-white/10 rounded-3xl">
                    No established protocols provided.
                  </div>
                )}
              </div>
           </GlassCard>

           {/* Call to Action */}
           <div className="flex items-center justify-center py-12">
              <div className="relative group">
                <div className="absolute inset-x-0 bottom-0 h-1 bg-[#e8a000] scale-x-0 group-hover:scale-x-50 transition-transform origin-center duration-500" />
                <button 
                  onClick={() => setShowRegisterModal(true)}
                  disabled={!regStatus.canRegister}
                  className="px-16 py-8 flex flex-col items-center gap-4 group"
                >
                  <div className="p-6 rounded-full border border-white/10 text-[#e8a000] group-hover:bg-[#e8a000] group-hover:text-black transition-all group-hover:scale-110">
                    <ArrowRight size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black text-white uppercase tracking-tighter">Ready to Join?</p>
                    <p className="text-[10px] font-black text-[#444] uppercase tracking-[0.4em] mt-1 group-hover:text-[#e8a000] transition-colors">{regStatus.canRegister ? 'Complete Registration' : regStatus.label}</p>
                  </div>
                </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
