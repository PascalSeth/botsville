'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, User, Users, Plus, ChevronRight, AlertCircle, X, Loader2, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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
  region: string;
  logo: string | null;
  banner: string | null;
  status: string;
  captainId: string;
  isCaptain?: boolean;
  players: Player[];
}

export default function MyTeamPage() {
  const { data: session, status } = useSession();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMyTeam();
    }
  }, [status]);

  const fetchMyTeam = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/my-team');
      const data = await response.json();
      
      if (response.ok && data) {
        setTeam(data);
      } else {
        setTeam(null);
      }
    } catch (err) {
      console.error('Error fetching team:', err);
      setError('Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  const generateInviteCode = async () => {
    if (!team) return;
    setGeneratingCode(true);
    try {
      const response = await fetch(`/api/teams/${team.id}/invite-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxUses: 10, expiresAt: null }),
      });
      const data = await response.json();
      if (response.ok && data.link) {
        setInviteCode(data.link.code);
      }
    } catch (err) {
      console.error('Error generating invite:', err);
    } finally {
      setGeneratingCode(false);
    }
  };

  const removePlayer = async (playerId: string) => {
    if (!team || !confirm('Are you sure you want to remove this player?')) return;
    setRemovingPlayerId(playerId);
    try {
      const response = await fetch(`/api/teams/${team.id}/players/${playerId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchMyTeam();
      }
    } catch (err) {
      console.error('Error removing player:', err);
    } finally {
      setRemovingPlayerId(null);
    }
  };

  const roleColors: Record<string, string> = {
    EXP: '#e8a000',
    JUNGLE: '#22c55e',
    MAGE: '#a855f7',
    MARKSMAN: '#3b82f6',
    ROAM: '#f43f5e',
  };

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-[#e8a000] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
          <p className="text-[#666] mb-4">Please log in to view your team</p>
          <Link href="/login" className="bg-[#e8a000] text-black px-6 py-2 font-bold uppercase tracking-wider">
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#e8a000] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 bg-[#e8a000]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users size={32} className="text-[#e8a000]" />
          </div>
          <h1 className="text-2xl font-black tracking-wider uppercase mb-2">No Team Yet</h1>
          <p className="text-[#666] mb-6">You are not part of a team. Create one or wait for an invite!</p>
          <Link
            href="/register-team"
            className="inline-flex items-center gap-2 bg-[#e8a000] hover:bg-[#ffb800] text-black px-6 py-3 font-bold uppercase tracking-wider transition-colors"
          >
            <Plus size={16} /> Register a Team
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" style={{ fontFamily: "'Rajdhani', 'Barlow Condensed', sans-serif" }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
        * { font-family: 'Barlow Condensed', 'Rajdhani', sans-serif; }
      `}</style>

      {/* Banner */}
      <div className="relative h-48 bg-[#080810] overflow-hidden">
        {team.banner ? (
          <img src={team.banner} alt="" className="w-full h-full object-cover opacity-50" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#e8a000]/10 to-[#4a90d9]/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        
        {/* Logo overlapping banner */}
        <div className="absolute bottom-0 left-8 translate-y-1/2">
          <div className="w-24 h-24 border-4 border-[#0a0a0f] bg-[#0d0d14] overflow-hidden">
            {team.logo ? (
              <img src={team.logo} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Shield size={32} className="text-[#333]" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-[0.1em] uppercase">{team.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[#e8a000]/70 text-sm tracking-widest">[{team.tag}]</span>
              <span className="text-[#555]">·</span>
              <span className="text-[#666] text-sm">{team.region}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase ${
              team.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {team.status}
            </span>
          </div>
        </div>
      </div>

      {/* Players Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black tracking-[0.15em] uppercase border-l-2 border-[#e8a000] pl-3">
            Roster
          </h2>
          {team.isCaptain && (
            <div className="flex gap-2">
              <button
                onClick={() => { setShowManageModal(true); }}
                className="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 border border-white/10 text-[#888] hover:text-white hover:border-[#e8a000]/40 transition-colors"
              >
                Manage
              </button>
              <button
                onClick={() => { setShowInviteModal(true); generateInviteCode(); }}
                className="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 bg-[#e8a000]/10 border border-[#e8a000]/30 text-[#e8a000] hover:bg-[#e8a000]/20 transition-colors"
              >
                + Invite
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-3">
          {team.players.map((player) => {
            const roleColor = roleColors[player.role] || '#666';
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-4 bg-[#0c0c12] border border-white/[0.07]"
              >
                {/* Player Avatar */}
                <div className="w-12 h-12 border border-white/10 overflow-hidden bg-[#0d0d14] shrink-0">
                  {player.photo ? (
                    <img src={player.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User size={16} className="text-[#333]" />
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold tracking-wide uppercase truncate">{player.ign}</p>
                  <p className="text-[10px] tracking-widest uppercase" style={{ color: roleColor }}>
                    {player.role}
                    {player.isSubstitute && ' (Sub)'}
                  </p>
                </div>

                {/* Role indicator */}
                <div
                  className="w-1 h-8 rounded-full"
                  style={{ background: roleColor }}
                />
              </motion.div>
            );
          })}
        </div>

        {team.players.length < 5 && (
          <div className="mt-4 p-4 border border-dashed border-white/10 text-center">
            <p className="text-[#555] text-sm">Need {5 - team.players.length} more player(s) to complete roster</p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0c0c12] border border-white/10 p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black tracking-wider uppercase">Invite Players</h3>
                <button onClick={() => setShowInviteModal(false)} className="text-[#666] hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-[#888] text-sm mb-4">Share this code with players you want to invite:</p>
              
              {generatingCode ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-[#e8a000]" />
                </div>
              ) : inviteCode ? (
                <div className="bg-[#0d0d14] border border-[#e8a000]/30 p-4 text-center">
                  <p className="text-[#e8a000] text-2xl font-black tracking-[0.3em]">{inviteCode}</p>
                </div>
              ) : (
                <p className="text-[#666] text-center">Failed to generate invite code</p>
              )}
              
              <p className="text-[#555] text-xs mt-4 text-center">
                Players can use this code at /join to join your team
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manage Players Modal */}
      <AnimatePresence>
        {showManageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setShowManageModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0c0c12] border border-white/10 p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black tracking-wider uppercase">Manage Players</h3>
                <button onClick={() => setShowManageModal(false)} className="text-[#666] hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-2">
                {team.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-[#0d0d14] border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 border border-white/10 overflow-hidden bg-[#0d0d14]">
                        {player.photo ? (
                          <img src={player.photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User size={12} className="text-[#333]" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{player.ign}</p>
                        <p className="text-[10px] text-[#666] uppercase">{player.role}</p>
                      </div>
                    </div>
                    {player.user?.id !== session?.user?.id && (
                      <button
                        onClick={() => removePlayer(player.id)}
                        disabled={removingPlayerId === player.id}
                        className="text-[#666] hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {removingPlayerId === player.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
