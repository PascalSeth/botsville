'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  Check,
  ChevronDown,
  Crosshair,
  Flame,
  MapPin,
  Share2,
  Shield,
  Star,
  Swords,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import type { HeroSort, HeroStat, PlayerInfo, PlayerStats, RecentGame } from './player-profile-types';
import styles from './player-profile.module.css';

const ROLE_CONFIG = {
  EXP: { label: 'EXP Lane', short: 'EXP', color: '#f59e0b', art: '/roles/exp.jpg', icon: Swords },
  JUNGLE: { label: 'Jungle', short: 'JGL', color: '#f43f5e', art: '/roles/jungle.jpg', icon: Crosshair },
  MID: { label: 'Mid Lane', short: 'MID', color: '#a855f7', art: '/roles/mid.jpg', icon: Flame },
  GOLD: { label: 'Gold Lane', short: 'GLD', color: '#eab308', art: '/roles/gold.jpg', icon: Target },
  ROAM: { label: 'Roam', short: 'ROM', color: '#06b6d4', art: '/roles/roam.jpg', icon: Shield },
};

export function getRoleConfig(role: string) {
  return ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] ?? { ...ROLE_CONFIG.ROAM, label: role || 'Flex', short: (role || 'FLX').slice(0, 3).toUpperCase() };
}

function getCombatGrade(stats: PlayerStats | null): { grade: string; rating: number } {
  if (!stats || stats.totalGames === 0) return { grade: '—', rating: 0 };
  const kdaScore = Math.min(100, (stats.overallKda / 7) * 100);
  const wrScore = Math.min(100, Math.max(0, stats.winRate));
  const mvpBonus = Math.min(15, (stats.mvpCount / Math.max(1, stats.totalGames)) * 35);
  const raw = Math.round(Math.min(99, kdaScore * 0.45 + wrScore * 0.4 + stats.killPressure * 0.15 + mvpBonus * 0.4));
  const rating = Math.max(40, raw);
  if (rating >= 88) return { grade: 'S+', rating };
  if (rating >= 78) return { grade: 'S', rating };
  if (rating >= 66) return { grade: 'A', rating };
  if (rating >= 54) return { grade: 'B', rating };
  return { grade: 'C', rating };
}

function getHeroTier(hero: HeroStat): { tier: 'S' | 'A' | 'B' | 'C'; color: string } {
  const score = hero.games * 2 + hero.winRate * 3 + hero.kda * 10;
  if (score >= 400) return { tier: 'S', color: '#f59e0b' };
  if (score >= 250) return { tier: 'A', color: '#a855f7' };
  if (score >= 150) return { tier: 'B', color: '#06b6d4' };
  return { tier: 'C', color: '#94a3b8' };
}

function SegmentedBar({ percent, segments = 10, accent }: { percent: number; segments?: number; accent?: string }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const filled = Math.round((clamped / 100) * segments);
  return (
    <div className={styles.segBar} aria-hidden="true">
      {Array.from({ length: segments }).map((_, idx) => (
        <span
          key={idx}
          className={idx < filled ? styles.segFilled : styles.segEmpty}
          style={idx < filled && accent ? { background: accent } : undefined}
        />
      ))}
    </div>
  );
}

export function ProfileImage({
  src,
  alt = '',
  sizes,
  className,
  fallback,
  priority = false,
}: {
  src?: string | null;
  alt?: string;
  sizes: string;
  className?: string;
  fallback?: ReactNode;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return src && src !== failed ? (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      priority={priority}
      onError={() => setFailed(src)}
    />
  ) : (
    <div className={styles.imageFallback} aria-hidden="true">
      {fallback ?? <Shield size={26} strokeWidth={1.3} />}
    </div>
  );
}

export function PlayerHero({
  player,
  stats,
  signatureHeroStat,
  recentGames,
  onShare,
  copied,
}: {
  player: PlayerInfo;
  stats: PlayerStats | null;
  signatureHeroStat?: HeroStat;
  recentGames: RecentGame[];
  onShare: () => void;
  copied: boolean;
}) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const role = getRoleConfig(player.role);
  const Icon = role.icon;
  const hasPhoto = Boolean(player.photo && player.photo !== failedPhoto);
  const { grade, rating } = getCombatGrade(stats);
  const mvpRate = stats && stats.totalGames > 0 ? Math.round((stats.mvpCount / stats.totalGames) * 100) : 0;
  const kdaPercent = stats ? Math.min(100, (stats.overallKda / 8) * 100) : 0;
  const latestForm = recentGames.slice(0, 5);

  const hudBars = [
    {
      label: 'KDA Ratio',
      value: stats ? stats.overallKda.toFixed(2) : '—',
      percent: kdaPercent,
      accent: role.color,
    },
    {
      label: 'Win Rate',
      value: stats ? `${stats.winRate.toFixed(1)}%` : '—',
      percent: stats ? stats.winRate : 0,
      accent: stats && stats.winRate >= 50 ? '#34d399' : '#fb7185',
    },
    {
      label: 'Kill Pressure',
      value: stats ? `${stats.killPressure.toFixed(0)}/100` : '—',
      percent: stats ? stats.killPressure : 0,
      accent: '#f59e0b',
    },
    {
      label: 'MVP Rate',
      value: stats ? `${mvpRate}%` : '—',
      percent: mvpRate,
      accent: '#38bdf8',
    },
  ];

  return (
    <header className={styles.stage}>
      {/* Atmospheric Arena Backdrop */}
      <div className={styles.stageEnv} aria-hidden="true">
        <Image
          src={role.art}
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.stageEnvArt}
        />
        <div className={styles.stageEnvShade} />
        <div className={styles.stageGrid} />
        <div className={styles.stageSpotlight} />
        <span className={styles.stageWatermark}>{player.team?.tag || player.ign}</span>
      </div>

      <div className={styles.stageInner}>
        {/* Floating Top HUD Controls */}
        <div className={styles.stageTopBar}>
          <Link href="/leaderboard" className={styles.hudBtn}>
            <ArrowLeft size={14} />
            <span>Leaderboard</span>
          </Link>

          <div className={styles.stageTopRight}>
            {player.rankBadge && (
              <span className={styles.topRankChip}>
                <Award size={12} />
                {player.rankBadge.replaceAll('_', ' ')}
              </span>
            )}
            <button type="button" onClick={onShare} className={styles.hudBtn}>
              {copied ? <Check size={14} /> : <Share2 size={14} />}
              <span>{copied ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* 3-Zone Video Game Character Stage */}
        <div className={styles.stageLayout}>
          {/* CENTER (Visual First on Mobile, Middle on Desktop): Full-Height Player Display */}
          <div className={styles.characterStage}>
            <div className={styles.characterFrame}>
              <span className={styles.reticleTL} aria-hidden="true" />
              <span className={styles.reticleTR} aria-hidden="true" />

              {hasPhoto ? (
                <Image
                  key={player.photo}
                  src={player.photo!}
                  alt={`${player.ign} player portrait`}
                  fill
                  priority
                  sizes="(max-width: 700px) 100vw, (max-width: 1100px) 48vw, 520px"
                  className={styles.characterPhoto}
                  onError={() => setFailedPhoto(player.photo)}
                />
              ) : (
                <div className={styles.characterFallback}>
                  <Image
                    src={role.art}
                    alt=""
                    fill
                    priority
                    sizes="(max-width: 700px) 100vw, 520px"
                    className={styles.characterFallbackArt}
                  />
                  <div className={styles.characterFallbackCrest}>
                    <Icon size={36} strokeWidth={1.4} />
                    <span>{player.ign.slice(0, 2).toUpperCase()}</span>
                  </div>
                </div>
              )}

              <div className={styles.characterFloorFade} aria-hidden="true" />
              <div className={styles.characterPedestal} aria-hidden="true" />

              {/* Mobile-Only Overlaid Identity on Bottom of Full-Bleed Poster */}
              <div className={styles.mobilePosterOverlay}>
                <div className={styles.roleStrip}>
                  <span className={styles.roleTag}>
                    <Icon size={12} />
                    {role.label}
                  </span>
                  {player.team && (
                    <span className={styles.mobileTeamPill}>[{player.team.tag}]</span>
                  )}
                  {stats && stats.totalGames > 0 && (
                    <span className={styles.mobileOvrPill}>OVR {rating}</span>
                  )}
                </div>
                <h2 className={styles.mobileIgn} aria-hidden="true">{player.ign}</h2>
                <div className={styles.mobileMetaRow}>
                  {player.realName && <span>{player.realName}</span>}
                  {player.region && (
                    <span>
                      <MapPin size={12} /> {player.region}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* LEFT ZONE: Identity, Headline, Squad & Signature Hero */}
          <div className={styles.identityColumn}>
            <div className={styles.desktopIdentity}>
              <div className={styles.roleStrip}>
                <span className={styles.roleTag}>
                  <Icon size={13} />
                  {role.label}
                </span>
                {player.secondaryRole && (
                  <span className={styles.subRoleTag}>
                    + {getRoleConfig(player.secondaryRole).label}
                  </span>
                )}
              </div>

              <h1 className={styles.playerIgn}>{player.ign}</h1>

              <div className={styles.metaRow}>
                {player.realName && <span className={styles.realNameText}>{player.realName}</span>}
                {player.region && (
                  <span className={styles.metaChip}>
                    <MapPin size={13} /> {player.region}
                  </span>
                )}
              </div>
            </div>

            {player.headline && <p className={styles.headline}>{player.headline}</p>}

            <div className={styles.loadoutGrid}>
              {player.team ? (
                <Link href={`/teams/${player.team.id}`} className={styles.squadHudCard}>
                  <span className={styles.squadCrest}>
                    <ProfileImage
                      src={player.team.logo}
                      sizes="44px"
                      className={styles.containImage}
                      fallback={<Shield size={20} />}
                    />
                  </span>
                  <span className={styles.squadMeta}>
                    <small>Active Squad</small>
                    <strong>
                      {player.team.name} <em>[{player.team.tag}]</em>
                    </strong>
                  </span>
                  <ArrowUpRight size={17} className={styles.squadArrow} />
                </Link>
              ) : (
                <div className={styles.freeAgentCard}>
                  <Shield size={18} />
                  <span>
                    <small>Squad Status</small>
                    <strong>Free Agent</strong>
                  </span>
                </div>
              )}

              {player.signatureHero && (
                <div className={styles.signatureHudCard}>
                  <span className={styles.signatureThumb}>
                    <ProfileImage
                      src={signatureHeroStat?.imageUrl}
                      sizes="44px"
                      className={styles.coverImage}
                      fallback={<Swords size={18} />}
                    />
                  </span>
                  <span className={styles.signatureMeta}>
                    <small>Signature Hero</small>
                    <strong>{player.signatureHero}</strong>
                  </span>
                  {signatureHeroStat && (
                    <span className={styles.signatureStat}>
                      <b>{signatureHeroStat.winRate}%</b>
                      <small>WR</small>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT ZONE: Video Game Telemetry HUD & Combat Power Bars */}
          <aside className={styles.telemetryColumn} aria-label="Player combat telemetry">
            {/* Rating & Grade Header */}
            <div className={styles.ovrHeader}>
              <div className={styles.ovrScoreBlock}>
                <span className={styles.ovrLabel}>Combat Rating</span>
                <div className={styles.ovrNumberRow}>
                  <strong>{stats && stats.totalGames > 0 ? rating : '—'}</strong>
                  <span>/ 99</span>
                </div>
              </div>
              <div className={styles.gradeBadge} aria-label={`Performance grade ${grade}`}>
                <small>RANK</small>
                <b>{grade}</b>
              </div>
            </div>

            {/* Segmented Power Bars */}
            <div className={styles.hudBars}>
              {hudBars.map((bar) => (
                <div key={bar.label} className={styles.hudBarRow}>
                  <div className={styles.hudBarHeader}>
                    <span>{bar.label}</span>
                    <strong>{bar.value}</strong>
                  </div>
                  <SegmentedBar percent={bar.percent} segments={10} accent={bar.accent} />
                </div>
              ))}
            </div>

            {/* Per-Game K / D / A Broadcast Readout */}
            <div className={styles.kdaTriad}>
              <div>
                <small>Avg K</small>
                <strong className={styles.kVal}>{stats ? stats.avgKills.toFixed(1) : '—'}</strong>
              </div>
              <div>
                <small>Avg D</small>
                <strong className={styles.dVal}>{stats ? stats.avgDeaths.toFixed(1) : '—'}</strong>
              </div>
              <div>
                <small>Avg A</small>
                <strong className={styles.aVal}>{stats ? stats.avgAssists.toFixed(1) : '—'}</strong>
              </div>
            </div>

            {/* Compact Combat Totals Strip */}
            <dl className={styles.hudCounters}>
              <div>
                <dt>Games</dt>
                <dd>{stats?.totalGames ?? 0}</dd>
              </div>
              <div>
                <dt>Wins</dt>
                <dd>{stats?.totalWins ?? 0}</dd>
              </div>
              <div>
                <dt>MVPs</dt>
                <dd className={styles.goldVal}>{stats?.mvpCount ?? 0}</dd>
              </div>
              <div>
                <dt>Savages</dt>
                <dd>{stats?.savages ?? 0}</dd>
              </div>
            </dl>

            {/* Mini Form Strip */}
            {latestForm.length > 0 && (
              <div className={styles.hudFormRow}>
                <span>Recent Form</span>
                <div className={styles.hudFormPips}>
                  {latestForm.map((game) => (
                    <span
                      key={`${game.matchId}-${game.gameNumber}`}
                      className={game.won ? styles.pipWin : styles.pipLoss}
                      title={`${game.won ? 'Win' : 'Loss'} — ${game.hero}`}
                    >
                      {game.won ? 'W' : 'L'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </header>
  );
}

export function EmptyState({
  title,
  children,
  icon = 'games',
}: {
  title: string;
  children: ReactNode;
  icon?: 'games' | 'heroes' | 'search';
}) {
  const Icon = icon === 'heroes' ? Target : icon === 'search' ? Crosshair : Swords;
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <Icon size={28} strokeWidth={1.3} />
      </div>
      <h3>{title}</h3>
      <div className={styles.emptyDescription}>{children}</div>
    </div>
  );
}

export function FeaturedHero({
  hero,
  name,
  isSignature = false,
}: {
  hero?: HeroStat;
  name: string;
  isSignature?: boolean;
}) {
  return (
    <section
      className={styles.featuredHero}
      aria-label={isSignature ? 'Signature hero' : 'Most played hero'}
    >
      <div className={styles.featuredArt}>
        <ProfileImage
          src={hero?.imageUrl}
          sizes="(max-width: 850px) 100vw, 720px"
          className={styles.coverImage}
          fallback={<Swords size={34} strokeWidth={1.2} />}
        />
        <div className={styles.featuredShade} />
      </div>

      <span className={styles.featuredKicker}>
        <Target size={12} />
        {isSignature ? 'Signature Pick' : 'Most Played'}
      </span>

      <div className={styles.featuredContent}>
        <span className={styles.eyebrow}>
          {hero ? `${hero.games} recorded game${hero.games === 1 ? '' : 's'}` : 'Player chosen hero'}
        </span>
        <h3>{name}</h3>
        {hero ? (
          <dl className={styles.featuredStats}>
            <div>
              <dt>Win Rate</dt>
              <dd>
                {hero.winRate}
                <span>%</span>
              </dd>
            </div>
            <div>
              <dt>KDA</dt>
              <dd>{hero.kda.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Wins</dt>
              <dd>{hero.wins}</dd>
            </div>
            <div>
              <dt>Kills</dt>
              <dd>{hero.kills}</dd>
            </div>
          </dl>
        ) : (
          <p className={styles.muted}>
            Match stats will appear after their first recorded game with this hero.
          </p>
        )}
      </div>
    </section>
  );
}

export function PerformancePanel({ stats }: { stats: PlayerStats }) {
  const losses = Math.max(0, stats.totalGames - stats.totalWins);
  return (
    <section className={styles.performance}>
      <div className={styles.panelHeading}>
        <Activity size={16} />
        <h3>Combat Breakdown</h3>
        <span>All recorded games</span>
      </div>

      <div className={styles.winRecord}>
        <div
          className={styles.winRing}
          style={{ '--win-angle': `${Math.min(100, Math.max(0, stats.winRate)) * 3.6}deg` } as CSSProperties}
        >
          <div>
            <strong>
              {stats.winRate.toFixed(0)}
              <span>%</span>
            </strong>
            <span>Win Rate</span>
          </div>
        </div>
        <dl className={styles.winLegend}>
          <div>
            <dt>
              <i />
              Victories
            </dt>
            <dd>{stats.totalWins}</dd>
          </div>
          <div>
            <dt>
              <i />
              Defeats
            </dt>
            <dd>{losses}</dd>
          </div>
          <div>
            <dt>Total Games</dt>
            <dd>{stats.totalGames}</dd>
          </div>
        </dl>
      </div>

      <div className={styles.averageHeading}>
        <span>Average Per Game</span>
        <span>K / D / A</span>
      </div>
      <dl className={styles.averageStats}>
        <div>
          <dt>Kills</dt>
          <dd>{stats.avgKills.toFixed(1)}</dd>
        </div>
        <div>
          <dt>Deaths</dt>
          <dd>{stats.avgDeaths.toFixed(1)}</dd>
        </div>
        <div>
          <dt>Assists</dt>
          <dd>{stats.avgAssists.toFixed(1)}</dd>
        </div>
      </dl>

      <div className={styles.pressure}>
        <div>
          <span>Kill Pressure Index</span>
          <strong>
            {stats.killPressure.toFixed(0)}
            <small> / 100</small>
          </strong>
        </div>
        <SegmentedBar percent={stats.killPressure} segments={12} accent="#f59e0b" />
        <p>Calculated from per-game KDA efficiency, capped at 100.</p>
      </div>
    </section>
  );
}

export function CareerHighlights({ stats }: { stats: PlayerStats }) {
  const highlights = [
    { label: 'MVP Awards', value: stats.mvpCount, icon: Trophy },
    { label: 'Maniacs', value: stats.maniacs, icon: Flame },
    { label: 'Savages', value: stats.savages, icon: Award },
  ];
  return (
    <section className={styles.careerPanel}>
      <div className={styles.panelHeading}>
        <Trophy size={16} />
        <h3>Career Accolades</h3>
      </div>
      <dl className={styles.highlights}>
        {highlights.map(({ label, value, icon: MetricIcon }) => (
          <div key={label}>
            <MetricIcon size={20} strokeWidth={1.4} />
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.careerTotals}>
        <span>
          <strong>{stats.totalKills.toLocaleString()}</strong>Total Kills
        </span>
        <span>
          <strong>{stats.totalAssists.toLocaleString()}</strong>Total Assists
        </span>
        <span>
          <strong>{stats.totalDeaths.toLocaleString()}</strong>Total Deaths
        </span>
      </div>
    </section>
  );
}

export function PlayerDetails({ player }: { player: PlayerInfo }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <Users size={16} />
        <h3>Player Dossier</h3>
      </div>
      <dl className={styles.playerDetails}>
        <div>
          <dt>Primary Role</dt>
          <dd>{getRoleConfig(player.role).label}</dd>
        </div>
        {player.secondaryRole && (
          <div>
            <dt>Secondary Role</dt>
            <dd>{getRoleConfig(player.secondaryRole).label}</dd>
          </div>
        )}
        {player.rankBadge && (
          <div>
            <dt>Rank Tier</dt>
            <dd className={styles.rankText}>{player.rankBadge.replaceAll('_', ' ').toLowerCase()}</dd>
          </div>
        )}
        {player.region && (
          <div>
            <dt>Region</dt>
            <dd>{player.region}</dd>
          </div>
        )}
        <div>
          <dt>Squad</dt>
          <dd>
            {player.team ? (
              <Link href={`/teams/${player.team.id}`}>
                {player.team.name}
                <ArrowUpRight size={12} />
              </Link>
            ) : (
              'Free Agent'
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function RecentForm({ games }: { games: RecentGame[] }) {
  if (!games.length) return null;
  const latest = games.slice(0, 5);
  const wins = latest.filter((game) => game.won).length;
  return (
    <section className={styles.formPanel}>
      <div>
        <p className={styles.eyebrow}>Recent Form</p>
        <h3>
          {wins}W <span>/</span> {latest.length - wins}L
        </h3>
        <p>Last {latest.length} recorded games</p>
      </div>
      <div className={styles.formResults} aria-label="Recent results, newest first">
        {latest.map((game, index) => (
          <span
            key={`${game.matchId}-${game.gameNumber}`}
            className={game.won ? styles.resultWin : styles.resultLoss}
            title={`${index === 0 ? 'Latest: ' : ''}${game.won ? 'Win' : 'Loss'} with ${game.hero}${game.vsTeam ? ` vs ${game.vsTeam}` : ''}`}
          >
            {game.won ? 'W' : 'L'}
          </span>
        ))}
        <small>Newest first</small>
      </div>
    </section>
  );
}

export function HeroCard({ hero, index }: { hero: HeroStat; index: number }) {
  const { tier, color } = getHeroTier(hero);
  return (
    <article className={styles.heroCard}>
      <div className={styles.heroCardArt}>
        <ProfileImage
          src={hero.imageUrl}
          sizes="(max-width: 600px) 50vw, (max-width: 1100px) 33vw, 290px"
          className={styles.coverImage}
          fallback={<Swords size={28} strokeWidth={1.2} />}
        />
        <div className={styles.heroCardShade} />
      </div>
      <div className={styles.heroCardTop}>
        <span className={styles.tierChip} style={{ color, borderColor: `${color}55`, background: `${color}18` }}>
          Tier {tier}
        </span>
        <span className={styles.heroIndex}>{String(index + 1).padStart(2, '0')}</span>
      </div>
      <div className={styles.heroCardContent}>
        <p>
          {hero.games} game{hero.games === 1 ? '' : 's'}
        </p>
        <h3>{hero.hero}</h3>
        <dl>
          <div>
            <dt>Win Rate</dt>
            <dd>
              {hero.winRate}
              <span>%</span>
            </dd>
          </div>
          <div>
            <dt>KDA</dt>
            <dd>{hero.kda.toFixed(1)}</dd>
          </div>
        </dl>
        <div className={styles.heroWinTrack}>
          <span style={{ width: `${Math.min(100, Math.max(0, hero.winRate))}%` }} />
        </div>
        <p className={styles.heroCardFooter}>
          {hero.wins}W · {Math.max(0, hero.games - hero.wins)}L<span>{hero.kills} kills</span>
        </p>
      </div>
    </article>
  );
}

export function HeroTable({
  heroes,
  sortBy,
  onSort,
}: {
  heroes: HeroStat[];
  sortBy: HeroSort;
  onSort: (sort: HeroSort) => void;
}) {
  const columns: { label: string; key: HeroSort }[] = [
    { label: 'Games', key: 'games' },
    { label: 'Win rate', key: 'winRate' },
    { label: 'KDA', key: 'kda' },
    { label: 'Kills', key: 'kills' },
  ];
  return (
    <div
      className={styles.tableScroll}
      tabIndex={0}
      role="region"
      aria-label="Hero statistics. Scroll horizontally for all columns."
    >
      <table className={styles.heroTable}>
        <caption className={styles.srOnly}>
          Hero statistics, sorted descending by {columns.find((c) => c.key === sortBy)?.label}
        </caption>
        <thead>
          <tr>
            <th scope="col">Hero</th>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={column.key === sortBy ? 'descending' : 'none'}
              >
                <button type="button" onClick={() => onSort(column.key)}>
                  {column.label}
                  {column.key === sortBy && <ArrowDown size={12} />}
                </button>
              </th>
            ))}
            <th scope="col">W / L</th>
          </tr>
        </thead>
        <tbody>
          {heroes.map((hero) => (
            <tr key={hero.hero}>
              <th scope="row">
                <span className={styles.tableHero}>
                  <span>
                    <ProfileImage src={hero.imageUrl} sizes="40px" className={styles.coverImage} />
                  </span>
                  <strong>{hero.hero}</strong>
                </span>
              </th>
              <td>{hero.games}</td>
              <td className={styles.winRateCell}>{hero.winRate}%</td>
              <td className={styles.kdaCell}>{hero.kda.toFixed(2)}</td>
              <td>{hero.kills}</td>
              <td>
                {hero.wins} / {Math.max(0, hero.games - hero.wins)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function gameDate(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? 'Date unavailable'
    : parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function MatchCard({ game }: { game: RecentGame }) {
  return (
    <details className={`${styles.matchCard} ${game.won ? styles.matchWin : styles.matchLoss}`}>
      <summary className={styles.matchSummary}>
        <span className={styles.matchAvatar}>
          <ProfileImage src={game.imageUrl} sizes="52px" className={styles.coverImage} />
        </span>
        <span className={styles.matchInfo}>
          <span className={styles.matchTitle}>
            <strong>{game.hero}</strong>
            <span className={styles.matchOutcome}>{game.won ? 'Victory' : 'Defeat'}</span>
            {game.isMvp && (
              <span className={styles.mvpBadge}>
                <Star size={10} /> MVP
              </span>
            )}
          </span>
          <span className={styles.matchMeta}>
            <time dateTime={game.date}>{gameDate(game.date)}</time>
            <span>Game {game.gameNumber}</span>
            {game.vsTeam && <span>vs {game.vsTeam}</span>}
          </span>
        </span>
        <span className={styles.matchScore}>
          <strong aria-label={`${game.kills} kills, ${game.deaths} deaths, ${game.assists} assists`}>
            {game.kills}
            <i>/</i>
            {game.deaths}
            <i>/</i>
            {game.assists}
          </strong>
          <span>{game.kda.toFixed(2)} KDA</span>
        </span>
        <ChevronDown size={16} className={styles.matchChevron} />
      </summary>
      <div className={styles.matchExpanded}>
        <dl>
          <div>
            <dt>Kills</dt>
            <dd>{game.kills}</dd>
          </div>
          <div>
            <dt>Deaths</dt>
            <dd>{game.deaths}</dd>
          </div>
          <div>
            <dt>Assists</dt>
            <dd>{game.assists}</dd>
          </div>
          <div>
            <dt>Maniacs</dt>
            <dd>{game.maniacs}</dd>
          </div>
          <div>
            <dt>Savages</dt>
            <dd>{game.savages}</dd>
          </div>
        </dl>
        <p>
          {game.isMvp ? (
            <>
              <Trophy size={13} /> Match MVP
            </>
          ) : (
            <>
              <Swords size={13} /> Recorded Performance
            </>
          )}
          <span>
            Game {game.gameNumber} · Match #{game.matchId.slice(-6)}
          </span>
        </p>
      </div>
    </details>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2>
          {title}
          <span>.</span>
        </h2>
      </div>
      {children}
    </div>
  );
}

export function BrowseSquadsLink() {
  return (
    <Link href="/teams" className={styles.textLink}>
      Explore squads <ArrowRight size={14} />
    </Link>
  );
}
