'use client';

import React, { useEffect, useState, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Crown, Users, Trophy, MapPin, Swords, Check, X,
  Loader2, Sparkles, ArrowLeft, Send, CheckCircle2, UserCheck, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Player {
  id: string;
  ign: string;
  role: string;
  photo: string | null;
  isSubstitute: boolean;
  user?: {
    id: string;
    ign: string;
    photo: string | null;
  } | null;
}

interface Team {
  id: string;
  name: string;
  tag: string;
  region: string;
  logo: string | null;
  banner: string | null;
  isRecruiting?: boolean;
  captainId: string;
  captain?: {
    id: string;
    ign: string;
    photo: string | null;
  } | null;
  players: Player[];
  _count?: {
    players: number;
    registrations: number;
    matchesAsA: number;
    matchesAsB: number;
  };
}

interface ReceivedInvite {
  id: string;
  teamId: string;
  status: string;
  team?: {
    id: string;
    name: string;
    tag: string;
  };
}

const ROLE_COLORS: Record<string, string> = {
  EXP: '#e8a000',
  JUNGLE: '#ef4444',
  MID: '#a855f7',
  GOLD: '#10b981',
  ROAM: '#06b6d4',
  FLEX: '#3b82f6',
};

export default function TeamProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status: authStatus } = useSession();

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invites & Applications state
  const [pendingInvite, setPendingInvite] = useState<ReceivedInvite | null>(null);
  const [respondingInvite, setRespondingInvite] = useState(false);
  const [selectedRole, setSelectedRole] = useState('EXP');

  // Application state
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicationSent, setApplicationSent] = useState(false);

  // Fetch Team profile
  useEffect(() => {
    async function fetchTeam() {
      try {
        setLoading(true);
        const res = await fetch(`/api/teams/${id}`);
        const data = await res.json();
        if (res.ok && data.data) {
          setTeam(data.data);
        } else {
          setError(data.error || 'Team not found');
        }
      } catch {
        setError('Failed to load team profile');
      } finally {
        setLoading(false);
      }
    }
    fetchTeam();
  }, [id]);

  // Check received invites for this user
  useEffect(() => {
    if (session?.user && id) {
      async function checkInvites() {
        try {
          const res = await fetch('/api/invites/received');
          const data = await res.json();
          if (res.ok && Array.isArray(data.data)) {
            const match = data.data.find(
              (inv: ReceivedInvite) => inv.teamId === id && inv.status === 'PENDING'
            );
            if (match) setPendingInvite(match);
          }
        } catch {
          // ignore
        }
      }
      checkInvites();
    }
  }, [session, id]);

  // Handle Respond to Invite
  const handleRespondInvite = async (action: 'accept' | 'decline') => {
    if (!pendingInvite) return;
    setRespondingInvite(true);
    try {
      const res = await fetch(`/api/invites/${pendingInvite.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, role: selectedRole }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(action === 'accept' ? '🎉 Welcome to the squad!' : 'Invite declined');
        setPendingInvite(null);
        // Refresh team profile
        const teamRes = await fetch(`/api/teams/${id}`);
        const teamData = await teamRes.json();
        if (teamRes.ok && teamData.data) setTeam(teamData.data);
      } else {
        toast.error(data.error || `Failed to ${action} invite`);
      }
    } catch {
      toast.error('Error processing response');
    } finally {
      setRespondingInvite(false);
    }
  };

  // Handle Application submission
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/teams/${team.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: applyMessage }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Application submitted to captain!');
        setApplicationSent(true);
        setShowApplyModal(false);
      } else {
        toast.error(data.error || 'Failed to submit application');
      }
    } catch {
      toast.error('Error submitting application');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-amber-400" />
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Loading Squad Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-[#07070c] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#0d0d14] border border-white/10 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Team Not Found</h2>
          <p className="text-zinc-400 text-sm">
            {error || "The squad you are looking for does not exist or may have been deleted."}
          </p>
          <div className="pt-2">
            <Link
              href="/teams"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all"
            >
              <ArrowLeft size={16} /> Explore All Teams
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const starters = team.players.filter(p => !p.isSubstitute);
  const substitutes = team.players.filter(p => p.isSubstitute);
  const isMember = session?.user?.id && team.players.some(p => p.user?.id === session.user.id);
  const isCaptain = session?.user?.id === team.captainId;

  return (
    <div className="min-h-screen bg-[#07070c] text-white pb-20 pt-20 lg:pt-24 font-sans">
      {/* ── Top Hero Banner ── */}
      <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden bg-zinc-950">
        {team.banner ? (
          <Image
            src={team.banner}
            alt={team.name}
            fill
            className="object-cover opacity-60"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-zinc-950 opacity-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070c] via-[#07070c]/50 to-transparent" />
        <div className="absolute inset-0 bg-radial-vignette opacity-70 pointer-events-none" />

        {/* Back Link */}
        <div className="absolute top-6 left-4 sm:left-8 z-20">
          <Link
            href="/teams"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-xs font-black uppercase tracking-wider transition-all"
          >
            <ArrowLeft size={14} /> All Squads
          </Link>
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-32 relative z-10 space-y-8">
        
        {/* ── Team Header Card ── */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0c14]/90 backdrop-blur-xl border border-white/10 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            
            {/* Logo + Title info */}
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-zinc-900 border-2 border-amber-500/40 shadow-2xl flex items-center justify-center shrink-0">
                {team.logo ? (
                  <Image src={team.logo} alt={team.name} fill className="object-cover" />
                ) : (
                  <Shield size={48} className="text-amber-400/80" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-black uppercase">
                    [{team.tag}]
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-400 text-xs font-bold uppercase flex items-center gap-1.5">
                    <MapPin size={12} className="text-amber-400" /> {team.region || 'Accra'}
                  </span>
                  {team.isRecruiting ? (
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Recruiting Free Agents
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-lg bg-zinc-800 border border-white/10 text-zinc-500 text-xs font-bold uppercase">
                      Roster Full
                    </span>
                  )}
                </div>

                <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
                  {team.name}
                </h1>

                {/* Captain badge */}
                {team.captain && (
                  <p className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                    <Crown size={14} className="text-amber-400" /> Captained by <strong className="text-white font-bold">{team.captain.ign}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions & Stats */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {isMember ? (
                <Link
                  href="/my-team"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Shield size={16} /> Open My Team Hub
                </Link>
              ) : team.isRecruiting && (
                <button
                  onClick={() => setShowApplyModal(true)}
                  disabled={applicationSent}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {applicationSent ? (
                    <>
                      <CheckCircle2 size={16} /> Application Sent
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Apply to Join Squad
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Lineup Size</span>
              <span className="text-lg font-black text-white font-mono">{team.players.length} Players</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Starters</span>
              <span className="text-lg font-black text-amber-400 font-mono">{starters.length} / 5</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Substitutes</span>
              <span className="text-lg font-black text-zinc-300 font-mono">{substitutes.length}</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Tournaments</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{team._count?.registrations || 0} Joined</span>
            </div>
          </div>
        </div>

        {/* ── Pending Invite Card (If Invited by Captain) ── */}
        <AnimatePresence>
          {pendingInvite && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-[#0c0c14] border-2 border-amber-500/40 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wide text-white">You have a Pending Team Invite!</h3>
                  <p className="text-xs text-amber-200/80">
                    {team.name} has invited you to join their official roster. Select your main role to accept.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider shrink-0">Your Role:</span>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="bg-black/60 border border-white/20 text-white font-bold text-xs p-2.5 rounded-xl outline-none focus:border-amber-500"
                  >
                    <option value="EXP">EXP Laner</option>
                    <option value="JUNGLE">Jungler</option>
                    <option value="MID">Mid Laner</option>
                    <option value="GOLD">Gold Laner</option>
                    <option value="ROAM">Roamer</option>
                    <option value="FLEX">Flex / Sub</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => handleRespondInvite('accept')}
                    disabled={respondingInvite}
                    className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {respondingInvite ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Accept & Join Squad
                  </button>

                  <button
                    onClick={() => handleRespondInvite('decline')}
                    disabled={respondingInvite}
                    className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <X size={14} /> Decline
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Starting Five Roster ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300">
              Starting Lineup ({starters.length} / 5 Starters)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {starters.map((player) => {
              const roleColor = ROLE_COLORS[player.role] || '#e8a000';
              const isCapt = player.user?.id === team.captainId || player.id === team.captainId;
              const photoUrl = player.photo || player.user?.photo;

              return (
                <div
                  key={player.id}
                  className="group relative p-4 rounded-2xl bg-[#0c0c14] border border-white/10 hover:border-amber-500/40 transition-all duration-300 space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono border"
                      style={{ background: `${roleColor}15`, color: roleColor, borderColor: `${roleColor}30` }}
                    >
                      {player.role || 'FLEX'}
                    </span>
                    {isCapt && (
                      <span className="flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Crown size={10} /> Captain
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-center text-center space-y-2 pt-2">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center text-amber-400 font-black text-lg">
                      {photoUrl ? (
                        <Image src={photoUrl} alt={player.ign} fill className="object-cover" />
                      ) : (
                        player.ign.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight text-white">
                        {player.ign}
                      </h4>
                      <p className="text-[10px] text-emerald-400 font-bold flex items-center justify-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active Starter
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Substitutes Roster ── */}
        {substitutes.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">
                Squad Substitutes ({substitutes.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {substitutes.map((player) => {
                const photoUrl = player.photo || player.user?.photo;
                return (
                  <div
                    key={player.id}
                    className="p-4 rounded-2xl bg-[#0c0c14]/60 border border-white/5 flex items-center gap-3"
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 font-black text-sm shrink-0">
                      {photoUrl ? (
                        <Image src={photoUrl} alt={player.ign} fill className="object-cover" />
                      ) : (
                        player.ign.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-tight text-white">{player.ign}</h4>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase block">{player.role || 'Substitute'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ── Apply Modal ── */}
      <AnimatePresence>
        {showApplyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-lg w-full p-6 rounded-3xl bg-[#0d0d14] border border-white/10 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Send size={18} className="text-emerald-400" />
                  <h3 className="text-base font-black uppercase tracking-wider text-white">
                    Apply to Join {team.name}
                  </h3>
                </div>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Message to Captain (Optional)
                  </label>
                  <textarea
                    rows={4}
                    value={applyMessage}
                    onChange={(e) => setApplyMessage(e.target.value)}
                    placeholder="Introduce yourself, your main hero preferences, peak rank, or why you want to join..."
                    className="w-full bg-black/60 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold uppercase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={applying}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {applying ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Submit Application
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
