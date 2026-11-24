import { generateRoundRobinSchedule } from './tournament-engine/round-robin';

export type DrawTeam = { id: string; name: string; tag: string; logo: string | null; seed: number | null };
export type DrawGroup = { name: string; teamIds: string[] };
export type DrawConfig = {
  startDate: string; playDays: number[]; matchesPerDay: number; bestOf: number;
  numGroups: number; legs: number; drawMode: 'SEEDED' | 'RANDOM';
  pointSystem: 'STANDARD' | 'MLBB_WEIGHTED'; advancingPerGroup: number;
  // Concurrent lobby count and slot spacing affect time placement only.
  parallelMatches?: number; slotMinutes?: number;
};
export type FixtureDraft = { config: DrawConfig; groups: DrawGroup[]; sourceSignature: string };
export type PlannedMatch = { groupName: string; round: number; teamAId: string; teamBId: string; scheduledTime: string; playDay: number; lobby: 'LOBBY_A' | 'LOBBY_B' };
export type DrawPlan = {
  groups: { name: string; teams: number; matches: number; perTeam: number; rounds: number }[];
  days: { playDay: number; date: string; matches: number }[];
  matches: PlannedMatch[]; totalMatches: number; playDays: number; firstMatch: string | null; lastMatch: string | null;
  issues: string[];
};
export type DraftPayload = {
  draft: FixtureDraft; defaults: DrawConfig; teams: DrawTeam[]; revision: number;
  savedAt: string | null; stale: boolean; sourceSignature: string; publishedMatches: number; plan: DrawPlan;
};

export function groupTotals(size: number, legs = 1) {
  return { matches: size * Math.max(0, size - 1) / 2 * legs, perTeam: Math.max(0, size - 1) * legs, rounds: size < 2 ? 0 : (size % 2 ? size : size - 1) * legs };
}

export function allocateGroups(teams: DrawTeam[], count: number, mode: DrawConfig['drawMode']): DrawGroup[] {
  const ordered = [...teams].sort((a, b) => (a.seed ?? Infinity) - (b.seed ?? Infinity) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  if (mode === 'RANDOM') {
    for (let i = ordered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    }
  }
  const groups = Array.from({ length: count }, (_, i) => ({ name: `Group ${i < 26 ? String.fromCharCode(65 + i) : i + 1}`, teamIds: [] as string[] }));
  ordered.forEach((team, index) => {
    const position = index % count;
    const group = mode === 'SEEDED' && Math.floor(index / count) % 2 ? count - 1 - position : position;
    groups[group].teamIds.push(team.id);
  });
  return groups;
}

// Runtime validation is shared by the editor and API; submitted JSON is never trusted.
export function validateDraft(value: unknown, teams: DrawTeam[], format: string): asserts value is FixtureDraft {
  if (!value || typeof value !== 'object') throw new Error('Provide a fixture draft.');
  const draft = value as FixtureDraft;
  const c = draft.config;
  if (!c || !Array.isArray(draft.groups) || typeof draft.sourceSignature !== 'string') throw new Error('The draft is incomplete. Reload the planner.');
  if (!['GROUP_STAGE', 'ROUND_ROBIN'].includes(format)) throw new Error('Group drafts are available for group stage and round robin tournaments.');
  if (!Number.isInteger(c.numGroups) || c.numGroups < 1 || c.numGroups > 32 || (format === 'ROUND_ROBIN' && c.numGroups !== 1)) throw new Error('Choose 1–32 groups. Round robin uses one group.');
  if (![1, 2].includes(c.legs)) throw new Error('Choose a single or double round robin.');
  if (![1, 3, 5, 7, 9].includes(c.bestOf)) throw new Error('Choose an odd best-of series from 1 to 9.');
  if (!['STANDARD', 'MLBB_WEIGHTED'].includes(c.pointSystem) || !['SEEDED', 'RANDOM'].includes(c.drawMode)) throw new Error('Choose a valid scoring system and draw mode.');
  if (!Number.isInteger(c.matchesPerDay) || c.matchesPerDay < 1 || c.matchesPerDay > 48) throw new Error('Choose between 1 and 48 series per day.');
  if (c.parallelMatches !== undefined && (!Number.isInteger(c.parallelMatches) || c.parallelMatches < 1 || c.parallelMatches > 2)) throw new Error('Choose one or two concurrent lobbies.');
  if (c.slotMinutes !== undefined && (!Number.isInteger(c.slotMinutes) || c.slotMinutes < 15 || c.slotMinutes > 480)) throw new Error('Choose a series slot between 15 minutes and 8 hours.');
  if (!Array.isArray(c.playDays) || !c.playDays.length || c.playDays.length > 7 || new Set(c.playDays).size !== c.playDays.length || c.playDays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error('Select at least one valid play day.');
  if (typeof c.startDate !== 'string' || !c.startDate.endsWith('Z') || !Number.isFinite(Date.parse(c.startDate))) throw new Error('Choose a valid start time in UTC.');
  const date = new Date(c.startDate);
  if (date.getUTCFullYear() < 2000 || date.getUTCFullYear() > 2200) throw new Error('Choose a start date between 2000 and 2200.');
  if (!Number.isInteger(c.advancingPerGroup) || c.advancingPerGroup < 1 || c.advancingPerGroup > 32) throw new Error('Choose 1–32 qualifiers per group.');
  if (draft.groups.length !== c.numGroups) throw new Error('Rebalance the draw to match the selected group count.');
  const seen = new Set<string>();
  const names = new Set<string>();
  const approved = new Set(teams.map(team => team.id));
  for (const group of draft.groups) {
    if (!group || typeof group.name !== 'string' || !group.name.trim() || group.name.length > 50 || /[\r\n]/.test(group.name) || !Array.isArray(group.teamIds)) throw new Error('Each group needs a name of up to 50 characters and a team list.');
    if (names.has(group.name.trim().toLowerCase())) throw new Error('Group names must be unique.');
    names.add(group.name.trim().toLowerCase());
    for (const id of group.teamIds) {
      if (!approved.has(id)) throw new Error('The approved team list changed. Reload the teams and rebalance the draft.');
      if (seen.has(id)) throw new Error('A team can only appear in one group.');
      seen.add(id);
    }
  }
  if (seen.size !== approved.size) throw new Error('Every approved team must be assigned exactly once. Reload the teams and rebalance the draft.');
  if (draft.groups.reduce((total, group) => total + groupTotals(group.teamIds.length, c.legs).matches, 0) > 10000) throw new Error('This draft exceeds 10,000 series. Use more groups.');
}

export function buildDrawPlan(draft: FixtureDraft, format: string): DrawPlan {
  const c = draft.config;
  const groups = draft.groups.map(group => ({ name: group.name, teams: group.teamIds.length, ...groupTotals(group.teamIds.length, c.legs) }));
  const issues = groups.filter(group => group.teams < 2).map(group => `${group.name} needs at least two approved teams.`);
  if (format === 'GROUP_STAGE' && groups.some(group => group.teams < c.advancingPerGroup)) issues.push('A group has fewer teams than the number of qualifiers.');
  if (format === 'GROUP_STAGE' && c.advancingPerGroup * groups.length < 2) issues.push('At least two teams must qualify for playoffs.');
  type Pair = { groupName: string; round: number; teamAId: string; teamBId: string };
  const pools: Pair[][] = [];
  for (const group of draft.groups) {
    if (group.teamIds.length < 2) continue;
    const rounds = generateRoundRobinSchedule(group.teamIds);
    for (let leg = 0; leg < c.legs; leg++) {
      rounds.forEach((pairs, index) => {
        const round = leg * rounds.length + index + 1;
        pools[round - 1] ??= [];
        pools[round - 1].push(...pairs.map(([a, b]) => ({ groupName: group.name, round, teamAId: leg % 2 ? b : a, teamBId: leg % 2 ? a : b })));
      });
    }
  }
  const matches: PlannedMatch[] = [];
  const days: DrawPlan['days'] = [];
  const orderedPairs = pools.flat();
  const day = new Date(c.startDate);
  day.setUTCSeconds(0, 0);
  // Date allocation depends only on the daily match count and selected play days.
  for (let offset = 0; offset < orderedPairs.length; offset += c.matchesPerDay) {
    while (!c.playDays.includes(day.getUTCDay())) day.setUTCDate(day.getUTCDate() + 1);
    const dailyPairs = orderedPairs.slice(offset, offset + c.matchesPerDay);
    const playDay = days.length + 1;
    const midnight = new Date(day);
    midnight.setUTCHours(24, 0, 0, 0);
    // Match count is the sole daily capacity; legacy lobby fields are ignored here.
    const availableMinutes = Math.floor((midnight.getTime() - day.getTime()) / 60000);
    const spacingMinutes = Math.min(120, Math.floor(availableMinutes / dailyPairs.length));
    if (spacingMinutes < 15) issues.push(`Day ${playDay} does not have enough time for ${dailyPairs.length} matches. Choose an earlier kickoff or lower the daily match count.`);
    const spacing = Math.max(0, spacingMinutes) * 60000;
    dailyPairs.forEach((pair, index) => matches.push({ ...pair, scheduledTime: new Date(day.getTime() + index * spacing).toISOString(), playDay, lobby: 'LOBBY_A' }));
    days.push({ playDay, date: day.toISOString().slice(0, 10), matches: dailyPairs.length });
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return { groups, days, matches, totalMatches: matches.length, playDays: days.length, firstMatch: matches[0]?.scheduledTime ?? null, lastMatch: matches.at(-1)?.scheduledTime ?? null, issues };
}
