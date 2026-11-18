'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Award, CalendarDays, Crown, Flame, MapPin, Shield, Sparkles, Swords, Target, Trophy, Users } from 'lucide-react';
import type { Player, Standing, Team } from './team-profile-types';
import styles from './team-profile.module.css';

export const ROLES = ['EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM'] as const;
const ROLE_CONFIG = {
  EXP: { label: 'EXP lane', color: '#efbc7a', art: '/roles/exp.jpg', icon: Swords },
  JUNGLE: { label: 'Jungle', color: '#f18e96', art: '/roles/jungle.jpg', icon: Flame },
  MID: { label: 'Mid lane', color: '#c0a0f3', art: '/roles/mid.jpg', icon: Sparkles },
  GOLD: { label: 'Gold lane', color: '#e8d58b', art: '/roles/gold.jpg', icon: Target },
  ROAM: { label: 'Roam', color: '#8bd3d4', art: '/roles/roam.jpg', icon: Shield },
};

function roleConfig(role: string) {
  return ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] ?? { ...ROLE_CONFIG.ROAM, label: role || 'Flex' };
}

export function formatDate(value: string, yearOnly = false) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString('en-GB', yearOnly ? { year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' });
}

export function TeamHero({ team, action }: { team: Team; action: ReactNode }) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const [failedBanner, setFailedBanner] = useState<string | null>(null);
  const standing = team.standings[0];
  const games = standing ? standing.wins + standing.losses : 0;
  const banner = team.banner && failedBanner !== team.banner ? team.banner : '/roles/exp.jpg';
  const captain = team.players.find(player => player.user?.id === team.captainId);
  const stats = [
    { label: standing ? 'Season rank' : 'Squad members', value: standing?.rank ? `#${standing.rank}` : standing ? '—' : team.players.length.toString(), icon: standing ? Award : Users },
    { label: standing ? 'Season wins' : 'Matches played', value: standing ? standing.wins.toString() : ((team._count?.matchesAsA ?? 0) + (team._count?.matchesAsB ?? 0)).toString(), icon: Swords },
    { label: standing ? 'Win rate' : 'Tournaments', value: standing ? games ? `${Math.round(standing.wins / games * 100)}%` : '—' : (team._count?.registrations ?? team.registrations.length).toString(), icon: Target },
    { label: 'Trophies', value: team.trophies.length.toString().padStart(2, '0'), icon: Trophy },
  ];

  return <header className={styles.hero} style={{ '--team-color': /^#[\da-f]{6}$/i.test(team.color ?? '') ? team.color : '#ecc78a' } as CSSProperties}>
    <div className={styles.heroArtwork}>
      <Image src={banner} alt="" fill priority sizes="(max-width: 1360px) 100vw, 1360px" className={styles.banner} onError={() => setFailedBanner(banner)} />
      <div className={styles.bannerShade} />
      <span className={styles.heroWatermark} aria-hidden="true">{team.tag}</span>
    </div>
    <div className={styles.heroContent}>
      <div className={styles.heroTop}>
        <span className={styles.eyebrow}><span className={styles.tinyDiamond} /> Botsville squad</span>
        <span className={`${styles.status} ${team.isRecruiting ? styles.statusOpen : ''}`}><span />{team.isRecruiting ? 'Recruiting' : 'Applications closed'}</span>
      </div>
      <div className={styles.heroMain}>
        <div className={styles.identity}>
          <div className={styles.crest}>
            {team.logo && failedLogo !== team.logo ? <Image src={team.logo} alt={`${team.name} crest`} fill sizes="(max-width: 700px) 80px, 116px" className={styles.crestImage} onError={() => setFailedLogo(team.logo)} /> : <Shield size={42} strokeWidth={1.2} />}
            <span className={styles.crestTag}>{team.tag}</span>
          </div>
          <div className={styles.identityText}>
            <p className={styles.teamTag}>[{team.tag}] <span>Mobile Legends: Bang Bang</span></p>
            <h1>{team.name}</h1>
            <div className={styles.heroMeta}>
              <span><MapPin size={14} />{team.region || 'Ghana'}</span>
              {team.captain && (captain ? <Link href={`/players/${captain.id}`}><Crown size={14} />{team.captain.ign}<ArrowUpRight size={12} /></Link> : <span><Crown size={14} />{team.captain.ign}</span>)}
            </div>
          </div>
        </div>
        {standing?.tier && <div className={styles.rankEmblem}>
          <span className={styles.emblemLines} aria-hidden="true" />
          <span className={styles.eyebrow}>Squad tier</span><strong>{standing.tier}</strong><span>{standing.season.name}</span>
        </div>}
      </div>
      <div className={styles.heroBottom}>
        <p><span className={styles.accentLine} />{standing ? standing.season.name : `Part of the arena since ${formatDate(team.registeredAt, true)}`}</p>
        <div className={styles.heroActions}>{action}</div>
      </div>
    </div>
    <dl className={styles.heroStats}>{stats.map(({ label, value, icon: Icon }) => <div key={label}><dt><Icon size={14} />{label}</dt><dd>{value}</dd></div>)}</dl>
  </header>;
}

export function PlayerCard({ player, captainId, index }: { player: Player; captainId: string; index: number }) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const config = roleConfig(player.role);
  const Icon = config.icon;
  const photo = player.photo || player.user?.photo;
  const hasPhoto = Boolean(photo && failedPhoto !== photo);
  const isCaptain = player.user?.id === captainId || player.id === captainId;
  return <Link href={`/players/${player.id}`} className={styles.playerCard} style={{ '--role': config.color } as CSSProperties}>
    <Image src={hasPhoto ? photo! : config.art} alt="" fill sizes="(max-width: 600px) 75vw, (max-width: 1000px) 32vw, 250px" className={styles.playerArt} onError={() => setFailedPhoto(photo ?? null)} />
    <div className={styles.playerShade} />
    <div className={styles.playerTop}><span><Icon size={13} />{config.label}</span><span className={styles.playerNumber}>{String(index + 1).padStart(2, '0')}</span></div>
    <div className={styles.playerContent}>
      <p className={styles.playerEyebrow}>{isCaptain ? <><Crown size={11} /> Captain</> : <><span /> Starting lineup</>}</p>
      <h3>{player.ign}</h3>
      <p className={styles.signature}>{player.signatureHero || (hasPhoto ? 'Squad member' : 'Role artwork')}{player.secondaryRole && <span> / {player.secondaryRole}</span>}</p>
      <div className={styles.playerStats}>
        {player.matchesPlayed > 0 ? <><span><strong>{Number(player.kda).toFixed(1)}</strong>KDA</span><span><strong>{Number(player.winRate).toFixed(0)}<small>%</small></strong>Win rate</span><span><strong>{player.mvpCount}</strong>MVP</span></> : <p>Ready to make their mark</p>}
      </div>
      <div className={styles.playerLink}>Player profile <ArrowUpRight size={15} /></div>
    </div>
  </Link>;
}

export function EmptyRoleCard({ role, recruiting, onApply }: { role: string; recruiting: boolean; onApply?: (role: string) => void }) {
  const config = roleConfig(role);
  const Icon = config.icon;
  return <div className={styles.emptyRole} style={{ '--role': config.color } as CSSProperties}>
    <span className={styles.emptyRoleLabel}>{config.label}</span>
    <div className={styles.emptyRoleIcon}><Icon size={30} strokeWidth={1.2} /></div>
    <h3>Room for a<br />playmaker.</h3>
    <p>No starter assigned</p>
    {recruiting && onApply && <button type="button" onClick={() => onApply(role)}>Apply for this role <ArrowRight size={14} /></button>}
  </div>;
}

export function ReserveCard({ player, captainId }: { player: Player; captainId: string }) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const config = roleConfig(player.role);
  const photo = player.photo || player.user?.photo;
  return <Link href={`/players/${player.id}`} className={styles.reserve}>
    <div className={styles.reserveAvatar}>{photo && photo !== failedPhoto ? <Image src={photo} alt="" fill sizes="48px" onError={() => setFailedPhoto(photo)} /> : <config.icon size={22} style={{ color: config.color }} />}</div>
    <div className={styles.reserveIdentity}><h3>{player.ign}{player.user?.id === captainId && <Crown size={12} />}</h3><p><span style={{ color: config.color }}>{config.label}</span>{player.signatureHero && <> · {player.signatureHero}</>}</p></div>
    <ArrowUpRight size={16} />
  </Link>;
}

export function SeasonRecord({ standing }: { standing?: Standing }) {
  if (!standing) return <div className={styles.emptyPanel}><div className={styles.emptyIcon}><Swords size={30} strokeWidth={1.3} /></div><h3>A new chapter awaits.</h3><p>This squad hasn’t recorded a season standing yet. Their results will appear here once they compete.</p><Link href="/tournaments" className={styles.textLink}>Explore tournaments <ArrowUpRight size={15} /></Link></div>;
  const games = standing.wins + standing.losses;
  const winRate = games ? Math.round(standing.wins / games * 100) : 0;
  return <div className={styles.seasonCard}>
    <div className={styles.seasonTop}><div><p className={styles.eyebrow}>{standing.season.status.replaceAll('_', ' ')}</p><h3>{standing.season.name}</h3></div>{standing.tier && <span className={styles.tierPill}>Tier {standing.tier}</span>}</div>
    <div className={styles.seasonNumbers}><div><span>League position</span><strong>{standing.rank > 0 ? `#${standing.rank}` : '—'}</strong></div><div><span>Season points</span><strong>{standing.points.toLocaleString()}</strong></div></div>
    <div className={styles.record}><span><i className={styles.winDot} />{standing.wins} wins</span><span><i className={styles.lossDot} />{standing.losses} losses</span><strong>{games ? `${winRate}% win rate` : 'No matches yet'}</strong></div>
    <div className={styles.recordBar} role="img" aria-label={`${standing.wins} wins and ${standing.losses} losses`}><span style={{ width: `${winRate}%` }} /></div>
    <div className={styles.seasonFoot}><span>{games} matches recorded</span>{standing.streak && <span className={standing.streak.startsWith('W') ? styles.winStreak : styles.lossStreak}><Flame size={13} />{standing.streak} streak</span>}</div>
    {standing.forfeits > 0 && <p className={styles.forfeits}>{standing.forfeits} forfeit{standing.forfeits === 1 ? '' : 's'} recorded</p>}
    <Link href="/leaderboard" className={styles.textLink}>View leaderboard <ArrowUpRight size={15} /></Link>
  </div>;
}

export function TournamentHistory({ team }: { team: Team }) {
  return <section className={styles.panel}>
    <div className={styles.panelHeading}><Trophy size={17} /><h3>Tournament appearances</h3><span>{team._count?.registrations ?? team.registrations.length}</span></div>
    {team.registrations.length ? <div className={styles.tournaments}>{team.registrations.map(entry => {
      const status = entry.tournament?.status ?? entry.status ?? 'Registered';
      return <div className={styles.tournament} key={entry.id}><span className={styles.tournamentIcon}><Trophy size={17} /></span><div><h4>{entry.tournament?.name ?? entry.name ?? 'Tournament'}</h4><p className={status === 'ONGOING' ? styles.liveText : ''}>{status.replaceAll('_', ' ').toLowerCase()}</p></div></div>;
    })}</div> : <p className={styles.mutedCopy}>The first tournament is still ahead. Appearances will be collected here.</p>}
    <Link href="/tournaments" className={styles.textLink}>Browse tournaments <ArrowUpRight size={15} /></Link>
  </section>;
}

export function TeamAbout({ team }: { team: Team }) {
  return <section className={styles.panel}>
    <div className={styles.panelHeading}><Shield size={17} /><h3>Squad details</h3></div>
    <dl className={styles.details}><div><dt><MapPin size={14} />Region</dt><dd>{team.region || 'Ghana'}</dd></div><div><dt><Crown size={14} />Captain</dt><dd>{team.captain?.ign || 'Unassigned'}</dd></div><div><dt><Users size={14} />Members</dt><dd>{team.players.length} / 20</dd></div><div><dt><CalendarDays size={14} />Established</dt><dd>{formatDate(team.registeredAt)}</dd></div></dl>
  </section>;
}

export function TeamLegacy({ team }: { team: Team }) {
  return <div className={styles.recordGrid}>
    <section className={styles.trophyCase}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Earned in the arena</p><h2>The trophy room<span>.</span></h2></div><Trophy size={28} strokeWidth={1.2} /></div>
      {team.trophies.length ? <div className={styles.trophies}>{team.trophies.map((trophy, index) => <div className={styles.trophy} key={`${trophy}-${index}`}><div><Trophy size={34} strokeWidth={1.2} /></div><span>Award {String(index + 1).padStart(2, '0')}</span><h3>{trophy}</h3></div>)}</div> : <div className={styles.emptyTrophies}><Trophy size={48} strokeWidth={.9} /><h3>Every legacy starts somewhere.</h3><p>The next victory could be the first one on the shelf.</p></div>}
      {team.totalPrizeMoney > 0 && <div className={styles.earnings}><div><span className={styles.eyebrow}>Career prize earnings</span><strong>GH₵ {(team.totalPrizeMoney / 100).toLocaleString('en-GH', { maximumFractionDigits: 2 })}</strong></div><Award size={30} strokeWidth={1.2} /></div>}
    </section>
    <div className={styles.sideStack}><TeamAbout team={team} />{team.nameHistory.length > 0 && <section className={styles.panel}><div className={styles.panelHeading}><CalendarDays size={17} /><h3>The journey</h3></div><ol className={styles.timeline}>{team.nameHistory.map((entry, index) => <li key={`${entry.changedAt}-${index}`}><time dateTime={entry.changedAt}>{formatDate(entry.changedAt)}</time><p>Previously <strong>{entry.oldName}</strong> <span>[{entry.oldTag}]</span></p></li>)}</ol></section>}</div>
  </div>;
}
