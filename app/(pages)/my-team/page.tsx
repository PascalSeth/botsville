'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, User, Users, Plus, AlertCircle, X, Loader2, Trash2,
  Crown, ArrowUpDown, Send, Trophy, Swords, UserCheck, Settings,
  Sparkles, Camera, MapPin, Tag, Check, Copy
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';

import TeamRosterView from './components/TeamRosterView';
import TeamRecruitmentView from './components/TeamRecruitmentView';
import TeamChallengeArenaView from './components/TeamChallengeArenaView';
import TeamSettingsView from './components/TeamSettingsView';

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
  };
}

interface Team {
  id: string;
  name: string;
  tag: string;
  teamCode?: string | null;
  region: string;
  logo: string | null;
  banner: string | null;
  status: string;
  isRecruiting?: boolean;
  captainId: string;
  isCaptain?: boolean;
  players: Player[];
}

interface MatchChallenge {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'SCHEDULED';
  weekStart: string;
  createdAt: string;
  challengerTeamId: string;
  challengedTeamId: string;
  challengerTeam?: { id: string; name: string; tag: string } | null;
  challengedTeam?: { id: string; name: string; tag: string } | null;
}

interface TeamOption {
  id: string;
  name: string;
  tag: string;
}

interface TeamInvite {
  id: string;
  createdAt?: string | null;
  fromUser?: {
    id: string;
    ign: string;
    photo?: string | null;
    player?: { role?: string } | null;
    mainRole?: string | null;
  } | null;
  toIGN?: string | null;
  role?: string | null;
  team?: { id?: string; name?: string } | null;
}

export default function MyTeamPage() {
  const { data: session, status } = useSession();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roster' | 'recruitment' | 'challenges' | 'settings'>('roster');

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [challenges, setChallenges] = useState<MatchChallenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // ── Fetch User's Team ──────────────────────────────────────
  const fetchMyTeam = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/my-team');
      if (res.ok) {
        const d = await res.json();
        const teamObj = d && (d.id ? d : d.team ? d.team : null);
        if (teamObj && teamObj.id) {
          const isCapt = teamObj.captainId === session?.user?.id || Boolean(teamObj.isCaptain);
          setTeam({ ...teamObj, isCaptain: isCapt });
        } else {
          setTeam(null);
        }
      } else {
        setTeam(null);
      }
    } catch {
      toast.error('Failed to load team details');
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMyTeam();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, fetchMyTeam]);

  // ── Fetch Pending Applications/Invites ────────────────────
  const fetchInvites = useCallback(async () => {
    if (!team?.id) return;
    try {
      setLoadingInvites(true);
      const res = await fetch(`/api/teams/${team.id}/invites`, { cache: 'no-store' });
      const d = await res.json();
      if (res.ok) {
        setInvites(Array.isArray(d) ? d : Array.isArray(d?.invites) ? d.invites : []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingInvites(false);
    }
  }, [team?.id]);


  // ── Fetch Challenges ──────────────────────────────────────
  const fetchChallenges = useCallback(async () => {
    if (!team) return;
    try {
      setLoadingChallenges(true);
      const res = await fetch('/api/matches/challenges');
      const d = await res.json();
      if (res.ok) {
        setChallenges(Array.isArray(d?.challenges) ? d.challenges : []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingChallenges(false);
    }
  }, [team]);

  // ── Fetch Team Options for Challenge Select ───────────────
  const fetchTeamOptions = useCallback(async () => {
    if (!team) return;
    try {
      const res = await fetch('/api/teams?limit=100');
      const d = await res.json();
      if (res.ok) {
        const filtered = (Array.isArray(d?.teams) ? d.teams : []).filter((t: TeamOption) => t.id !== team.id);
        setTeamOptions(filtered);
      }
    } catch {
      // ignore
    }
  }, [team]);

  useEffect(() => {
    if (team) {
      fetchInvites();
      fetchChallenges();
      fetchTeamOptions();
    }
  }, [team, fetchInvites, fetchChallenges, fetchTeamOptions]);

  // ── Invite Code Generator ─────────────────────────────────
  const generateInviteCode = async () => {
    if (!team) return;
    setGeneratingCode(true);
    try {
      const res = await fetch(`/api/teams/${team.id}/invite-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxUses: 10 }),
      });
      const d = await res.json();
      if (res.ok && d.link?.code) {
        setInviteCode(d.link.code);
        toast.success('Generated Team Invite Code!');
      }
    } catch {
      toast.error('Failed to generate invite code');
    } finally {
      setGeneratingCode(false);
    }
  };

  // ── Remove Player from Roster ─────────────────────────────
  const handleRemovePlayer = async (playerId: string) => {
    if (!team) return;
    try {
      const res = await fetch(`/api/teams/${team.id}/players/${playerId}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('Player removed from squad');
        fetchMyTeam();
      } else {
        toast.error(data.error || 'Failed to remove player');
      }
    } catch {
      toast.error('Error removing player');
    }
  };

  // ── Leave Team ───────────────────────────────────────────
  const handleLeaveTeam = async (playerId: string) => {
    if (!team) return;
    try {
      const res = await fetch(`/api/teams/${team.id}/players/${playerId}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('You have left the squad');
        setTeam(null);
        fetchMyTeam();
      } else {
        toast.error(data.error || 'Failed to leave squad');
      }
    } catch {
      toast.error('Error leaving squad');
    }
  };

  // ── Edit Player (Role / Substitute / Photo) ───────────────────────
  const handleEditPlayer = async (playerId: string, updates: { role?: string; isSubstitute?: boolean; photo?: string | null }) => {
    if (!team) return;
    try {
      const res = await fetch(`/api/teams/${team.id}/players/${playerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        toast.success('Player updated');
        fetchMyTeam();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update player');
      }
    } catch {
      toast.error('Error updating player');
    }
  };

  // ── Invite Player by IGN ──────────────────────────────────
  const handleInvitePlayer = async (ign: string, role: string) => {
    if (!team) return;
    try {
      const res = await fetch(`/api/teams/${team.id}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ign, role }),
      });
      if (res.ok) {
        toast.success(`Invite sent to ${ign}!`);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to send invite');
      }
    } catch {
      toast.error('Error sending invite');
    }
  };

  // ── Toggle Recruiting ─────────────────────────────────────
  const handleToggleRecruiting = async (val: boolean) => {
    if (!team) return;
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRecruiting: val }),
      });
      if (res.ok) {
        setTeam((prev) => (prev ? { ...prev, isRecruiting: val } : prev));
        toast.success(val ? 'Recruitment opened!' : 'Recruitment paused');
      }
    } catch {
      toast.error('Failed to update recruitment state');
    }
  };

  // ── Respond to Applicant Invite ───────────────────────────
  const handleAcceptInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/invites/${inviteId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('Applicant accepted to roster!');
        fetchInvites();
        fetchMyTeam();
      } else {
        toast.error(data?.error || 'Failed to accept applicant');
      }
    } catch {
      toast.error('Failed to accept applicant');
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/invites/${inviteId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.info('Application declined');
        fetchInvites();
      } else {
        toast.error(data?.error || 'Failed to decline application');
      }
    } catch {
      toast.error('Failed to decline application');
    }
  };


  // ── Send Challenge ────────────────────────────────────────
  const handleSendChallenge = async (challengedTeamId: string) => {
    const res = await fetch('/api/matches/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengedTeamId }),
    });
    if (!res.ok) throw new Error('Challenge failed');
    fetchChallenges();
  };

  // ── Respond to Challenge ──────────────────────────────────
  const handleRespondChallenge = async (challengeId: string, action: 'accept' | 'reject') => {
    const res = await fetch(`/api/matches/challenges/${challengeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) throw new Error('Failed to respond to challenge');
    fetchChallenges();
  };

  // ── Update Squad Settings ─────────────────────────────────
  const handleUpdateTeamSettings = async (updates: Partial<Team>) => {
    if (!team) return;
    const res = await fetch(`/api/teams/${team.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update squad');
    setTeam((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070c] flex flex-col items-center justify-center pt-28 md:pt-36 text-center">
        <Loader2 size={36} className="animate-spin text-amber-400 mb-3" />
        <p className="text-xs font-mono font-black uppercase tracking-widest text-zinc-500">Loading Squad Hub...</p>
      </div>
    );
  }

  // If user is not on a team, show Register / Join Squad Hero Banner
  if (!team) {
    return (
      <div className="min-h-screen bg-[#07070c] text-white pt-28 md:pt-36 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8 p-10 rounded-3xl bg-gradient-to-b from-[#12121c] to-[#07070c] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Shield size={40} />
          </div>

          <div className="space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">
              No Active Squad Found
            </span>
            <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white">
              Join or Register Your Squad
            </h1>
            <p className="text-zinc-400 text-sm max-w-lg mx-auto leading-relaxed">
              Compete in official tournaments, challenge rival teams in scrims, and climb the Ghana MLBB Squad Leaderboard!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/register-team"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20"
            >
              Register New Squad
            </Link>
            <Link
              href="/teams"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-black uppercase tracking-wider transition-all"
            >
              Browse Squad Finder
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCaptain = Boolean(team.isCaptain);

  return (
    <div className="min-h-screen bg-[#07070c] text-white pt-24 lg:pt-32 pb-20">
      {/* ── Squad Header Banner ───────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#0c0c14] shadow-2xl">
          {/* Banner Image / Gradient */}
          <div className="h-44 sm:h-52 w-full relative bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-[#0c0c14]">
            {team.banner && (
              <Image src={team.banner} alt={team.name} fill className="object-cover opacity-30" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c14] via-[#0c0c14]/60 to-transparent" />
          </div>

          {/* Banner Content Body */}
          <div className="p-6 sm:p-8 -mt-16 sm:-mt-20 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="flex items-end gap-5">
              {/* Logo Avatar */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-zinc-900 border-2 border-white/20 shadow-2xl shrink-0">
                {team.logo ? (
                  <Image src={team.logo} alt={team.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#101018] text-amber-400 font-black text-2xl">
                    {team.tag}
                  </div>
                )}
              </div>

              {/* Title & Tag */}
              <div className="space-y-1 pb-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-black uppercase">
                    [{team.tag}]
                  </span>
                  <span className="text-zinc-400 text-xs font-bold uppercase">{team.region || 'Accra'}</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
                  {team.name}
                </h1>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-3">
              {isCaptain && (
                <span className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Crown size={14} /> Team Captain
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Glassmorphic Sticky Hub Navigation Bar ────────────── */}
      <div className="sticky top-20 z-40 bg-[#07070c]/90 backdrop-blur-xl border-y border-white/10 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 overflow-x-auto py-3 scrollbar-hide">
            {[
              { key: 'roster', label: 'Squad Roster', icon: Shield },
              { key: 'recruitment', label: 'Recruitment & Trials', icon: UserCheck, badge: invites.length },
              { key: 'challenges', label: 'Challenge Arena', icon: Swords, badge: challenges.length },
              { key: 'settings', label: 'Identity & Customization', icon: Settings },
            ].map((tab) => {
              const active = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 relative shrink-0 ${
                    active
                      ? 'bg-amber-500 text-black shadow-xl'
                      : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-black' : 'text-zinc-400'} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                        active ? 'bg-black/20 text-black' : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                  {active && (
                    <motion.div
                      layoutId="activeMyTeamTab"
                      className="absolute inset-0 rounded-2xl border-2 border-white/40 pointer-events-none"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Tab Content ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 'roster' && (
              <TeamRosterView
                team={team}
                isCaptain={isCaptain}
                currentUserId={session?.user?.id}
                onRemovePlayer={handleRemovePlayer}
                onLeaveTeam={handleLeaveTeam}
                onEditPlayer={handleEditPlayer}
                onInvitePlayer={handleInvitePlayer}
                onGenerateTeamCode={generateInviteCode}
                teamCode={inviteCode}
                generatingCode={generatingCode}
              />
            )}

            {activeTab === 'recruitment' && (
              <TeamRecruitmentView
                isCaptain={isCaptain}
                isRecruiting={Boolean(team.isRecruiting)}
                onToggleRecruiting={handleToggleRecruiting}
                invites={invites}
                onAcceptInvite={handleAcceptInvite}
                onDeclineInvite={handleDeclineInvite}
                loadingInvites={loadingInvites}
              />
            )}

            {activeTab === 'challenges' && (
              <TeamChallengeArenaView
                teamId={team.id}
                isCaptain={isCaptain}
                challenges={challenges}
                teamOptions={teamOptions}
                onSendChallenge={handleSendChallenge}
                onRespondChallenge={handleRespondChallenge}
                loadingChallenges={loadingChallenges}
              />
            )}

            {activeTab === 'settings' && (
              <TeamSettingsView
                team={team}
                isCaptain={isCaptain}
                onUpdateTeamSettings={handleUpdateTeamSettings}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
