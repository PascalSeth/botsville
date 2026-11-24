'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Clock3, Flag, ListChecks, Loader2, Plus, Radio, RefreshCw, Search, Swords, Trophy, Users, X } from 'lucide-react';
import TournamentCard from './TournamentCard';
import { dashboardFetch } from '../lib/api';
import { useRoleGuard } from '../lib/useRole';
import {
  TOURNAMENT_FORMAT_LABELS, TOURNAMENT_STATUS_LABELS, tournamentIssues,
  type TournamentDeskPayload, type TournamentDeskView,
} from '@/lib/tournament-dashboard';
import styles from './tournaments.module.css';

const VIEWS: { value: TournamentDeskView; label: string }[] = [
  { value: 'active', label: 'Active' }, { value: 'attention', label: 'Needs attention' },
  { value: 'all', label: 'All tournaments' }, { value: 'archive', label: 'Archive' },
];
function dateLabel(date: string, time = false) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}), timeZone: 'UTC' }).format(new Date(date));
}
function TournamentDesk() {
  const { isAllowed } = useRoleGuard(['TOURNAMENT_ADMIN']);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawView = searchParams.get('view');
  const view = VIEWS.find(item => item.value === rawView)?.value || 'active';
  const season = searchParams.get('season') || '';
  const format = searchParams.get('format') || '';
  const status = searchParams.get('status') || '';
  const query = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'soonest';
  const page = searchParams.get('page') || '1';
  const requestParams = new URLSearchParams({ view, page, sort });
  if (season) requestParams.set('season', season);
  if (format) requestParams.set('format', format);
  if (status) requestParams.set('status', status);
  if (query) requestParams.set('q', query);
  const requestKey = requestParams.toString();
  const [search, setSearch] = useState(query);
  const [snapshot, setSnapshot] = useState<{ key: string; data: TournamentDeskPayload } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const data = snapshot?.key === requestKey ? snapshot.data : null;

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 0);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!isAllowed) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      const result = await dashboardFetch<TournamentDeskPayload>('/api/admin/tournaments?' + requestKey, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (result.error || !result.data) setError(result.error || 'The tournament desk couldn’t load.');
      else setSnapshot({ key: requestKey, data: result.data });
      setLoading(false);
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [requestKey, revision, isAllowed]);

  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  function updateFilters(changes: Record<string, string>, resetPage = true) {
    const next = new URLSearchParams(searchParams.toString());
    if (resetPage) next.delete('page');
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(pathname + (next.size ? '?' + next.toString() : ''), { scroll: false });
  }
  function resetFilters() {
    setSearch('');
    router.replace(pathname, { scroll: false });
  }
  const seasons = snapshot?.data.seasons ?? [];
  const scopedSeason = seasons.find(item => item.id === season);
  const activeSeason = seasons.find(item => item.status === 'ACTIVE');
  const now = data ? Date.parse(data.generatedAt) : Date.now();
  const totalPages = data ? Math.max(1, Math.ceil(data.pagination.total / data.pagination.pageSize)) : 1;
  const filtered = Boolean(query || format || status || season);
  const createUrl = '/dashboard/tournaments/setup' + (season ? '?season=' + encodeURIComponent(season) : '');

  return (
    <div className={styles.desk}>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>Botsville / Competition desk</span><h1>Tournaments<span>.</span></h1><p>From the first sign-up to the final GG.</p></div>
        <div className={styles.headerActions}><Link className={styles.textLink} href="/dashboard/seasons">Manage seasons <ArrowUpRight size={14} /></Link><Link className={styles.primaryButton} href={createUrl}><Plus size={15} /> Create tournament</Link></div>
      </header>

      <div className={styles.scopeBar}>
        <div><CalendarDays size={14} /><label htmlFor="desk-season" className={styles.srOnly}>Season</label><select id="desk-season" value={season} onChange={event => updateFilters({ season: event.target.value })}><option value="">All seasons</option>{seasons.map(item => <option key={item.id} value={item.id}>{item.name}{item.status === 'ACTIVE' ? ' · Active' : ''}</option>)}</select></div>
        {activeSeason && !season && <button className={styles.seasonShortcut} onClick={() => updateFilters({ season: activeSeason.id })}>Current season: {activeSeason.name}<ArrowRight size={12} /></button>}
        {scopedSeason && <Link className={styles.seasonShortcut} href={'/dashboard/seasons/' + scopedSeason.id}>{dateLabel(scopedSeason.startDate)} — {dateLabel(scopedSeason.endDate)}<ArrowUpRight size={12} /></Link>}
        <div className={styles.refresh}><span>{data ? 'Updated ' + new Date(data.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC' : 'All times UTC'}</span><button disabled={loading} onClick={() => setRevision(value => value + 1)} className={styles.iconButton} aria-label="Refresh tournament data"><RefreshCw size={14} className={loading ? styles.spin : undefined} /></button></div>
      </div>

      <div className={styles.summary} aria-label="Season overview">
        <div><span><Radio size={14} /> In progress</span><strong>{data?.summary.live ?? '—'}</strong><small>Tournaments under way</small></div>
        <div><span><Users size={14} /> Registration open</span><strong>{data?.summary.open ?? '—'}</strong><small>Events marked open</small></div>
        <div data-attention={Boolean(data?.summary.pending)}><span><ListChecks size={14} /> Pending teams</span><strong>{data?.summary.pending ?? '—'}</strong><small>Applications to review</small></div>
        <div data-attention={Boolean(data?.summary.review)}><span><Flag size={14} /> Results to review</span><strong>{data?.summary.review ?? '—'}</strong><small>Review or finalise scores</small></div>
      </div>

      {error && <div className={styles.error} role="alert"><Flag size={16} /><div><strong>Couldn’t refresh tournament data.</strong><p>{error}{data ? ' Previously loaded data is shown below.' : ''}</p></div><button onClick={() => setRevision(value => value + 1)} className={styles.secondaryButton}>Retry</button></div>}
      <button className={styles.operationsToggle} aria-expanded={operationsOpen} aria-controls="tournament-operations" onClick={() => setOperationsOpen(value => !value)}><span><ListChecks size={15} /> Tasks & fixtures{data && <small>{data.attentionTotal} events need attention</small>}</span><ChevronDown size={15} /></button>

      <div className={styles.workspace}>
        <section className={styles.registry} aria-label="Tournament registry" id="tournament-registry">
          <div className={styles.viewTabs} aria-label="Tournament views">{VIEWS.map(item => <button key={item.value} aria-pressed={view === item.value} onClick={() => updateFilters({ view: item.value, status: '' })}>{item.label}<span>{data?.viewCounts[item.value] ?? '—'}</span></button>)}</div>
          <div className={styles.filters}>
            <form className={styles.search} onSubmit={event => { event.preventDefault(); updateFilters({ q: search.trim() }); }}><Search size={15} /><input aria-label="Search tournaments" placeholder="Search name, season or format…" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} /><button type="submit" aria-label="Apply search"><ArrowRight size={15} /></button></form>
            <div className={styles.filterSelects}>
              <select aria-label="Filter by format" value={format} onChange={event => updateFilters({ format: event.target.value })}><option value="">All formats</option>{Object.entries(TOURNAMENT_FORMAT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <select aria-label="Filter by status" value={status} onChange={event => updateFilters({ status: event.target.value, view: 'all' })}><option value="">All statuses</option>{Object.entries(TOURNAMENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <select aria-label="Sort tournaments" value={sort} onChange={event => updateFilters({ sort: event.target.value })}><option value="soonest">{view === 'archive' ? 'Recent dates' : 'Start date'}</option><option value="newest">Recently created</option><option value="name">Name A–Z</option></select>
            </div>
          </div>
          <div className={styles.listIntro}><span>{view === 'active' ? 'Scheduled, open, closed and in-progress tournaments.' : view === 'attention' ? 'Pending entries, results and schedule checks.' : view === 'archive' ? 'Completed and cancelled tournaments.' : 'Every tournament, across the full lifecycle.'}</span>{filtered && <button onClick={resetFilters}><X size={12} /> Reset filters</button>}</div>
          <div aria-busy={loading || !isAllowed}>
            {!data && (loading || !error) ? <div className={styles.loading} role="status"><Loader2 size={19} className={styles.spin} /> Loading the competition desk…</div>
              : data && data.tournaments.length === 0 ? <div className={styles.empty}><Trophy size={25} /><h2>{view === 'attention' ? 'Nothing needs attention here' : filtered ? 'No tournaments match' : view === 'archive' ? 'No archived tournaments yet' : 'Make room for the next GG'}</h2><p>{view === 'attention' ? 'There are no outstanding alerts in this view.' : filtered ? 'Try another search, season or format.' : view === 'archive' ? 'Completed and cancelled events will appear here.' : 'Create a tournament, open entries and build the bracket.'}</p>{filtered ? <button className={styles.secondaryButton} onClick={resetFilters}>Reset filters</button> : view === 'active' && <Link className={styles.primaryButton} href={createUrl}><Plus size={14} /> Create tournament</Link>}</div>
              : data && (
                <div className={styles.tournamentGrid}>
                  {data.tournaments.map((tournament, index) => (
                    <TournamentCard key={tournament.id} tournament={tournament} now={now} lead={index === 0} />
                  ))}
                </div>
              )}
          </div>
          {data && data.pagination.total > 0 && <footer className={styles.pagination}><span>{(data.pagination.page - 1) * data.pagination.pageSize + 1}–{Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total)} of {data.pagination.total} tournaments</span><div><button className={styles.iconButton} disabled={loading || data.pagination.page === 1} aria-label="Previous page" onClick={() => { updateFilters({ page: String(data.pagination.page - 1) }, false); document.getElementById('tournament-registry')?.scrollIntoView({ block: 'start' }); }}><ArrowLeft size={14} /></button><span>{data.pagination.page} / {totalPages}</span><button className={styles.iconButton} disabled={loading || data.pagination.page >= totalPages} aria-label="Next page" onClick={() => { updateFilters({ page: String(data.pagination.page + 1) }, false); document.getElementById('tournament-registry')?.scrollIntoView({ block: 'start' }); }}><ArrowRight size={14} /></button></div></footer>}
        </section>

        <aside className={styles.operations} id="tournament-operations" data-open={operationsOpen}>
          <section className={styles.attentionPanel}>
            <div className={styles.panelHeading}><h2><Flag size={14} /> Needs attention</h2><span>{data?.attentionTotal ?? '—'}</span></div>
            <p className={styles.panelScope}>{scopedSeason?.name || 'Across all seasons'} · Unfiltered task queue</p>
            {!data ? <p className={styles.quiet}>Tasks load with the desk.</p> : !data.attention.length ? <div className={styles.clearState}><Check size={19} /><p>The desk is clear.<span>No outstanding tournament alerts.</span></p></div> : <div className={styles.taskList}>{data.attention.map(tournament => {
              const issue = tournamentIssues(tournament, now)[0];
              if (!issue) return null;
              return <Link key={tournament.id} href={issue.href}><span className={styles.taskLabel} data-urgent={issue.urgent}>{issue.label}</span><strong>{tournament.name}</strong><p>{issue.detail}</p><span className={styles.taskAction}>{issue.action}<ArrowUpRight size={13} /></span></Link>;
            })}</div>}
            {Boolean(data?.attentionTotal) && <button className={styles.panelLink} onClick={() => { updateFilters({ view: 'attention', q: '', status: '', format: '' }); setSearch(''); setOperationsOpen(false); }}>View all tasks <ArrowRight size={13} /></button>}
          </section>

          <section className={styles.fixturePanel}>
            <div className={styles.panelHeading}><h2><Swords size={14} /> Up next</h2><span>UTC</span></div>
            {!data?.fixtures.length ? <p className={styles.quiet}>{data ? 'No live or upcoming fixtures scheduled in this season view.' : 'Fixtures load with the desk.'}</p> : <div className={styles.fixtureList}>{data.fixtures.map(match => <Link key={match.id} href={'/dashboard/matches?tournamentId=' + encodeURIComponent(match.tournament.id)}><div><span className={styles.fixtureDate} data-live={match.status === 'LIVE'}>{match.status === 'LIVE' ? <><Radio size={11} /> Live now</> : <><Clock3 size={11} />{dateLabel(match.scheduledTime, true)}</>}</span><ArrowUpRight size={12} /></div><strong>{match.teamA.tag || match.teamA.name}<span>vs</span>{match.teamB?.tag || match.teamB?.name || 'TBC'}</strong><small>{match.tournament.name}</small></Link>)}</div>}
          </section>
          <p className={styles.legend}><span><i /> Approved</span><span><i /> Pending</span></p><p className={styles.legendNote}>Team capacity excludes rejected, withdrawn, forfeited and disqualified entries. Match totals exclude cancelled fixtures and resting rounds.</p>
        </aside>
      </div>
    </div>
  );
}

export default function TournamentsDashboardPage() {
  return <Suspense fallback={<div className={styles.loading} role="status"><Loader2 size={18} className={styles.spin} /> Opening tournaments…</div>}><TournamentDesk /></Suspense>;
}
