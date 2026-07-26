'use client';

import React, { useEffect, useState, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Crown, Users, Trophy, MapPin, Swords, Check, X,
  Loader2, Sparkles, ArrowLeft, Send, CheckCircle2, AlertCircle,
  Star, TrendingUp, Activity, Award, Hash,
  Calendar, BarChart3, Flame, ChevronRight, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Player {
  id: string;
  ign: string;
  realName?: string | null;
  role: string;
  secondaryRole?: string | null;
  signatureHero?: string | null;
  photo: string | null;
  isSubstitute: boolean;
  kda: number;
  winRate: number;
  mvpCount: number;
  matchesPlayed: number;
  user?: { id: string; ign: string; photo: string | null } | null;
}

interface Standing {
  rank: number;
  wins: number;
  losses: number;
  forfeits: number;
  points: number;
  streak: string | null;
  tier: string;
  season: { id: string; name: string; status: string };
}

interface TournamentReg {
  id: string;
  tournament?: { id: string; name: string; status: string };
  name?: string;
  status?: string;
}

interface NameHistory {
  oldName: string;
  oldTag: string;
  changedAt: string;
}

interface Team {
  id: string;
  name: string;
  tag: string;
  region: string;
  color: string | null;
  logo: string | null;
  banner: string | null;
  isRecruiting?: boolean;
  captainId: string;
  trophies: string[];
  totalPrizeMoney: number;
  registeredAt: string;
  captain?: { id: string; ign: string; photo: string | null } | null;
  players: Player[];
  standings: Standing[];
  nameHistory: NameHistory[];
  registrations: TournamentReg[];
  _count?: { players: number; registrations: number; matchesAsA: number; matchesAsB: number };
}

interface ReceivedInvite {
  id: string;
  teamId: string;
  status: string;
}

// â”€â”€â”€ Role Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ROLE_CFG: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ReactNode }> = {
  EXP:    { color: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b30', label: 'EXP',    icon: <Swords size={9} /> },
  JUNGLE: { color: '#ef4444', bg: '#ef444415', border: '#ef444430', label: 'Jungle', icon: <Flame  size={9} /> },
  MID:    { color: '#a855f7', bg: '#a855f715', border: '#a855f730', label: 'Mid',    icon: <Star   size={9} /> },
  GOLD:   { color: '#10b981', bg: '#10b98115', border: '#10b98130', label: 'Gold',   icon: <Award  size={9} /> },
  ROAM:   { color: '#06b6d4', bg: '#06b6d415', border: '#06b6d430', label: 'Roam',   icon: <Shield size={9} /> },
  FLEX:   { color: '#3b82f6', bg: '#3b82f615', border: '#3b82f630', label: 'Flex',   icon: <Star   size={9} /> },
};
const TIER_COLORS: Record<string, string> = { S: '#f59e0b', A: '#3b82f6', B: '#a855f7', C: '#6b7280' };

function rcfg(role: string) { return ROLE_CFG[role] ?? ROLE_CFG.FLEX; }

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StreakBadge({ streak }: { streak: string | null }) {
  if (!streak) return null;
  const win = streak.startsWith('W');
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
      win ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
    }`}>
      {win ? 'ðŸ”¥' : 'ðŸ’€'} {streak}
    </span>
  );
}

function StatBox({ label, value, color, icon }: { label: string; value: string | number; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
      {icon && <span style={{ color }} className="mb-0.5 opacity-70">{icon}</span>}
      <span className="text-base font-black font-mono leading-tight" style={{ color }}>{value}</span>
      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">{label}</span>
    </div>
  );
}

function PlayerCard({ player, captainId, teamColor, delay = 0 }: {
  player: Player; captainId: string; teamColor: string; delay?: number;
}) {
  const r = rcfg(player.role);
  const photo = player.photo || player.user?.photo;
  const isCapt = player.user?.id === captainId || player.id === captainId;
  const hasStats = player.matchesPlayed > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
    >
      <Link
        href={`/players/${player.id}`}
        className={`group block relative rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
          player.isSubstitute
            ? 'bg-[#0c0c16]/60 border-white/[0.05] opacity-75 hover:opacity-100 hover:border-white/10'
            : 'bg-[#0c0c16] border-white/10 hover:border-white/20'
        }`}
      >
        {/* Role top bar */}
        <div className="h-[2px] w-full" style={{ background: player.isSubstitute ? `${r.color}50` : r.color }} />

        <div className="p-4 space-y-3">
          {/* Badges */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase font-mono"
              style={{ background: r.bg, color: r.color, border: `1px solid ${r.border}` }}>
              {r.icon} {player.role}
            </span>
            <div className="flex items-center gap-1">
              {isCapt && (
                <span className="flex items-center gap-0.5 text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Crown size={8} /> CPT
                </span>
              )}
              {player.isSubstitute && (
                <span className="text-[8px] font-mono uppercase text-zinc-600 border border-white/[0.07] px-1.5 py-0.5 rounded">SUB</span>
              )}
            </div>
          </div>

          {/* Photo + IGN */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-zinc-900 border-2 flex items-center justify-center text-base font-black transition-transform duration-300 group-hover:scale-105"
              style={{ borderColor: `${r.color}50` }}>
              {photo ? (
                <Image src={photo} alt={player.ign} fill className="object-cover" />
              ) : (
                <span style={{ color: r.color }}>{player.ign.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className="font-black text-sm text-white uppercase tracking-tight group-hover:text-amber-400 transition-colors flex items-center justify-center gap-1">
                {player.ign}
                <ExternalLink size={9} className="text-zinc-600 group-hover:text-amber-400 transition-colors shrink-0" />
              </p>
              {player.signatureHero && (
                <p className="text-[9px] font-bold mt-0.5" style={{ color: `${r.color}90` }}>âš” {player.signatureHero}</p>
              )}
              {player.secondaryRole && (
                <p className="text-[8px] text-zinc-600 mt-0.5">+{player.secondaryRole}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="pt-2 border-t border-white/[0.05]">
            {hasStats ? (
              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <span className="block text-xs font-black" style={{ color: r.color }}>{player.kda.toFixed(1)}</span>
                  <span className="block text-[8px] text-zinc-600 uppercase">KDA</span>
                </div>
                <div>
                  <span className="block text-xs font-black text-emerald-400">{player.winRate.toFixed(0)}%</span>
                  <span className="block text-[8px] text-zinc-600 uppercase">WR</span>
                </div>
                <div>
                  <span className="block text-xs font-black text-amber-400">{player.mvpCount}</span>
                  <span className="block text-[8px] text-zinc-600 uppercase">MVP</span>
                </div>
              </div>
            ) : (
              <p className="text-[9px] text-zinc-700 italic text-center">No data yet</p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function TeamProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = use(params);
  const { data: session } = useSession();

  const [team, setTeam]                         = useState<Team | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState<string | null>(null);
  const [pendingInvite, setPendingInvite]       = useState<ReceivedInvite | null>(null);
  const [respondingInvite, setRespondingInvite] = useState(false);
  const [selectedRole, setSelectedRole]         = useState('EXP');
  const [applying, setApplying]                 = useState(false);
  const [applyMsg, setApplyMsg]                 = useState('');
  const [showModal, setShowModal]               = useState(false);
  const [applied, setApplied]                   = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!routeId) return;
      setLoading(true); setError(null);
      try {
        let loaded: Team | null = null;
        const res = await fetch(`/api/teams/${routeId}`);
        const data = await res.json();
        if (res.ok && data && !data.error) loaded = data as Team;

        let invite: ReceivedInvite | null = null;
        if (session?.user) {
          try {
            const ir = await fetch('/api/invites/received');
            const id2 = await ir.json();
            const arr: ReceivedInvite[] = Array.isArray(id2) ? id2 : Array.isArray(id2?.data) ? id2.data : [];
            const tid = loaded?.id || routeId;
            invite = arr.find(i => (i.teamId === tid || i.id === routeId) && i.status === 'PENDING') || null;
            if (!loaded && invite?.teamId) {
              const fb = await fetch(`/api/teams/${invite.teamId}`);
              const fd = await fb.json();
              if (fb.ok && fd && !fd.error) loaded = fd as Team;
            }
          } catch { /* ignore */ }
        }
        if (active) {
          if (loaded) { setTeam(loaded); setPendingInvite(invite); }
          else setError((data as { error?: string })?.error || 'Squad not found');
        }
      } catch { if (active) setError('Failed to load squad'); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [routeId, session?.user]);

  const handleRespond = async (action: 'accept' | 'decline') => {
    if (!pendingInvite) return;
    setRespondingInvite(true);
    try {
      const res = await fetch(`/api/invites/${pendingInvite.id}/respond`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, role: selectedRole }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(action === 'accept' ? 'ðŸŽ‰ Welcome to the squad!' : 'Invite declined');
        setPendingInvite(null);
        if (team?.id) {
          const r = await fetch(`/api/teams/${team.id}`);
          const d2 = await r.json();
          if (r.ok && !d2.error) setTeam(d2 as Team);
        }
      } else toast.error(d.error || `Failed to ${action}`);
    } catch { toast.error('Error'); }
    finally { setRespondingInvite(false); }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault(); if (!team) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/teams/${team.id}/apply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: applyMsg }),
      });
      const d = await res.json();
      if (res.ok) { toast.success('Application sent!'); setApplied(true); setShowModal(false); }
      else toast.error(d.error || 'Failed');
    } catch { toast.error('Failed'); }
    finally { setApplying(false); }
  };

  // â”€â”€ Loading / Error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (loading) return (
    <div className="min-h-screen bg-[#07070c] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center"><Shield size={20} className="text-amber-400" /></div>
        </div>
        <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest animate-pulse">Loading Squad...</p>
      </div>
    </div>
  );

  if (error || !team) return (
    <div className="min-h-screen bg-[#07070c] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-[#0d0d14] border border-white/10 text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase">Squad Not Found</h2>
          <p className="text-zinc-500 text-xs mt-1">This profile could not be found.</p>
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/teams" className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-amber-400 transition-all">
            <ArrowLeft size={13} /> Browse Teams
          </Link>
          <Link href="/my-team" className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white/10 transition-all">
            <Users size={13} /> My Team
          </Link>
        </div>
      </div>
    </div>
  );

  // â”€â”€ Computed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const starters    = team.players.filter(p => !p.isSubstitute);
  const subs        = team.players.filter(p => p.isSubstitute);
  const standing    = team.standings?.[0] ?? null;
  const tc          = team.color || '#f59e0b';
  const total       = (standing?.wins ?? 0) + (standing?.losses ?? 0);
  const wr          = total > 0 ? Math.round((standing!.wins / total) * 100) : 0;
  const isMember    = !!(session?.user?.id && team.players.some(p => p.user?.id === session.user.id));
  const emptySlots  = Math.max(0, 5 - starters.length);

  return (
    <div className="min-h-screen bg-[#07070c] text-white font-sans">

      {/* â”€â”€â”€ HERO BANNER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="relative w-full h-72 sm:h-96 overflow-hidden bg-zinc-950">
        {team.banner ? (
          <Image src={team.banner} alt={team.name} fill className="object-cover opacity-45" priority />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${tc}25, #07070c 65%)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070c] via-[#07070c]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07070c]/60 via-transparent to-transparent" />
        <div className="absolute inset-0 opacity-25" style={{ background: `radial-gradient(ellipse at 25% 65%, ${tc}35, transparent 55%)` }} />

        {/* Back */}
        <div className="absolute top-20 left-4 sm:left-8 lg:top-6 z-20">
          <Link href="/teams" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 hover:border-white/25 text-zinc-300 hover:text-white text-[11px] font-black uppercase tracking-wider transition-all">
            <ArrowLeft size={13} /> All Squads
          </Link>
        </div>

        {/* Ghost tag */}
        <div className="absolute inset-0 flex items-center justify-end pr-6 sm:pr-12 pointer-events-none select-none overflow-hidden">
          <span className="font-black leading-none" style={{ fontSize: 'clamp(5rem, 16vw, 13rem)', color: `${tc}09`, letterSpacing: '-0.05em' }}>
            {team.tag}
          </span>
        </div>
      </div>

      {/* â”€â”€â”€ PAGE BODY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-36 relative z-10 space-y-6 pb-24">

        {/* â”€â”€â”€ HEADER CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="rounded-3xl bg-[#0c0c14]/90 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${tc}, ${tc}60, transparent)` }} />
          <div className="p-6 sm:p-8 space-y-6">

            {/* Logo + identity + actions */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Logo */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 flex items-center justify-center shrink-0 bg-zinc-900 shadow-2xl"
                style={{ borderColor: `${tc}50` }}>
                {team.logo
                  ? <Image src={team.logo} alt={team.name} fill className="object-cover" />
                  : <Shield size={44} style={{ color: tc }} className="opacity-60" />
                }
                <div className="absolute inset-0" style={{ background: `radial-gradient(circle, ${tc}18, transparent 70%)` }} />
              </div>

              {/* Identity */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-black font-mono uppercase border"
                    style={{ background: `${tc}15`, borderColor: `${tc}40`, color: tc }}>
                    [{team.tag}]
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-400 text-xs font-bold uppercase flex items-center gap-1.5">
                    <MapPin size={11} className="text-amber-400" /> {team.region || 'Ghana'}
                  </span>
                  {standing?.tier && (
                    <span className="px-3 py-1 rounded-lg text-xs font-black uppercase border"
                      style={{ background: `${TIER_COLORS[standing.tier]}15`, color: TIER_COLORS[standing.tier], borderColor: `${TIER_COLORS[standing.tier]}40` }}>
                      {standing.tier}-Tier
                    </span>
                  )}
                  {team.isRecruiting ? (
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Recruiting
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-lg bg-zinc-800/60 border border-white/[0.08] text-zinc-500 text-xs font-bold uppercase">Roster Full</span>
                  )}
                  {standing && <StreakBadge streak={standing.streak} />}
                </div>

                <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">{team.name}</h1>

                {team.captain && (
                  <div className="flex items-center gap-2">
                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-amber-500/40 bg-zinc-900 flex items-center justify-center shrink-0">
                      {team.captain.photo
                        ? <Image src={team.captain.photo} alt={team.captain.ign} fill className="object-cover" />
                        : <Crown size={10} className="text-amber-400" />
                      }
                    </div>
                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                      <Crown size={10} className="text-amber-400" />
                      Captain â€” <strong className="text-white font-bold ml-0.5">{team.captain.ign}</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                {isMember ? (
                  <Link href="/my-team" className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20">
                    <Shield size={14} /> My Team Hub
                  </Link>
                ) : team.isRecruiting && (
                  <button
                    onClick={() => setShowModal(true)}
                    disabled={applied}
                    className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50"
                    style={{ background: applied ? '#333' : `linear-gradient(135deg, ${tc}, ${tc}cc)`, color: applied ? '#888' : '#000', boxShadow: applied ? 'none' : `0 8px 25px ${tc}30` }}
                  >
                    {applied ? <><CheckCircle2 size={14} /> Applied!</> : <><Send size={14} /> Apply to Join</>}
                  </button>
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-4 border-t border-white/[0.06]">
              {standing ? (
                <>
                  <StatBox label="Rank"     value={`#${standing.rank}`}              color={tc}       icon={<Hash size={11} />} />
                  <StatBox label="Wins"     value={standing.wins}                    color="#10b981"  icon={<TrendingUp size={11} />} />
                  <StatBox label="Losses"   value={standing.losses}                  color="#ef4444"  icon={<Activity size={11} />} />
                  <StatBox label="Win Rate" value={`${wr}%`}                         color={tc}       icon={<BarChart3 size={11} />} />
                  <StatBox label="Points"   value={standing.points.toLocaleString()} color={tc}       icon={<Star size={11} />} />
                  <StatBox label="Tourn."   value={team._count?.registrations ?? 0}  color="#a855f7"  icon={<Trophy size={11} />} />
                </>
              ) : (
                <>
                  <StatBox label="Players"  value={team.players.length}                                                                   color={tc}       icon={<Users size={11} />} />
                  <StatBox label="Starters" value={`${starters.length}/5`}                                                                color="#10b981"  icon={<Shield size={11} />} />
                  <StatBox label="Subs"     value={subs.length}                                                                                            icon={<Star size={11} />} />
                  <StatBox label="Tourn."   value={team._count?.registrations ?? 0}                                                       color="#a855f7"  icon={<Trophy size={11} />} />
                  <StatBox label="Matches"  value={(team._count?.matchesAsA ?? 0) + (team._count?.matchesAsB ?? 0)}                                        icon={<Swords size={11} />} />
                  <StatBox label="Prize"    value={`â‚µ${((team.totalPrizeMoney ?? 0) / 100).toFixed(0)}`}                                  color="#f59e0b"  icon={<Award size={11} />} />
                </>
              )}
            </div>

            {/* Win rate bar */}
            {standing && total > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-600">
                  <span>{standing.wins}W â€” {standing.losses}L{standing.forfeits > 0 ? ` â€” ${standing.forfeits}F` : ''}</span>
                  <span style={{ color: tc }}>{wr}% Win Rate Â· {standing.season.name}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${tc}, ${tc}88)` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${wr}%` }}
                    transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* â”€â”€â”€ TROPHIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {team.trophies.length > 0 && (
          <div className="p-5 rounded-2xl bg-[#0c0c14] border border-amber-500/20 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest mr-2">
              <Trophy size={12} className="text-amber-400" /> Trophy Case
            </div>
            {team.trophies.map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-300">
                <Trophy size={10} className="text-amber-400" /> {t}
              </div>
            ))}
          </div>
        )}

        {/* â”€â”€â”€ PENDING INVITE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <AnimatePresence>
          {pendingInvite && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 rounded-3xl border-2 border-amber-500/40 shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${tc}15, #0c0c14)` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-white">Pending Team Invite!</h3>
                  <p className="text-xs text-amber-200/70">{team.name} has invited you to join.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider shrink-0">Your Role:</span>
                  <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
                    className="bg-black/60 border border-white/20 text-white font-bold text-xs p-2.5 rounded-xl outline-none focus:border-amber-500">
                    {Object.entries(ROLE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleRespond('accept')} disabled={respondingInvite}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2">
                    {respondingInvite ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Accept
                  </button>
                  <button onClick={() => handleRespond('decline')} disabled={respondingInvite}
                    className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs uppercase transition-all disabled:opacity-50 flex items-center gap-1.5">
                    <X size={13} /> Decline
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* â”€â”€â”€ TWO COLUMN LAYOUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Roster (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Starting 5 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: tc }} />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                  Starting Lineup â€” {starters.length} / 5
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                {starters.map((p, i) => (
                  <PlayerCard key={p.id} player={p} captainId={team.captainId} teamColor={tc} delay={i * 0.07} />
                ))}
                {emptySlots > 0 && Array.from({ length: emptySlots }).map((_, i) => (
                  <div key={`slot-${i}`}
                    className="rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.01] flex items-center justify-center"
                    style={{ minHeight: 200 }}>
                    <div className="text-center space-y-1.5">
                      <div className="w-10 h-10 rounded-2xl border border-dashed border-white/[0.07] flex items-center justify-center mx-auto">
                        <Users size={14} className="text-zinc-700" />
                      </div>
                      <p className="text-[9px] text-zinc-700 uppercase tracking-wider font-bold">Open Slot</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Substitutes */}
            {subs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-700" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                    Substitutes â€” {subs.length}
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {subs.map((p, i) => (
                    <PlayerCard key={p.id} player={p} captainId={team.captainId} teamColor={tc} delay={0.3 + i * 0.07} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info Sidebar (1/3 width) */}
          <div className="space-y-4">

            {/* Season */}
            {standing?.season && (
              <div className="rounded-2xl bg-[#0c0c14] border border-white/10 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar size={12} style={{ color: tc }} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Active Season</h4>
                </div>
                <p className="font-black text-white text-sm">{standing.season.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                    <span className="block text-2xl font-black" style={{ color: tc }}>#{standing.rank}</span>
                    <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Rank</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                    <span className="block text-2xl font-black text-white">{standing.points}</span>
                    <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Points</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
                    <span className="block text-sm font-black text-emerald-400">{standing.wins}</span>
                    <span className="text-[8px] text-zinc-600 uppercase">W</span>
                  </div>
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/15">
                    <span className="block text-sm font-black text-red-400">{standing.losses}</span>
                    <span className="text-[8px] text-zinc-600 uppercase">L</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <span className="block text-sm font-black" style={{ color: tc }}>{wr}%</span>
                    <span className="text-[8px] text-zinc-600 uppercase">WR</span>
                  </div>
                </div>
                {standing.forfeits > 0 && (
                  <p className="text-[10px] text-red-400/70 flex items-center gap-1">
                    <AlertCircle size={10} /> {standing.forfeits} forfeit{standing.forfeits > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {/* Prize money */}
            {(team.totalPrizeMoney ?? 0) > 0 && (
              <div className="rounded-2xl bg-[#0c0c14] border border-amber-500/20 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Award size={12} className="text-amber-400" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Earnings</h4>
                </div>
                <p className="text-3xl font-black text-amber-400">
                  â‚µ{((team.totalPrizeMoney) / 100).toLocaleString()}
                </p>
                <p className="text-[10px] text-zinc-600 mt-1">Cumulative prize winnings</p>
              </div>
            )}

            {/* Tournaments */}
            {team.registrations.length > 0 && (
              <div className="rounded-2xl bg-[#0c0c14] border border-white/10 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy size={12} style={{ color: tc }} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Tournaments ({team._count?.registrations ?? team.registrations.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {team.registrations.map((t, i) => {
                    const name   = t.tournament?.name   ?? t.name   ?? 'â€”';
                    const status = t.tournament?.status ?? t.status ?? '';
                    const sc: Record<string, string> = { ONGOING: '#10b981', COMPLETED: '#6b7280', UPCOMING: '#3b82f6', REGISTRATION: '#f59e0b' };
                    const col = sc[status] ?? '#6b7280';
                    return (
                      <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <Trophy size={11} style={{ color: col }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-white truncate">{name}</p>
                          <span className="text-[9px] uppercase font-bold" style={{ color: col }}>{status}</span>
                        </div>
                        <ChevronRight size={10} className="text-zinc-700 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Name history */}
            {team.nameHistory.length > 0 && (
              <div className="rounded-2xl bg-[#0c0c14] border border-white/10 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Activity size={12} style={{ color: tc }} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Name History</h4>
                </div>
                <div className="space-y-2">
                  {team.nameHistory.map((h, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-zinc-700 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-[11px]">
                          <span className="text-zinc-500 font-mono">[{h.oldTag}]</span>
                          <span className="text-zinc-400 ml-1">{h.oldName}</span>
                        </p>
                        <p className="text-[9px] text-zinc-700">{new Date(h.changedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Founded */}
            <div className="rounded-2xl bg-[#0c0c14] border border-white/[0.08] p-4 flex items-center gap-3">
              <Calendar size={12} className="text-zinc-600 shrink-0" />
              <div>
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Founded</p>
                <p className="text-xs font-bold text-zinc-300">
                  {new Date(team.registeredAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€â”€ APPLY MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#0d0d16] border border-white/10 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Swords size={18} style={{ color: tc }} />
                  <h3 className="text-base font-black uppercase tracking-tight text-white">Apply to {team.name}</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleApply} className="space-y-4">
                <textarea rows={4} value={applyMsg} onChange={e => setApplyMsg(e.target.value)}
                  placeholder="Introduce yourself â€” your role, signature heroes, and why you want to join..."
                  className="w-full bg-black/60 border border-white/10 text-white text-xs p-3 rounded-xl outline-none focus:border-amber-500 placeholder:text-zinc-600 resize-none"
                  required />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                    Cancel
                  </button>
                  <button type="submit" disabled={applying}
                    className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${tc}, ${tc}cc)`, color: '#000' }}>
                    {applying ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    Send Application
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
