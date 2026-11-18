'use client';

import React, { useEffect, useState, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Trophy, MapPin, Swords, Check, X,
  Loader2, ArrowLeft, Send, CheckCircle2, AlertCircle,
  Star, TrendingUp, Activity, Award, Hash,
  Calendar, BarChart3, Flame, ChevronRight, ExternalLink, Share2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────

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

// ─── Role Config ─────────────────────────────────────────────

const ROLE_CFG: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ReactNode }> = {
  EXP: { color: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b30', label: 'EXP', icon: <Swords size={9} /> },
  JUNGLE: { color: '#ef4444', bg: '#ef444415', border: '#ef444430', label: 'Jungle', icon: <Flame size={9} /> },
  MID: { color: '#a855f7', bg: '#a855f715', border: '#a855f730', label: 'Mid', icon: <Star size={9} /> },
  GOLD: { color: '#10b981', bg: '#10b98115', border: '#10b98130', label: 'Gold', icon: <Award size={9} /> },
  ROAM: { color: '#06b6d4', bg: '#06b6d415', border: '#06b6d430', label: 'Roam', icon: <Shield size={9} /> },
  FLEX: { color: '#3b82f6', bg: '#3b82f615', border: '#3b82f630', label: 'Flex', icon: <Star size={9} /> },
};
const TIER_COLORS: Record<string, string> = { S: '#f59e0b', A: '#3b82f6', B: '#a855f7', C: '#6b7280' };

function rcfg(role: string) { return ROLE_CFG[role] ?? ROLE_CFG.FLEX; }

// ─── Sub-components ──────────────────────────────────────────

function StreakBadge({ streak }: { streak: string | null }) {
  if (!streak) return null;
  const win = streak.startsWith('W');
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${win ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
      }`}>
      {streak}
    </span>
  );
}

function StatBox({ label, value, color, icon }: { label: string; value: string | number; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-between p-3 rounded-xl bg-black/50 border border-white/10 backdrop-blur-md">
      <div className="flex items-center justify-between w-full text-zinc-400 text-[10px] font-mono uppercase tracking-wider">
        <span>{label}</span>
        {icon && <span style={{ color }}>{icon}</span>}
      </div>
      <div className="my-1 text-lg sm:text-xl font-black font-mono leading-tight" style={{ color: color || '#fff' }}>
        {value}
      </div>
    </div>
  );
}

function PlayerCard({ player, captainId, delay = 0 }: {
  player: Player; captainId: string; delay?: number;
}) {
  const r = rcfg(player.role);
  const photo = player.photo || player.user?.photo;
  const isCapt = player.user?.id === captainId || player.id === captainId;
  const hasStats = player.matchesPlayed > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Link
        href={`/players/${player.id}`}
        className={`group block relative rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${player.isSubstitute
          ? 'bg-[#0c0c16]/70 border-white/[0.06] hover:border-white/15'
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
                <span className="flex items-center gap-0.5 text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  CAPTAIN
                </span>
              )}
              {player.isSubstitute && (
                <span className="text-[8px] font-mono uppercase text-zinc-500 border border-white/[0.08] px-1.5 py-0.5 rounded">
                  SUB
                </span>
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
            <div className="min-w-0 w-full">
              <p className="font-black text-sm text-white uppercase tracking-tight group-hover:text-amber-400 transition-colors flex items-center justify-center gap-1 truncate">
                {player.ign}
                <ExternalLink size={10} className="text-zinc-600 group-hover:text-amber-400 transition-colors shrink-0" />
              </p>
              {player.signatureHero && (
                <p className="text-[10px] font-bold mt-0.5 truncate" style={{ color: `${r.color}90` }}>
                  {player.signatureHero}
                </p>
              )}
              {player.secondaryRole && (
                <p className="text-[9px] text-zinc-500 mt-0.5">+{player.secondaryRole}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="pt-2 border-t border-white/[0.06]">
            {hasStats ? (
              <div className="grid grid-cols-3 gap-1 text-center font-mono">
                <div>
                  <span className="block text-xs font-black" style={{ color: r.color }}>{player.kda.toFixed(1)}</span>
                  <span className="block text-[8px] text-zinc-500 uppercase">KDA</span>
                </div>
                <div>
                  <span className="block text-xs font-black text-emerald-400">{player.winRate.toFixed(0)}%</span>
                  <span className="block text-[8px] text-zinc-500 uppercase">WR</span>
                </div>
                <div>
                  <span className="block text-xs font-black text-amber-400">{player.mvpCount}</span>
                  <span className="block text-[8px] text-zinc-500 uppercase">MVP</span>
                </div>
              </div>
            ) : (
              <p className="text-[9px] text-zinc-600 italic text-center">No match data</p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function TeamProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = use(params);
  const { data: session, status: authStatus } = useSession();

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myTeam, setMyTeam] = useState<{ id: string; name: string; tag?: string } | null>(null);
  const [checkingMembership, setCheckingMembership] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const [pendingInvite, setPendingInvite] = useState<ReceivedInvite | null>(null);
  const [respondingInvite, setRespondingInvite] = useState(false);
  const [selectedRole, setSelectedRole] = useState('EXP');
  const [failedLogoSrc, setFailedLogoSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/teams/${routeId}`);
        const data = await res.json();
        let loaded = res.ok && data && !data.error ? (data as Team) : null;
        let invite: ReceivedInvite | null = null;
        let currentTeam: { id: string; name: string; tag?: string } | null = null;

        if (session?.user?.id) {
          const [invResult, myTeamResult] = await Promise.allSettled([
            fetch('/api/invites/received', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
            fetch('/api/my-team', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
          ]);

          if (myTeamResult.status === 'fulfilled' && myTeamResult.value?.id) {
            currentTeam = {
              id: myTeamResult.value.id,
              name: myTeamResult.value.name,
              tag: myTeamResult.value.tag,
            };
          }

          if (invResult.status === 'fulfilled' && invResult.value) {
            const id2 = invResult.value;
            const arr: ReceivedInvite[] = Array.isArray(id2) ? id2 : Array.isArray(id2?.data) ? id2.data : [];
            const tid = loaded?.id || routeId;
            invite = arr.find(i => (i.teamId === tid || i.id === routeId) && i.status === 'PENDING') || null;
            if (!loaded && invite?.teamId) {
              try {
                const fb = await fetch(`/api/teams/${invite.teamId}`);
                const fd = await fb.json();
                if (fb.ok && fd && !fd.error) loaded = fd as Team;
              } catch { /* ignore */ }
            }
          }
        }
        if (active) {
          setMyTeam(currentTeam);
          if (authStatus !== 'loading') setCheckingMembership(false);
          if (loaded) { setTeam(loaded); setPendingInvite(invite); }
          else setError((data as { error?: string })?.error || 'Squad not found');
        }
      } catch { if (active) setError('Failed to load squad'); }
      finally {
        if (active) {
          setLoading(false);
          if (authStatus !== 'loading') setCheckingMembership(false);
        }
      }
    }
    load();
    return () => { active = false; };
  }, [routeId, session?.user, authStatus]);

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
        toast.success(action === 'accept' ? 'Welcome to the squad!' : 'Invite declined');
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
    e.preventDefault();
    if (!team) return;
    if (myTeam) {
      toast.error(`You are already on squad "${myTeam.name}". Leave your current squad before applying.`);
      setShowModal(false);
      return;
    }
    setApplying(true);
    try {
      const res = await fetch(`/api/teams/${team.id}/apply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitch: applyMsg }),
      });
      const d = await res.json();
      if (res.ok) { toast.success('Application sent!'); setApplied(true); setShowModal(false); }
      else toast.error(d.error || 'Failed');
    } catch { toast.error('Failed'); }
    finally { setApplying(false); }
  };

  const handleShare = async () => {
    if (!team) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `${team.name} [${team.tag}] - Botsville Esports`,
          text: `Check out squad ${team.name} [${team.tag}] on Botsville Ghana!`,
          url,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Squad profile link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  };

  // ── Loading / Error ──────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-[#07070c] flex items-center justify-center pt-20">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={36} className="animate-spin text-amber-400" />
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Loading Squad...</p>
      </div>
    </div>
  );

  if (error || !team) return (
    <div className="min-h-screen bg-[#07070c] text-white flex items-center justify-center p-4 pt-20">
      <div className="max-w-md w-full p-8 rounded-3xl bg-[#0d0d14] border border-white/10 text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase">Squad Not Found</h2>
          <p className="text-zinc-500 text-xs mt-1">This squad profile could not be found.</p>
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

  // ── Computed ────────────────────────────────────────────────

  const starters = team.players.filter(p => !p.isSubstitute);
  const subs = team.players.filter(p => p.isSubstitute);
  const standing = team.standings?.[0] ?? null;
  const tc = team.color || '#f59e0b';
  const total = (standing?.wins ?? 0) + (standing?.losses ?? 0);
  const wr = total > 0 ? Math.round((standing!.wins / total) * 100) : 0;
  const isMember = Boolean(
    session?.user?.id &&
    (team.captainId === session.user.id ||
      myTeam?.id === team.id ||
      team.players.some(p => p.user?.id === session.user.id))
  );
  const inAnotherTeam = Boolean(myTeam && myTeam.id !== team.id);
  const canApply = Boolean(team.isRecruiting && !isMember && !inAnotherTeam && authStatus !== 'loading' && !checkingMembership);
  const emptySlots = Math.max(0, 5 - starters.length);
  const isLogoFailed = !team.logo || failedLogoSrc === team.logo;

  return (
    <div className="min-h-screen bg-[#07070c] text-white font-sans pt-20 sm:pt-22 md:pt-24 pb-20 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ─── UNIFIED HERO CARD (Same theme as /my-team) ────────── */}
        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 bg-[#0d1420] shadow-xl transition-all">
          {/* Banner Backdrop with high opacity so photo is clearly visible */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <Image
              src={team.banner || '/roles/exp.jpg'}
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 100vw, 1400px"
              className="object-cover opacity-85 transition-opacity"
            />
            {/* Clean bottom gradient for text contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a101a] via-[#0a101a]/55 to-black/20" />
          </div>

          {/* Main Hero Content */}
          <div className="relative z-10 p-4 sm:p-6 md:p-7 space-y-4 sm:space-y-5">
            {/* Top Bar: Back Link & Status Pills */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Link
                href="/teams"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 hover:border-white/25 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md transition-all active:scale-[0.98]"
              >
                <ArrowLeft size={13} />
                <span>All Squads</span>
              </Link>

              <div className="flex items-center gap-2">
                {standing?.tier && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border backdrop-blur-md"
                    style={{ background: `${TIER_COLORS[standing.tier]}20`, color: TIER_COLORS[standing.tier], borderColor: `${TIER_COLORS[standing.tier]}40` }}
                  >
                    {standing.tier}-Tier
                  </span>
                )}
                {team.isRecruiting ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[10px] sm:text-xs font-mono font-bold tracking-wider uppercase backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    Recruiting Open
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-white/10 text-zinc-400 text-[10px] sm:text-xs font-mono font-bold tracking-wider uppercase backdrop-blur-md">
                    Roster Full
                  </span>
                )}
                {standing && <StreakBadge streak={standing.streak} />}
              </div>
            </div>

            {/* Team Identity Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
              {/* Crest / Logo */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-black/60 border border-white/15 p-2 relative flex items-center justify-center shrink-0 shadow-lg backdrop-blur-sm overflow-hidden">
                {!isLogoFailed ? (
                  <Image
                    key={team.logo}
                    src={team.logo!}
                    alt={team.name}
                    fill
                    sizes="(max-width: 640px) 80px, 96px"
                    className="object-contain p-2"
                    onError={() => setFailedLogoSrc(team.logo)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-amber-400">
                    <Shield size={32} strokeWidth={1.5} className="text-amber-400/80 mb-0.5" />
                    <span className="text-[10px] font-mono font-black tracking-widest text-amber-300">
                      {team.tag || 'SQ'}
                    </span>
                  </div>
                )}
              </div>

              {/* Team Info / Name / Meta */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs sm:text-sm font-black tracking-widest">
                    [{team.tag}]
                  </span>
                  <span className="text-xs text-zinc-400 font-medium flex items-center gap-1">
                    <MapPin size={12} className="text-amber-400" /> {team.region || 'Ghana'}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight drop-shadow-md break-words">
                  {team.name}
                </h1>

                {team.captain && (
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <span>Captain:</span>
                    <strong className="text-white font-semibold">{team.captain.ign}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Tactical Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
              {standing ? (
                <>
                  <StatBox label="Rank" value={`#${standing.rank}`} color={tc} icon={<Hash size={12} />} />
                  <StatBox label="Wins" value={standing.wins} color="#10b981" icon={<TrendingUp size={12} />} />
                  <StatBox label="Losses" value={standing.losses} color="#ef4444" icon={<Activity size={12} />} />
                  <StatBox label="Win Rate" value={`${wr}%`} color={tc} icon={<BarChart3 size={12} />} />
                  <StatBox label="Points" value={standing.points.toLocaleString()} color={tc} icon={<Star size={12} />} />
                  <StatBox label="Tourn." value={team._count?.registrations ?? team.registrations.length} color="#a855f7" icon={<Trophy size={12} />} />
                </>
              ) : (
                <>
                  <StatBox label="Roster" value={team.players.length} color={tc} icon={<Users size={12} />} />
                  <StatBox label="Starters" value={`${starters.length}/5`} color="#10b981" icon={<Shield size={12} />} />
                  <StatBox label="Bench" value={subs.length} icon={<Star size={12} />} />
                  <StatBox label="Tourn." value={team._count?.registrations ?? team.registrations.length} color="#a855f7" icon={<Trophy size={12} />} />
                  <StatBox label="Matches" value={(team._count?.matchesAsA ?? 0) + (team._count?.matchesAsB ?? 0)} icon={<Swords size={12} />} />
                  <StatBox label="Prize" value={`₵${((team.totalPrizeMoney ?? 0) / 100).toFixed(0)}`} color="#f59e0b" icon={<Award size={12} />} />
                </>
              )}
            </div>

            {/* Win Rate Progress Bar if standing exists */}
            {standing && total > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[10px] font-mono uppercase text-zinc-400">
                  <span>{standing.wins}W — {standing.losses}L{standing.forfeits > 0 ? ` — ${standing.forfeits}F` : ''}</span>
                  <span style={{ color: tc }}>{wr}% Win Rate · {standing.season.name}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${wr}%`, background: tc }}
                  />
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2.5 border-t border-white/10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98]"
                >
                  <Share2 size={13} className="text-zinc-400" />
                  <span>Share Squad</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {isMember ? (
                  <Link
                    href="/my-team"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
                  >
                    <Shield size={14} /> My Squad Hub
                  </Link>
                ) : inAnotherTeam ? (
                  <span
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-xs font-mono font-bold uppercase tracking-wider select-none"
                    title="Leave your current squad before applying to another team"
                  >
                    <Shield size={13} className="text-zinc-500" />
                    Already in [{myTeam?.tag || myTeam?.name}]
                  </span>
                ) : canApply && (
                  <button
                    onClick={() => setShowModal(true)}
                    disabled={applied}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 active:scale-[0.98]"
                  >
                    {applied ? <><CheckCircle2 size={14} /> Applied!</> : <><Send size={14} /> Apply to Join</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── PENDING INVITE CARD (If invited by this squad) ───── */}
        <AnimatePresence>
          {pendingInvite && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#0d1420] to-[#0a101a] shadow-xl space-y-4"
            >
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-white">Pending Squad Invite!</h3>
                <p className="text-xs text-amber-200/80 mt-0.5">{team.name} invited you to join their official roster.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider shrink-0 font-mono">Role:</span>
                  <select
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value)}
                    className="bg-black/60 border border-white/15 text-white font-bold text-xs p-2.5 rounded-xl outline-none focus:border-amber-400"
                  >
                    {Object.entries(ROLE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRespond('accept')}
                    disabled={respondingInvite}
                    className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {respondingInvite ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Accept
                  </button>
                  <button
                    onClick={() => handleRespond('decline')}
                    disabled={respondingInvite}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 font-bold text-xs uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <X size={13} /> Decline
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── TROPHY CASE ──────────────────────────────────────── */}
        {team.trophies.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0c14] border border-amber-500/20 flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-mono font-bold uppercase tracking-widest mr-2">
              <Trophy size={13} className="text-amber-400" /> Trophy Case
            </div>
            {team.trophies.map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-300">
                <Trophy size={11} className="text-amber-400" /> {t}
              </div>
            ))}
          </div>
        )}

        {/* ─── TWO COLUMN LAYOUT: ROSTER & SQUAD INFO ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Starting Lineup & Reserves (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Starting 5 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Shield size={13} className="text-amber-400" />
                  Starting Lineup ({starters.length} / 5)
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
                {starters.map((p, i) => (
                  <PlayerCard key={p.id} player={p} captainId={team.captainId} delay={i * 0.05} />
                ))}
                {emptySlots > 0 && Array.from({ length: emptySlots }).map((_, i) => (
                  <div key={`slot-${i}`}
                    className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] flex items-center justify-center p-4 min-h-[220px]">
                    <div className="text-center space-y-1.5">
                      <div className="w-10 h-10 rounded-2xl border border-dashed border-white/10 flex items-center justify-center mx-auto">
                        <Users size={14} className="text-zinc-600" />
                      </div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono font-bold">Open Slot</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Substitutes */}
            {subs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Users size={13} className="text-zinc-500" />
                  Substitutes ({subs.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {subs.map((p, i) => (
                    <PlayerCard key={p.id} player={p} captainId={team.captainId} delay={0.2 + i * 0.05} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Info Sidebar (1/3 width) */}
          <div className="space-y-4">

            {/* Season Standings */}
            {standing?.season && (
              <div className="rounded-2xl bg-[#0c0c14] border border-white/10 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-amber-400" />
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Active Season</h4>
                </div>
                <p className="font-black text-white text-base">{standing.season.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                    <span className="block text-2xl font-black text-amber-400 font-mono">#{standing.rank}</span>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Rank</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                    <span className="block text-2xl font-black text-white font-mono">{standing.points}</span>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Points</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
                    <span className="block text-sm font-black text-emerald-400">{standing.wins}</span>
                    <span className="text-[8px] text-zinc-500 uppercase">W</span>
                  </div>
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/15">
                    <span className="block text-sm font-black text-red-400">{standing.losses}</span>
                    <span className="text-[8px] text-zinc-500 uppercase">L</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <span className="block text-sm font-black text-amber-300">{wr}%</span>
                    <span className="text-[8px] text-zinc-500 uppercase">WR</span>
                  </div>
                </div>
                {standing.forfeits > 0 && (
                  <p className="text-[10px] text-red-400/80 flex items-center gap-1 font-mono">
                    <AlertCircle size={11} /> {standing.forfeits} forfeit{standing.forfeits > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {/* Total Prize Earnings */}
            {(team.totalPrizeMoney ?? 0) > 0 && (
              <div className="rounded-2xl bg-[#0c0c14] border border-amber-500/20 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Award size={13} className="text-amber-400" />
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Total Earnings</h4>
                </div>
                <p className="text-3xl font-black text-amber-400 font-mono">
                  ₵{((team.totalPrizeMoney) / 100).toLocaleString()}
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">Cumulative tournament winnings</p>
              </div>
            )}

            {/* Tournaments */}
            {team.registrations.length > 0 && (
              <div className="rounded-2xl bg-[#0c0c14] border border-white/10 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy size={13} className="text-amber-400" />
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                    Tournaments ({team._count?.registrations ?? team.registrations.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {team.registrations.map((t, i) => {
                    const name = t.tournament?.name ?? t.name ?? '—';
                    const status = t.tournament?.status ?? t.status ?? '';
                    const sc: Record<string, string> = { ONGOING: '#10b981', COMPLETED: '#6b7280', UPCOMING: '#3b82f6', REGISTRATION: '#f59e0b' };
                    const col = sc[status] ?? '#6b7280';
                    return (
                      <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <Trophy size={12} style={{ color: col }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{name}</p>
                          <span className="text-[9px] uppercase font-mono font-bold" style={{ color: col }}>{status}</span>
                        </div>
                        <ChevronRight size={11} className="text-zinc-600 shrink-0" />
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
                  <Activity size={13} className="text-zinc-400" />
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Name History</h4>
                </div>
                <div className="space-y-2">
                  {team.nameHistory.map((h, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs">
                          <span className="text-zinc-500 font-mono">[{h.oldTag}]</span>
                          <span className="text-zinc-300 ml-1 font-medium">{h.oldName}</span>
                        </p>
                        <p className="text-[9px] text-zinc-600 font-mono">{new Date(h.changedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Founded */}
            <div className="rounded-2xl bg-[#0c0c14] border border-white/[0.08] p-4 flex items-center gap-3">
              <Calendar size={13} className="text-zinc-500 shrink-0" />
              <div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Founded</p>
                <p className="text-xs font-bold text-zinc-300">
                  {new Date(team.registeredAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── APPLY MODAL ──────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && canApply && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 sm:p-7 rounded-3xl bg-[#0d0d16] border border-white/10 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Swords size={18} className="text-amber-400" />
                  <h3 className="text-base font-black uppercase tracking-tight text-white">Apply to {team.name}</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleApply} className="space-y-4">
                <textarea
                  rows={4}
                  value={applyMsg}
                  onChange={e => setApplyMsg(e.target.value)}
                  placeholder="Introduce yourself — your main role, signature heroes, and why you want to join..."
                  className="w-full bg-black/60 border border-white/10 text-white text-xs p-3 rounded-xl outline-none focus:border-amber-400 placeholder:text-zinc-600 resize-none"
                  required
                />
                <div className="flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 text-xs font-bold uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={applying}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 transition-all shadow-md"
                  >
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
