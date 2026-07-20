'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Swords, Plus, Calendar, Clock, Trophy, Check, X, Shield, Send, Sparkles,
  Loader2, Globe, Users, ArrowRight, Flame, AlertCircle, Info, Lock
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface MatchChallenge {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'SCHEDULED';
  weekStart: string;
  createdAt: string;
  challengerTeamId: string;
  challengedTeamId?: string | null;
  message?: string | null;
  challengerTeam?: { id: string; name: string; tag: string; logo?: string | null } | null;
  challengedTeam?: { id: string; name: string; tag: string; logo?: string | null } | null;
  initiatedBy?: { id: string; ign: string } | null;
}

interface TeamOption {
  id: string;
  name: string;
  tag: string;
}

interface MyTeamInfo {
  id: string;
  name: string;
  tag: string;
  isCaptain: boolean;
}

export default function ChallengeArenaPage() {
  const { data: session } = useSession();
  const [challenges, setChallenges] = useState<MatchChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'open_board' | 'scheduled' | 'history'>('open_board');

  const [myTeam, setMyTeam] = useState<MyTeamInfo | null>(null);
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [challengeType, setChallengeType] = useState<'public' | 'direct'>('public');
  const [selectedRivalId, setSelectedRivalId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Structured challenge form fields
  const [challengeForm, setChallengeForm] = useState({
    preferredTime: '',
    format: 'BO3' as 'BO1' | 'BO3' | 'BO5',
    server: 'Classic' as 'Classic' | 'Brawl' | 'Ranked Draft',
    stakes: 'Clout' as 'Clout' | 'Bragging Rights' | 'Just Practice' | 'Community Hype' | 'Cash' | 'Custom',
    cashAmount: '',
    customStakes: '',
    taunt: '',
  });

  // ── Fetch User's Team Status ───────────────────────────────
  const fetchMyTeam = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/my-team');
      if (res.ok) {
        const d = await res.json();
        const t = d && (d.id ? d : d.team ? d.team : null);
        if (t && t.id) {
          setMyTeam({
            id: t.id,
            name: t.name,
            tag: t.tag,
            isCaptain: Boolean(t.isCaptain || t.captainId === session.user?.id),
          });
        }
      }
    } catch {
      // ignore
    }
  }, [session]);

  // ── Fetch All Challenges ────────────────────────────────────
  const fetchChallenges = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/matches/challenges');
      const d = await res.json();
      if (res.ok) {
        setChallenges(Array.isArray(d?.challenges) ? d.challenges : []);
      }
    } catch {
      toast.error('Failed to load Challenge Arena matches');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch Teams for Direct Challenge Selection ─────────────
  const fetchTeamOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/teams?limit=100');
      const d = await res.json();
      if (res.ok) {
        const list = (Array.isArray(d?.teams) ? d.teams : []).map((t: TeamOption) => ({
          id: t.id,
          name: t.name,
          tag: t.tag,
        }));
        setTeamOptions(list);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchMyTeam();
    fetchChallenges();
    fetchTeamOptions();
  }, [fetchMyTeam, fetchChallenges, fetchTeamOptions]);

  // ── Handle Accept Open/Direct Challenge ────────────────────
  const handleAcceptChallenge = async (challengeId: string) => {
    if (!session) {
      toast.error('Sign in to accept challenges', {
        action: { label: 'Sign in', onClick: () => window.location.href = '/login' },
      });
      return;
    }

    if (!myTeam) {
      toast.error('You must be in an active squad to accept challenges');
      return;
    }

    if (!myTeam.isCaptain) {
      toast.error('Only Team Captains can accept match challenges');
      return;
    }

    setAcceptingId(challengeId);
    try {
      const res = await fetch(`/api/matches/challenges/${challengeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      const d = await res.json();
      if (!res.ok) {
        throw new Error(d?.error || 'Failed to accept challenge');
      }
      toast.success('⚔️ Challenge Accepted! Match details are live.', {
        description: 'Tournament admins have been notified to schedule your match room.',
      });
      fetchChallenges();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to accept challenge');
    } finally {
      setAcceptingId(null);
    }
  };

  // ── Handle Post Challenge ──────────────────────────────────
  const handlePostChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTeam || !myTeam.isCaptain) {
      toast.error('Only Team Captains can post challenges');
      return;
    }

    if (challengeType === 'direct' && !selectedRivalId) {
      toast.error('Please select a rival team to challenge');
      return;
    }

    setSubmitting(true);
    try {
      // Build structured message body from form fields
      const stakesLabel = challengeForm.stakes === 'Custom'
        ? challengeForm.customStakes || 'Custom Stakes'
        : challengeForm.stakes === 'Cash'
          ? `Cash GHS ${challengeForm.cashAmount || '?'}`
          : challengeForm.stakes;

      const messageParts = [
        `📋 Format: ${challengeForm.format}`,
        `🌐 Server: ${challengeForm.server}`,
        `🏆 Stakes: ${stakesLabel}`,
        challengeForm.preferredTime
          ? `⏰ Preferred Time: ${new Date(challengeForm.preferredTime).toLocaleString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
          : `⏰ Time: Flexible / TBD`,
        challengeForm.taunt ? `💬 "${challengeForm.taunt}"` : null,
      ].filter(Boolean).join(' · ');

      const payload = {
        challengedTeamId: challengeType === 'direct' ? selectedRivalId : null,
        message: messageParts,
      };

      const res = await fetch('/api/matches/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || 'Failed to post challenge');

      toast.success(challengeType === 'public' ? '🔥 Public Challenge Posted to Arena!' : '⚔️ Direct Squad Challenge Sent!');
      setShowModal(false);
      setChallengeForm({ preferredTime: '', format: 'BO3', server: 'Classic', stakes: 'Clout', cashAmount: '', customStakes: '', taunt: '' });
      setSelectedRivalId('');
      fetchChallenges();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post challenge');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter Categories
  const openPublicChallenges = challenges.filter(
    (c) => c.status === 'PENDING' && !c.challengedTeamId
  );
  const directPendingChallenges = challenges.filter(
    (c) => c.status === 'PENDING' && c.challengedTeamId
  );
  const scheduledMatches = challenges.filter(
    (c) => c.status === 'ACCEPTED' || c.status === 'SCHEDULED'
  );

  return (
    <div className="min-h-screen bg-[#07070c] text-white pt-24 lg:pt-32 pb-20">
      {/* Background Glow Lights */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] pointer-events-none opacity-20 blur-[130px] bg-red-600/30" />

      {/* ── Hero Banner ────────────────────────────────────────── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 p-8 rounded-3xl bg-gradient-to-r from-red-950/40 via-[#12121c] to-[#07070c] border border-red-500/30 shadow-2xl relative overflow-hidden">
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest">
                <Swords size={12} /> Ghana MLBB Matchmaking
              </span>
              {myTeam && (
                <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase">
                  [{myTeam.tag}] {myTeam.name}
                </span>
              )}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-white">
              Challenge <span className="text-red-500">Arena</span>
            </h1>

            <p className="text-zinc-400 text-xs sm:text-sm max-w-xl leading-relaxed">
              Post public scrim challenges, accept rival listings, and battle for ranking points. Any active team captain can issue or accept open challenges!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 z-10">
            {myTeam?.isCaptain ? (
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-500 hover:opacity-90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-red-500/20 transition-all hover:scale-[1.02]"
              >
                <Swords size={16} />
                <span>Issue Match Challenge</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 font-bold flex items-center gap-2">
                <Lock size={14} className="text-amber-400" />
                <span>Only Team Captains Can Issue Challenges</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky Navigation Bar ──────────────────────────────── */}
      <div className="sticky top-20 z-40 bg-[#07070c]/90 backdrop-blur-xl border-y border-white/10 mb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 overflow-x-auto py-3 scrollbar-hide">
            {[
              { key: 'open_board', label: 'Public Challenge Board', icon: Globe, count: openPublicChallenges.length },
              { key: 'scheduled', label: 'Scheduled Scrims', icon: Calendar, count: scheduledMatches.length },
              { key: 'history', label: 'Direct Challenges', icon: Swords, count: directPendingChallenges.length },
            ].map((tab) => {
              const active = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 relative shrink-0 ${
                    active
                      ? 'bg-red-600 text-white shadow-xl shadow-red-600/30'
                      : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-white' : 'text-zinc-400'} />
                  <span>{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                      active ? 'bg-black/40 text-white' : 'bg-white/10 text-zinc-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content Area ──────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
            <Loader2 size={36} className="animate-spin text-red-500" />
            <p className="text-xs font-mono font-black uppercase tracking-widest text-zinc-500">Loading Scrim Listings...</p>
          </div>
        ) : activeTab === 'open_board' ? (
          /* ── Public Challenge Board ────────────────────────────── */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase tracking-wide text-white flex items-center gap-2">
                  <Flame className="text-red-500" size={20} /> Open Public Scrim Board
                </h3>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Public challenges posted by teams looking for an immediate opponent. Any squad captain can accept!
                </p>
              </div>
            </div>

            {openPublicChallenges.length === 0 ? (
              <div className="p-16 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] text-center space-y-3">
                <Swords size={48} className="text-zinc-700 mx-auto" />
                <h4 className="text-lg font-black uppercase text-zinc-400">No Open Public Challenges</h4>
                <p className="text-xs text-zinc-600 max-w-md mx-auto">
                  Be the first captain to post an open challenge for other teams to accept!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {openPublicChallenges.map((challenge) => {
                  const isMyChallenge = myTeam && challenge.challengerTeamId === myTeam.id;

                  return (
                    <div
                      key={challenge.id}
                      className="p-6 rounded-2xl bg-gradient-to-b from-[#12121a] to-[#0a0a0e] border border-white/10 hover:border-red-500/40 transition-all shadow-xl flex flex-col justify-between space-y-5 group"
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                          <Flame size={12} /> OPEN TO ANY SQUAD
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {new Date(challenge.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Team Info */}
                      <div className="flex items-center gap-4">
                        <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-zinc-900 border border-white/15 shrink-0 flex items-center justify-center text-amber-400 font-black text-xl">
                          {challenge.challengerTeam?.logo ? (
                            <Image src={challenge.challengerTeam.logo} alt={challenge.challengerTeam.name} fill className="object-cover" />
                          ) : (
                            challenge.challengerTeam?.tag || 'TEAM'
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                              [{challenge.challengerTeam?.tag}]
                            </span>
                          </div>
                          <h4 className="text-lg font-black uppercase tracking-wide text-white group-hover:text-red-400 transition-colors mt-0.5">
                            {challenge.challengerTeam?.name}
                          </h4>
                          {challenge.initiatedBy?.ign && (
                            <p className="text-[10px] text-zinc-500 font-medium">Posted by Captain {challenge.initiatedBy.ign}</p>
                          )}
                        </div>
                      </div>

                      {/* Message / Stakes Note */}
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-zinc-300 italic leading-relaxed">
                        "{challenge.message || 'Custom Draft Match — Ready to battle!'}"
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        {isMyChallenge ? (
                          <div className="w-full text-center py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-500 text-xs font-bold uppercase">
                            Your Squad's Open Listing
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAcceptChallenge(challenge.id)}
                            disabled={acceptingId === challenge.id}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:opacity-90 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                          >
                            {acceptingId === challenge.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Swords size={16} />
                            )}
                            <span>{acceptingId === challenge.id ? 'Accepting...' : 'Accept Challenge ⚔️'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'scheduled' ? (
          /* ── Scheduled Matches ─────────────────────────────────── */
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black uppercase tracking-wide text-white flex items-center gap-2">
                <Calendar className="text-emerald-400" size={20} /> Scheduled Scrim Battles
              </h3>
              <p className="text-zinc-400 text-xs mt-0.5">
                Confirmed match challenges scheduled between competing squads.
              </p>
            </div>

            {scheduledMatches.length === 0 ? (
              <div className="p-16 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] text-center space-y-3">
                <Calendar size={48} className="text-zinc-700 mx-auto" />
                <h4 className="text-lg font-black uppercase text-zinc-400">No Scheduled Scrims Currently</h4>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {scheduledMatches.map((match) => (
                  <div
                    key={match.id}
                    className="p-6 rounded-2xl bg-gradient-to-b from-[#12121a] to-[#0a0a0e] border border-white/10 space-y-5 shadow-xl"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                        ● CONFIRMED MATCH BATTLE
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        {new Date(match.weekStart).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 py-3 border-y border-white/5">
                      <div className="text-center flex-1 space-y-1">
                        <span className="text-xs font-mono font-black text-amber-400">[{match.challengerTeam?.tag}]</span>
                        <h4 className="text-white font-black text-base uppercase">{match.challengerTeam?.name}</h4>
                      </div>

                      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 font-black text-sm shrink-0">
                        VS
                      </div>

                      <div className="text-center flex-1 space-y-1">
                        <span className="text-xs font-mono font-black text-amber-400">[{match.challengedTeam?.tag}]</span>
                        <h4 className="text-white font-black text-base uppercase">{match.challengedTeam?.name}</h4>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Direct Challenges View ────────────────────────────── */
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black uppercase tracking-wide text-white flex items-center gap-2">
                <Swords className="text-amber-400" size={20} /> Direct Squad Challenges
              </h3>
              <p className="text-zinc-400 text-xs mt-0.5">
                Challenges issued directly to specific target teams.
              </p>
            </div>

            {directPendingChallenges.length === 0 ? (
              <div className="p-16 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] text-center space-y-3">
                <Shield size={48} className="text-zinc-700 mx-auto" />
                <h4 className="text-lg font-black uppercase text-zinc-400">No Direct Challenges Active</h4>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {directPendingChallenges.map((c) => (
                  <div key={c.id} className="p-6 rounded-2xl bg-[#0f0f17] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-amber-400">Direct Rival Challenge</span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="text-center flex-1">
                        <p className="text-white font-black text-sm uppercase">{c.challengerTeam?.name}</p>
                      </div>
                      <div className="text-red-400 font-black">VS</div>
                      <div className="text-center flex-1">
                        <p className="text-white font-black text-sm uppercase">{c.challengedTeam?.name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Issue Challenge Modal ─────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl mx-auto bg-[#0b0c14] border border-red-500/20 rounded-3xl shadow-2xl text-white my-6 flex flex-col max-h-[calc(100vh-3rem)]">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-7 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30">
                  <Swords size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-white">Issue Match Challenge</h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-0.5">Squad [{myTeam?.tag}] {myTeam?.name}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePostChallenge} className="p-7 space-y-7 overflow-y-auto flex-1">

              {/* ── Step 1: Challenge Type ───────────────────────── */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">01 — Visibility</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['public', 'direct'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setChallengeType(type)}
                      className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                        challengeType === type
                          ? 'bg-red-600/10 border-red-500/60 text-white'
                          : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      {challengeType === type && (
                        <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                          <Check size={10} className="text-white" />
                        </div>
                      )}
                      <span className="text-sm">{type === 'public' ? '🔥' : '🎯'}</span>
                      <p className="text-xs font-black uppercase mt-1">{type === 'public' ? 'Open Board' : 'Direct Target'}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
                        {type === 'public' ? 'Any squad captain can accept' : 'Challenge a specific rival team'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Team Selector */}
              {challengeType === 'direct' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Target Rival</p>
                  <select
                    value={selectedRivalId}
                    onChange={(e) => setSelectedRivalId(e.target.value)}
                    required
                    className="w-full bg-[#0d0e17] border border-white/10 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
                  >
                    <option value="">— Choose Rival Squad —</option>
                    {teamOptions.filter((t) => t.id !== myTeam?.id).map((t) => (
                      <option key={t.id} value={t.id}>[{t.tag}] {t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* ── Step 2: Match Setup Grid ─────────────────────── */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">02 — Match Setup</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                  {/* Preferred Time */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1.5 flex items-center gap-1.5">
                      <Clock size={11} /> Preferred Match Time
                    </label>
                    <input
                      type="datetime-local"
                      value={challengeForm.preferredTime}
                      onChange={(e) => setChallengeForm(f => ({ ...f, preferredTime: e.target.value }))}
                      className="w-full bg-[#0d0e17] border border-white/10 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
                    />
                    <p className="text-[9px] text-zinc-600 mt-1">Leave blank for flexible / TBD time.</p>
                  </div>

                  {/* Best Of Format */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1.5 flex items-center gap-1.5">
                      <Trophy size={11} /> Format
                    </label>
                    <div className="flex flex-col gap-2">
                      {(['BO1', 'BO3', 'BO5'] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setChallengeForm(prev => ({ ...prev, format: f }))}
                          className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                            challengeForm.format === f
                              ? 'bg-red-600/20 border-red-500/60 text-red-300'
                              : 'bg-white/[0.03] border-white/10 text-zinc-500 hover:text-white'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Server / Mode */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1.5 flex items-center gap-1.5">
                      <Globe size={11} /> Server
                    </label>
                    <div className="flex flex-col gap-2">
                      {(['Classic', 'Brawl', 'Ranked Draft'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setChallengeForm(prev => ({ ...prev, server: s }))}
                          className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                            challengeForm.server === s
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                              : 'bg-white/[0.03] border-white/10 text-zinc-500 hover:text-white'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stakes */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1.5 flex items-center gap-1.5">
                      <Flame size={11} /> Stakes
                    </label>
                    <div className="flex flex-col gap-2">
                      {(['Clout', 'Bragging Rights', 'Just Practice', 'Community Hype', 'Cash', 'Custom'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setChallengeForm(prev => ({ ...prev, stakes: s }))}
                          className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                            challengeForm.stakes === s
                              ? s === 'Cash'
                                ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                                : 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                              : 'bg-white/[0.03] border-white/10 text-zinc-500 hover:text-white'
                          }`}
                        >
                          {s === 'Clout' ? '👑 ' : s === 'Bragging Rights' ? '🏆 ' : s === 'Just Practice' ? '🎯 ' : s === 'Community Hype' ? '🔥 ' : s === 'Cash' ? '💵 ' : '✏️ '}{s}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Cash Price Input */}
                {challengeForm.stakes === 'Cash' && (
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-400 uppercase">GHS</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      value={challengeForm.cashAmount}
                      onChange={(e) => setChallengeForm(f => ({ ...f, cashAmount: e.target.value }))}
                      className="w-full bg-[#0d0e17] border border-emerald-500/40 rounded-xl p-3.5 pl-14 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-zinc-500">per team</span>
                  </div>
                )}

                {/* Custom Stakes Input */}
                {challengeForm.stakes === 'Custom' && (
                  <input
                    type="text"
                    placeholder="Describe your custom stakes..."
                    value={challengeForm.customStakes}
                    onChange={(e) => setChallengeForm(f => ({ ...f, customStakes: e.target.value }))}
                    className="w-full bg-[#0d0e17] border border-purple-500/30 rounded-xl p-3.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                )}
              </div>

              {/* ── Step 3: Taunt ────────────────────────────────── */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">03 — Trash Talk (Optional)</p>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={120}
                    placeholder="e.g. Don't sleep on us — we'll expose your defence 😤"
                    value={challengeForm.taunt}
                    onChange={(e) => setChallengeForm(f => ({ ...f, taunt: e.target.value }))}
                    className="w-full bg-[#0d0e17] border border-white/10 rounded-xl p-3.5 pr-16 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors italic"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-zinc-600">
                    {challengeForm.taunt.length}/120
                  </span>
                </div>
              </div>

              {/* ── Preview Banner ───────────────────────────────── */}
              <div className="p-4 rounded-2xl bg-black/50 border border-white/5 space-y-1.5">
                <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-2">Challenge Card Preview</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/20 text-[10px] text-red-300 font-bold">{challengeForm.format}</span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/20 text-[10px] text-amber-300 font-bold">{challengeForm.server}</span>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                    challengeForm.stakes === 'Cash'
                      ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-300'
                      : 'bg-purple-500/15 border-purple-500/20 text-purple-300'
                  }`}>
                    {challengeForm.stakes === 'Cash'
                      ? `💵 Cash GHS ${challengeForm.cashAmount || '?'} per team`
                      : challengeForm.stakes === 'Custom'
                        ? challengeForm.customStakes || 'Custom Stakes'
                        : challengeForm.stakes}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-zinc-400 font-bold">
                    ⏰ {challengeForm.preferredTime ? new Date(challengeForm.preferredTime).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Flexible'}
                  </span>
                </div>
                {challengeForm.taunt && (
                  <p className="text-[10px] text-zinc-400 italic mt-2 pt-2 border-t border-white/5">"{challengeForm.taunt}"</p>
                )}
              </div>

              {/* ── Submit Row ───────────────────────────────────── */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-3 rounded-2xl border border-white/10 text-zinc-400 text-xs font-bold uppercase hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-500 hover:opacity-90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-red-500/20 disabled:opacity-50 transition-all"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>{challengeType === 'public' ? '🔥 Post to Open Board' : '⚔️ Send Direct Challenge'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
