'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, User, Users, Plus, AlertCircle, X, Loader2, Trash2,
  Crown, ArrowUpDown, Send, Trophy, Swords, UserCheck, Settings,
  Sparkles, Camera, MapPin, Tag, Check, Copy, Clock, Mail
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
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
  sentAt?: string | null;
  createdAt?: string | null;
  fromUserId?: string | null;
  toUserId?: string | null;
  fromUser?: {
    id: string;
    ign: string;
    photo?: string | null;
    player?: { role?: string } | null;
    mainRole?: string | null;
  } | null;
  toUser?: {
    id: string;
    ign: string;
    photo?: string | null;
  } | null;
  toIGN?: string | null;
  message?: string | null;
  role?: string | null;
  team?: { id?: string; name?: string } | null;
}

export function MyTeamContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roster' | 'recruitment' | 'challenges' | 'settings'>('roster');

  // ── Sync Active Tab from URL Query Param (e.g. ?tab=recruitment) ──
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && ['roster', 'recruitment', 'challenges', 'settings'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copiedHeaderCode, setCopiedHeaderCode] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [challenges, setChallenges] = useState<MatchChallenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // ── Pending Applications (when user applied to squads) ──
  const [myApplications, setMyApplications] = useState<Array<{
    id: string;
    teamId: string;
    message: string | null;
    sentAt: string;
    team?: {
      id: string;
      name: string;
      tag: string;
      logo?: string | null;
      color?: string | null;
    };
  }>>([]);
  const [loadingMyApps, setLoadingMyApps] = useState(false);
  const [withdrawingAppId, setWithdrawingAppId] = useState<string | null>(null);

  // ── Received Invites (when squads invited the user) ──
  const [receivedInvites, setReceivedInvites] = useState<Array<any>>([]);
  const [loadingReceivedInvites, setLoadingReceivedInvites] = useState(false);
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);

  const fetchMyApplications = useCallback(async () => {
    try {
      setLoadingMyApps(true);
      const res = await fetch('/api/my-applications', { cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        setMyApplications(Array.isArray(d?.applications) ? d.applications : []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMyApps(false);
    }
  }, []);

  const fetchReceivedInvites = useCallback(async () => {
    try {
      setLoadingReceivedInvites(true);
      const res = await fetch('/api/invites/received', { cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        setReceivedInvites(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingReceivedInvites(false);
    }
  }, []);

  const handleWithdrawApplication = async (teamId: string) => {
    try {
      setWithdrawingAppId(teamId);
      const res = await fetch(`/api/my-applications?teamId=${teamId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Application withdrawn successfully');
        fetchMyApplications();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d?.error || 'Failed to withdraw application');
      }
    } catch {
      toast.error('Failed to withdraw application');
    } finally {
      setWithdrawingAppId(null);
    }
  };

  const handleRespondReceivedInvite = async (inviteId: string, action: 'accept' | 'decline') => {
    try {
      setRespondingInviteId(inviteId);
      const res = await fetch(`/api/invites/${inviteId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(action === 'accept' ? '🎉 Welcome to the squad!' : 'Invite declined');
        fetchReceivedInvites();
        fetchMyTeam();
      } else {
        toast.error(d?.error || 'Failed to respond to invite');
      }
    } catch {
      toast.error('Failed to respond to invite');
    } finally {
      setRespondingInviteId(null);
    }
  };

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
      fetchMyApplications();
      fetchReceivedInvites();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, fetchMyTeam, fetchMyApplications, fetchReceivedInvites]);

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

  // ── Edit / Substitute Player (Role / Swap / Promotion / Photo) ──────
  const handleEditPlayer = async (
    playerId: string,
    updates: {
      role?: string;
      isSubstitute?: boolean;
      photo?: string | null;
      replacePlayerId?: string;
      swapRoleWithPlayerId?: string;
      swapRoleIfTaken?: boolean;
      realName?: string | null;
    }
  ): Promise<boolean> => {
    if (!team) return false;
    try {
      const res = await fetch(`/api/teams/${team.id}/players/${playerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data?.message || 'Squad roster updated successfully');
        await fetchMyTeam();
        return true;
      } else {
        toast.error(data?.error || 'Failed to update squad player');
        return false;
      }
    } catch {
      toast.error('Network error updating player');
      return false;
    }
  };

  // ── Invite Player by IGN ──────────────────────────────────
  const handleInvitePlayer = async (ign: string, role: string): Promise<boolean> => {
    if (!team) return false;
    try {
      const res = await fetch(`/api/teams/${team.id}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toIGN: ign, ign, role }),
      });
      if (res.ok) {
        toast.success(`Invite sent to ${ign}!`);
        fetchInvites();
        return true;
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to send invite');
        return false;
      }
    } catch {
      toast.error('Error sending invite');
      return false;
    }
  };

  // ── Cancel Sent Invite ────────────────────────────────────
  const handleCancelInvite = async (inviteId: string) => {
    if (!team) return;
    try {
      const res = await fetch(`/api/teams/${team.id}/invites?inviteId=${inviteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Invite cancelled');
        fetchInvites();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to cancel invite');
      }
    } catch {
      toast.error('Error cancelling invite');
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

  const [uploadingHeaderBanner, setUploadingHeaderBanner] = useState(false);
  const [uploadingHeaderLogo, setUploadingHeaderLogo] = useState(false);

  const handleHeaderBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !team) return;
    setUploadingHeaderBanner(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageDataUrl = reader.result as string;
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageDataUrl, type: 'teams', bucket: 'images' }),
        });
        const data = await res.json();
        if (res.ok && data.url) {
          await handleUpdateTeamSettings({ banner: data.url });
          toast.success('Team banner updated!');
        } else {
          toast.error(data.error || 'Upload failed');
        }
        setUploadingHeaderBanner(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Upload failed');
      setUploadingHeaderBanner(false);
    }
  };

  const handleHeaderLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !team) return;
    setUploadingHeaderLogo(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageDataUrl = reader.result as string;
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageDataUrl, type: 'teams', bucket: 'images' }),
        });
        const data = await res.json();
        if (res.ok && data.url) {
          await handleUpdateTeamSettings({ logo: data.url });
          toast.success('Squad logo updated!');
        } else {
          toast.error(data.error || 'Upload failed');
        }
        setUploadingHeaderLogo(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Upload failed');
      setUploadingHeaderLogo(false);
    }
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

  // If user is not on a team, show Register / Join Squad Hero Banner & Active Applications/Invites
  if (!team) {
    return (
      <div className="min-h-screen bg-[#07070c] text-white pt-28 md:pt-36 pb-20 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Banner */}
          <div className="text-center space-y-8 p-10 rounded-3xl bg-gradient-to-b from-[#12121c] to-[#07070c] border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Shield size={40} />
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
                You Are Not in a Squad
              </h1>
              <p className="text-zinc-400 text-sm max-w-lg mx-auto leading-relaxed">
                Assemble your roster, register your clan tag, or apply to join an active squad competing in Botsville tournaments.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                href="/register-team"
                className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-wider text-xs shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                <Users size={16} /> Register New Squad
              </Link>
              <Link
                href="/teams"
                className="px-8 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-wider text-xs border border-white/10 transition-all flex items-center gap-2"
              >
                <Swords size={16} /> Explore Active Teams
              </Link>
            </div>
          </div>

          {/* Pending Applications Section */}
          {myApplications.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                  <Clock size={16} /> Your Pending Squad Applications ({myApplications.length})
                </h2>
                <span className="text-[10px] text-zinc-500 font-mono">Awaiting captain response</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myApplications.map((app) => (
                  <div
                    key={app.id}
                    className="p-5 rounded-2xl bg-[#0f0f18] border border-white/10 hover:border-amber-500/30 transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center font-black text-amber-400 overflow-hidden relative"
                            style={{ borderColor: app.team?.color ? `${app.team.color}50` : undefined }}
                          >
                            {app.team?.logo ? (
                              <Image src={app.team.logo} alt={app.team.name} fill className="object-cover" />
                            ) : (
                              <span>{app.team?.tag || 'SQ'}</span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-sm">{app.team?.name || 'Squad'}</h3>
                            <span className="text-[10px] font-mono text-zinc-400">Tag: [{app.team?.tag}]</span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                          <Clock size={11} className="animate-pulse" /> Pending
                        </span>
                      </div>

                      {app.message && (
                        <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                          <p className="text-[11px] text-zinc-300 italic leading-relaxed">
                            {app.message}
                          </p>
                        </div>
                      )}

                      <div className="text-[10px] text-zinc-500 font-mono">
                        Submitted: {new Date(app.sentAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <Link
                        href={`/teams/${app.teamId}`}
                        className="text-[11px] text-zinc-400 hover:text-white font-bold uppercase tracking-wider transition-colors"
                      >
                        View Squad →
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleWithdrawApplication(app.teamId)}
                        disabled={withdrawingAppId === app.teamId}
                        className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {withdrawingAppId === app.teamId ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <X size={12} />
                        )}
                        <span>Withdraw</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Direct Invites Received Section */}
          {receivedInvites.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                  <Mail size={16} /> Direct Squad Invites Received ({receivedInvites.length})
                </h2>
                <span className="text-[10px] text-zinc-500 font-mono">Invited by squad captains</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {receivedInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-5 rounded-2xl bg-gradient-to-b from-[#121815] to-[#0c120f] border border-emerald-500/30 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-black/60 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 overflow-hidden relative">
                          {inv.team?.logo ? (
                            <Image src={inv.team.logo} alt={inv.team.name} fill className="object-cover" />
                          ) : (
                            <span>{inv.team?.tag || 'SQ'}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm">{inv.team?.name || 'Squad'}</h3>
                          <span className="text-[10px] font-mono text-zinc-400">Invited you to their roster</span>
                        </div>
                      </div>

                      {inv.message && (
                        <p className="text-xs text-emerald-200/80 italic bg-black/30 p-2.5 rounded-lg border border-emerald-500/20">
                          &ldquo;{inv.message}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-emerald-500/20">
                      <button
                        onClick={() => handleRespondReceivedInvite(inv.id, 'accept')}
                        disabled={respondingInviteId === inv.id}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                      >
                        {respondingInviteId === inv.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Check size={13} />
                        )}
                        <span>Accept Invite</span>
                      </button>

                      <button
                        onClick={() => handleRespondReceivedInvite(inv.id, 'decline')}
                        disabled={respondingInviteId === inv.id}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border border-white/10 transition-all disabled:opacity-50"
                      >
                        <X size={13} />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isCaptain = Boolean(team.isCaptain);
  const incomingApplications = invites.filter((inv) => (inv.fromUserId || inv.fromUser?.id) !== team.captainId);
  const sentInvites = invites.filter((inv) => (inv.fromUserId || inv.fromUser?.id) === team.captainId);

  return (
    <div className="min-h-screen bg-[#07070c] text-white pt-24 pb-20">
      {/* ── Squad Header Backdrop & Hero ───────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#0d0d14] shadow-2xl">
          {/* Cover Banner Backdrop */}
          <div className="relative h-48 sm:h-64 w-full bg-gradient-to-r from-amber-950/40 via-zinc-900 to-black overflow-hidden group">
            {team.banner ? (
              <Image src={team.banner} alt={team.name} fill className="object-cover opacity-60" priority />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/5" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d14] via-[#0d0d14]/40 to-transparent" />

            {/* Captain Banner File Upload Button Overlay */}
            {isCaptain && (
              <label className="absolute top-4 right-4 z-20 px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black/80 border border-white/15 text-white text-xs font-bold uppercase tracking-wider cursor-pointer backdrop-blur-md transition-all flex items-center gap-2">
                {uploadingHeaderBanner ? (
                  <><Loader2 size={14} className="animate-spin text-amber-400" /> Uploading Banner...</>
                ) : (
                  <><Camera size={14} className="text-amber-400" /> Change Banner</>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleHeaderBannerUpload}
                  disabled={uploadingHeaderBanner}
                />
              </label>
            )}
          </div>

          {/* Banner Content Body */}
          <div className="p-6 sm:p-8 -mt-16 sm:-mt-20 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              {/* Logo with Captain Upload Trigger */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-zinc-950 border-4 border-[#0d0d14] shadow-2xl overflow-hidden shrink-0 group/logo">
                {team.logo ? (
                  <Image src={team.logo} alt={team.name} fill className="object-cover" priority />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-amber-400 font-mono font-black text-2xl">
                    {team.tag}
                  </div>
                )}

                {isCaptain && (
                  <label className="absolute inset-0 bg-black/70 opacity-0 group-hover/logo:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white gap-1 p-2 text-center">
                    {uploadingHeaderLogo ? (
                      <Loader2 size={20} className="animate-spin text-amber-400" />
                    ) : (
                      <>
                        <Camera size={18} className="text-amber-400" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Change Logo</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleHeaderLogoUpload}
                      disabled={uploadingHeaderLogo}
                    />
                  </label>
                )}
              </div>

              {/* Team Titles & Identifiers */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-black uppercase tracking-wider">
                    [{team.tag}]
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <MapPin size={10} /> {team.region}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                    ● {team.status}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white truncate">
                  {team.name}
                </h1>

                <p className="text-zinc-400 text-xs">
                  {team.players.length} / 20 Registered Players ({team.players.filter((p) => !p.isSubstitute).length} Starters)
                </p>
              </div>
            </div>

            {/* Quick Team Code Copy Pill & Captain Badge */}
            <div className="flex flex-wrap items-center gap-3">
              {team.teamCode && (
                <div className="flex items-center gap-2 bg-black/70 border border-amber-500/30 px-3.5 py-1.5 rounded-xl">
                  <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Squad Code:</span>
                  <span className="text-amber-400 font-mono font-black text-xs tracking-widest">{team.teamCode}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(team.teamCode!);
                      setCopiedHeaderCode(true);
                      toast.success('Squad Join Code copied!');
                      setTimeout(() => setCopiedHeaderCode(false), 2000);
                    }}
                    className="p-1 rounded hover:bg-white/10 text-zinc-300 transition-colors ml-0.5"
                    title="Copy Squad Code"
                  >
                    {copiedHeaderCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
              )}
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
              { key: 'recruitment', label: 'Applications & Trials', icon: UserCheck, badge: incomingApplications.length },
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
                teamCode={team.teamCode || inviteCode}
                generatingCode={generatingCode}
                invites={sentInvites}
                onCancelInvite={handleCancelInvite}
              />
            )}

            {activeTab === 'recruitment' && (
              <TeamRecruitmentView
                isCaptain={isCaptain}
                isRecruiting={Boolean(team.isRecruiting)}
                onToggleRecruiting={handleToggleRecruiting}
                invites={incomingApplications}
                onAcceptInvite={handleAcceptInvite}
                onDeclineInvite={handleDeclineInvite}
                loadingInvites={loadingInvites}
                teamCode={team.teamCode}
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

export default function MyTeamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07070c] flex flex-col items-center justify-center pt-28 md:pt-36 text-center">
          <Loader2 size={36} className="animate-spin text-amber-400 mb-3" />
          <p className="text-xs font-mono font-black uppercase tracking-widest text-zinc-500">Loading Squad Hub...</p>
        </div>
      }
    >
      <MyTeamContent />
    </Suspense>
  );
}
