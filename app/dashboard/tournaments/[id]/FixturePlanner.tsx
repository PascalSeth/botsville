'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dialog } from 'radix-ui';
import { ArrowRight, Check, Loader2, RefreshCw, Save, Shuffle, X } from 'lucide-react';
import { dashboardFetch } from '../../lib/api';
import { allocateGroups, buildDrawPlan, groupTotals, validateDraft, type DraftPayload, type DrawConfig, type FixtureDraft, type DrawPlan } from '@/lib/tournament-planner';
import styles from './tournament-detail.module.css';
import TeamLogo from '../TeamLogo';
import GameDaySchedule from '../GameDaySchedule';

const stamp = (value: string) => new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

export default function FixturePlanner({ tournamentId, format, teamVersion, onPublished }: { tournamentId: string; format: string; teamVersion: string; onPublished: () => void }) {
  const [payload, setPayload] = useState<DraftPayload | null>(null);
  const [draft, setDraft] = useState<FixtureDraft | null>(null);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [fixtureGroup, setFixtureGroup] = useState('');
  const [fixturePage, setFixturePage] = useState(0);
  const [fixtureDay, setFixtureDay] = useState(0);
  const [dayPage, setDayPage] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const endpoint = `/api/tournaments/${tournamentId}/fixture-draft`;
  const load = useCallback(async () => {
    setBusy('load'); setError('');
    const result = await dashboardFetch<DraftPayload>(endpoint);
    setBusy('');
    if (result.error || !result.data) { setError(result.error || 'Unable to load the draft.'); return; }
    setPayload(result.data); setDraft(result.data.draft);
    setSaved(JSON.stringify(result.data.draft));
    setFixturePage(0);
    setFixtureDay(0); setDayPage(0);
  }, [endpoint]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  const dirty = Boolean(draft && JSON.stringify(draft) !== saved);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);

  let plan: DrawPlan | null = null;
  let invalid = '';
  if (draft && payload) {
    try { validateDraft(draft, payload.teams, format); plan = buildDrawPlan(draft, format); }
    catch (err) { invalid = err instanceof Error ? err.message : 'Check the draft settings.'; }
  }

  function configure(patch: Partial<DrawConfig>) {
    if (!draft || !payload) return;
    const config = { ...draft.config, ...patch };
    setDraft({ ...draft, config, groups: patch.numGroups !== undefined || patch.drawMode !== undefined ? allocateGroups(payload.teams, config.numGroups, config.drawMode) : draft.groups });
    setNotice(''); setFixturePage(0); setFixtureDay(0); setDayPage(0);
  }
  function moveTeam(teamId: string, target: number) {
    if (!draft) return;
    setDraft({ ...draft, groups: draft.groups.map((group, index) => ({ ...group, teamIds: [...group.teamIds.filter(id => id !== teamId), ...(index === target ? [teamId] : [])] })) });
    setFixturePage(0); setNotice('');
  }
  async function save() {
    if (!draft || !payload || invalid) return;
    setBusy('save'); setError(''); setNotice('');
    const result = await dashboardFetch<{ draft: FixtureDraft; revision: number; savedAt: string; plan: DrawPlan }>(endpoint, { method: 'PUT', body: JSON.stringify({ draft, revision: payload.revision }) });
    setBusy('');
    if (result.error || !result.data) { setError(result.error || 'Unable to save the draft.'); return; }
    setPayload({ ...payload, ...result.data, stale: false });
    setDraft(result.data.draft); setSaved(JSON.stringify(result.data.draft));
    setNotice('Draft saved. Your groups and schedule are ready to review.');
  }
  async function publish() {
    if (!payload || !draft || busy || invalid) return;
    setBusy('publish'); setError('');
    const result = await dashboardFetch<{ message: string }>(endpoint, { method: 'POST', body: JSON.stringify({ action: 'publish', revision: payload.revision, draft }) });
    setBusy('');
    if (result.error) { setError(result.error); return; }
    setConfirm(false); setSaved(JSON.stringify(draft)); onPublished();
  }

  if (!draft || !payload) return <div className={styles.empty}>{error ? <><p role="alert">{error}</p><button onClick={() => void load()} className={styles.button}>Try again</button></> : <><Loader2 size={20} className={styles.spin} /><p>Loading your tournament setup…</p></>}</div>;
  const c = draft.config;
  const needsSave = dirty || !payload.savedAt;
  const fixtures = plan?.matches.filter(match => (!fixtureGroup || match.groupName === fixtureGroup) && (!fixtureDay || match.playDay === fixtureDay)) ?? [];
  const page = Math.min(fixturePage, Math.max(0, Math.ceil(fixtures.length / 12) - 1));
  const locked = payload.publishedMatches > 0;
  const teamListChanged = payload.teams.map(team => team.id).sort().join(',') !== teamVersion;
  const stale = draft.sourceSignature !== payload.sourceSignature || teamListChanged;
  const publishBlocker = locked ? 'Fixtures already exist. Continue in match management.' : stale ? 'Refresh the changed settings or approved teams before publishing.' : invalid || plan?.issues[0] || (!plan?.totalMatches ? 'Assign at least two approved teams to create fixtures.' : '');
  const ready = !publishBlocker;
  const currentDayPage = Math.min(dayPage, Math.max(0, Math.ceil((plan?.days.length ?? 0) / 8) - 1));
  const teamName = (id: string) => payload.teams.find(team => team.id === id)?.tag || payload.teams.find(team => team.id === id)?.name || 'Team removed';

  return <div className={styles.planner}>
    <div className={styles.sectionHeading}><div><span className={styles.kicker}>01 / Draft room</span><h2>Your teams. Your match days.</h2><p>Arrange the groups, choose matches per day, then review and publish. Save a draft whenever you want to return later.</p></div><span className={styles.draftState} data-dirty={needsSave}>{needsSave ? 'Working draft' : 'Draft saved'}</span></div>
    <div className={styles.lineup} aria-label="Approved team lineup">{payload.teams.map(team => <div key={team.id} title={team.name}><TeamLogo team={team} size={44} /><span>{team.tag || team.name}</span></div>)}{!payload.teams.length && <p>Approve teams to add them to the draw.</p>}</div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.notice} role="status"><Check size={15} />{notice}</p>}
    {(stale || payload.stale) && <div className={styles.warning}>Settings or approved teams have changed. Reload the latest team list, then use setup settings to rebuild the draw.<button className={styles.textButton} onClick={() => { if (!dirty || window.confirm('Discard unsaved draft changes and reload?')) void load(); }}>Reload latest data</button></div>}
    {locked && <p className={styles.warning}>Fixtures have already been published. Continue in match management.</p>}
    <fieldset disabled={Boolean(busy) || locked} className={styles.plannerFields}>
      <div className={styles.plannerLayout}>
        <section className={styles.configPanel}>
          <div className={styles.panelTitle}><h3>Draw settings</h3><button type="button" className={styles.textButton} onClick={() => { if (window.confirm('Replace this draft with the latest setup settings and rebalance groups?')) { setDraft({ config: payload.defaults, groups: allocateGroups(payload.teams, payload.defaults.numGroups, payload.defaults.drawMode), sourceSignature: payload.sourceSignature }); setPayload({ ...payload, stale: false }); setFixturePage(0); } }}>Use setup settings</button></div>
          <div className={styles.fieldGrid}>
            <label>Groups<input type="number" min={1} max={32} disabled={format === 'ROUND_ROBIN'} value={c.numGroups} onChange={e => configure({ numGroups: Math.max(1, Math.min(32, Number(e.target.value) || 1)) })} /></label>
            <label>Meetings per pair<select value={c.legs} onChange={e => configure({ legs: Number(e.target.value) })}><option value={1}>Once · single round robin</option><option value={2}>Twice · double round robin</option></select></label>
            <label>Series length<select value={c.bestOf} onChange={e => configure({ bestOf: Number(e.target.value) })}>{[1, 3, 5, 7, 9].map(n => <option key={n} value={n}>Best of {n}</option>)}</select></label>
            <label>Draw method<select value={c.drawMode} onChange={e => configure({ drawMode: e.target.value as DrawConfig['drawMode'] })}><option value="SEEDED">Seeded · snake order</option><option value="RANDOM">Random draw</option></select></label>
            <label>Points<select value={c.pointSystem} onChange={e => configure({ pointSystem: e.target.value as DrawConfig['pointSystem'] })}><option value="STANDARD">Standard</option><option value="MLBB_WEIGHTED">MLBB weighted</option></select></label>
            {format === 'GROUP_STAGE' && <label>Qualifiers per group<input type="number" min={1} max={32} value={c.advancingPerGroup} onChange={e => configure({ advancingPerGroup: Number(e.target.value) })} /></label>}
          </div>
          <h3 className={styles.subheading}>Match days <span>UTC</span></h3>
          <label className={styles.field}>First day & daily start time<input type="datetime-local" value={c.startDate.slice(0, 16)} onChange={e => { if (e.target.value) configure({ startDate: e.target.value + ':00.000Z' }); }} /></label>
          <GameDaySchedule config={c} totalMatches={draft.groups.reduce((sum, group) => sum + groupTotals(group.teamIds.length, c.legs).matches, 0)} onChange={configure} />
          {draft.groups.length === 1 && payload.teams.length > 0 && payload.teams.length === c.matchesPerDay * 2 && <p className={styles.help}>All {payload.teams.length} teams play once each game day · {c.matchesPerDay} fixtures per day.</p>}
        </section>
        <section className={styles.drawPanel}>
          <div className={styles.panelTitle}><div><h3>Group draw</h3><p>{payload.teams.length} approved teams · Move teams using their group selector.</p></div><button type="button" className={styles.button} onClick={() => { setDraft({ ...draft, groups: allocateGroups(payload.teams, c.numGroups, c.drawMode) }); setFixturePage(0); }}><Shuffle size={14} />{c.drawMode === 'RANDOM' ? 'Redraw' : 'Rebalance'}</button></div>
          <div className={styles.groupGrid}>{draft.groups.map((group, index) => {
            const total = plan?.groups[index];
            return <section className={styles.groupCard} key={index}>
              <header><span className={styles.groupLetter}>{index < 26 ? String.fromCharCode(65 + index) : index + 1}</span><input aria-label={`Name for group ${index + 1}`} maxLength={50} value={group.name} onChange={e => setDraft({ ...draft, groups: draft.groups.map((item, position) => position === index ? { ...item, name: e.target.value } : item) })} /><small>{group.teamIds.length} teams</small></header>
              <div className={styles.groupNumbers}><span><strong>{total?.matches ?? '—'}</strong> series</span><span><strong>{total?.perTeam ?? '—'}</strong> / team</span><span><strong>{total?.rounds ?? '—'}</strong> rounds</span></div>
              {group.teamIds.map(teamId => { const team = payload.teams.find(item => item.id === teamId); return <div key={teamId} className={styles.drawTeam}><TeamLogo team={team} size={34} /><div className={styles.drawTeamName}><strong title={team?.name}>{team?.name || 'Team no longer approved'}</strong><small>{team?.tag || 'Team'}{team?.seed ? ` · Seed ${team.seed}` : ''}</small></div><select aria-label={`Move ${team?.name || 'team'} to group`} value={index} onChange={e => moveTeam(teamId, Number(e.target.value))}>{draft.groups.map((option, n) => <option value={n} key={n}>{option.name}</option>)}</select></div>; })}
              {!group.teamIds.length && <p className={styles.help}>Move an approved team here to begin.</p>}
              {group.teamIds.length % 2 === 1 && <p className={styles.groupFootnote}>One team rests each round. Rest slots don’t count as matches.</p>}
            </section>;
          })}</div>
          <p className={styles.help}>Series per group = teams × (teams − 1) ÷ 2 × meetings. Best-of controls games within each series.</p>
        </section>
      </div>
    </fieldset>
    {invalid && <p className={styles.warning} role="alert">{invalid}</p>}
    {plan && <>
      <div className={styles.planSummary}><div><strong>{plan.totalMatches}</strong><span>Total series</span></div><div><strong>{plan.playDays}</strong><span>Play days</span></div><div><strong>BO{c.bestOf}</strong><span>Per series</span></div><div><strong>{plan.lastMatch ? stamp(plan.lastMatch) : '—'}</strong><span>Last scheduled start · UTC</span></div></div>
      {plan.issues.length > 0 && <div className={styles.warning}><strong>Before publishing</strong>{plan.issues.map(issue => <p key={issue}>{issue}</p>)}</div>}
      <section className={styles.matchDays}>
        <div className={styles.panelTitle}><div><h3>Your match days</h3><p>{c.matchesPerDay} fixtures per game day · {plan.totalMatches} total · All groups combined{plan.totalMatches % c.matchesPerDay > 0 ? ` · Final day: ${plan.totalMatches % c.matchesPerDay}` : ''}</p></div><button className={styles.textButton} onClick={() => { setFixtureDay(0); setFixturePage(0); setPreviewOpen(true); }}>View all fixtures</button></div>
        <div className={styles.dayGrid}>{plan.days.slice(currentDayPage * 8, currentDayPage * 8 + 8).map(day => <button key={day.playDay} aria-pressed={fixtureDay === day.playDay} onClick={() => { setFixtureDay(day.playDay); setFixturePage(0); setPreviewOpen(true); }}><span>Day {day.playDay}</span><time dateTime={day.date}>{new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}</time><strong>{day.matches}<small> matches</small></strong></button>)}</div>
        {plan.days.length > 8 && <div className={styles.pager}><button className={styles.button} disabled={currentDayPage === 0} onClick={() => setDayPage(currentDayPage - 1)}>Earlier days</button><span>{currentDayPage + 1} / {Math.ceil(plan.days.length / 8)}</span><button className={styles.button} disabled={(currentDayPage + 1) * 8 >= plan.days.length} onClick={() => setDayPage(currentDayPage + 1)}>Later days</button></div>}
      </section>
      <details className={styles.schedulePreview} open={previewOpen} onToggle={event => setPreviewOpen(event.currentTarget.open)}>
        <summary>{fixtureDay ? `Day ${fixtureDay}` : 'All fixtures'} · {fixtures.length} matches <span>Teams & suggested start times</span></summary>
        <div className={styles.panelTitle}><select aria-label="Preview group" value={fixtureGroup} onChange={e => { setFixtureGroup(e.target.value); setFixturePage(0); }}><option value="">All groups</option>{draft.groups.map(group => <option key={group.name}>{group.name}</option>)}</select><span className={styles.help}>Suggested starts in UTC · Exact times can be edited after publishing.</span></div>
        <div className={styles.previewRows}>{fixtures.slice(page * 12, page * 12 + 12).map((match, index) => <div key={`${match.groupName}-${match.round}-${index}`}><time>{stamp(match.scheduledTime)}</time><span>{match.groupName} · R{match.round}</span><div className={styles.previewTeams}><span><TeamLogo team={payload.teams.find(team => team.id === match.teamAId)} size={28} /><strong>{teamName(match.teamAId)}</strong></span><small>vs</small><span><TeamLogo team={payload.teams.find(team => team.id === match.teamBId)} size={28} /><strong>{teamName(match.teamBId)}</strong></span></div><span className={styles.fixtureSlot}>Play day {match.playDay}</span></div>)}</div>
        {fixtures.length > 12 && <div className={styles.pager}><button className={styles.button} disabled={page === 0} onClick={() => setFixturePage(page - 1)}>Previous</button><span>{page + 1} / {Math.ceil(fixtures.length / 12)}</span><button className={styles.button} disabled={(page + 1) * 12 >= fixtures.length} onClick={() => setFixturePage(page + 1)}>Next</button></div>}
      </details>
    </>}
    {publishBlocker && <p id="publish-blocker" className={styles.warning} role="status"><strong>Before publishing: </strong>{publishBlocker}</p>}
    <div className={styles.saveBar}><div><strong>{ready ? 'Ready to publish your draw' : 'Finish setting up the draw'}</strong><span>{needsSave ? 'Publishing includes your latest changes. Saving first is optional.' : `Draft saved ${stamp(payload.savedAt!)} UTC`}</span></div><button className={styles.button} disabled={Boolean(busy)} aria-label="Reload draft" onClick={() => { if (!dirty || window.confirm('Discard unsaved draft changes and reload?')) void load(); }}><RefreshCw size={15} /></button><button className={styles.button} disabled={Boolean(busy) || !needsSave || Boolean(invalid) || stale || locked} onClick={() => void save()}>{busy === 'save' ? <Loader2 size={15} className={styles.spin} /> : <Save size={15} />} Save draft</button><button className={styles.primary} disabled={!ready || Boolean(busy)} aria-describedby={publishBlocker ? 'publish-blocker' : undefined} onClick={() => { setError(''); setConfirm(true); }}>Review & publish <ArrowRight size={15} /></button></div>
    <Dialog.Root open={confirm} onOpenChange={open => { if (busy !== 'publish') setConfirm(open); }}><Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content className={styles.modal}>
      <Dialog.Title>Publish this draw?</Dialog.Title><Dialog.Description>{plan?.totalMatches} fixtures across {plan?.playDays} game days, with {c.matchesPerDay} fixtures per day{plan && plan.totalMatches % c.matchesPerDay > 0 ? ` (${plan.totalMatches % c.matchesPerDay} on the final day)` : ''}. Your current team assignments and schedule will be published together. Registration will close.</Dialog.Description>
      <div className={styles.confirmLineup}>{payload.teams.map(team => <TeamLogo key={team.id} team={team} size={38} />)}</div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.modalActions}><Dialog.Close asChild><button className={styles.button} disabled={Boolean(busy)}><X size={14} /> Keep editing</button></Dialog.Close><button className={styles.primary} disabled={!ready || Boolean(busy)} onClick={() => void publish()}>{busy === 'publish' && <Loader2 size={15} className={styles.spin} />}Publish {plan?.totalMatches} matches</button></div>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
