'use client';

import { useState } from 'react';
import { Crown, LogOut, Loader2 } from 'lucide-react';
import TeamActionDialog, { buttonClass, primaryClass, fieldClass } from './TeamActionDialog';
import type { TeamPlayer } from './team-types';

export default function TeamLeadershipView({ team, isCaptain, currentUserId, onTransferCaptaincy, onLeaveTeam }: {
  team: { name: string; captainId: string | null; players: TeamPlayer[] };
  isCaptain: boolean;
  currentUserId?: string;
  onTransferCaptaincy: (userId: string) => Promise<boolean>;
  onLeaveTeam: (playerId: string) => Promise<boolean>;
}) {
  const [dialog, setDialog] = useState<'transfer' | 'leave' | null>(null);
  const [successorId, setSuccessorId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const captain = team.players.find(p => p.user?.id === team.captainId);
  const me = team.players.find(p => p.user?.id === currentUserId);
  const eligible = team.players.filter(p => p.user?.id && p.user.id !== team.captainId);
  const successor = eligible.find(p => p.user?.id === successorId);
  const mustTransfer = isCaptain && eligible.length > 0;
  const leavingDisbands = isCaptain && !eligible.length;
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = dialog === 'transfer' && successor && confirmed ? await onTransferCaptaincy(successor.user!.id)
        : dialog === 'leave' && me && !mustTransfer ? await onLeaveTeam(me.id) : false;
      if (ok) setDialog(null);
    } finally { setBusy(false); }
  };
  return <section className="w-full space-y-5 rounded-2xl border border-white/10 bg-[#101a28] p-4 sm:p-6">
    <div><h2 className="flex items-center gap-2 text-xl font-bold text-white"><Crown size={20} className="text-amber-400" /> Captain & membership</h2><p className="mt-2 text-sm text-zinc-400">{captain ? captain.ign + ' is your team captain.' : 'Manage team leadership and your membership.'}</p></div>
    {isCaptain && <div className="space-y-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4"><h3 className="font-semibold text-white">Transfer captaincy</h3><p className="text-sm leading-relaxed text-zinc-400">Give another teammate control of the roster, applications, and team settings. You will stay on the team in your current lineup position.</p><button className={buttonClass} disabled={!eligible.length} onClick={() => { setSuccessorId(''); setConfirmed(false); setDialog('transfer'); }}><Crown size={16} /> Choose new captain</button>{!eligible.length && <p className="text-xs text-amber-300">A teammate needs a registered account before they can become captain.</p>}</div>}
    {me && <div className="flex flex-col justify-between gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center"><div><h3 className="font-semibold text-white">Leave team</h3><p className="mt-1 text-sm text-zinc-400">{mustTransfer ? 'Transfer captaincy before leaving the roster.' : leavingDisbands ? 'Leaving will disband the team because no teammate can take captaincy.' : 'Remove yourself from the active roster.'}</p></div><button className={buttonClass + ' shrink-0 !text-red-400'} onClick={() => setDialog('leave')}><LogOut size={16} /> Leave team</button></div>}
    <TeamActionDialog open={dialog !== null} onClose={() => setDialog(null)} busy={busy} title={dialog === 'transfer' ? 'Transfer captaincy' : leavingDisbands ? 'Leave and disband team' : 'Leave ' + team.name} description={dialog === 'transfer' ? 'Choose an active teammate with a registered account.' : mustTransfer ? 'Your team needs a new captain before you can leave.' : 'Review this membership change before continuing.'}>
      <div className="space-y-5">
        {dialog === 'transfer' ? <><label className="block space-y-2 text-sm text-zinc-300"><span>New captain</span><select className={fieldClass} value={successorId} disabled={busy} onChange={e => { setSuccessorId(e.target.value); setConfirmed(false); }}><option value="">Select a teammate</option>{eligible.map(p => <option key={p.id} value={p.user!.id}>{p.ign} · {p.isSubstitute ? 'Substitute' : 'Starter'}</option>)}</select></label>{successor && <label className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-relaxed text-amber-100"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-amber-400" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} /><span>I understand that {successor.ign} will become captain and I will lose captain controls. Pending applications will move to them.</span></label>}</>
        : <p className="text-sm leading-relaxed text-zinc-300">{mustTransfer ? 'Choose a successor first. You can return here to leave once the transfer is complete.' : leavingDisbands ? 'This will disband ' + team.name + ', release its roster, and close its pending invites and challenges.' : 'You will leave the roster. Your match history will be preserved.'}</p>}
        <div className="flex flex-wrap justify-end gap-3"><button className={buttonClass} disabled={busy} onClick={() => setDialog(null)}>Cancel</button>{dialog === 'leave' && mustTransfer ? <button className={primaryClass} onClick={() => { setSuccessorId(''); setConfirmed(false); setDialog('transfer'); }}>Choose new captain</button> : <button className={primaryClass} disabled={busy || (dialog === 'transfer' && (!successor || !confirmed))} onClick={() => void submit()}>{busy && <Loader2 size={16} className="animate-spin" />}{dialog === 'transfer' ? 'Transfer captaincy' : leavingDisbands ? 'Leave & disband' : 'Confirm leave'}</button>}</div>
      </div>
    </TeamActionDialog>
  </section>;
}
