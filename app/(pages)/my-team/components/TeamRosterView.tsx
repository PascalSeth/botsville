'use client';

import React from 'react';
import Image from 'next/image';
import { Shield, Crown, Users, Star, ArrowUpDown, Trash2, Copy, Check, Plus, Trophy, Loader2, UploadCloud } from 'lucide-react';
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

interface TeamRosterViewProps {
  team: Team;
  isCaptain: boolean;
  onRemovePlayer: (playerId: string) => void;
  onEditPlayer: (playerId: string, updates: { role?: string; isSubstitute?: boolean; photo?: string | null }) => void;
  onInvitePlayer: (ign: string, role: string) => void;
  onGenerateTeamCode: () => void;
  teamCode: string | null;
  generatingCode: boolean;
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
  onRemovePlayer,
  onEditPlayer,
  onInvitePlayer,
  onGenerateTeamCode,
  teamCode,
  generatingCode,
}: TeamRosterViewProps) {
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [inviteIGN, setInviteIGN] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState('FLEX');
  const [isInviting, setIsInviting] = React.useState(false);
  const [editingPlayerId, setEditingPlayerId] = React.useState<string | null>(null);
  const [editRole, setEditRole] = React.useState('');
  const [editIsSub, setEditIsSub] = React.useState(false);
  const [editPhotoUrl, setEditPhotoUrl] = React.useState('');
  const [uploadingImage, setUploadingImage] = React.useState(false);

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

        {/* Team Invite Code */}
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

      {/* Direct IGN Invite Form */}
      {isCaptain && (
        <div className="p-4 rounded-xl bg-[#0a0a0f] border border-white/5 flex flex-col sm:flex-row items-center gap-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 shrink-0">
            <Plus size={14} className="inline mr-1" /> Add Player
          </h4>
          <input
            type="text"
            placeholder="Player IGN..."
            value={inviteIGN}
            onChange={(e) => setInviteIGN(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500/50"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none focus:border-amber-500/50"
          >
            <option value="FLEX">FLEX</option>
            <option value="EXP">EXP</option>
            <option value="JUNGLE">JUNGLE</option>
            <option value="MID">MID</option>
            <option value="GOLD">GOLD</option>
            <option value="ROAM">ROAM</option>
          </select>
          <button
            onClick={async () => {
              if (!inviteIGN.trim()) return;
              setIsInviting(true);
              await onInvitePlayer(inviteIGN.trim(), inviteRole);
              setIsInviting(false);
              setInviteIGN('');
            }}
            disabled={isInviting || !inviteIGN.trim()}
            className="px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-bold text-[10px] uppercase tracking-widest rounded-lg disabled:opacity-50 border border-emerald-500/30 transition-all w-full sm:w-auto"
          >
            {isInviting ? 'Sending...' : 'Send Invite'}
          </button>
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
                  <h5 className="text-white font-black text-sm uppercase tracking-wide truncate">
                    {player.ign}
                  </h5>

                  {isCaptain && !isCapt && editingPlayerId !== player.id && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      <button
                        onClick={() => onRemovePlayer(player.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-500/20 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
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
                        <option value="true">Substitute</option>
                      </select>
                      <div className="flex flex-col gap-1.5">
                        <input 
                          type="text" 
                          placeholder="Image URL (optional)" 
                          value={editPhotoUrl}
                          onChange={(e) => setEditPhotoUrl(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-[10px] text-white p-1.5 rounded outline-none focus:border-amber-500/50"
                        />
                        <label className="flex items-center justify-center gap-1.5 w-full bg-white/5 hover:bg-white/10 border border-dashed border-white/20 text-[9px] text-zinc-400 py-1.5 rounded cursor-pointer transition-colors">
                          {uploadingImage ? (
                            <><Loader2 size={10} className="animate-spin" /> Uploading...</>
                          ) : (
                            <><UploadCloud size={10} /> Upload Image File</>
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handlePhotoUpload} 
                            disabled={uploadingImage}
                          />
                        </label>
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
                  <h5 className="text-white font-black text-sm uppercase tracking-wide truncate">
                    {player.ign}
                  </h5>

                  {isCaptain && editingPlayerId !== player.id && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingPlayerId(player.id);
                          setEditRole(player.role);
                          setEditIsSub(player.isSubstitute);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onRemovePlayer(player.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-500/20 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
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
                        <option value="true">Substitute</option>
                      </select>
                      <div className="flex flex-col gap-1.5">
                        <input 
                          type="text" 
                          placeholder="Image URL (optional)" 
                          value={editPhotoUrl}
                          onChange={(e) => setEditPhotoUrl(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-[10px] text-white p-1.5 rounded outline-none focus:border-amber-500/50"
                        />
                        <label className="flex items-center justify-center gap-1.5 w-full bg-white/5 hover:bg-white/10 border border-dashed border-white/20 text-[9px] text-zinc-400 py-1.5 rounded cursor-pointer transition-colors">
                          {uploadingImage ? (
                            <><Loader2 size={10} className="animate-spin" /> Uploading...</>
                          ) : (
                            <><UploadCloud size={10} /> Upload Image File</>
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handlePhotoUpload} 
                            disabled={uploadingImage}
                          />
                        </label>
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
    </div>
  );
}
