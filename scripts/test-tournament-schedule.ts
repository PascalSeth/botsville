import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocateGroups, buildDrawPlan, defaultDrawConfig, drawSourceSignature, validateDraft, type DrawConfig, type FixtureDraft } from '../lib/tournament-planner';
import { gameWeeks, planGameDates, validateMatchdayConfig, weeklyGameDates } from '../lib/tournament-schedule';

const teams = Array.from({ length: 14 }, (_, index) => ({ id: `team-${index + 1}`, name: `Team ${index + 1}`, tag: `T${index + 1}`, logo: null, seed: index + 1 }));
const exampleDates = ['2026-11-27', '2026-11-28', '2026-11-29', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06', '2026-12-09', '2026-12-10', '2026-12-11', '2026-12-12', '2026-12-13'];
const config: DrawConfig = { startDate: '2026-11-27T16:00:00.000Z', playDays: [5, 6, 0], playDates: exampleDates, matchesPerDay: 7, bestOf: 3, numGroups: 1, legs: 1, drawMode: 'SEEDED', pointSystem: 'STANDARD', advancingPerGroup: 2 };
const draft = (patch: Partial<DrawConfig> = {}): FixtureDraft => ({ config: { ...config, ...patch }, groups: allocateGroups(teams, 1, 'SEEDED'), sourceSignature: 'test' });

test('14 teams play all 91 unique pairings in 13 full game days, with a 3 / 5 / 5 weekly split', () => {
  const input = draft();
  validateDraft(input, teams, 'ROUND_ROBIN');
  const plan = buildDrawPlan(input, 'ROUND_ROBIN');
  assert.deepEqual(plan.issues, []);
  assert.equal(plan.totalMatches, 91);
  assert.equal(plan.playDays, 13);
  assert.deepEqual(plan.days.map(day => day.date), exampleDates);
  assert.deepEqual(gameWeeks(plan.days.map(day => day.date)).map(week => week.days), [3, 5, 5]);
  assert.equal(plan.lastMatch?.slice(0, 10), '2026-12-13');
  assert.equal(new Set(plan.matches.map(match => [match.teamAId, match.teamBId].sort().join(':'))).size, 91);
  for (const day of plan.days) {
    const matches = plan.matches.filter(match => match.playDay === day.playDay);
    assert.equal(matches.length, 7);
    assert.equal(new Set(matches.flatMap(match => [match.teamAId, match.teamBId])).size, 14);
    assert.equal(new Set(matches.map(match => match.round)).size, 1);
    assert.ok(matches.every(match => match.scheduledTime.slice(0, 10) === day.date));
    assert.equal(matches[0].scheduledTime.slice(11, 16), '16:00');
  }
});

test('the ending date follows edited dates, including dates outside the repeating weekdays', () => {
  const changedDates = [...exampleDates.slice(0, -1), '2027-01-04'];
  const changed = draft({ playDates: changedDates, playDays: [] });
  validateDraft(changed, teams, 'ROUND_ROBIN');
  const plan = buildDrawPlan(changed, 'ROUND_ROBIN');
  assert.equal(plan.lastMatch?.slice(0, 10), '2027-01-04');
  assert.deepEqual(plan.days.map(day => day.date), changedDates);
  assert.equal(planGameDates(changed.config, 91).endDate, '2027-01-04');
});

test('existing drafts repeat their chosen weekdays and keep their original time allocation', () => {
  const input = draft({ playDates: undefined });
  validateDraft(input, teams, 'ROUND_ROBIN');
  const plan = buildDrawPlan(input, 'ROUND_ROBIN');
  assert.equal(plan.playDays, 13);
  assert.equal(plan.lastMatch?.slice(0, 10), '2026-12-25');
  assert.ok(plan.days.every(day => [5, 6, 0].includes(new Date(day.date).getUTCDay())));
  assert.equal(plan.matches[1].scheduledTime, '2026-11-27T17:08:00.000Z');
});

test('missing or excess custom dates block publication and never claim a complete ending date', () => {
  for (const dates of [[], exampleDates.slice(0, 12), [...exampleDates, '2026-12-14']]) {
    const plan = buildDrawPlan(draft({ playDates: dates }), 'ROUND_ROBIN');
    assert.equal(plan.totalMatches, 91);
    assert.equal(plan.playDays, 13);
    assert.match(plan.issues.join(' '), /exactly 13 game dates/);
    assert.equal(plan.lastMatch, null);
  }
});

test('API validation rejects duplicate, unordered, impossible and out-of-range dates', () => {
  for (const dates of [
    ['2026-11-27', '2026-11-27'], ['2026-11-29', '2026-11-28'],
    ['2026-02-30'], ['2026-11-31'], ['2026-11-26'], ['2026-1-2'], [''], ['2201-01-01'],
  ]) assert.throws(() => validateMatchdayConfig({ ...config, playDates: dates }));
  for (const playDates of [null, '2026-11-27', [123]]) {
    assert.throws(() => validateMatchdayConfig({ ...config, playDates } as unknown as DrawConfig));
  }
  assert.throws(() => validateMatchdayConfig({ ...config, playDates: undefined, playDays: [] }), /weekly game day/);
  for (const matchesPerDay of [0, -1, 1.5, 49, NaN]) assert.throws(() => validateMatchdayConfig({ ...config, matchesPerDay }));
});

test('game dates survive draft JSON persistence and preserve the same published plan', () => {
  const input = draft();
  const restored = JSON.parse(JSON.stringify(input));
  validateDraft(restored, teams, 'ROUND_ROBIN');
  assert.deepEqual(buildDrawPlan(restored, 'ROUND_ROBIN'), buildDrawPlan(input, 'ROUND_ROBIN'));
});

test('a changed daily count recalculates required days and explicitly identifies a partial final day', () => {
  const plan = buildDrawPlan(draft({ matchesPerDay: 6, playDates: undefined }), 'ROUND_ROBIN');
  assert.equal(plan.totalMatches, 91);
  assert.equal(plan.playDays, 16);
  assert.equal(plan.days.at(-1)?.matches, 1);
  assert.equal(planGameDates({ ...config, matchesPerDay: 6, playDates: undefined }, 91).endDate, plan.lastMatch?.slice(0, 10));
});

test('double round robin still gives every team one fixture on each of 26 game days', () => {
  const plan = buildDrawPlan(draft({ legs: 2, playDates: undefined }), 'ROUND_ROBIN');
  assert.equal(plan.totalMatches, 182);
  assert.equal(plan.playDays, 26);
  for (const day of plan.days) {
    const matches = plan.matches.filter(match => match.playDay === day.playDay);
    assert.equal(new Set(matches.flatMap(match => [match.teamAId, match.teamBId])).size, 14);
  }
});

test('group-stage fixtures share one daily capacity and keep whole rounds when the capacity fits', () => {
  const groupTeams = teams.slice(0, 8);
  const input: FixtureDraft = {
    config: { ...config, numGroups: 2, matchesPerDay: 4, playDates: exampleDates.slice(0, 3) },
    groups: allocateGroups(groupTeams, 2, 'SEEDED'), sourceSignature: 'test',
  };
  validateDraft(input, groupTeams, 'GROUP_STAGE');
  const plan = buildDrawPlan(input, 'GROUP_STAGE');
  assert.deepEqual(plan.issues, []);
  assert.equal(plan.totalMatches, 12);
  assert.equal(plan.playDays, 3);
  for (const day of plan.days) {
    const matches = plan.matches.filter(match => match.playDay === day.playDay);
    assert.equal(matches.length, 4);
    assert.equal(new Set(matches.flatMap(match => [match.teamAId, match.teamBId])).size, 8);
  }
});

test('custom dates respect leap days and week boundaries across years', () => {
  const leap = { ...config, startDate: '2028-02-28T16:00:00.000Z', playDates: ['2028-02-29'] };
  assert.equal(planGameDates(leap, 7).endDate, '2028-02-29');
  assert.deepEqual(gameWeeks(['2026-12-31', '2027-01-01', '2027-01-04']), [{ start: '2026-12-28', days: 2 }, { start: '2027-01-04', days: 1 }]);
  assert.deepEqual(weeklyGameDates({ ...config, playDays: [] }, 13), []);
  assert.deepEqual(weeklyGameDates({ ...config, playDays: [7] }, 13), []);
});

test('late kickoff cannot silently spill fixtures onto a rest day', () => {
  const plan = buildDrawPlan(draft({ startDate: '2026-11-27T23:59:00.000Z' }), 'ROUND_ROBIN');
  assert.match(plan.issues.join(' '), /not have enough time/);
  assert.ok(plan.matches.every(match => exampleDates.includes(match.scheduledTime.slice(0, 10))));
});

test('registration defaults and signatures stay stable when teams arrive', () => {
  const tournament = { date: new Date(config.startDate), playDaysPerWeek: [5, 6, 0], matchesPerDay: 7, defaultBestOf: 3, format: 'ROUND_ROBIN', numGroups: 1, teamsPerGroup: null, roundRobinLegs: 1, drawMode: 'SEEDED', pointSystem: 'STANDARD' as const, registrations: [], stages: [] };
  const before = defaultDrawConfig(tournament);
  const after = defaultDrawConfig({ ...tournament, registrations: teams, stages: [{ stageType: 'GROUP_STAGE', numGroups: null, teamsAdvancingPerGroup: null }] });
  assert.equal(drawSourceSignature('ROUND_ROBIN', before, []), drawSourceSignature('ROUND_ROBIN', after, []));
});
