'use client';

import { use, useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Tabs } from 'radix-ui';
import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpDown,
  Crosshair,
  Grid3X3,
  List,
  Loader2,
  RefreshCw,
  Search,
  Swords,
  Target,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { HERO_SORT_LABELS, type HeroSort, type ProfileData } from './player-profile-types';
import {
  BrowseSquadsLink,
  CareerHighlights,
  EmptyState,
  FeaturedHero,
  getRoleConfig,
  HeroCard,
  HeroTable,
  MatchCard,
  PerformancePanel,
  PlayerDetails,
  PlayerHero,
  RecentForm,
  SectionHeading,
} from './PlayerProfileSections';
import styles from './player-profile.module.css';

type ProfileTab = 'overview' | 'heroes' | 'matches';
type MatchFilter = 'all' | 'wins' | 'losses';

interface FetchState {
  id: string | null;
  data: ProfileData | null;
  error: 'not-found' | 'failed' | null;
}

export default function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [fetchState, setFetchState] = useState<FetchState>({ id: null, data: null, error: null });
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all');
  const [heroSort, setHeroSort] = useState<HeroSort>('games');
  const [heroQuery, setHeroQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/players/${id}/stats`, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 404) {
          setFetchState({ id, data: null, error: 'not-found' });
          return;
        }
        const json = await res.json();
        const payload: ProfileData | null = json?.data ?? (json?.player ? json : null);
        if (!res.ok || !payload?.player) {
          setFetchState({ id, data: null, error: res.ok ? 'not-found' : 'failed' });
          return;
        }
        setFetchState({ id, data: payload, error: null });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setFetchState({ id, data: null, error: 'failed' });
      });

    return () => controller.abort();
  }, [id, retryCount]);

  const loading = fetchState.id !== id;
  const data = fetchState.id === id ? fetchState.data : null;
  const loadError = fetchState.id === id ? fetchState.error : null;

  const mostPlayedHero = useMemo(() => {
    if (!data?.heroBreakdown.length) return undefined;
    return [...data.heroBreakdown].sort(
      (a, b) => b.games - a.games || b.winRate - a.winRate || b.kda - a.kda
    )[0];
  }, [data]);

  const filteredHeroes = useMemo(() => {
    if (!data?.heroBreakdown.length) return [];
    const query = heroQuery.trim().toLowerCase();
    const list = query
      ? data.heroBreakdown.filter((item) => item.hero.toLowerCase().includes(query))
      : [...data.heroBreakdown];

    return list.sort((a, b) => {
      if (heroSort === 'games') return b.games - a.games || b.winRate - a.winRate;
      if (heroSort === 'winRate') return b.winRate - a.winRate || b.games - a.games;
      if (heroSort === 'kda') return b.kda - a.kda || b.games - a.games;
      return b.kills - a.kills || b.games - a.games;
    });
  }, [data, heroQuery, heroSort]);

  const filteredMatches = useMemo(() => {
    const games = data?.recentGames ?? [];
    if (matchFilter === 'wins') return games.filter((g) => g.won);
    if (matchFilter === 'losses') return games.filter((g) => !g.won);
    return games;
  }, [data, matchFilter]);

  const handleRetry = () => {
    setFetchState({ id: null, data: null, error: null });
    setRetryCount((c) => c + 1);
  };

  const handleShare = async () => {
    if (!data?.player) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `${data.player.ign} — Botsville Player Profile`,
          text: `Check out ${data.player.ign}'s Mobile Legends profile on Botsville.`,
          url,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Player profile link copied');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  if (loading) {
    return (
      <main className={`${styles.page} ${styles.statePage}`}>
        <div className={styles.stateCard} role="status" aria-live="polite">
          <Loader2 size={36} className={styles.spinner} />
          <h1>Loading Profile</h1>
          <p>Syncing combat telemetry, hero mastery, and match history…</p>
        </div>
      </main>
    );
  }

  if (loadError === 'failed') {
    return (
      <main className={`${styles.page} ${styles.statePage}`}>
        <div className={styles.stateCard}>
          <AlertCircle size={38} />
          <h1>Could Not Load Player</h1>
          <p>Something went wrong while fetching this player’s stats. Try again in a moment.</p>
          <div className={styles.stateActions}>
            <button type="button" onClick={handleRetry} className={styles.primary}>
              <RefreshCw size={15} /> Try again
            </button>
            <Link href="/leaderboard" className={styles.secondary}>
              <ArrowLeft size={15} /> Leaderboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!data?.player) {
    return (
      <main className={`${styles.page} ${styles.statePage}`}>
        <div className={styles.stateCard}>
          <Users size={38} />
          <h1>Player Not Found</h1>
          <p>This player profile could not be located or may have been removed.</p>
          <div className={styles.stateActions}>
            <Link href="/leaderboard" className={styles.primary}>
              <ArrowLeft size={15} /> Leaderboard
            </Link>
            <Link href="/teams" className={styles.secondary}>
              Explore squads
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { player, stats, heroBreakdown, recentGames } = data;
  const role = getRoleConfig(player.role);
  const signatureName = player.signatureHero?.trim() || null;
  const signatureHeroStat = signatureName
    ? heroBreakdown.find((item) => item.hero.trim().toLowerCase() === signatureName.toLowerCase())
    : undefined;
  const featuredHeroName = signatureName ?? mostPlayedHero?.hero ?? null;
  const featuredHeroStat = signatureName ? signatureHeroStat : mostPlayedHero;
  const featuredIsSignature = Boolean(signatureName);

  const winCount = recentGames.filter((g) => g.won).length;
  const lossCount = recentGames.length - winCount;

  return (
    <main className={styles.page} style={{ '--role-color': role.color } as CSSProperties}>
      <PlayerHero
        player={player}
        stats={stats}
        signatureHeroStat={signatureHeroStat}
        recentGames={recentGames}
        onShare={handleShare}
        copied={copied}
      />

      <Tabs.Root
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ProfileTab)}
        className={styles.tabs}
      >
        <div className={styles.tabsBarWrap}>
          <div className={styles.tabsBar}>
            <Tabs.List className={styles.tabsList} aria-label="Player profile sections">
              <Tabs.Trigger value="overview" className={styles.tab}>
                <Target size={14} /> Overview
              </Tabs.Trigger>
              <Tabs.Trigger value="heroes" className={styles.tab}>
                <Crosshair size={14} /> Hero Pool
                <span className={styles.tabCount}>[{heroBreakdown.length}]</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="matches" className={styles.tab}>
                <Swords size={14} /> Match Log
                <span className={styles.tabCount}>[{recentGames.length}]</span>
              </Tabs.Trigger>
            </Tabs.List>
            <span className={styles.tabsNote}>
              {player.ign} {'//'} {role.short}
            </span>
          </div>
        </div>

        <div className={styles.tabBody}>
          <Tabs.Content value="overview" className={styles.tabContent}>
            <SectionHeading eyebrow="Combat Dossier" title="Performance Overview">
              <span>
                {stats
                  ? `${stats.totalGames} game${stats.totalGames === 1 ? '' : 's'} recorded`
                  : 'Awaiting first match'}
              </span>
            </SectionHeading>

            <div className={styles.overviewGrid}>
              <div className={styles.stack}>
                {featuredHeroName && (
                  <FeaturedHero
                    hero={featuredHeroStat}
                    name={featuredHeroName}
                    isSignature={featuredIsSignature}
                  />
                )}
                {stats && stats.totalGames > 0 ? (
                  <PerformancePanel stats={stats} />
                ) : (
                  <EmptyState title="No match stats yet" icon="games">
                    <p>
                      Win rate, average K/D/A, and combat score will appear here once {player.ign}{' '}
                      completes a recorded match.
                    </p>
                    <BrowseSquadsLink />
                  </EmptyState>
                )}
              </div>

              <div className={styles.stack}>
                {stats && stats.totalGames > 0 && <CareerHighlights stats={stats} />}
                <RecentForm games={recentGames} />
                <PlayerDetails player={player} />
              </div>
            </div>

            {recentGames.length > 0 && (
              <section className={styles.recentSection} aria-label="Latest recorded matches">
                <div className={styles.sectionSmallHeading}>
                  <h3>Latest Matches</h3>
                  <button
                    type="button"
                    className={styles.textLink}
                    onClick={() => setActiveTab('matches')}
                  >
                    Full Match Log ({recentGames.length}) <ArrowRight size={14} />
                  </button>
                </div>
                <div className={styles.matchList}>
                  {recentGames.slice(0, 3).map((game) => (
                    <MatchCard key={`${game.matchId}-${game.gameNumber}`} game={game} />
                  ))}
                </div>
              </section>
            )}
          </Tabs.Content>

          <Tabs.Content value="heroes" className={styles.tabContent}>
            <SectionHeading eyebrow="Champion Mastery" title="Hero Pool">
              <span>
                {heroBreakdown.length} hero{heroBreakdown.length === 1 ? '' : 'es'}
              </span>
            </SectionHeading>

            {heroBreakdown.length === 0 ? (
              <div className={styles.stack}>
                {signatureName && <FeaturedHero name={signatureName} isSignature />}
                <EmptyState title="No hero stats recorded yet" icon="heroes">
                  <p>
                    Hero win rates, KDA, and mastery cards will appear here after {player.ign}’s
                    first recorded match.
                  </p>
                  <BrowseSquadsLink />
                </EmptyState>
              </div>
            ) : (
              <>
                <div className={styles.heroControls}>
                  <label className={styles.searchField}>
                    <Search size={15} aria-hidden="true" />
                    <span className={styles.srOnly}>Search heroes</span>
                    <input
                      type="search"
                      value={heroQuery}
                      onChange={(e) => setHeroQuery(e.target.value)}
                      placeholder="Search hero pool..."
                    />
                  </label>

                  <label className={styles.sortField}>
                    <ArrowUpDown size={15} aria-hidden="true" />
                    <span className={styles.srOnly}>Sort heroes</span>
                    <select
                      value={heroSort}
                      onChange={(e) => setHeroSort(e.target.value as HeroSort)}
                    >
                      {(Object.keys(HERO_SORT_LABELS) as HeroSort[]).map((key) => (
                        <option key={key} value={key}>
                          {HERO_SORT_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className={styles.viewToggle} role="group" aria-label="Hero pool layout">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      aria-pressed={viewMode === 'grid'}
                      aria-label="Grid view"
                    >
                      <Grid3X3 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      aria-pressed={viewMode === 'table'}
                      aria-label="Table view"
                    >
                      <List size={16} />
                    </button>
                  </div>
                </div>

                {filteredHeroes.length === 0 ? (
                  <EmptyState title="No matching heroes" icon="search">
                    <p>No recorded hero stats matched “{heroQuery.trim()}”.</p>
                    <button
                      type="button"
                      className={styles.textLink}
                      onClick={() => setHeroQuery('')}
                    >
                      Clear search
                    </button>
                  </EmptyState>
                ) : viewMode === 'grid' ? (
                  <div className={styles.heroGrid}>
                    {filteredHeroes.map((hero, index) => (
                      <HeroCard key={hero.hero} hero={hero} index={index} />
                    ))}
                  </div>
                ) : (
                  <>
                    <HeroTable heroes={filteredHeroes} sortBy={heroSort} onSort={setHeroSort} />
                    <p className={styles.tableHint}>
                      <ArrowLeftRight size={13} aria-hidden="true" /> Swipe sideways to view all
                      columns
                    </p>
                  </>
                )}
              </>
            )}
          </Tabs.Content>

          <Tabs.Content value="matches" className={styles.tabContent}>
            <SectionHeading eyebrow="Battle Telemetry" title="Match History">
              <span>
                {recentGames.length} game{recentGames.length === 1 ? '' : 's'}
              </span>
            </SectionHeading>

            {recentGames.length === 0 ? (
              <EmptyState title="No recorded matches yet" icon="games">
                <p>
                  {player.ign} hasn’t played any recorded tournament or league games yet.
                </p>
                <BrowseSquadsLink />
              </EmptyState>
            ) : (
              <>
                <div className={styles.matchToolbar}>
                  <p>
                    Showing {filteredMatches.length} of {recentGames.length} recorded game
                    {recentGames.length === 1 ? '' : 's'}
                  </p>
                  <div className={styles.matchFilters} role="group" aria-label="Filter matches">
                    <button
                      type="button"
                      onClick={() => setMatchFilter('all')}
                      aria-pressed={matchFilter === 'all'}
                    >
                      All ({recentGames.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchFilter('wins')}
                      aria-pressed={matchFilter === 'wins'}
                    >
                      Wins ({winCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchFilter('losses')}
                      aria-pressed={matchFilter === 'losses'}
                    >
                      Losses ({lossCount})
                    </button>
                  </div>
                </div>

                {filteredMatches.length === 0 ? (
                  <EmptyState
                    title={matchFilter === 'wins' ? 'No recorded wins yet' : 'No recorded losses'}
                    icon="games"
                  >
                    <p>No matches found under this filter.</p>
                    <button
                      type="button"
                      className={styles.textLink}
                      onClick={() => setMatchFilter('all')}
                    >
                      Show all matches
                    </button>
                  </EmptyState>
                ) : (
                  <div className={styles.matchList}>
                    {filteredMatches.map((game) => (
                      <MatchCard key={`${game.matchId}-${game.gameNumber}`} game={game} />
                    ))}
                  </div>
                )}
              </>
            )}
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </main>
  );
}
