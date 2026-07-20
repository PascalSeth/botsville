'use client';

import React, { useState } from 'react';
import { Swords, Plus, Calendar, Clock, Trophy, Check, X, Shield, Send, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

interface TeamChallengeArenaViewProps {
  teamId: string;
  isCaptain: boolean;
  challenges: MatchChallenge[];
  teamOptions: TeamOption[];
  onSendChallenge: (challengedTeamId: string) => Promise<void>;
  onRespondChallenge: (challengeId: string, action: 'accept' | 'reject') => Promise<void>;
  loadingChallenges: boolean;
}

export default function TeamChallengeArenaView({
  teamId,
  isCaptain,
  challenges,
  teamOptions,
  onSendChallenge,
  onRespondChallenge,
  loadingChallenges,
}: TeamChallengeArenaViewProps) {
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [selectedRivalId, setSelectedRivalId] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'scheduled' | 'pending' | 'open_board'>('scheduled');

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRivalId) {
      toast.error('Select a rival team to challenge');
      return;
    }
    setSending(true);
    try {
      await onSendChallenge(selectedRivalId);
      setShowChallengeModal(false);
      setSelectedRivalId('');
      toast.success('Match Challenge sent!');
    } catch {
      toast.error('Failed to send challenge');
    } finally {
      setSending(false);
    }
  };

  const pendingChallenges = challenges.filter((c) => c.status === 'PENDING');
  const scheduledMatches = challenges.filter((c) => c.status === 'ACCEPTED' || c.status === 'SCHEDULED');

  return (
    <div className="space-y-8">
      {/* Arena Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-red-950/40 via-[#12121a] to-[#07070c] border border-red-500/20 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Swords size={12} /> Scrim & Match Arena
            </span>
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tight text-white">
            Squad Rivalry & Challenges
          </h3>
          <p className="text-zinc-400 text-xs max-w-xl">
            Challenge rival squads to practice scrims, post open match listings, and track scheduled tournament matches.
          </p>
        </div>

        {isCaptain && (
          <div className="flex items-center gap-3">
            <a
              href="/challenge-arena"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-amber-500 hover:opacity-90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-red-500/20 transition-all hover:scale-[1.02]"
            >
              <Swords size={16} />
              <span>Go to Challenge Arena Page →</span>
            </a>
          </div>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveSubTab('scheduled')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeSubTab === 'scheduled'
              ? 'bg-white/10 text-white border border-white/20'
              : 'text-zinc-500 hover:text-white'
          }`}
        >
          Scheduled Matches ({scheduledMatches.length})
        </button>

        <button
          onClick={() => setActiveSubTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeSubTab === 'pending'
              ? 'bg-white/10 text-white border border-white/20'
              : 'text-zinc-500 hover:text-white'
          }`}
        >
          Pending Challenges ({pendingChallenges.length})
        </button>
      </div>

      {/* Content View */}
      {loadingChallenges ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Loader2 size={28} className="animate-spin text-red-500" />
          <span className="text-xs font-mono font-black uppercase tracking-widest text-zinc-500">Loading Challenge Arena...</span>
        </div>
      ) : activeSubTab === 'scheduled' ? (
        <div className="space-y-4">
          {scheduledMatches.length === 0 ? (
            <div className="p-12 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] text-center space-y-2">
              <Calendar size={36} className="text-zinc-600 mx-auto" />
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">No Scheduled Matches</p>
              <p className="text-zinc-600 text-xs">Accepted squad challenges and tournament matches will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledMatches.map((match) => (
                <div
                  key={match.id}
                  className="p-5 rounded-2xl bg-[#0f0f17] border border-white/10 space-y-4 shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
                      ● CONFIRMED MATCH
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      Week of {new Date(match.weekStart).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-2">
                    <div className="text-center flex-1">
                      <p className="text-white font-black text-sm uppercase">
                        {match.challengerTeam?.name || 'Challenger'}
                      </p>
                      <span className="text-[10px] font-mono text-zinc-500">[{match.challengerTeam?.tag}]</span>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-black text-xs">
                      VS
                    </div>

                    <div className="text-center flex-1">
                      <p className="text-white font-black text-sm uppercase">
                        {match.challengedTeam?.name || 'Challenged'}
                      </p>
                      <span className="text-[10px] font-mono text-zinc-500">[{match.challengedTeam?.tag}]</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {pendingChallenges.length === 0 ? (
            <div className="p-12 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] text-center space-y-2">
              <Swords size={36} className="text-zinc-600 mx-auto" />
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">No Pending Challenges</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingChallenges.map((c) => {
                const isIncoming = c.challengedTeamId === teamId;
                return (
                  <div
                    key={c.id}
                    className="p-5 rounded-2xl bg-[#0f0f17] border border-white/10 space-y-4 shadow-xl"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase">
                        {isIncoming ? '📥 Incoming Challenge' : '📤 Outgoing Challenge'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 py-2">
                      <div className="text-center flex-1">
                        <p className="text-white font-black text-sm uppercase">
                          {c.challengerTeam?.name || 'Challenger'}
                        </p>
                        <span className="text-[10px] font-mono text-zinc-500">[{c.challengerTeam?.tag}]</span>
                      </div>

                      <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-xs">
                        VS
                      </div>

                      <div className="text-center flex-1">
                        <p className="text-white font-black text-sm uppercase">
                          {c.challengedTeam?.name || 'Challenged'}
                        </p>
                        <span className="text-[10px] font-mono text-zinc-500">[{c.challengedTeam?.tag}]</span>
                      </div>
                    </div>

                    {isCaptain && isIncoming && (
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() => onRespondChallenge(c.id, 'accept')}
                          className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all"
                        >
                          Accept Match
                        </button>
                        <button
                          onClick={() => onRespondChallenge(c.id, 'reject')}
                          className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-black uppercase tracking-wider border border-white/10 transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Challenge Modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0e1017] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Swords className="text-red-500" size={18} /> Challenge A Rival Squad
              </h3>
              <button
                onClick={() => setShowChallengeModal(false)}
                className="p-1 rounded bg-white/5 text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateChallenge} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">
                  Select Opponent Team
                </label>
                <select
                  value={selectedRivalId}
                  onChange={(e) => setSelectedRivalId(e.target.value)}
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="">-- Choose Rival Team --</option>
                  {teamOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} [{t.tag}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChallengeModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 text-xs font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Issue Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
