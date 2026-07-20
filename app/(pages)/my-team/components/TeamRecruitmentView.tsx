'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { UserCheck, UserPlus, Shield, Check, X, Loader2, Sparkles, Send, Users, Star, Trophy } from 'lucide-react';
import { toast } from 'sonner';

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

interface TeamRecruitmentViewProps {
  isCaptain: boolean;
  isRecruiting: boolean;
  onToggleRecruiting: (val: boolean) => void;
  invites: TeamInvite[];
  onAcceptInvite: (inviteId: string) => void;
  onDeclineInvite: (inviteId: string) => void;
  loadingInvites: boolean;
}

const ROLES = [
  { key: 'EXP', label: 'EXP Lane', color: '#e8a000' },
  { key: 'JUNGLE', label: 'Jungle', color: '#ef4444' },
  { key: 'MID', label: 'Mid Lane', color: '#a855f7' },
  { key: 'GOLD', label: 'Gold Lane', color: '#10b981' },
  { key: 'ROAM', label: 'Roam', color: '#06b6d4' },
];

export default function TeamRecruitmentView({
  isCaptain,
  isRecruiting,
  onToggleRecruiting,
  invites,
  onAcceptInvite,
  onDeclineInvite,
  loadingInvites,
}: TeamRecruitmentViewProps) {
  const [selectedVacancies, setSelectedVacancies] = useState<string[]>(['JUNGLE', 'ROAM']);

  const toggleRoleVacancy = (roleKey: string) => {
    setSelectedVacancies((prev) =>
      prev.includes(roleKey) ? prev.filter((r) => r !== roleKey) : [...prev, roleKey]
    );
    toast.success('Vacant role updated');
  };

  return (
    <div className="space-y-8">
      {/* Captain Recruitment Control Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#12121a] via-[#0d0d15] to-[#07070c] border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={12} /> Scout & Trial Hub
            </span>
            {isRecruiting ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                ● Accepting Applications
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-zinc-500/10 border border-zinc-500/30 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                Recruitment Paused
              </span>
            )}
          </div>

          <h3 className="text-2xl font-black uppercase tracking-tight text-white">
            Squad Recruitment & Trials
          </h3>
          <p className="text-zinc-400 text-xs max-w-xl">
            Post specific role vacancies to attract free agents or scout incoming trial applications directly to your inbox.
          </p>
        </div>

        {isCaptain && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onToggleRecruiting(!isRecruiting)}
              className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg ${
                isRecruiting
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              {isRecruiting ? 'Pause Applications' : 'Open Recruitment'}
            </button>
          </div>
        )}
      </div>

      {/* Role Vacancies Configurations (What roles the team needs) */}
      <div className="p-6 rounded-2xl bg-[#0f0f17] border border-white/10 space-y-4">
        <div>
          <h4 className="text-white font-black text-sm uppercase tracking-wide">
            Seeking Role Vacancies
          </h4>
          <p className="text-zinc-400 text-xs mt-0.5">
            Select the active positions your squad is currently scouting for free agents.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {ROLES.map((r) => {
            const isSeeking = selectedVacancies.includes(r.key);
            return (
              <button
                key={r.key}
                disabled={!isCaptain}
                onClick={() => toggleRoleVacancy(r.key)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${
                  isSeeking
                    ? 'text-black shadow-md'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
                style={{
                  background: isSeeking ? r.color : undefined,
                  borderColor: isSeeking ? r.color : undefined,
                }}
              >
                <span>{r.label}</span>
                {isSeeking ? <Check size={14} className="text-black" /> : <UserPlus size={14} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Applications & Scout Inbox */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300 flex items-center gap-2">
            <UserCheck size={16} className="text-amber-400" /> Scout Inbox & Trial Requests ({invites.length})
          </h4>
        </div>

        {loadingInvites ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Loader2 size={28} className="animate-spin text-amber-400" />
            <span className="text-xs font-mono font-black uppercase tracking-widest text-zinc-500">Loading Applications...</span>
          </div>
        ) : invites.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] text-center space-y-2">
            <Users size={36} className="text-zinc-600 mx-auto" />
            <p className="text-xs font-black uppercase tracking-widest text-zinc-400">No Pending Applications</p>
            <p className="text-zinc-600 text-xs">When free agents apply for your squad, their profile cards will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invites.map((inv) => {
              const applicant = inv.fromUser;
              const mainRole = applicant?.mainRole || applicant?.player?.role || 'FLEX';

              return (
                <div
                  key={inv.id}
                  className="p-5 rounded-2xl bg-gradient-to-b from-[#12121a] to-[#0a0a0e] border border-white/10 space-y-4 hover:border-white/20 transition-all shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
                      {applicant?.photo ? (
                        <Image src={applicant.photo} alt={applicant.ign || 'Player'} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold">
                          {applicant?.ign?.slice(0, 2) || 'PL'}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h5 className="text-white font-black text-sm uppercase tracking-wide truncate">
                        {applicant?.ign || inv.toIGN || 'Applicant'}
                      </h5>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {mainRole}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons for Captain */}
                  {isCaptain && (
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => onAcceptInvite(inv.id)}
                        className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Check size={14} /> Accept
                      </button>

                      <button
                        onClick={() => onDeclineInvite(inv.id)}
                        className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border border-white/10 transition-all"
                      >
                        <X size={14} /> Decline
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
