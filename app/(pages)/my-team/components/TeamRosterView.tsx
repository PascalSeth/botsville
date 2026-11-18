'use client';

import { useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { Crown, ArrowRight, ArrowUpDown, Users, Loader2, Pencil, UserMinus, Camera, Crosshair, Plus, Info, Shield as ShieldIcon } from 'lucide-react';
import { toast } from 'sonner';
import { TEAM_ROLES } from '@/lib/team-lineup';
import { fileToCompressedDataUrl } from '@/lib/supabase';
import TeamActionDialog, { buttonClass, primaryClass, fieldClass } from './TeamActionDialog';
import type { TeamPlayer, PlayerUpdates } from './team-types';
import styles from '../my-team.module.css';

type Action = 'menu' | 'promote' | 'substitute' | 'bench' | 'role' | 'photo' | 'remove';
interface Props {
  team: { captainId: string | null; players: TeamPlayer[] };
  isCaptain: boolean;
  currentUserId?: string;
  onEditPlayer: (id: string, updates: PlayerUpdates) => Promise<boolean>;
  onRemovePlayer: (id: string) => Promise<boolean>;
  onOpenRecruitment: () => void;
  onOpenSettings: () => void;
}
const roleColors: Record<string, string> = { EXP: '#fbbf24', JUNGLE: '#f87171', MID: '#c084fc', GOLD: '#34d399', ROAM: '#22d3ee' };

export default function TeamRosterView({ team, isCaptain, currentUserId, onEditPlayer, onRemovePlayer, onOpenRecruitment, onOpenSettings }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<Action>('menu');
  const [role, setRole] = useState('EXP');
  const [partnerId, setPartnerId] = useState('');
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const player = team.players.find(p => p.id === selectedId);
  const starters = team.players.filter(p => !p.isSubstitute).sort((a,b) => TEAM_ROLES.indexOf(a.role as typeof TEAM_ROLES[number]) - TEAM_ROLES.indexOf(b.role as typeof TEAM_ROLES[number]));
  const subs = team.players.filter(p => p.isSubstitute);
  const openRoles = TEAM_ROLES.filter(r => !starters.some(p => p.role === r));
  const occupant = starters.find(p => p.role === role && p.id !== player?.id);
  const partner = subs.find(p => p.id === partnerId);
  const open = (p: TeamPlayer, next: Action = 'menu') => {
    setSelectedId(p.id); setAction(next); setPartnerId('');
    setRole(p.isSubstitute ? (openRoles.includes(p.role as typeof TEAM_ROLES[number]) ? p.role : openRoles[0] || p.role) : p.role);
    setPhoto(p.photo || p.user?.photo || '');
  };
  const save = async () => {
    if (!player || busy || uploading) return;
    setBusy(true);
    try {
      let ok = false;
      if (action === 'remove') ok = await onRemovePlayer(player.id);
      else {
        let updates: PlayerUpdates = {};
        if (action === 'promote') updates = occupant ? { replacePlayerId: occupant.id, role } : { isSubstitute: false, role };
        if (action === 'substitute') updates = { replacePlayerId: partnerId, role: player.role };
        if (action === 'bench') updates = { isSubstitute: true };
        if (action === 'role') updates = { role, ...(occupant && !player.isSubstitute ? { swapRoleIfTaken: true } : {}) };
        if (action === 'photo') updates = { photo: photo || null };
        ok = await onEditPlayer(player.id, updates);
      }
      if (ok) setSelectedId(null);
    } finally { setBusy(false); }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const image = await fileToCompressedDataUrl(file);
      const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image, type: 'profiles', bucket: 'images' }) });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed');
      setPhoto(data.url);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Upload failed'); }
    finally { setUploading(false); }
  };
  const reserveCard = (p: TeamPlayer) => <div key={p.id} className={styles.reserve}>
    <div className={styles.reserveAvatar}><Image src={p.photo || p.user?.photo || '/roles/' + p.role.toLowerCase() + '.jpg'} alt="" fill sizes="44px" /></div>
    <div className={styles.reserveInfo}><strong>{p.ign} {p.user?.id === team.captainId && <Crown size={12} className="ml-1 inline text-amber-400" aria-label="Captain" />}</strong><span>{p.role} / Substitute{p.user?.id === currentUserId ? ' / You' : ''}</span></div>
    {(isCaptain || p.user?.id === currentUserId) && <button className={styles.reserveAction} onClick={() => open(p, isCaptain ? 'menu' : 'photo')} aria-label={'Manage ' + p.ign}>{isCaptain ? 'Manage' : 'Edit photo'} <ArrowRight size={12} className="ml-1 inline" /></button>}
  </div>;
  const actionButton = (next: Action, label: string, detail: string, Icon: typeof Pencil) => <button className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-4 text-left hover:border-amber-400/40 hover:bg-white/5" onClick={() => setAction(next)}>
    <Icon size={18} className="shrink-0 text-amber-400" /><span className="flex-1"><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs text-zinc-400">{detail}</span></span><ArrowRight size={15} className="text-zinc-500" />
  </button>;
  return <div>
    <div className={styles.sectionHead}>
      <div><p className={styles.eyebrow}>01 / Roster management</p><h2 className={styles.sectionTitle}>Your starting five<span className="text-amber-300">.</span></h2><p className={styles.sectionSubtitle}>Set your roles. Build your lineup. Play as one.</p></div>
      <span className={styles.sectionIndex}>SQUAD / {String(team.players.length).padStart(2, '0')}</span>
    </div>
    <div className={styles.readiness}>
      <div className={styles.readinessBars} aria-label={starters.length + ' of 5 starting positions filled'}>{TEAM_ROLES.map(r => <span key={r} className={starters.some(p => p.role === r) ? styles.filled : undefined} />)}</div>
      <div className={styles.readinessCopy}><strong>{starters.length === 5 && openRoles.length === 0 ? 'All roles filled.' : openRoles.length + ' starting position' + (openRoles.length === 1 ? '' : 's') + ' open.'}</strong> {isCaptain ? 'Select a player to manage roles and substitutions.' : 'Your captain manages the starting lineup.'}</div>
    </div>
    <section aria-label="Starting lineup">
      <h3 className={styles.panelLabel}>Active lineup <span>{starters.length} / 05 starters</span></h3>
      <div className={styles.lineup} tabIndex={0} role="region" aria-label="Starting players. Scroll to see all five roles.">
        {TEAM_ROLES.map((r, index) => {
          const p = starters.find(p => p.role === r);
          const tint = { '--role': roleColors[r] } as CSSProperties;
          if (!p) return <div key={r} style={tint} className={styles.playerCard + ' ' + styles.emptyCard}>
            <span className={styles.emptyRole}>{r}</span><Crosshair size={30} strokeWidth={1} className="text-slate-600" />
            <span className={styles.emptyCopy}>Position open</span>
            {isCaptain && <button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-300 hover:border-amber-400/50 hover:text-amber-300" onClick={onOpenRecruitment}><Plus size={11} /> Recruit player</button>}
          </div>;
          const canManage = isCaptain || p.user?.id === currentUserId;
          return <article key={r} className={styles.playerCard} style={tint}>
            <div className={styles.roleArt}><Image src={p.photo || p.user?.photo || '/roles/' + r.toLowerCase() + '.jpg'} alt={p.photo || p.user?.photo ? p.ign : ''} fill sizes="(max-width: 599px) 76vw, (max-width: 1099px) 31vw, 210px" /></div>
            <div className={styles.cardShade} />
            <div className={styles.cardTop}><span>{r}</span><span className={styles.cardNumber}>0{index + 1}</span></div>
            <div className={styles.playerInfo}>
              <div className={styles.playerLabel}>{p.user?.id === team.captainId ? <><Crown size={10} /> Captain</> : <><span className="h-1 w-1 bg-emerald-400" /> Starter</>}{p.user?.id === currentUserId && <span className="ml-auto text-slate-400">You</span>}</div>
              <h4 className={styles.playerName} title={p.ign}>{p.ign}</h4>
              <p className={styles.playerState}>{r === 'EXP' || r === 'GOLD' || r === 'MID' ? r + ' lane' : r === 'JUNGLE' ? 'Jungler' : 'Roamer'}</p>
              {canManage ? <button className={styles.cardAction} onClick={() => open(p, isCaptain ? 'menu' : 'photo')} aria-label={'Manage ' + p.ign}>{isCaptain ? 'Manage player' : 'Edit photo'}<ArrowUpDown size={12} /></button> : <div className={styles.cardAction}>Starting lineup <ShieldIcon size={14} /></div>}
            </div>
          </article>;
        })}
      </div>
      <p className={styles.swipeHint}><ArrowRight size={13} /> Swipe to explore all five roles</p>
      {starters.length > new Set(starters.map(p => p.role)).size && <div className="mt-4 space-y-2"><p className="text-xs text-amber-300">Some starters share a role. Manage these players to assign an open role or move them to substitutes.</p>{starters.filter((p, i) => starters.findIndex(other => other.role === p.role) !== i).map(reserveCard)}</div>}
    </section>
    <section className={styles.reserveSection} aria-label="Substitutes">
      <h3 className={styles.panelLabel}>Reserve bench <span>{String(subs.length).padStart(2, '0')} players</span></h3>
      {subs.length ? <div className={styles.reserves}>{subs.map(reserveCard)}</div> : <div className={styles.emptyBench}><Users size={20} strokeWidth={1.3} /><span>Your bench is open. Recruit substitutes to strengthen your squad.</span></div>}
    </section>
    {isCaptain && <div className={styles.commandHint}><Info size={13} className="mt-0.5 shrink-0" /><span>Lineup changes never change captaincy. <button className="text-slate-400 hover:text-amber-300" onClick={onOpenSettings}>Manage your captain in team settings →</button></span></div>}
    <TeamActionDialog open={Boolean(player)} onClose={() => setSelectedId(null)} busy={busy || uploading} title={player ? (action === 'menu' ? 'Manage ' : { promote: 'Start ', substitute: 'Substitute ', bench: 'Bench ', role: 'Change role · ', photo: 'Player photo · ', remove: 'Remove ' }[action]) + player.ign : 'Manage player'} description={action === 'menu' ? 'Choose one action for this player.' : 'Review the change below before confirming.'}>
      {player && (action === 'menu' ? <div className="space-y-3">
        {player.isSubstitute ? actionButton('promote', 'Move to starting lineup', 'Choose an open role or a starter to replace.', ArrowUpDown) : <>{subs.length > 0 && actionButton('substitute', 'Bring in a substitute', 'Replace this starter with a player from the bench.', ArrowUpDown)}{actionButton('bench', 'Move to substitutes', 'Leave this starting position open.', UserMinus)}</>}
        {actionButton('role', 'Change role', player.isSubstitute ? 'Set this substitute’s preferred role.' : 'Choose an open role or swap roles with another starter.', Pencil)}
        {actionButton('photo', 'Edit player photo', 'Update the photo displayed on the roster.', Camera)}
        {player.user?.id !== team.captainId && player.user?.id !== currentUserId && <div className="border-t border-white/10 pt-3"><button className={buttonClass + ' w-full !text-red-400'} onClick={() => setAction('remove')}>Remove from team</button></div>}
      </div> : <div className="space-y-5">
        {(action === 'promote' || action === 'role') && <label className="block space-y-2 text-sm text-zinc-300"><span>{action === 'promote' ? 'Starting role' : 'Role'}</span><select className={fieldClass} value={role} onChange={e => setRole(e.target.value)}>{TEAM_ROLES.map(r => { const current = starters.find(p => p.role === r && p.id !== player.id); return <option key={r} value={r}>{r}{current && (action === 'promote' || !player.isSubstitute) ? ' · ' + current.ign : ' · available'}</option>; })}</select></label>}
        {action === 'promote' && <p className="rounded-xl bg-emerald-400/10 p-4 text-sm leading-relaxed text-emerald-200">{player.ign} will start as {role}.{occupant ? ' ' + occupant.ign + ' will move to substitutes and keep their role.' : ' This position is open; no other player will move.'}</p>}
        {action === 'role' && <p className="text-sm leading-relaxed text-zinc-300">{occupant && !player.isSubstitute ? player.ign + ' will play ' + role + '. ' + occupant.ign + ' will play ' + player.role + '.' : player.ign + ' will play ' + role + ' and remain a ' + (player.isSubstitute ? 'substitute.' : 'starter.')}</p>}
        {action === 'substitute' && <><label className="block space-y-2 text-sm text-zinc-300"><span>Substitute to bring in</span><select className={fieldClass} value={partnerId} onChange={e => setPartnerId(e.target.value)}><option value="">Select a substitute</option>{subs.map(p => <option key={p.id} value={p.id}>{p.ign} · {p.role}</option>)}</select></label>{partner && <p className="rounded-xl bg-emerald-400/10 p-4 text-sm text-emerald-200">{partner.ign} will start as {player.role}. {player.ign} will move to substitutes.</p>}</>}
        {action === 'bench' && <p className="text-sm leading-relaxed text-zinc-300">{player.ign} will remain on the team as a substitute. The {player.role} starting position will stay open until you fill it.</p>}
        {action === 'remove' && <p className="rounded-xl bg-red-400/10 p-4 text-sm leading-relaxed text-red-200">{player.ign} will leave the roster. Their match history is preserved. You can invite them again later.</p>}
        {action === 'photo' && <div className="space-y-4">{photo && <div className="relative h-24 w-24 overflow-hidden rounded-xl"><Image src={photo} alt="Player photo preview" fill sizes="96px" className="object-cover" /></div>}<label className="block space-y-2 text-sm text-zinc-300"><span>Upload photo</span><input type="file" accept="image/*" disabled={uploading || busy} onChange={e => void upload(e.target.files?.[0])} className={fieldClass} /></label>{uploading && <p className="text-sm text-amber-400">Uploading photo…</p>}<button className={buttonClass} onClick={() => setPhoto('')} disabled={uploading || busy}>Remove photo</button></div>}
        <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5"><button className={buttonClass} disabled={busy || uploading} onClick={() => isCaptain ? setAction('menu') : setSelectedId(null)}>Back</button><button className={primaryClass} disabled={busy || uploading || (action === 'substitute' && !partnerId) || (action === 'role' && role === player.role)} onClick={() => void save()}>{busy && <Loader2 size={16} className="animate-spin" />}{action === 'remove' ? 'Confirm removal' : 'Confirm change'}</button></div>
      </div>)}
    </TeamActionDialog>
  </div>;
}
