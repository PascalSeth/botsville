'use client';

import { useEffect, useState } from 'react';
import { Copy, Loader2, Search, Send, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { TEAM_ROLES } from '@/lib/team-lineup';
import { invitedRole } from '@/lib/team-invites';
import TeamActionDialog, { buttonClass, primaryClass, fieldClass } from './TeamActionDialog';
import type { TeamPlayer, TeamRequest } from './team-types';
import styles from '../my-team.module.css';

interface Props {
  teamId: string;
  players: TeamPlayer[];
  isCaptain: boolean;
  isRecruiting: boolean;
  onToggleRecruiting: (value: boolean) => Promise<boolean>;
  invites: TeamRequest[];
  sentInvites: TeamRequest[];
  onAcceptInvite: (id: string, placement: { role: string; isSubstitute: boolean }) => Promise<boolean>;
  onDeclineInvite: (id: string) => Promise<boolean>;
  onInvitePlayer: (ign: string, role: string) => Promise<boolean>;
  onCancelInvite: (id: string) => Promise<boolean>;
  loadingInvites: boolean;
  teamCode?: string | null;
}
interface FreeAgent { id: string; ign: string; mainRole: string | null; inTeam: boolean; hasPendingInvite: boolean }

export default function TeamRecruitmentView({ teamId, players, isCaptain, isRecruiting, onToggleRecruiting, invites, sentInvites, onAcceptInvite, onDeclineInvite, onInvitePlayer, onCancelInvite, loadingInvites, teamCode }: Props) {
  const [view, setView] = useState<'applications' | 'invites'>('applications');
  const [review, setReview] = useState<TeamRequest | null>(null);
  const [role, setRole] = useState('EXP');
  const [sub, setSub] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [query, setQuery] = useState('');
  const [inviteRole, setInviteRole] = useState('EXP');
  const [agents, setAgents] = useState<FreeAgent[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searchVersion, setSearchVersion] = useState(0);
  const starters = players.filter(p => !p.isSubstitute);
  const openRoles = TEAM_ROLES.filter(r => !starters.some(p => p.role === r));
  const canStart = starters.length < 5 && openRoles.includes(role as typeof TEAM_ROLES[number]);

  useEffect(() => {
    if (!isCaptain || view !== 'invites') return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true); setSearchError(false);
      try {
        const res = await fetch('/api/users/available?q=' + encodeURIComponent(query) + '&teamId=' + teamId, { signal: controller.signal });
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setAgents(data.users || []);
      } catch { if (!controller.signal.aborted) setSearchError(true); }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, teamId, isCaptain, view, searchVersion]);

  const send = async (ign: string) => {
    if (busyId || !ign.trim()) return;
    setBusyId('send:' + ign);
    try { if (await onInvitePlayer(ign.trim(), inviteRole)) { setQuery(''); setSearchVersion(v => v + 1); } }
    finally { setBusyId(null); }
  };
  const respond = async (accept: boolean) => {
    if (!review || busyId) return;
    setBusyId(review.id);
    try {
      const ok = accept ? await onAcceptInvite(review.id, { role, isSubstitute: sub }) : await onDeclineInvite(review.id);
      if (ok) setReview(null);
    } finally { setBusyId(null); }
  };
  if (!isCaptain) return <div className="rounded-lg border border-white/10 bg-[#0f0f17] p-8 text-sm text-zinc-400">Your captain manages applications and invitations. Recruitment is currently {isRecruiting ? 'open' : 'paused'}.</div>;
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className={styles.eyebrow}>02 / Recruitment center</p><h2 className={styles.sectionTitle}>Build your squad<span className="text-amber-300">.</span></h2><p className="mt-2 text-sm text-zinc-400">Review applications or invite registered players to your team.</p></div><button className={buttonClass} disabled={toggling} onClick={async () => { setToggling(true); try { await onToggleRecruiting(!isRecruiting); } finally { setToggling(false); } }}>{toggling && <Loader2 size={15} className="animate-spin" />}{isRecruiting ? 'Pause applications' : 'Open applications'}</button></div>
    <div className="flex flex-col gap-4 rounded-lg border border-white/10 bg-[#101a28] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-white">{isRecruiting ? 'Applications open' : 'Applications paused'} · {players.length}/20 players</p><p className="mt-1 text-xs text-zinc-400">{openRoles.length ? 'Open starting roles: ' + openRoles.join(', ') : 'Starting lineup full. Recruit substitutes for your bench.'}</p></div>{teamCode && <button className={buttonClass} aria-label="Copy signup team code" onClick={async () => { try { await navigator.clipboard.writeText(teamCode); toast.success('Signup team code copied'); } catch { toast.error('Could not copy code'); } }}><span className="text-xs text-zinc-400">Signup code</span><span className="font-mono text-amber-400">{teamCode}</span><Copy size={14} /></button>}</div>
    <div className="flex flex-wrap gap-2" aria-label="Recruitment views"><button className={view === 'applications' ? primaryClass : buttonClass} aria-pressed={view === 'applications'} onClick={() => setView('applications')}><UserCheck size={16} />Applications ({invites.length})</button><button className={view === 'invites' ? primaryClass : buttonClass} aria-pressed={view === 'invites'} onClick={() => setView('invites')}><Send size={16} />Invitations ({sentInvites.length})</button></div>
    {view === 'applications' ? <section className="space-y-3" aria-label="Incoming applications">
      <p className="text-sm text-zinc-400">Review a player’s role and choose their place on the roster before accepting.</p>
      {loadingInvites ? <p className="py-8 text-sm text-zinc-400">Loading applications…</p> : !invites.length ? <div className="rounded-lg border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">No pending applications.</div> : invites.map(inv => <div key={inv.id} className="flex flex-col justify-between gap-4 rounded-lg border border-white/10 bg-[#101a28] p-5 sm:flex-row sm:items-center"><div className="min-w-0"><h3 className="font-bold text-white">{inv.fromUser?.ign || inv.toIGN}</h3><p className="mt-1 text-xs text-amber-400">Preferred role: {inv.role || invitedRole(inv.message) || inv.fromUser?.mainRole || 'Not specified'}</p>{inv.message && <p className="mt-2 break-words text-sm leading-relaxed text-zinc-400">{inv.message}</p>}<p className="mt-2 text-xs text-zinc-500">Applied {inv.sentAt ? new Date(inv.sentAt).toLocaleDateString() : 'recently'}</p></div><button className={buttonClass + ' shrink-0'} disabled={Boolean(busyId)} onClick={() => { setReview(inv); const preferred = inv.role || invitedRole(inv.message) || inv.fromUser?.mainRole || 'EXP'; setRole(TEAM_ROLES.includes(preferred as typeof TEAM_ROLES[number]) ? preferred : 'EXP'); setSub(true); }}>Review application</button></div>)}
    </section> : <div className="space-y-6">
      <section className="space-y-4 rounded-lg border border-white/10 bg-[#101a28] p-5"><h3 className="font-bold text-white">Invite a player</h3><p className="text-sm text-zinc-400">The player must accept your invitation. An occupied role joins as a substitute.</p><form className="grid items-end gap-3 sm:grid-cols-[1fr_140px_auto]" onSubmit={e => { e.preventDefault(); void send(query); }}><label className="space-y-2 text-xs text-zinc-400"><span className="flex items-center gap-2"><Search size={14} /> Player IGN</span><input className={fieldClass} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search or enter an exact IGN" /></label><label className="space-y-2 text-xs text-zinc-400"><span>Invited role</span><select className={fieldClass} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>{TEAM_ROLES.map(r => <option key={r}>{r}</option>)}</select></label><button type="submit" className={primaryClass} disabled={Boolean(busyId) || !query.trim() || players.length >= 20}>Send invite</button></form>
        {searching && <p className="text-xs text-zinc-500">Finding players…</p>}{searchError ? <p className="text-sm text-red-300">Player search could not load. You can still invite by exact IGN.</p> : <div className="divide-y divide-white/5">{agents.slice(0, 8).map(agent => <div key={agent.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-200">{agent.ign}</p><p className="text-xs text-zinc-500">{agent.mainRole || 'Any role'} · {agent.inTeam ? 'Already on a team' : agent.hasPendingInvite ? 'Request pending' : 'Free agent'}</p></div><button className={buttonClass} disabled={Boolean(busyId) || agent.inTeam || agent.hasPendingInvite || players.length >= 20} onClick={() => void send(agent.ign)}>{busyId === 'send:' + agent.ign ? 'Sending…' : 'Invite'}</button></div>)}</div>}
      </section>
      <section className="space-y-3"><h3 className="font-bold text-white">Sent invitations</h3>{loadingInvites ? <p className="text-sm text-zinc-400">Loading invitations…</p> : !sentInvites.length ? <p className="rounded-md border border-dashed border-white/10 p-6 text-sm text-zinc-500">No pending invitations.</p> : sentInvites.map(inv => <div key={inv.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 p-4"><div><p className="text-sm font-semibold text-white">{inv.toUser?.ign || inv.toIGN}</p><p className="mt-1 text-xs text-zinc-400">{inv.role || invitedRole(inv.message) || 'Any role'} ? Awaiting player response</p></div><button className={buttonClass} disabled={Boolean(busyId)} onClick={async () => { setBusyId(inv.id); try { if (await onCancelInvite(inv.id)) setSearchVersion(v => v + 1); } finally { setBusyId(null); } }}>{busyId === inv.id ? 'Cancelling…' : 'Cancel invite'}</button></div>)}</section>
    </div>}
    <TeamActionDialog open={Boolean(review)} onClose={() => setReview(null)} busy={Boolean(busyId)} title={'Review ' + (review?.fromUser?.ign || review?.toIGN || 'application')} description="Choose a role and roster position. Accepting adds this player to your team immediately.">
      <div className="space-y-5"><label className="block space-y-2 text-sm text-zinc-300"><span>Role</span><select className={fieldClass} value={role} onChange={e => { setRole(e.target.value); if (!openRoles.includes(e.target.value as typeof TEAM_ROLES[number])) setSub(true); }}>{TEAM_ROLES.map(r => <option key={r}>{r}</option>)}</select></label><label className="block space-y-2 text-sm text-zinc-300"><span>Roster position</span><select className={fieldClass} value={sub ? 'sub' : 'starter'} onChange={e => setSub(e.target.value === 'sub')}><option value="sub">Substitute</option><option value="starter" disabled={!canStart}>Starter{!canStart ? ' · role occupied or lineup full' : ''}</option></select></label><p className="rounded-md bg-amber-400/5 p-4 text-sm text-amber-100">{review?.fromUser?.ign || review?.toIGN} will join as {sub ? 'a substitute' : 'a starter'} for {role}. Existing players keep their positions.</p>{players.length >= 20 && <p className="text-sm text-red-300">Your roster is full. Remove a player before accepting another.</p>}<div className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5"><button className={buttonClass + ' !text-red-400'} disabled={Boolean(busyId)} onClick={() => void respond(false)}>Decline application</button><button className={primaryClass} disabled={Boolean(busyId) || players.length >= 20 || (!sub && !canStart)} onClick={() => void respond(true)}>{busyId && <Loader2 size={16} className="animate-spin" />}Accept as {sub ? 'substitute' : 'starter'}</button></div></div>
    </TeamActionDialog>
  </div>;
}
