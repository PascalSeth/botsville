'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  Trophy,
  Users,
  ChevronRight,
  Swords,
  Medal,
  Zap,
  AlertCircle,
  Share2,
  Loader2,
  Clock,
  ChevronLeft,
  Layout,
  Shield,
  Target,
  Lock,
  ArrowRight,
  CheckCircle,
  X,
  Plus,
  Sparkles,
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
  defaultBestOf?: number;
  registrations?: TournamentRegistration[];
  groups?: TournamentGroup[];
};

const FORMAT_DESCRIPTIONS: Record<string, { label: string; details: string }> = {
  GROUP_STAGE: {
    label: "Group Stage + Double Elimination Playoffs",
    details: "Teams are split into groups for intra-group round robin play. Top teams advance to double-elimination bracket playoffs.",
  },
  DOUBLE_ELIMINATION: {
    label: "Double Elimination Bracket",
    details: "Every team begins in the Upper Bracket. Losing a match drops a team to the Lower Bracket for a second-chance run.",
  },
  SINGLE_ELIMINATION: {
    label: "Single Elimination Knockout Cup",
    details: "High-stakes direct elimination bracket. Lose once and your tournament run concludes.",
  },
  ROUND_ROBIN: {
    label: "Round Robin League",
    details: "Every team plays every other team over scheduled matchdays. Factions are ranked on cumulative win points.",
  },
  SWISS: {
    label: "Swiss System Series",
    details: "Teams are paired each round against opponents with identical win-loss records. Qualify at 3 wins, eliminated at 3 losses.",
  },
};

const getRegistrationStatus = (tournament: Tournament): { canRegister: boolean; label: string; color: string } => {
  const filled = tournament.filled || tournament.registrations?.length || 0;
  const isFull = filled >= tournament.slots;
  const deadlineDate = tournament.registrationDeadline ? new Date(tournament.registrationDeadline) : new Date(tournament.date);
  const isPastDeadline = Date.now() > deadlineDate.getTime();

  if (tournament.status === 'COMPLETED') return { canRegister: false, label: 'Tournament Completed', color: 'text-gray-500 border-gray-500/30 bg-gray-500/10' };
  if (isFull) return { canRegister: false, label: 'Tournament Full', color: 'text-red-500 border-red-500/30 bg-red-500/10' };
  if (isPastDeadline) return { canRegister: false, label: 'Registration Closed', color: 'text-red-500 border-red-500/30 bg-red-500/10' };

  return { canRegister: true, label: 'Registration Open', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
};

const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Countdown Component
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

const CountdownDisplay = ({ target }: { target: string }) => {
  const t = useCountdown(new Date(target));
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

// Premium Glass Card Component
const GlassCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`bg-[#0a0a0f] backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors shadow-2xl ${className}`}
  >
    {children}
  </motion.div>
);

const Scanlines = ({ opacity = 0.025 }: { opacity?: number }) => (
  <div className="absolute inset-0 pointer-events-none z-[1]"
    style={{ opacity, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,#fff 2px,#fff 3px)', backgroundSize: '100% 3px' }} />
);

// ── Registration Modal ────────────────────────────────────────
const RegisterModal = ({ t: tournament, onClose }: { t: Tournament; onClose: () => void }) => {
  const [team, setTeam] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCaptain, setIsCaptain] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [registeredTeams, setRegisteredTeams] = useState<string[]>([]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const [teamResponse, registrationResponse] = await Promise.all([
          fetch('/api/my-team'),
          fetch(`/api/tournaments/${tournament.id}/register`),
        ]);
        const teamJson = await teamResponse.json();
        const registrationData = await registrationResponse.json();

        if (teamResponse.ok && teamJson?.name) {
          setRegisteredTeams([teamJson.name]);
          setIsCaptain(Boolean(teamJson.isCaptain));
          if (Boolean(teamJson.isCaptain)) setTeam(teamJson.name);
        }

        if (registrationResponse.ok && registrationData?.registered) {
          setAlreadyRegistered(true);
        }
      } catch (e) {
        console.error("Fetch registration data error:", e);
      }
    };
    void fetchTeams();
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
        setError(data?.error || 'Failed to register team');
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError('Connection failed. Please try again.');
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
        <div className="relative h-48 shrink-0 overflow-hidden bg-gradient-to-br from-gray-900 via-purple-950 to-black">
          {(tournament.banner || tournament.heroImage || tournament.image) && (
            <img
              src={tournament.banner || tournament.heroImage || tournament.image || ''}
              alt=""
              className="w-full h-full object-cover brightness-[0.3]"
            />
          )}
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at bottom left, ${accentColor}40, transparent 60%)` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08080d] via-transparent to-transparent" />
          <Scanlines />
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-xl bg-black/50 border border-white/10 text-white hover:bg-white/10 transition-colors z-10">
            <X size={18} />
          </button>
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
                <p className="text-[#555] text-xs font-medium">Your team has been successfully registered for this event.</p>
              </div>
              <button onClick={onClose} className="px-10 py-4 bg-[#e8a000] text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#ffb800] transition-all">Close</button>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold flex items-center gap-3">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Date', val: formatDate(tournament.date), icon: Calendar },
                  { label: 'Format', val: tournament.format.replace(/_/g, ' '), icon: Swords },
                  { label: 'Capacity', val: `${tournament.filled || tournament.registrations?.length || 0}/${tournament.slots}`, icon: Users },
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
                    <Link href="/register-team" className="text-[#e8a000] text-[10px] font-black uppercase tracking-widest hover:underline">Establish New Team &rarr;</Link>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 rounded border-white/20 bg-white/5 text-[#e8a000]"
                  />
                  <span className="text-[#888] text-[10px] leading-relaxed font-bold group-hover:text-white transition-colors uppercase tracking-tight">Accept tournament protocol and community guidelines.</span>
                </label>
                <button onClick={submit} disabled={!canSubmit} className="w-full py-5 bg-[#e8a000] text-black font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-[#ffb800] transition-all disabled:opacity-20 flex items-center justify-center gap-3">
                   {loading ? <Loader2 size={16} className="animate-spin" /> : <><Shield size={16} /> Register Now</>}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ── Dynamic Competition Brief Component ────────────────────────────────
const CompetitionBrief = ({ tournament, delay = 0.4 }: { tournament: Tournament; delay?: number }) => {
  const fmt = FORMAT_DESCRIPTIONS[tournament.format] ?? {
    label: tournament.format.replace(/_/g, " "),
    details: "Standard competitive tournament rules apply.",
  };

  const sections = [
    {
      title: 'Tournament Logistics',
      icon: Clock,
      items: [
        { label: 'Start Date', val: formatDate(tournament.date), sub: 'Scheduled Kickoff' },
        { label: 'Registration Deadline', val: formatDate(tournament.registrationDeadline || tournament.date), sub: 'Roster Lock' },
        { label: 'Location', val: tournament.location || 'Online', sub: 'Event Domain' },
      ]
    },
    {
      title: 'Tournament Format & Structure',
      icon: Layout,
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[#e8a000] text-[10px] font-black uppercase tracking-widest mb-1">Competition Format</p>
            <p className="text-white text-xs font-bold uppercase mb-2">{fmt.label}</p>
            <p className="text-white/60 text-xs leading-relaxed">{fmt.details}</p>
          </div>
          {tournament.season && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div>
                <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest">Season Association</p>
                <p className="text-white text-xs font-bold uppercase mt-0.5">{tournament.season.name}</p>
              </div>
              <Trophy size={20} className="text-[#e8a000]" />
            </div>
          )}
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
              <p className="text-white text-xs font-bold uppercase">Standard Series Match</p>
              <p className="text-white/50 text-[10px] uppercase tracking-widest mt-1">Best of {tournament.defaultBestOf || 3} (BO{tournament.defaultBestOf || 3})</p>
            </div>
            <Swords size={20} className="text-[#e8a000]" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#e8a000]/10 border border-[#e8a000]/30">
            <div>
              <p className="text-[#e8a000] text-xs font-bold uppercase">Grand Finals Series</p>
              <p className="text-[#e8a000]/70 text-[10px] uppercase tracking-widest mt-1">Best of {(tournament.defaultBestOf || 3) + 2} (BO{(tournament.defaultBestOf || 3) + 2})</p>
            </div>
            <Trophy size={20} className="text-[#e8a000]" />
          </div>
        </div>
      )
    },
    {
      title: 'Prize & Ranking Allocation',
      icon: Medal,
      content: (
        <div className="space-y-4">
          {tournament.prizePool ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-center space-y-1">
              <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Guaranteed Prize Pool</p>
              <p className="text-2xl font-black text-white">{tournament.prizePool}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Prize pool structure to be announced by event organizers.</p>
          )}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Standing Tie-Breakers</p>
            <div className="space-y-1 text-xs text-gray-300 font-medium">
              <p><span className="text-[#e8a000] font-bold">1.</span> Head-to-head match result</p>
              <p><span className="text-[#e8a000] font-bold">2.</span> Game win differential (+W/-L)</p>
              <p><span className="text-[#e8a000] font-bold">3.</span> Total cumulative game points</p>
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
    </div>
  );
};

// ── Registered Teams Component ────────────────────────────────
const RegisteredTeams = ({ registrations = [], slots = 0, accentColor = '#e8a000', delay = 0.4 }: { registrations?: TournamentRegistration[]; slots?: number; accentColor?: string; delay?: number }) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: delay }
    }
  };

  const item = {
    hidden: { opacity: 0, scale: 0.9, y: 15 },
    show: { opacity: 1, scale: 1, y: 0 }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 rounded-full bg-[#e8a000]" />
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Registered Factions</h2>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-0.5">
              {registrations.length} of {slots} Team Slots Claimed
            </p>
          </div>
        </div>
      </div>

      {registrations.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-white/10 rounded-3xl bg-[#0a0a0f] space-y-2">
          <Users size={36} className="mx-auto text-gray-600 mb-2" />
          <p className="text-xs font-black uppercase text-gray-400 tracking-wider">No Teams Registered Yet</p>
          <p className="text-xs text-gray-500">Be the first squad to register for this event.</p>
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
              className="relative aspect-square rounded-2xl bg-[#0a0a0f] border border-white/10 p-4 flex flex-col items-center justify-center text-center overflow-hidden hover:border-[#e8a000]/50 transition-all group"
            >
              <div className="absolute top-2 right-3 text-[10px] font-mono text-gray-600">
                #{String(reg.seed || idx + 1).padStart(2, '0')}
              </div>
              
              <div className="w-14 h-14 rounded-xl bg-black/40 border border-white/5 p-2 mb-2 flex items-center justify-center group-hover:scale-110 transition-transform">
                {reg.team.logo ? (
                  <img src={reg.team.logo} alt={reg.team.name} className="w-full h-full object-contain" />
                ) : (
                  <Shield size={24} className="text-white/20 group-hover:text-[#e8a000] transition-colors" />
                )}
              </div>

              <div className="space-y-0.5 w-full">
                <p className="text-xs font-black text-white uppercase truncate px-1 group-hover:text-[#e8a000] transition-colors">
                  {reg.team.name}
                </p>
                <p className="text-[9px] font-mono text-gray-500 uppercase">[{reg.team.tag}]</p>
              </div>
            </motion.div>
          ))}

          {/* Empty Slot Placeholders */}
          {Array.from({ length: Math.max(0, Math.min(5, slots - registrations.length)) }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square rounded-2xl bg-white/[0.01] border border-dashed border-white/5 flex items-center justify-center opacity-30">
               <div className="w-8 h-8 rounded-lg border border-white/10 border-dashed flex items-center justify-center">
                  <Plus size={16} className="text-white/20" />
               </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

// ── Main Page Component ───────────────────────────────────────────
export default function PublicTournamentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
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
    if (slug) void fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#05050a] gap-4">
        <Loader2 size={32} className="animate-spin text-[#e8a000]" />
        <p className="text-xs font-black uppercase text-gray-500 tracking-widest">Loading Tournament Details...</p>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05050a] p-12">
        <div className="text-center space-y-6">
          <AlertCircle size={48} className="mx-auto text-red-500/50" />
          <p className="text-white text-3xl font-black uppercase tracking-tight">{error || 'Tournament Not Found'}</p>
          <Link href="/tournaments" className="inline-block px-8 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-white/10 transition-all">
            Return to Tournament Registry
          </Link>
        </div>
      </div>
    );
  }

  const isLive = tournament.status === 'LIVE' || tournament.status === 'ONGOING';
  const isCompleted = tournament.status === 'COMPLETED';
  const regStatus = getRegistrationStatus(tournament);

  return (
    <div className="min-h-screen bg-[#05050a] text-white selection:bg-[#e8a000]/30 pt-20 pb-24 relative">
      <AnimatePresence>
        {showRegisterModal && <RegisterModal t={tournament} onClose={() => setShowRegisterModal(false)} />}
      </AnimatePresence>

      {/* Hero Banner Header */}
      <div className="relative h-[440px] w-full overflow-hidden bg-gradient-to-br from-gray-900 via-purple-950 to-black border-b border-white/10">
        {(tournament.banner || tournament.heroImage || tournament.image) && (
          <img
            src={tournament.banner || tournament.heroImage || tournament.image || ''}
            alt=""
            className="w-full h-full object-cover opacity-50 transition-all duration-700"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-[#05050a]/70 to-transparent" />
        <Scanlines opacity={0.03} />

        <div className="absolute inset-x-0 bottom-0 max-w-6xl mx-auto px-6 pb-12 flex flex-col justify-end z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Link href="/tournaments" className="inline-flex items-center gap-2 text-[#e8a000] text-xs font-black uppercase tracking-wider hover:underline">
              <ChevronLeft size={16} /> Return to Tournaments
            </Link>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                  isLive ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' :
                  isCompleted ? 'bg-white/10 border-white/20 text-gray-300' :
                  'bg-[#e8a000]/20 border-[#e8a000]/40 text-[#e8a000]'
                }`}>
                  {tournament.status}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-gray-300">
                  <Trophy size={14} className="text-[#e8a000]" />
                  {tournament.format.replace(/_/g, ' ')}
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-tight">
                {tournament.name}
              </h1>

              {tournament.subtitle && (
                <p className="text-gray-400 text-base md:text-lg font-medium max-w-2xl">
                  {tournament.subtitle}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              {regStatus.canRegister ? (
                <button 
                  onClick={() => setShowRegisterModal(true)}
                  className="px-8 py-3.5 bg-[#e8a000] text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-[#ffb800] transition-all shadow-xl shadow-[#e8a000]/20 flex items-center gap-2"
                >
                  <Zap size={16} /> Register Team Now
                </button>
              ) : (
                <span className="px-6 py-3 bg-white/5 border border-white/10 text-gray-400 font-bold text-xs uppercase rounded-xl flex items-center gap-2">
                  <Lock size={14} /> {regStatus.label}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-6xl mx-auto px-6 pt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Event Overview & Quick Links */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard delay={0.2}>
            <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-3">
              <div className="w-1.5 h-5 bg-[#e8a000] rounded-full" />
              <h2 className="text-xs font-black text-white uppercase tracking-wider">Tournament Details</h2>
            </div>
            <div className="space-y-5">
              {[
                { label: 'Start Date', val: formatDate(tournament.date), icon: Calendar },
                { label: 'Location / Server', val: tournament.location || 'Online', icon: MapPin },
                { label: 'Max Teams', val: `${tournament.slots} Teams`, icon: Users },
                { label: 'Prize Pool', val: tournament.prizePool || 'TBA', icon: Sparkles }
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/5 text-[#e8a000] border border-white/5"><Icon size={16} /></div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{item.label}</p>
                      <p className="text-xs font-black text-white uppercase mt-0.5">{item.val}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {tournament.description && (
            <GlassCard delay={0.3}>
              <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-3">
                <div className="w-1.5 h-5 bg-[#e8a000] rounded-full" />
                <h2 className="text-xs font-black text-white uppercase tracking-wider">About This Event</h2>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                {tournament.description}
              </p>
            </GlassCard>
          )}
        </div>

        {/* Right Column: Brief, Registered Teams, Rankings, Rules */}
        <div className="lg:col-span-2 space-y-10">
          <CompetitionBrief tournament={tournament} />

          <RegisteredTeams 
            registrations={tournament.registrations} 
            slots={tournament.slots} 
            accentColor={tournament.color || '#e8a000'}
            delay={0.5}
          />

          {/* Standings Table if available */}
          {standings.length > 0 && (
            <GlassCard delay={0.4}>
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-[#e8a000] rounded-full" />
                  <h2 className="text-xs font-black text-white uppercase tracking-wider">Live Standings</h2>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-white/5">
                      <th className="pb-3 pr-4">Rank</th>
                      <th className="pb-3 pr-4">Team</th>
                      <th className="pb-3 pr-4 text-center">W</th>
                      <th className="pb-3 pr-4 text-center">L</th>
                      <th className="pb-3 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {standings.map((s) => (
                      <tr key={s.team.id} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 pr-4 font-mono font-black text-[#e8a000]">#{s.rank}</td>
                        <td className="py-3.5 pr-4">
                          <span className="text-xs font-black text-white uppercase">[{s.team.tag}] {s.team.name}</span>
                        </td>
                        <td className="py-3.5 pr-4 text-center text-xs font-bold text-emerald-400 font-mono">{s.wins}</td>
                        <td className="py-3.5 pr-4 text-center text-xs font-bold text-red-400 font-mono">{s.losses}</td>
                        <td className="py-3.5 text-right font-mono font-black text-amber-400 text-xs">{s.points} PTS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* Rules Section */}
          <GlassCard delay={0.5}>
            <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
              <div className="w-1.5 h-5 bg-[#e8a000] rounded-full" />
              <h2 className="text-xs font-black text-white uppercase tracking-wider">Official Event Rules</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tournament.rules && tournament.rules.length > 0 ? (
                tournament.rules.map((rule, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex gap-3 items-start">
                    <span className="text-[#e8a000] font-black text-xs">0{idx + 1}.</span>
                    <p className="text-xs text-gray-300 font-medium leading-relaxed">{rule}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 italic col-span-2">Standard Ghanaian MLBB Esports guidelines apply for this tournament.</p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
