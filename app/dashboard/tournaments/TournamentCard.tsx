'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { ArrowUpRight, Check, Clock3, Copy, Expand, Flag, ImagePlus, Layers, Settings2, Trophy, X } from 'lucide-react';
import { toast } from 'sonner';
import { TOURNAMENT_FORMAT_LABELS, TOURNAMENT_STATUS_LABELS, tournamentIssues, tournamentNextAction, type DeskTournament } from '@/lib/tournament-dashboard';
import styles from './tournaments.module.css';

function dateLabel(date: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(date));
}

function Artwork({ tournament, lead }: {
  tournament: DeskTournament;
  lead: boolean;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const [originals, setOriginals] = useState<string[]>([]);
  const candidates = [...new Set([tournament.banner, tournament.heroImage].map(value => value?.trim()).filter((value): value is string => Boolean(value)))];
  const source = candidates.find(value => !failed.includes(value));
  if (!source) return <div className={styles.artworkEmpty}>
    <span className={styles.artworkBrand}>BOTSVILLE / COMPETITIONS</span>
    <ImagePlus size={32} strokeWidth={1.2} />
    <strong>{candidates.length ? 'Artwork unavailable' : 'Give this event a cover'}</strong>
    <Link href={'/dashboard/tournaments/' + tournament.id + '/edit'}>{candidates.length ? 'Update artwork' : 'Add tournament artwork'}<ArrowUpRight size={13} /></Link>
  </div>;
  const useOriginal = originals.includes(source) || /[?]|\.gif$/i.test(source);
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button type="button" className={styles.artwork} aria-label={'View full artwork for ' + tournament.name}>
          <Image
            key={source + String(useOriginal)}
            src={source}
            alt={tournament.name + ' artwork'}
            fill
            priority={lead}
            className={styles.artworkImage}
            sizes="(max-width: 700px) 100vw, (max-width: 1023px) 54vw, 560px"
            unoptimized={useOriginal}
            onError={() => {
              if (!useOriginal) setOriginals(previous => [...previous, source]);
              else setFailed(previous => [...previous, source]);
            }}
          />
          <span className={styles.expandArtwork}><Expand size={14} /><span>View artwork</span></span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.imageOverlay} />
        <Dialog.Content className={styles.imageDialog} aria-describedby={undefined}>
          <div className={styles.imageDialogHeader}>
            <Dialog.Title>{tournament.name}</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close artwork"><X size={18} /></button>
            </Dialog.Close>
          </div>
          <Image src={source} alt={tournament.name + ' full artwork'} width={1600} height={900} unoptimized />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function TournamentCard({ tournament, now, lead = false }: {
  tournament: DeskTournament;
  now: number;
  lead?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const issues = tournamentIssues(tournament, now);
  const action = tournamentNextAction(tournament, now);
  const { approved, pending, matches, completed, live, waitlist } = tournament.counts;
  const activeStage = tournament.stages.find(stage => stage.status === 'ACTIVE');
  const base = '/dashboard/tournaments/' + tournament.id;
  const approvedPercent = tournament.slots > 0 ? Math.min(100, approved / tournament.slots * 100) : 0;
  const pendingPercent = tournament.slots > 0 ? Math.min(100 - approvedPercent, pending / tournament.slots * 100) : 0;
  const remainingHours = Math.ceil((Date.parse(tournament.registrationDeadline) - now) / 3600000);
  const registrationHint = remainingHours <= 0 ? 'Registration deadline passed' : remainingHours < 24 ? 'Registration closes in ' + remainingHours + 'h' : 'Registration closes ' + new Date(tournament.registrationDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin + '/tournaments/' + tournament.id);
      setCopied(true);
      toast.success('Tournament link copied.');
    } catch { toast.error('Couldn’t copy the link. Open the public page to share it.'); }
  }

  return <article className={styles.tournamentCard} data-lead={lead} data-live={tournament.status === 'ONGOING'}>
    <header className={styles.cardTopline}>
      <span className={styles.cardSeason}>{tournament.season.name}</span>
      <span className={styles.status} data-status={tournament.status}><i />{TOURNAMENT_STATUS_LABELS[tournament.status]}</span>
    </header>
    <Artwork tournament={tournament} lead={lead} />
    <div className={styles.cardBody}>
      <div className={styles.cardEyebrow}><span>{TOURNAMENT_FORMAT_LABELS[tournament.format]}</span>{live > 0 && <span className={styles.liveMatches}>{live} live</span>}</div>
      <h2><Link href={base}>{tournament.name}</Link></h2>
      {lead && tournament.subtitle && <p className={styles.cardSubtitle}>{tournament.subtitle}</p>}
      <div className={styles.cardSchedule}><Clock3 size={12} /><time dateTime={tournament.date}>{dateLabel(tournament.date)} UTC</time><span>{tournament.isOnline ? 'Online' : tournament.location}</span></div>
      {tournament.prizePool && <div className={styles.cardPrize}><Trophy size={13} /><span>{tournament.prizePool}</span><small>Prize pool</small></div>}
      <div className={styles.cardStats}>
        <div>
          <div className={styles.statTitle}><span>Teams</span><strong>{approved}<small> / {tournament.slots}</small></strong></div>
          <div className={styles.capacity} role="img" aria-label={approved + ' approved, ' + pending + ' pending, ' + tournament.slots + ' team capacity'}><span style={{ width: approvedPercent + '%' }} /><span style={{ width: pendingPercent + '%' }} /></div>
          <Link href={base + '#registrations'} data-pending={pending > 0}>{pending ? pending + ' pending approval' : 'Approved entries'}{waitlist > 0 && ' · ' + waitlist + ' waitlisted'}</Link>
        </div>
        <div>
          <div className={styles.statTitle}><span>Matches</span><strong>{completed}<small> / {matches}</small></strong></div>
          <div className={styles.matchProgress} role="img" aria-label={completed + ' of ' + matches + ' matches played'}><span style={{ width: (matches ? Math.min(100, completed / matches * 100) : 0) + '%' }} /></div>
          <Link href={base + '#bracket'}>{activeStage?.name || (matches ? 'Played / scheduled' : 'Fixtures not set')}</Link>
        </div>
      </div>
      <div className={styles.cardNotice}>
        {issues[0] ? <Link href={issues[0].href} className={styles.issueLink} data-urgent={issues[0].urgent}><Flag size={12} /><span>{issues[0].label}</span>{issues.length > 1 && <small title={issues.slice(1).map(issue => issue.label).join(' · ')}>+{issues.length - 1}</small>}</Link>
          : tournament.status === 'OPEN' ? <span><Clock3 size={12} />{registrationHint}</span>
          : <span><Layers size={12} />{tournament.status === 'COMPLETED' ? 'Results are in' : tournament.status === 'CANCELLED' ? 'Event cancelled' : tournament.stages.length + ' tournament ' + (tournament.stages.length === 1 ? 'stage' : 'stages')}</span>}
      </div>
      <footer className={styles.cardActions}>
        <Link href={action.href} className={styles.cardPrimary}>{action.label}<ArrowUpRight size={15} /></Link>
        <button onClick={copyLink} className={styles.iconButton} aria-label={'Copy public link for ' + tournament.name} title="Copy public link">{copied ? <Check size={15} /> : <Copy size={15} />}</button>
        <Link href={base + '/edit'} className={styles.iconButton} aria-label={'Settings for ' + tournament.name} title="Tournament settings"><Settings2 size={15} /></Link>
      </footer>
    </div>
  </article>;
}
