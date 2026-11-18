'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, X, Loader2, Swords, UserCheck, Settings,
  Check, Clock, Mail, Gamepad2
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';

import TeamHero from './components/TeamHero';
import TeamRosterView from './components/TeamRosterView';
import TeamRecruitmentView from './components/TeamRecruitmentView';
import TeamChallengeArenaView from './components/TeamChallengeArenaView';
import TeamSettingsView from './components/TeamSettingsView';
import TeamLeadershipView from './components/TeamLeadershipView';
import styles from './my-team.module.css';
import type { TeamRequest } from './components/team-types';

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
  kind?: 'APPLICATION' | 'INVITE';
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
  const [teamLoadError, setTeamLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<'roster' | 'recruitment' | 'challenges' | 'settings'>('roster');

  // ── Sync Active Tab from URL Query Param (e.g. ?tab=recruitment) ──
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && ['roster', 'recruitment', 'challenges', 'settings'].includes(tab)) {
      setActiveTab(tab as typeof activeTab);
    }
  }, [searchParams]);

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
  const [, setLoadingMyApps] = useState(false);
  const [withdrawingAppId, setWithdrawingAppId] = useState<string | null>(null);

  // ── Received Invites (when squads invited the user) ──
  const [receivedInvites, setReceivedInvites] = useState<Array<TeamRequest & { team?: { name: string; tag: string; logo?: string | null } }>>([]);
  const [, setLoadingReceivedInvites] = useState(false);
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
  const fetchMyTeam = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true);
      setTeamLoadError(false);
      const res = await fetch('/api/my-team', { cache: 'no-store' });
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
        throw new Error('Unable to load team');
      }
    } catch {
      setTeamLoadError(true);
      toast.error('Failed to load team details. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMyTeam(true);
      fetchMyApplications();
      fetchReceivedInvites();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, fetchMyTeam, fetchMyApplications, fetchReceivedInvites]);

  // ── Fetch Pending Applications/Invites ────────────────────
  const fetchInvites = useCallback(async () => {
    if (!team?.id || !team.isCaptain) { setInvites([]); return; }
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
  }, [team?.id, team?.isCaptain]);


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

  // ── Remove Player from Roster ─────────────────────────────
  const handleRemovePlayer = async (playerId: string): Promise<boolean> => {
    if (!team) return false;
    try {
      const res = await fetch('/api/teams/' + team.id + '/players/' + playerId, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to update membership');
      toast.success('Player removed from squad');
      await fetchMyTeam();
      return true;
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update membership'); return false; }
  };
  // ── Leave Team ───────────────────────────────────────────
  const handleLeaveTeam = async (playerId: string): Promise<boolean> => {
    if (!team) return false;
    try {
      const res = await fetch('/api/teams/' + team.id + '/players/' + playerId, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to update membership');
      toast.success('You have left the squad');
      await fetchMyTeam();
      return true;
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update membership'); return false; }
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
  const handleCancelInvite = async (inviteId: string): Promise<boolean> => {
    if (!team) return false;
    try {
      const res = await fetch('/api/teams/' + team.id + '/invites?inviteId=' + inviteId, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel invite');
      toast.success('Invite cancelled');
      await fetchInvites();
      return true;
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to cancel invite'); return false; }
  };
  // ── Toggle Recruiting ─────────────────────────────────────
  const handleToggleRecruiting = async (isRecruiting: boolean): Promise<boolean> => {
    try { await handleUpdateTeamSettings({ isRecruiting }); toast.success(isRecruiting ? 'Applications opened' : 'Applications paused'); return true; }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to update recruitment'); return false; }
  };
  // ── Respond to Applicant Invite ───────────────────────────
  const handleAcceptInvite = async (inviteId: string, placement: { role: string; isSubstitute: boolean }): Promise<boolean> => {
    try {
      const res = await fetch('/api/invites/' + inviteId + '/respond', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept', ...placement }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to respond to application');
      toast.success(data.message || 'Application updated');
      await Promise.all([fetchInvites(), fetchMyTeam()]);
      return true;
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to respond to application'); return false; }
  };
  const handleDeclineInvite = async (inviteId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/invites/' + inviteId + '/respond', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'decline' }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to respond to application');
      toast.success(data.message || 'Application updated');
      await Promise.all([fetchInvites(), fetchMyTeam()]);
      return true;
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to respond to application'); return false; }
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
    if (!team) throw new Error('Team not loaded');
    const res = await fetch('/api/teams/' + team.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to save team settings');
    setTeam(prev => prev ? { ...prev, ...data.team, isCaptain: data.team.captainId === session?.user?.id } : prev);
  };

  const handleTransferCaptaincy = async (captainId: string): Promise<boolean> => {
    try {
      await handleUpdateTeamSettings({ captainId });
      setInvites([]);
      await fetchMyTeam();
      toast.success('Captaincy transferred. You are still on the team.');
      return true;
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to transfer captaincy'); return false; }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070c] flex flex-col items-center justify-center pt-20 text-center">
        <Loader2 size={36} className="animate-spin text-amber-400 mb-3" />
        <p className="text-xs font-mono font-black uppercase tracking-widest text-zinc-500">Loading Squad Hub...</p>
      </div>
    );
  }

  if (teamLoadError && !team) return <div className="min-h-screen bg-[#07070c] px-4 pt-24 text-center text-white"><p>Unable to load your team.</p><button className="mt-4 rounded-xl bg-amber-400 px-5 py-3 font-bold text-black" onClick={() => void fetchMyTeam(true)}>Try again</button></div>;

  // If user is not on a team, show Register / Join Squad Hero Banner & Active Applications/Invites
  if (!team) {
    return (
      <div className="min-h-screen bg-[#07070c] text-white pt-20 sm:pt-22 md:pt-24 pb-20 px-3 sm:px-4">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Hero Banner */}
          <div className="text-center space-y-5 sm:space-y-7 p-6 sm:p-10 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#121824] via-[#0d1420] to-[#07070c] border border-amber-500/20 shadow-2xl relative overflow-hidden">
            {/* Ambient cyber glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
              <Shield size={36} className="text-amber-400" />
            </div>

            <div className="space-y-2.5">
              <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full inline-block">
                Botsville Ghana // Free Agent Hub
              </span>
              <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                You Are Not in a Squad
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
                Assemble your roster, register your clan tag, or apply to join an active squad competing in Botsville tournaments.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
              <Link
                href="/register-team"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-wider text-xs shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Users size={16} /> Register New Squad
              </Link>
              <Link
                href="/teams"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-wider text-xs border border-white/10 transition-all flex items-center justify-center gap-2 min-h-[44px]"
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
                        disabled={Boolean(respondingInviteId)}
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
                        disabled={Boolean(respondingInviteId)}
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
  const incomingApplications = invites.filter(inv => inv.kind === 'APPLICATION');
  const sentInvites = invites.filter(inv => inv.kind === 'INVITE');

  const captain = team.players.find(player => player.user?.id === team.captainId);
  const tabs = [
    { key: 'roster', label: 'Lineup', mobileLabel: 'Lineup', detail: 'Players & positions', icon: Shield, badge: 0 },
    { key: 'recruitment', label: 'Recruitment', mobileLabel: 'Recruit', detail: 'Build your squad', icon: UserCheck, badge: incomingApplications.length },
    { key: 'challenges', label: 'Match lobby', mobileLabel: 'Matches', detail: 'Find your next rival', icon: Swords, badge: challenges.length },
    { key: 'settings', label: 'Team settings', mobileLabel: 'Settings', detail: 'Identity & captaincy', icon: Settings, badge: 0 },
  ] as const;

  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <TeamHero team={team} isCaptain={isCaptain} />
        <div className={styles.workspace}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarLabel + ' ' + styles.eyebrow}>Control room</div>
            <nav className={styles.tabs} aria-label="Team sections">
              {tabs.map(tab => <button key={tab.key} aria-current={activeTab === tab.key ? 'page' : undefined} onClick={() => setActiveTab(tab.key)} className={styles.navItem + (activeTab === tab.key ? ' ' + styles.navActive : '')}>
                <tab.icon size={17} strokeWidth={1.5} className="shrink-0" />
                <span className={styles.navText}><strong><span className={styles.desktopNavLabel}>{tab.label}</span><span className={styles.mobileNavLabel}>{tab.mobileLabel}</span></strong><small>{tab.detail}</small></span>
                {tab.badge > 0 && <span className={styles.navBadge}>{tab.badge}</span>}
              </button>)}
            </nav>
            <div className={styles.sidebarFoot}>
              <Gamepad2 size={24} strokeWidth={1} className="mb-4 text-slate-600" />
              <p className={styles.eyebrow}>Your squad</p>
              <p className="mt-3 text-xs font-semibold text-slate-300">{team.players.length} / 20 players</p>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Captain: {captain?.ign || 'Assigned'}</p>

            </div>
          </aside>
          <main className={styles.content}>
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>
                {activeTab === 'roster' && <TeamRosterView team={team} isCaptain={isCaptain} currentUserId={session?.user?.id} onRemovePlayer={handleRemovePlayer} onEditPlayer={handleEditPlayer} onOpenRecruitment={() => setActiveTab('recruitment')} onOpenSettings={() => setActiveTab('settings')} />}
                {activeTab === 'recruitment' && <TeamRecruitmentView teamId={team.id} players={team.players} isCaptain={isCaptain} isRecruiting={Boolean(team.isRecruiting)} onToggleRecruiting={handleToggleRecruiting} invites={incomingApplications} sentInvites={sentInvites} onAcceptInvite={handleAcceptInvite} onDeclineInvite={handleDeclineInvite} onInvitePlayer={handleInvitePlayer} onCancelInvite={handleCancelInvite} loadingInvites={loadingInvites} teamCode={team.teamCode} />}
                {activeTab === 'challenges' && <TeamChallengeArenaView teamId={team.id} isCaptain={isCaptain} challenges={challenges} teamOptions={teamOptions} onSendChallenge={handleSendChallenge} onRespondChallenge={handleRespondChallenge} loadingChallenges={loadingChallenges} />}
                {activeTab === 'settings' && <div className="space-y-8"><div><p className={styles.eyebrow}>04 / Team control</p><h2 className={styles.sectionTitle}>Team settings</h2><p className={styles.sectionSubtitle}>Your identity. Your captain. Your squad.</p></div><TeamLeadershipView team={team} isCaptain={isCaptain} currentUserId={session?.user?.id} onTransferCaptaincy={handleTransferCaptaincy} onLeaveTeam={handleLeaveTeam} /><TeamSettingsView team={team} isCaptain={isCaptain} onUpdateTeamSettings={handleUpdateTeamSettings} /></div>}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function MyTeamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07070c] flex flex-col items-center justify-center pt-20 text-center">
          <Loader2 size={36} className="animate-spin text-amber-400 mb-3" />
          <p className="text-xs font-mono font-black uppercase tracking-widest text-zinc-500">Loading Squad Hub...</p>
        </div>
      }
    >
      <MyTeamContent />
    </Suspense>
  );
}
