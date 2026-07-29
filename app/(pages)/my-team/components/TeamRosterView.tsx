'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Crown, Users, Star, ArrowUpDown, Trash2, Copy, Check, Plus, Trophy,
  Loader2, UploadCloud, LogOut, UserX, AlertTriangle, X, Search, CheckCircle2
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

interface TeamInvite {
  id: string;
  toIGN?: string | null;
  toUser?: {
    id: string;
    ign: string;
    photo?: string | null;
  } | null;
  role?: string | null;
  createdAt?: string | null;
  sentAt?: string | null;
  expiresAt?: string | null;
}

interface AvailableUser {
  id: string;
  ign: string;
  photo: string | null;
  mainRole: string | null;
  region: string | null;
  openToOffers: boolean;
  inTeam: boolean;
  teamName: string | null;
  teamTag: string | null;
  hasPendingInvite: boolean;
}

interface TeamRosterViewProps {
  team: Team;
  isCaptain: boolean;
  currentUserId?: string;
  onRemovePlayer: (playerId: string) => Promise<void> | void;
  onLeaveTeam: (playerId: string) => Promise<void> | void;
  onEditPlayer: (playerId: string, updates: { role?: string; isSubstitute?: boolean; photo?: string | null }) => void;
  onInvitePlayer: (ign: string, role: string) => Promise<boolean | void> | void;
  onGenerateTeamCode: () => void;
  teamCode: string | null;
  generatingCode: boolean;
  invites?: TeamInvite[];
  onCancelInvite?: (inviteId: string) => Promise<void> | void;
}

const ROLE_COLORS: Record<string, string> = {
  EXP: '#e8a000',
  JUNGLE: '#ef4444',
  MID: '#a855f7',
  GOLD: '#10b981',
  ROAM: '#06b6d4',
};

export default function TeamRosterView({
  team,
  isCaptain,
  currentUserId,
  onRemovePlayer,
  onLeaveTeam,
  onEditPlayer,
  onInvitePlayer,
  onGenerateTeamCode,
  teamCode,
  generatingCode,
  invites = [],
  onCancelInvite,
}: TeamRosterViewProps) {
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [inviteIGN, setInviteIGN] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState('FLEX');
  const [isInviting, setIsInviting] = React.useState(false);
  const [editingPlayerId, setEditingPlayerId] = React.useState<string | null>(null);
  const [cancellingInviteId, setCancellingInviteId] = React.useState<string | null>(null);
  const [editRole, setEditRole] = React.useState('');
  const [editIsSub, setEditIsSub] = React.useState(false);
  const [editPhotoUrl, setEditPhotoUrl] = React.useState('');
  const [uploadingImage, setUploadingImage] = React.useState(false);

  // Available players / Search state
  const [availableUsers, setAvailableUsers] = React.useState<AvailableUser[]>([]);
  const [loadingAvailable, setLoadingAvailable] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [invitingUserId, setInvitingUserId] = React.useState<string | null>(null);

  const fetchAvailableUsers = React.useCallback(async (query: string) => {
    setLoadingAvailable(true);
    try {
      const res = await fetch(`/api/users/available?q=${encodeURIComponent(query)}&teamId=${team.id}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data.users || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingAvailable(false);
    }
  }, [team.id]);

  React.useEffect(() => {
    if (!isCaptain) return;
    const timer = setTimeout(() => {
      fetchAvailableUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isCaptain, fetchAvailableUsers]);

  // Modals state
  const [showLeaveModal, setShowLeaveModal] = React.useState(false);
  const [leavingTeam, setLeavingTeam] = React.useState(false);
  const [playerToRemove, setPlayerToRemove] = React.useState<Player | null>(null);
  const [removingPlayer, setRemovingPlayer] = React.useState(false);

  const currentUserPlayer = React.useMemo(() => {
    if (!currentUserId) return null;
    return team.players.find(
      (p) => p.user?.id === currentUserId || (p as any).userId === currentUserId
    );
  }, [team.players, currentUserId]);

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const imageDataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageDataUrl,
          type: "profiles",
          bucket: "images",
        }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setEditPhotoUrl(data.url);
        toast.success("Image uploaded!");
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const starters = team.players.filter((p) => !p.isSubstitute);
  const substitutes = team.players.filter((p) => p.isSubstitute);

  const handleCopyCode = () => {
    if (!teamCode) return;
    navigator.clipboard.writeText(teamCode);
    setCopiedCode(true);
    toast.success('Team Invite Code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Top Quick Actions & Team Code Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0f0f17] border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Trophy size={20} />
          </div>
          <div>
            <h3 className="text-white font-black text-sm uppercase tracking-wide">Squad Lineup & Roles</h3>
            <p className="text-zinc-400 text-xs font-medium">
              {team.players.length} Total Players ({starters.length} Starters · {substitutes.length} Subs)
            </p>
          </div>
        </div>

        {/* Action Buttons: Leave Squad & Team Invite Code */}
        <div className="flex flex-wrap items-center gap-3">
          {currentUserPlayer && (
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
            >
              <LogOut size={14} /> Leave Squad
            </button>
          )}

          {isCaptain && (
            <div className="flex items-center gap-2">
              {teamCode ? (
                <div className="flex items-center gap-2 bg-black/60 border border-white/10 px-3.5 py-2 rounded-xl text-xs font-mono">
                  <span className="text-zinc-400 text-[10px] font-sans uppercase font-bold">Invite Code:</span>
                  <span className="text-amber-400 font-black tracking-widest">{teamCode}</span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 rounded hover:bg-white/10 text-zinc-300 transition-colors"
                  >
                    {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={onGenerateTeamCode}
                  disabled={generatingCode}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {generatingCode ? 'Generating...' : 'Get Invite Code'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Add Player / Available Players Workflow */}
      {isCaptain && (
        <div className="p-5 rounded-2xl bg-gradient-to-b from-[#12121e] to-[#0a0a0f] border border-white/10 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Plus size={16} />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-white">
                  Add Player to Squad
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Search active players, view their status, or invite free agents not currently in a team
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Assign Role:</span>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-amber-400 font-bold outline-none focus:border-amber-500/50"
              >
                <option value="FLEX">FLEX</option>
                <option value="EXP">EXP</option>
                <option value="JUNGLE">JUNGLE</option>
                <option value="MID">MID</option>
                <option value="GOLD">GOLD</option>
                <option value="ROAM">ROAM</option>
              </select>
            </div>
          </div>

          {/* Search & Custom IGN bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search player by IGN (e.g. Shadow, Phantom)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500/50 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Manual invite button if typing exact IGN not in search list */}
            {searchQuery.trim() && !availableUsers.some(u => u.ign.toLowerCase() === searchQuery.trim().toLowerCase()) && (
              <button
                onClick={async () => {
                  const ign = searchQuery.trim();
                  if (!ign) return;
                  setIsInviting(true);
                  await onInvitePlayer(ign, inviteRole);
                  setIsInviting(false);
                  setSearchQuery('');
                  fetchAvailableUsers('');
                }}
                disabled={isInviting}
                className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
              >
                {isInviting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Invite &quot;{searchQuery.trim()}&quot;
              </button>
            )}
          </div>

          {/* Available Players Grid / List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {searchQuery ? `Search Results for "${searchQuery}"` : 'Available Free Agents (Not in a Team)'}
              </span>
              {loadingAvailable && <Loader2 size={12} className="animate-spin text-amber-400" />}
            </div>

            {availableUsers.length === 0 && !loadingAvailable ? (
              <div className="p-4 rounded-xl bg-black/30 border border-dashed border-white/10 text-center space-y-1">
                <p className="text-xs text-zinc-400 font-medium">
                  No matching players found.
                </p>
                <p className="text-[10px] text-zinc-500">
                  You can type any exact registered IGN above and click &quot;Invite&quot;.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {availableUsers.map((u) => {
                  const isInvitingThis = invitingUserId === u.id;
                  const roleColor = ROLE_COLORS[u.mainRole || 'FLEX'] || '#e8a000';

                  return (
                    <div
                      key={u.id}
                      className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-3 hover:border-white/15 transition-all"
                    >
                      {/* User Info */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-white/10 flex items-center justify-center text-xs font-black text-amber-400">
                          {u.photo ? (
                            <Image src={u.photo} alt={u.ign} fill className="object-cover" />
                          ) : (
                            u.ign.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <h5 className="text-xs font-black text-white truncate">{u.ign}</h5>
                            {u.mainRole && (
                              <span
                                className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase"
                                style={{ background: `${roleColor}20`, color: roleColor }}
                              >
                                {u.mainRole}
                              </span>
                            )}
                          </div>
                          
                          {/* Status Badge */}
                          <div className="mt-0.5 flex items-center gap-1">
                            {u.inTeam ? (
                              <span className="text-[9px] font-bold text-zinc-500 truncate">
                                On team [{u.teamTag || u.teamName}]
                              </span>
                            ) : u.hasPendingInvite ? (
                              <span className="text-[9px] font-bold text-amber-400 flex items-center gap-0.5">
                                <CheckCircle2 size={10} /> Invite Pending
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Not in a team
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Invite Button */}
                      {!u.inTeam && !u.hasPendingInvite && (
                        <button
                          onClick={async () => {
                            setInvitingUserId(u.id);
                            const ok = await onInvitePlayer(u.ign, inviteRole);
                            if (ok !== false) {
                              setAvailableUsers(prev => prev.map(item => item.id === u.id ? { ...item, hasPendingInvite: true } : item));
                            }
                            setInvitingUserId(null);
                          }}
                          disabled={isInvitingThis}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 transition-all shrink-0 disabled:opacity-50"
                        >
                          {isInvitingThis ? 'Sending...' : 'Invite'}
                        </button>
                      )}

                      {u.hasPendingInvite && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[9px] font-bold uppercase tracking-wider border border-amber-500/20 shrink-0">
                          Sent
                        </span>
                      )}

                      {u.inTeam && (
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-800/80 text-zinc-500 text-[9px] font-bold uppercase tracking-wider shrink-0">
                          In Team
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Sent Invites list for Captains */}
          {isCaptain && invites && invites.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-black/40 border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Pending Sent Invites ({invites.length})
                </span>
                <span className="text-[9px] text-zinc-500">You can cancel pending invites anytime</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {invites.map((inv) => {
                  const targetIgn = inv.toUser?.ign || inv.toIGN || 'Player';
                  const targetPhoto = inv.toUser?.photo;
                  const roleColor = ROLE_COLORS[inv.role || 'FLEX'] || '#e8a000';
                  const isCancellingThis = cancellingInviteId === inv.id;

                  return (
                    <div
                      key={inv.id}
                      className="p-2.5 rounded-lg bg-zinc-900/80 border border-white/10 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden text-[9px] font-black text-amber-400">
                          {targetPhoto ? (
                            <img src={targetPhoto} alt={targetIgn} className="w-full h-full object-cover" />
                          ) : (
                            targetIgn.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-xs font-bold text-white truncate">{targetIgn}</span>
                            {inv.role && (
                              <span className="text-[8px] font-black px-1 rounded uppercase" style={{ background: `${roleColor}20`, color: roleColor }}>
                                {inv.role}
                              </span>
                            )}
                          </div>
                          <span className="text-[8px] text-amber-400/80 font-mono">Pending response</span>
                        </div>
                      </div>

                      {onCancelInvite && (
                        <button
                          type="button"
                          onClick={async () => {
                            setCancellingInviteId(inv.id);
                            await onCancelInvite(inv.id);
                            setCancellingInviteId(null);
                          }}
                          disabled={isCancellingThis}
                          className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[9px] font-bold uppercase transition-all shrink-0"
                          title="Cancel Invite"
                        >
                          {isCancellingThis ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Starters Section (5 Players) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">
            Starting Five (Main Lineup)
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {starters.map((player) => {
            const roleColor = ROLE_COLORS[player.role] || '#e8a000';
            const isCapt = player.user?.id === team.captainId || player.id === team.captainId;
            const isSelf = currentUserPlayer?.id === player.id;
            const photoUrl = player.photo || player.user?.photo;

            return (
              <div
                key={player.id}
                className="relative bg-gradient-to-b from-[#12121a] to-[#0a0a0e] border border-white/10 rounded-2xl overflow-hidden p-4 shadow-xl flex flex-col justify-between group hover:border-white/20 transition-all"
              >
                {/* Captain Crown Badge */}
                {isCapt && (
                  <div className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 backdrop-blur-md">
                    <Crown size={10} /> Captain
                  </div>
                )}

                {/* Role Badge */}
                <div className="absolute top-3 right-3 z-10">
                  <span
                    className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest backdrop-blur-md border shadow-md"
                    style={{
                      background: `${roleColor}20`,
                      borderColor: `${roleColor}50`,
                      color: roleColor,
                    }}
                  >
                    {player.role}
                  </span>
                </div>

                {/* Portrait */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/10 my-2">
                  {photoUrl ? (
                    <Image src={photoUrl} alt={player.ign} fill className="object-cover object-top" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d14]">
                      <Users size={36} style={{ color: roleColor, opacity: 0.3 }} />
                    </div>
                  )}
                </div>

                {/* Player IGN & Controls */}
                <div className="space-y-2 text-center pt-1">
                  <h5 className="text-white font-black text-sm uppercase tracking-wide truncate flex items-center justify-center gap-1">
                    {player.ign}
                    {isSelf && (
                      <span className="text-[9px] text-amber-400 font-mono font-bold uppercase">(You)</span>
                    )}
                  </h5>

                  {/* Controls for Captain — shown on every card including own */}
                  {isCaptain && editingPlayerId !== player.id && (
                    <div className="flex gap-1 transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        onClick={() => {
                          setEditingPlayerId(player.id);
                          setEditRole(player.role);
                          setEditIsSub(player.isSubstitute);
                          setEditPhotoUrl(player.photo || '');
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20 transition-all"
                      >
                        Edit
                      </button>
                      {/* Only show Remove for other players, not self */}
                      {!isSelf && (
                        <button
                          onClick={() => setPlayerToRemove(player)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-500/20 transition-all"
                          title="Remove member"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Non-captain member's leave button */}
                  {isSelf && !isCaptain && (
                    <button
                      onClick={() => setShowLeaveModal(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-500/20 transition-all"
                    >
                      <LogOut size={12} /> Leave Squad
                    </button>
                  )}

                  {editingPlayerId === player.id && (
                    <div className="space-y-1.5 p-1.5 bg-black/40 rounded-lg border border-white/5 relative z-20">
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-xs text-white p-1 rounded"
                      >
                        <option value="EXP">EXP</option>
                        <option value="JUNGLE">JUNGLE</option>
                        <option value="MID">MID</option>
                        <option value="GOLD">GOLD</option>
                        <option value="ROAM">ROAM</option>
                        <option value="FLEX">FLEX</option>
                      </select>
                      <select
                        value={editIsSub ? "true" : "false"}
                        onChange={(e) => setEditIsSub(e.target.value === "true")}
                        className="w-full bg-white/5 border border-white/10 text-xs text-white p-1 rounded"
                      >
                        <option value="false">Starter</option>
                        <option value="true" disabled={team.players.length <= 5}>
                          Substitute {team.players.length <= 5 ? '(Needs 5 starters)' : ''}
                        </option>
                      </select>
                      <div className="flex flex-col gap-1.5">
                        {editPhotoUrl ? (
                          <div className="relative w-full h-16 rounded-lg overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={editPhotoUrl} alt="Player photo" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-1 transition-opacity">
                              <label className="bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black uppercase px-2 py-1 rounded cursor-pointer transition-colors">
                                {uploadingImage ? "..." : "Change"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handlePhotoUpload}
                                  disabled={uploadingImage}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => setEditPhotoUrl('')}
                                className="bg-red-500/30 text-red-300 hover:bg-red-500/50 text-[9px] font-bold uppercase px-2 py-1 rounded transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-1.5 w-full bg-white/5 hover:bg-white/10 border border-dashed border-white/20 text-[9px] text-zinc-300 py-2 rounded cursor-pointer transition-colors">
                            {uploadingImage ? (
                              <><Loader2 size={12} className="animate-spin text-amber-400" /> Uploading...</>
                            ) : (
                              <><UploadCloud size={12} className="text-amber-400" /> Upload Image File</>
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handlePhotoUpload} 
                              disabled={uploadingImage}
                            />
                          </label>
                        )}
                      </div>
                      <div className="flex gap-1 pt-1">
                        <button
                          onClick={() => {
                            onEditPlayer(player.id, { role: editRole, isSubstitute: editIsSub, photo: editPhotoUrl || null });
                            setEditingPlayerId(null);
                          }}
                          className="flex-1 bg-emerald-500/20 text-emerald-400 text-[9px] py-1 font-bold uppercase rounded border border-emerald-500/30 hover:bg-emerald-500/30"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPlayerId(null)}
                          className="flex-1 bg-white/5 text-zinc-400 text-[9px] py-1 font-bold uppercase rounded hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty Starter Slots */}
          {Array.from({ length: Math.max(0, 5 - starters.length) }).map((_, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center text-center space-y-2 min-h-[220px]"
            >
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-600">
                <Users size={18} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Starter Slot Open</p>
            </div>
          ))}
        </div>
      </div>

      {/* Substitutes Section */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">
            Substitutes & Reserves (Max 15)
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {substitutes.map((player) => {
            const roleColor = ROLE_COLORS[player.role] || '#a855f7';
            const isCapt = player.user?.id === team.captainId || player.id === team.captainId;
            const isSelf = currentUserPlayer?.id === player.id;
            const photoUrl = player.photo || player.user?.photo;

            return (
              <div
                key={player.id}
                className="relative bg-gradient-to-b from-[#12121a] to-[#0a0a0e] border border-white/10 rounded-2xl p-4 flex flex-col justify-between group hover:border-white/20 transition-all"
              >
                <div className="absolute top-3 right-3 z-10">
                  <span
                    className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border"
                    style={{
                      background: `${roleColor}20`,
                      borderColor: `${roleColor}40`,
                      color: roleColor,
                    }}
                  >
                    SUB · {player.role}
                  </span>
                </div>

                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/10 my-2">
                  {photoUrl ? (
                    <Image src={photoUrl} alt={player.ign} fill className="object-cover object-top" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d14]">
                      <Users size={32} className="text-zinc-600" />
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-center pt-1">
                  <h5 className="text-white font-black text-sm uppercase tracking-wide truncate flex items-center justify-center gap-1">
                    {player.ign}
                    {isSelf && (
                      <span className="text-[9px] text-amber-400 font-mono font-bold uppercase">(You)</span>
                    )}
                  </h5>

                  {isCaptain && editingPlayerId !== player.id && (
                    <div className="flex gap-1 transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        onClick={() => {
                          setEditingPlayerId(player.id);
                          setEditRole(player.role);
                          setEditIsSub(player.isSubstitute);
                          setEditPhotoUrl(player.photo || '');
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20 transition-all"
                      >
                        Edit
                      </button>
                      {!isSelf && (
                        <button
                          onClick={() => setPlayerToRemove(player)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-500/20 transition-all"
                          title="Remove member"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}

                  {isSelf && !isCaptain && (
                    <button
                      onClick={() => setShowLeaveModal(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-500/20 transition-all"
                    >
                      <LogOut size={12} /> Leave Squad
                    </button>
                  )}

                  {editingPlayerId === player.id && (
                    <div className="space-y-1.5 p-1.5 bg-black/40 rounded-lg border border-white/5 relative z-20">
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-xs text-white p-1 rounded"
                      >
                        <option value="EXP">EXP</option>
                        <option value="JUNGLE">JUNGLE</option>
                        <option value="MID">MID</option>
                        <option value="GOLD">GOLD</option>
                        <option value="ROAM">ROAM</option>
                        <option value="FLEX">FLEX</option>
                      </select>
                      <select
                        value={editIsSub ? "true" : "false"}
                        onChange={(e) => setEditIsSub(e.target.value === "true")}
                        className="w-full bg-white/5 border border-white/10 text-xs text-white p-1 rounded"
                      >
                        <option value="false" disabled={starters.length >= 5}>
                          Starter {starters.length >= 5 ? '(5/5 Starters Full)' : ''}
                        </option>
                        <option value="true">Substitute</option>
                      </select>
                      <div className="flex flex-col gap-1.5">
                        {editPhotoUrl ? (
                          <div className="relative w-full h-16 rounded-lg overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={editPhotoUrl} alt="Player photo" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-1 transition-opacity">
                              <label className="bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black uppercase px-2 py-1 rounded cursor-pointer transition-colors">
                                {uploadingImage ? "..." : "Change"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handlePhotoUpload}
                                  disabled={uploadingImage}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => setEditPhotoUrl('')}
                                className="bg-red-500/30 text-red-300 hover:bg-red-500/50 text-[9px] font-bold uppercase px-2 py-1 rounded transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-1.5 w-full bg-white/5 hover:bg-white/10 border border-dashed border-white/20 text-[9px] text-zinc-300 py-2 rounded cursor-pointer transition-colors">
                            {uploadingImage ? (
                              <><Loader2 size={12} className="animate-spin text-amber-400" /> Uploading...</>
                            ) : (
                              <><UploadCloud size={12} className="text-amber-400" /> Upload Image File</>
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handlePhotoUpload} 
                              disabled={uploadingImage}
                            />
                          </label>
                        )}
                      </div>
                      <div className="flex gap-1 pt-1">
                        <button
                          onClick={() => {
                            onEditPlayer(player.id, { role: editRole, isSubstitute: editIsSub, photo: editPhotoUrl || null });
                            setEditingPlayerId(null);
                          }}
                          className="flex-1 bg-emerald-500/20 text-emerald-400 text-[9px] py-1 font-bold uppercase rounded border border-emerald-500/30 hover:bg-emerald-500/30"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPlayerId(null)}
                          className="flex-1 bg-white/5 text-zinc-400 text-[9px] py-1 font-bold uppercase rounded hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {substitutes.length === 0 && (
            <div className="col-span-full p-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] text-center text-zinc-500 text-xs font-medium">
              No substitute players currently registered in the reserve roster.
            </div>
          )}
        </div>
      </div>

      {/* ── LEAVE TEAM CONFIRMATION MODAL ───────────────────────── */}
      <AnimatePresence>
        {showLeaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[#0e0e17] border border-red-500/30 rounded-3xl p-6 space-y-5 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <LogOut size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">Leave Squad</h3>
                  <p className="text-zinc-400 text-xs font-medium">Confirmation Required</p>
                </div>
              </div>

              <div className="space-y-3 bg-red-950/20 border border-red-500/20 p-4 rounded-2xl">
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Are you sure you want to leave <strong className="text-white font-bold">{team.name} [{team.tag}]</strong>?
                </p>
                <p className="text-[11px] text-red-400/90 font-medium">
                  You will be removed from the active roster and will no longer be eligible for squad matches, scrims, or leaderboards.
                </p>
                {isCaptain && team.players.length > 1 && (
                  <div className="pt-2 border-t border-red-500/20 text-[11px] text-amber-400 font-bold flex items-start gap-1.5">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>As Team Captain, you must transfer captaincy to another player before leaving the team.</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={leavingTeam || Boolean(isCaptain && team.players.length > 1)}
                  onClick={async () => {
                    if (!currentUserPlayer) {
                      toast.error("Could not locate your player profile on this team.");
                      return;
                    }
                    setLeavingTeam(true);
                    await onLeaveTeam(currentUserPlayer.id);
                    setLeavingTeam(false);
                    setShowLeaveModal(false);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  {leavingTeam ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                  <span>{isCaptain && team.players.length > 1 ? "Transfer Captaincy First" : "Confirm Leave"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── REMOVE MEMBER CONFIRMATION MODAL ───────────────────────── */}
      <AnimatePresence>
        {playerToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 0 }}
              className="w-full max-w-md bg-[#0e0e17] border border-red-500/30 rounded-3xl p-6 space-y-5 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setPlayerToRemove(null)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <UserX size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">Remove Member</h3>
                  <p className="text-zinc-400 text-xs font-medium">Captain Action</p>
                </div>
              </div>

              <div className="space-y-3 bg-red-950/20 border border-red-500/20 p-4 rounded-2xl">
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Are you sure you want to remove <strong className="text-white font-bold">{playerToRemove.ign}</strong> from <strong className="text-white">{team.name}</strong>?
                </p>
                <p className="text-[11px] text-zinc-400">
                  This player will be removed from your squad roster. They can be re-invited at any time.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPlayerToRemove(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={removingPlayer}
                  onClick={async () => {
                    setRemovingPlayer(true);
                    await onRemovePlayer(playerToRemove.id);
                    setRemovingPlayer(false);
                    setPlayerToRemove(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  {removingPlayer ? <Loader2 size={14} className="animate-spin" /> : <UserX size={14} />}
                  <span>Confirm Remove</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
