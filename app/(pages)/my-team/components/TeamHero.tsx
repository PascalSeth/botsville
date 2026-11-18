'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Check, Copy, Crown, MapPin, Share2, Shield, Swords } from 'lucide-react';
import { toast } from 'sonner';
import type { TeamPlayer } from './team-types';
import styles from '../my-team.module.css';

interface Props {
  team: {
    id: string;
    name: string;
    tag: string;
    region: string;
    logo: string | null;
    banner: string | null;
    teamCode?: string | null;
    isRecruiting?: boolean;
    players: TeamPlayer[];
  };
  isCaptain: boolean;
}

export default function TeamHero({ team, isCaptain }: Props) {
  const [copied, setCopied] = useState(false);
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const [failedBanner, setFailedBanner] = useState<string | null>(null);
  const starters = team.players.filter(player => !player.isSubstitute);
  const ready = starters.length === 5 && new Set(starters.map(player => player.role)).size === 5;
  const banner = team.banner && failedBanner !== team.banner ? team.banner : '/roles/exp.jpg';

  const copyCode = async () => {
    if (!team.teamCode) return;
    try {
      await navigator.clipboard.writeText(team.teamCode);
      setCopied(true);
      toast.success('Team invite code copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy the invite code');
    }
  };

  const shareTeam = async () => {
    const url = `${window.location.origin}/teams/${team.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${team.name} [${team.tag}]`,
          text: `Meet our squad on Botsville.${team.teamCode ? ` Squad code: ${team.teamCode}` : ''}`,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Team profile link copied');
    } catch {
      toast.error('Could not share the team profile');
    }
  };

  return (
    <header className={styles.header}>
      <Image
        src={banner}
        alt=""
        fill
        priority
        sizes="(max-width: 760px) 100vw, 1200px"
        className={styles.heroBackdrop}
        onError={() => setFailedBanner(banner)}
      />
      <div className={styles.heroShade} />
      <div className={styles.heroTop}>
        <span className={styles.heroKicker}><Swords size={13} /> My team</span>
        <span className={`${styles.status} ${!ready ? styles.statusIncomplete : ''}`}>
          <span className={styles.statusDot} />
          {ready ? 'Lineup ready' : 'Building lineup'}
        </span>
      </div>

      <div className={styles.heroBody}>
        <div className={styles.identity}>
          <div className={styles.crest}>
            {team.logo && failedLogo !== team.logo ? (
              <Image src={team.logo} alt="Team logo" fill sizes="(max-width: 600px) 72px, 88px" className="object-contain p-2" onError={() => setFailedLogo(team.logo)} />
            ) : <Shield size={34} strokeWidth={1.4} />}
            {isCaptain && <span className={styles.crestCrown}><Crown size={12} /></span>}
          </div>
          <div className={styles.identityText}>
            <p className={styles.teamTag}>[{team.tag}] <span>BOTSVILLE</span></p>
            <h1 className={styles.teamName}>{team.name}</h1>
            <div className={styles.identityMeta}>
              <span><MapPin size={12} /> {team.region || 'Ghana'}</span>
              <span>{isCaptain ? 'Team captain' : 'Squad member'}</span>
            </div>
          </div>
        </div>

        <dl className={styles.heroStats} aria-label="Squad overview">
          <div><dt>Players</dt><dd>{team.players.length}<span>/20</span></dd></div>
          <div><dt>Starting</dt><dd>{starters.length}<span>/5</span></dd></div>
          <div><dt>Reserves</dt><dd>{String(team.players.length - starters.length).padStart(2, '0')}</dd></div>
        </dl>
      </div>

      <div className={styles.heroFooter}>
        <p className={styles.heroCaption}>{team.isRecruiting ? 'Open for new teammates' : 'Applications paused'}</p>
        <div className={`${styles.heroActions} ${!team.teamCode ? styles.heroActionsWithoutCode : ''}`}>
          <Link href={`/teams/${team.id}`} className={styles.heroPrimary}>
            Team profile <ArrowUpRight size={16} />
          </Link>
          {team.teamCode && (
            <button type="button" className={styles.heroCode} onClick={() => void copyCode()} aria-label={`Copy team invite code ${team.teamCode}`}>
              <span><small>Invite code</small><strong>{copied ? 'Copied!' : team.teamCode}</strong></span>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          )}
          <button type="button" className={styles.heroShare} onClick={() => void shareTeam()} aria-label="Share team profile"><Share2 size={17} /></button>
        </div>
      </div>
    </header>
  );
}
