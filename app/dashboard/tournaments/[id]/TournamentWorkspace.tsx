'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { Activity, ArrowDownRight, ArrowRight, CalendarDays, Check, CheckCircle2, ChevronLeft, CircleAlert, Clock3, ExternalLink, Layers3, Loader2, Plus, RefreshCw, Search, Shield, Swords, Trophy, UserRoundCheck, Users, X } from 'lucide-react';
import { dashboardFetch } from '../../lib/api';
import FixturePlanner from './FixturePlanner';
import TournamentArtwork from './TournamentArtwork';
import TeamLogo from '../TeamLogo';
import styles from './tournament-detail.module.css';

type Team = { id: string; name: string; tag: string; logo: string | null; region?: string; captain?: { id: string; ign: string } | null };
type Registration = { id: string; teamId: string; status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'WITHDRAWN' | 'FORFEITED' | 'DISQUALIFIED'; seed?: number | null; registeredAt: string; team?: Team | null };
type Match = { id: string; stage: string | null; round: number | null; playDay?: number | null; lobby?: string | null; status: string; scoreA: number; scoreB: number; scheduledTime: string; bracketType: string | null; bestOf: number; winnerId: string | null; teamA: Team | null; teamB: Team | null; winner?: Team | null };
type Standing = { id: string; groupName: string; rank: number; wins: number; losses: number; draws?: number; groupPoints: number; gameWins?: number; gameLosses?: number; team: Team };
type Tournament = { id: string; name: string; subtitle: string | null; status: string; format: string; date?: string | null; slots?: number | null; filled?: number | null; banner?: string | null; heroImage?: string | null; prizePool?: string | null; numGroups?: number | null; teamsPerGroup?: number | null; matchesPerTeam?: number | null; matchesPerDay?: number | null; defaultBestOf?: number; pointSystem?: string | null; season?: { id: string; name: string }; groups?: { id: string; name: string; teams: { team: Team }[] }[]; stages?: { id: string; name: string; order: number; stageType: string; status: string; defaultBestOf: number }[] };
type AvailableTeam = Team & { _count?: { players: number } };
type Section = 'BRACKET' | 'MATCHES' | 'STANDINGS' | 'REGISTRATIONS';
type StandingsResponse = { groups?: Record<string, Standing[]>; standings?: Standing[] };

const FORMAT_NAMES: Record<string, string> = { GROUP_STAGE: 'Groups + playoffs', ROUND_ROBIN: 'Round robin league', SINGLE_ELIMINATION: 'Single elimination', DOUBLE_ELIMINATION: 'Double elimination', SWISS: 'Swiss system', SWISS_PLAYOFFS: 'Swiss playoffs' };
const DATE = (value: string | null | undefined, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) => value ? new Date(value).toLocaleString('en-GB', options) : 'Not scheduled';
const TAGS: Record<Section, string> = { BRACKET: 'Draw & stages', MATCHES: 'Fixtures', STANDINGS: 'Standings', REGISTRATIONS: 'Teams' };

export default function TournamentWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [standings, setStandings] = useState<Record<string, Standing[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [section, setSection] = useState<Section>('BRACKET');
  const [search, setSearch] = useState('');
  const [matchStatus, setMatchStatus] = useState('ALL');
  const [registrationStatus, setRegistrationStatus] = useState('ALL');
  const [showAdd, setShowAdd] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Registration | null>(null);
  const [availableTeams, setAvailableTeams] = useState<AvailableTeam[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    const [t, m, r, s] = await Promise.all([
      dashboardFetch<Tournament>(`/api/tournaments/${id}`),
      dashboardFetch<Match[]>(`/api/tournaments/${id}/matches`),
      dashboardFetch<Registration[]>(`/api/tournaments/${id}/registrations`),
      dashboardFetch<StandingsResponse>(`/api/tournaments/${id}/standings`),
    ]);
    setLoading(false);
    if (t.error || !t.data) { setError(t.error || 'Tournament not found.'); setTournament(null); return; }
    setTournament(t.data);
    setMatches(m.data ?? []);
    setRegistrations(r.data ?? []);
    setStandings(s.data?.groups ?? {});
  }, [id]);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    const readHash = () => { const value = window.location.hash.slice(1).toUpperCase(); if (['BRACKET', 'MATCHES', 'STANDINGS', 'REGISTRATIONS'].includes(value)) setSection(value as Section); };
    readHash(); window.addEventListener('hashchange', readHash); return () => window.removeEventListener('hashchange', readHash);
  }, []);

  const changeSection = (value: Section) => { setSection(value); window.history.replaceState(window.history.state, '', `${window.location.pathname}#${value.toLowerCase()}`); };
  const approved = registrations.filter(item => item.status === 'APPROVED');
  const pending = registrations.filter(item => item.status === 'PENDING');
  const groupMatches = matches.filter(match => match.bracketType === 'GROUP_STAGE' || !match.bracketType);
  const playoffMatches = matches.filter(match => ['WINNER_BRACKET', 'LOSER_BRACKET', 'GRAND_FINAL', 'BRACKET_RESET'].includes(match.bracketType ?? ''));
  const usesGroupDraft = matches.length === 0 && ['GROUP_STAGE', 'ROUND_ROBIN'].includes(tournament?.format ?? '');

  const filteredMatches = useMemo(() => matches.filter(match => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || [match.stage, match.teamA?.name, match.teamA?.tag, match.teamB?.name, match.teamB?.tag].some(value => value?.toLowerCase().includes(query));
    return matchesQuery && (matchStatus === 'ALL' || match.status === matchStatus);
  }), [matches, search, matchStatus]);
  const filteredRegistrations = useMemo(() => registrations.filter(reg => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || [reg.team?.name, reg.team?.tag, reg.team?.captain?.ign].some(value => value?.toLowerCase().includes(query));
    return matchesQuery && (registrationStatus === 'ALL' || reg.status === registrationStatus);
  }), [registrations, search, registrationStatus]);

  async function registrationAction(registrationId: string, action: 'approve' | 'reject') {
    setBusy(registrationId); setError(''); setNotice('');
    const result = await dashboardFetch(`/api/tournaments/${id}/registrations`, { method: 'PUT', body: JSON.stringify({ registrationId, action }) });
    setBusy('');
    if (result.error) { setError(result.error); return; }
    setNotice(action === 'approve' ? 'Team approved and added to the draw.' : 'Registration declined.');
    await loadData();
  }

  async function approveAll() {
    setBusy('approve-all'); setError(''); setNotice('');
    const results = await Promise.all(pending.map(reg => dashboardFetch(`/api/tournaments/${id}/registrations`, { method: 'PUT', body: JSON.stringify({ registrationId: reg.id, action: 'approve' }) })));
    const failed = results.find(result => result.error);
    setBusy('');
    if (failed?.error) { setError(failed.error); await loadData(); return; }
    setNotice(`${pending.length} teams approved.`); await loadData();
  }

  async function openAddTeam() {
    setShowAdd(true); setTeamSearch(''); setSelectedTeam('');
    if (availableTeams.length) return;
    setBusy('teams');
    const result = await dashboardFetch<{ teams?: AvailableTeam[] }>(`/api/teams?status=ACTIVE&limit=100`);
    setBusy('');
    setAvailableTeams(Array.isArray(result.data) ? result.data as unknown as AvailableTeam[] : result.data?.teams ?? []);
    if (result.error) setError(result.error);
  }

  async function addTeam() {
    if (!selectedTeam) return;
    setBusy('add'); setError('');
    const result = await dashboardFetch<{ message?: string; results?: { message: string }[] }>(`/api/tournaments/${id}/registrations`, { method: 'POST', body: JSON.stringify({ teamIds: [selectedTeam], autoApprove }) });
    setBusy('');
    if (result.error) { setError(result.error); return; }
    setNotice(result.data?.results?.[0]?.message ?? result.data?.message ?? 'Team added.');
    setShowAdd(false); await loadData();
  }

  async function removeTeam() {
    if (!removeTarget) return;
    setBusy(removeTarget.id); setError('');
    const result = await dashboardFetch(`/api/tournaments/${id}/registrations?registrationId=${removeTarget.id}`, { method: 'DELETE' });
    setBusy(''); setRemoveTarget(null);
    if (result.error) { setError(result.error); return; }
    setNotice('Team removed from this tournament.'); await loadData();
  }

  async function generatePlayoffs() {
    setBusy('playoffs'); setError(''); setNotice('');
    const result = await dashboardFetch<{ message?: string }>(`/api/tournaments/${id}/advance-to-playoffs`, { method: 'POST', body: JSON.stringify({}) });
    setBusy('');
    if (result.error) { setError(result.error); return; }
    setNotice(result.data?.message ?? 'Playoff bracket generated.'); await loadData();
  }

  async function resetFixtures() {
    setBusy('reset'); setError('');
    const result = await dashboardFetch(`/api/tournaments/${id}/matches`, { method: 'DELETE' });
    setBusy(''); setShowReset(false);
    if (result.error) { setError(result.error); return; }
    setNotice('Fixtures cleared. Approved teams are still registered.'); await loadData();
  }

  if (loading && !tournament) return <div className={`${styles.detail} ${styles.pageShell}`}><div className={styles.loadingState}><Loader2 className={styles.spin} size={24} /><span>Preparing tournament workspace</span></div></div>;
  if (!tournament) return <div className={`${styles.detail} ${styles.pageShell}`}><div className={styles.empty}><Trophy size={30} /><p>{error || 'Tournament not found.'}</p><Link className={styles.button} href="/dashboard/tournaments"><ChevronLeft size={15} /> Back to tournaments</Link></div></div>;

  const formatName = FORMAT_NAMES[tournament.format] ?? tournament.format.replaceAll('_', ' ').toLowerCase();
  const remaining = Math.max(0, (tournament.slots ?? 0) - approved.length);
  const activeTeams = availableTeams.filter(team => !registrations.some(reg => reg.teamId === team.id && ['APPROVED', 'PENDING'].includes(reg.status)) && [team.name, team.tag, team.region].some(value => value?.toLowerCase().includes(teamSearch.toLowerCase())));
  const sections: { id: Section; label: string; icon: ReactNode; count?: number }[] = [
    { id: 'BRACKET', label: 'Competition', icon: <Layers3 size={15} /> },
    { id: 'MATCHES', label: 'Fixtures', icon: <Swords size={15} />, count: matches.length },
    { id: 'STANDINGS', label: 'Standings', icon: <Trophy size={15} /> },
    { id: 'REGISTRATIONS', label: 'Teams', icon: <Users size={15} />, count: registrations.length },
  ];

  return <div className={`${styles.detail} ${styles.pageShell}`}>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/dashboard/tournaments"><ChevronLeft size={14} /> Tournaments</Link><span>/</span><span>{tournament.name}</span><Link className={styles.publicLink} href={`/tournaments/${tournament.id}`} target="_blank">Public page <ExternalLink size={12} /></Link></nav>
    <header className={styles.topline}><div><span className={styles.kicker}>{tournament.season?.name ?? 'Tournament'} · {formatName}</span><h1>{tournament.name}</h1><p className={styles.topSubline}>{tournament.subtitle || 'Competition management'}</p></div><div className={styles.topActions}><button className={styles.button} type="button" disabled={loading} onClick={() => void loadData()}><RefreshCw size={14} /> Refresh</button><Link href={`/dashboard/tournaments/${tournament.id}/edit`} className={styles.primary}>Event settings <ArrowRight size={14} /></Link></div></header>

    <section className={styles.hero}><TournamentArtwork tournament={{ id: tournament.id, name: tournament.name, banner: tournament.banner ?? null, heroImage: tournament.heroImage ?? null }} /><aside className={styles.eventBrief}><span className={styles.status} data-live={tournament.status === 'ONGOING'}><i />{tournament.status.replaceAll('_', ' ')}</span>{tournament.subtitle && <p className={styles.subtitle}>{tournament.subtitle}</p>}<dl><div><dt>Season</dt><dd>{tournament.season?.name ?? 'Unassigned'}</dd></div><div><dt>Format</dt><dd>{formatName}</dd></div><div><dt>First match</dt><dd>{DATE(tournament.date, { dateStyle: 'medium', timeStyle: 'short' })}</dd></div><div><dt>Prize pool</dt><dd>{tournament.prizePool || 'Not announced'}</dd></div></dl><div className={styles.briefStats}><div><strong>{approved.length}<small>/{tournament.slots ?? '—'}</small></strong><span>Approved teams</span></div><div><strong>{matches.length}</strong><span>Fixtures</span></div></div><div className={styles.heroActions}><button type="button" className={styles.button} onClick={() => changeSection('REGISTRATIONS')}><Users size={14} /> Manage teams</button><button type="button" className={styles.primary} onClick={() => void openAddTeam()}><Plus size={14} /> Add team</button></div></aside></section>

    <section className={styles.journey} aria-label="Tournament progress"><div data-current={matches.length === 0}><span>01</span><div><strong>Team list</strong><small>{approved.length} approved · {pending.length} pending</small></div><b>{pending.length ? `${pending.length} review` : 'Ready'}</b></div><div data-current={matches.length > 0 && playoffMatches.length === 0}><span>02</span><div><strong>Competition</strong><small>{matches.length ? `${matches.length} fixtures scheduled` : 'Draw and schedule'}</small></div><b>{matches.length ? 'Active' : 'Next'}</b></div><div data-current={playoffMatches.length > 0}><span>03</span><div><strong>Final stage</strong><small>{playoffMatches.length ? `${playoffMatches.length} playoff fixtures` : 'Qualifiers advance'}</small></div><b>{playoffMatches.length ? 'Built' : 'Later'}</b></div></section>

    {(error || notice) && <div className={error ? styles.error : styles.notice} role={error ? 'alert' : 'status'}>{error ? <CircleAlert size={15} /> : <CheckCircle2 size={15} />}{error || notice}<button type="button" aria-label="Dismiss message" onClick={() => { setError(''); setNotice(''); }}><X size={14} /></button></div>}
    <nav className={styles.tabs} aria-label="Tournament workspace">{sections.map(item => <button type="button" key={item.id} aria-pressed={section === item.id} onClick={() => changeSection(item.id)}>{item.icon}{item.label}{item.count !== undefined && <span>{item.count}</span>}</button>)}</nav>

    {section === 'BRACKET' && <section className={styles.workspace}>
      {usesGroupDraft ? <FixturePlanner tournamentId={tournament.id} format={tournament.format} teamVersion={approved.map(reg => reg.teamId).sort().join(',')} onPublished={() => { void loadData(); }} /> : <>
        <div className={styles.sectionHeading}><div><span className={styles.kicker}>Competition view</span><h2>{matches.length ? 'The road to the final' : 'Your tournament draw'}</h2><p>{matches.length ? `${groupMatches.length} group fixtures and ${playoffMatches.length} knockout fixtures.` : 'Review the competition structure and registered teams.'}</p></div>{tournament.format === 'GROUP_STAGE' && groupMatches.length > 0 && playoffMatches.length === 0 && <button className={styles.primary} type="button" disabled={busy === 'playoffs'} onClick={() => void generatePlayoffs()}>{busy === 'playoffs' ? <Loader2 size={14} className={styles.spin} /> : <Trophy size={14} />} Advance qualifiers</button>}</div>
        {tournament.groups?.length ? <div className={styles.publishedGroups}>{tournament.groups.map((group, index) => <section className={styles.groupCard} key={group.id}><header><span className={styles.groupLetter}>{String.fromCharCode(65 + index)}</span><h3>{group.name}</h3><small>{group.teams.length} teams</small></header><div>{group.teams.map((entry, rank) => <div className={styles.publishedTeam} key={entry.team.id}><span className={styles.seed}>{String(rank + 1).padStart(2, '0')}</span><TeamLogo team={entry.team} size={35} /><strong>{entry.team.name}</strong><small>{entry.team.tag}</small></div>)}</div></section>)}</div> : matches.length === 0 ? <div className={styles.featureEmpty}><div className={styles.emptyArtwork}><Trophy size={30} /></div><div><span className={styles.kicker}>{formatName}</span><h3>Build the opening round</h3><p>{approved.length < 2 ? `Add ${2 - approved.length} more approved team${approved.length === 1 ? '' : 's'} to start.` : 'No fixtures have been published for this format yet. Add teams, then create fixtures from the match workspace.'}</p><button className={styles.button} type="button" onClick={() => changeSection(approved.length < 2 ? 'REGISTRATIONS' : 'MATCHES')}>{approved.length < 2 ? 'Review team list' : 'Open fixtures'} <ArrowRight size={14} /></button></div></div> : null}
        {playoffMatches.length > 0 && <section className={styles.bracketSection}><div className={styles.panelTitle}><div><h3>Knockout bracket</h3><p>Each match opens the full referee and result workspace.</p></div><span className={styles.sectionCount}>{playoffMatches.length} fixtures</span></div><div className={styles.bracketColumns}>{[...new Set(playoffMatches.map(match => match.round ?? 1))].sort((a, b) => a - b).map(round => <div className={styles.bracketRound} key={round}><span>Round {round}</span>{playoffMatches.filter(match => (match.round ?? 1) === round).map(match => <MatchCard key={match.id} match={match} />)}</div>)}</div></section>}
        {matches.length > 0 && <section className={styles.bracketSection}><div className={styles.panelTitle}><div><h3>Latest fixtures</h3><p>Group stage and round-robin schedule</p></div><button className={styles.textButton} onClick={() => changeSection('MATCHES')}>All fixtures <ArrowRight size={13} /></button></div><div className={styles.fixtureGrid}>{groupMatches.slice(0, 6).map(match => <MatchCard key={match.id} match={match} />)}</div></section>}
        {tournament.format === 'GROUP_STAGE' && groupMatches.length > 0 && playoffMatches.length === 0 && <div className={styles.nextStage}><div><span className={styles.kicker}>Qualification</span><strong>Playoffs unlock after every group result is final</strong><p>The draw settings decide how many teams advance from each group.</p></div><Shield size={20} /></div>}
      </>}
    </section>}

    {section === 'MATCHES' && <section className={styles.workspace}><div className={styles.sectionHeading}><div><span className={styles.kicker}>Schedule & results</span><h2>Fixtures</h2><p>Find a match, review the day and kickoff, or open its referee workspace.</p></div>{matches.length > 0 && <button type="button" className={styles.dangerButton} onClick={() => setShowReset(true)}>Reset fixtures</button>}</div><div className={styles.filters}><label className={styles.search}><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search team, tag or stage" /></label><select aria-label="Filter match status" value={matchStatus} onChange={event => setMatchStatus(event.target.value)}><option value="ALL">All statuses</option>{[...new Set(matches.map(match => match.status))].map(status => <option key={status}>{status}</option>)}</select></div>{filteredMatches.length ? <div className={styles.fixtureList}>{filteredMatches.map(match => <MatchCard key={match.id} match={match} />)}</div> : <EmptyBlock icon={<Swords size={24} />} title={matches.length ? 'No fixtures match those filters' : 'The schedule is waiting for its first match'} detail={matches.length ? 'Change the search or status filter.' : usesGroupDraft ? 'Open the Competition tab to finish the draw and publish it.' : 'Add teams and publish the tournament schedule.'} />}</section>}

    {section === 'STANDINGS' && <section className={styles.workspace}><div className={styles.sectionHeading}><div><span className={styles.kicker}>Live table</span><h2>Standings</h2><p>Points and records update from finalized group-stage results.</p></div><button className={styles.button} type="button" onClick={() => void loadData()}><RefreshCw size={14} /> Refresh table</button></div>{Object.keys(standings).length ? <div className={styles.standingsGrid}>{Object.entries(standings).map(([groupName, rows]) => <section className={styles.standingsCard} key={groupName}><header><div><span className={styles.kicker}>Group table</span><h3>{groupName}</h3></div><span>{rows.length} teams</span></header><div className={styles.tableWrap}><table><thead><tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>GD</th><th>PTS</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} data-qualifies={row.rank <= (tournament.teamsPerGroup ?? 2)}><td>{String(row.rank).padStart(2, '0')}</td><td><span className={styles.standingTeam}><TeamLogo team={row.team} size={30} /><strong>{row.team.name}</strong><small>{row.team.tag}</small></span></td><td>{row.wins}</td><td>{row.losses}</td><td>{(row.gameWins ?? 0) - (row.gameLosses ?? 0)}</td><td><strong>{row.groupPoints}</strong></td></tr>)}</tbody></table></div></section>)}</div> : <EmptyBlock icon={<Trophy size={24} />} title="Standings take shape after results" detail="Once matches are completed and finalized, group tables appear here." />}</section>}

    {section === 'REGISTRATIONS' && <section className={styles.workspace}><div className={styles.sectionHeading}><div><span className={styles.kicker}>Team desk · {approved.length} / {tournament.slots ?? '∞'} approved</span><h2>Team list</h2><p>{remaining ? `${remaining} tournament places remain.` : 'All available places have been filled.'} Review entries, approve squads, and arrange the draw.</p></div><div className={styles.registrationActions}><button className={styles.button} type="button" onClick={() => void openAddTeam()}><Plus size={14} /> Add team</button>{pending.length > 0 && <button className={styles.primary} type="button" disabled={Boolean(busy)} onClick={() => void approveAll()}><UserRoundCheck size={14} /> Approve all · {pending.length}</button>}</div></div><div className={styles.filters}><label className={styles.search}><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search team, tag or captain" /></label><select aria-label="Filter team status" value={registrationStatus} onChange={event => setRegistrationStatus(event.target.value)}><option value="ALL">All teams</option><option value="PENDING">Needs review</option><option value="APPROVED">Approved</option><option value="REJECTED">Declined</option><option value="WITHDRAWN">Withdrawn</option><option value="FORFEITED">Forfeited</option><option value="DISQUALIFIED">Disqualified</option></select></div>{filteredRegistrations.length ? <div className={styles.registrationList}>{filteredRegistrations.map(reg => <article className={styles.registration} key={reg.id}><TeamLogo team={reg.team} size={50} /><div className={styles.registrationIdentity}><strong>{reg.team?.name ?? 'Team no longer available'}</strong><small>[{reg.team?.tag ?? '—'}] · Captain @{reg.team?.captain?.ign ?? 'not provided'} · Joined {DATE(reg.registeredAt)}</small></div><span className={styles.registrationStatus} data-pending={reg.status === 'PENDING'}>{reg.status === 'APPROVED' ? <CheckCircle2 size={13} /> : <Activity size={13} />}{reg.status.toLowerCase()}</span><div className={styles.rowActions}>{['PENDING', 'REJECTED'].includes(reg.status) && <button className={styles.approveButton} type="button" disabled={Boolean(busy)} onClick={() => void registrationAction(reg.id, 'approve')}>{busy === reg.id ? <Loader2 size={13} className={styles.spin} /> : <Check size={13} />} Approve</button>}{reg.status === 'PENDING' && <button className={styles.button} type="button" disabled={Boolean(busy)} onClick={() => void registrationAction(reg.id, 'reject')}>Decline</button>}<button className={styles.iconButton} type="button" aria-label={`Remove ${reg.team?.name ?? 'team'}`} onClick={() => setRemoveTarget(reg)}><X size={15} /></button></div></article>)}</div> : <EmptyBlock icon={<Users size={24} />} title="No teams in this view" detail="Try a different filter or add a team to the tournament." />}</section>}

    <Dialog.Root open={showAdd} onOpenChange={setShowAdd}><Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content className={styles.modal}><Dialog.Title className={styles.modalTitle}>Add a team</Dialog.Title><Dialog.Description className={styles.modalDescription}>Add an active squad to {tournament.name}. You can approve it immediately or review it with other entries.</Dialog.Description><label className={styles.search}><Search size={15} /><input autoFocus value={teamSearch} onChange={event => setTeamSearch(event.target.value)} placeholder="Search active teams" /></label><div className={styles.teamPicker}>{busy === 'teams' ? <p className={styles.empty}>Loading teams…</p> : activeTeams.map(team => <button key={team.id} type="button" aria-pressed={selectedTeam === team.id} onClick={() => setSelectedTeam(team.id)}><TeamLogo team={team} size={38} /><span><strong>{team.name}</strong><small>{team.tag} · {team.region || 'Region not set'}</small></span>{selectedTeam === team.id && <Check size={15} />}</button>)}</div><label className={styles.autoApprove}><span><strong>Approve immediately</strong><small>Place the squad straight into the draw.</small></span><input type="checkbox" checked={autoApprove} onChange={event => setAutoApprove(event.target.checked)} /></label><div className={styles.modalActions}><Dialog.Close asChild><button className={styles.button} type="button">Cancel</button></Dialog.Close><button className={styles.primary} type="button" disabled={!selectedTeam || busy === 'add'} onClick={() => void addTeam()}>{busy === 'add' ? <Loader2 size={14} className={styles.spin} /> : <Plus size={14} />} Add selected team</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={Boolean(removeTarget)} onOpenChange={open => { if (!open) setRemoveTarget(null); }}><Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content className={styles.modal}><Dialog.Title className={styles.modalTitle}>Remove this team?</Dialog.Title><Dialog.Description className={styles.modalDescription}>Remove {removeTarget?.team?.name ?? 'this team'} and free their tournament place?</Dialog.Description><div className={styles.modalActions}><Dialog.Close asChild><button className={styles.button} type="button">Keep team</button></Dialog.Close><button className={styles.dangerPrimary} type="button" disabled={Boolean(busy)} onClick={() => void removeTeam()}>{busy === removeTarget?.id ? <Loader2 size={14} className={styles.spin} /> : null} Remove team</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={showReset} onOpenChange={setShowReset}><Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content className={styles.modal}><Dialog.Title className={styles.modalTitle}>Clear all fixtures?</Dialog.Title><Dialog.Description className={styles.modalDescription}>This removes {matches.length} fixtures and clears the group table. Approved team registrations remain. This action cannot be undone.</Dialog.Description><div className={styles.modalActions}><Dialog.Close asChild><button className={styles.button} type="button">Cancel</button></Dialog.Close><button className={styles.dangerPrimary} type="button" disabled={busy === 'reset'} onClick={() => void resetFixtures()}>{busy === 'reset' ? <Loader2 size={14} className={styles.spin} /> : null} Clear fixtures</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}

function EmptyBlock({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return <div className={styles.featureEmpty}><div className={styles.emptyIcon}>{icon}</div><div><h3>{title}</h3><p>{detail}</p></div></div>;
}

function MatchCard({ match }: { match: Match }) {
  return <Link className={styles.matchRow} href={`/matches/${match.id}`}><div className={styles.matchTime}><time>{DATE(match.scheduledTime, { dateStyle: 'medium' })}</time><small><Clock3 size={12} /> {DATE(match.scheduledTime, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</small></div><div className={styles.matchTeams}><span><TeamLogo team={match.teamA} size={38} /><strong>{match.teamA?.name ?? 'TBD'}</strong></span><b>{match.status === 'COMPLETED' || match.status === 'VERIFIED' ? `${match.scoreA} — ${match.scoreB}` : 'VS'}</b><span><TeamLogo team={match.teamB} size={38} /><strong>{match.teamB?.name ?? 'TBD'}</strong></span></div><div className={styles.matchMeta}><span>{match.stage || `Round ${match.round ?? 1}`}</span><small>BO{match.bestOf}{match.playDay ? ` · Play day ${match.playDay}` : ''}</small></div><ArrowDownRight size={15} /></Link>;
}
