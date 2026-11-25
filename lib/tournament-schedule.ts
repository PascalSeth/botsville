export type MatchdayConfig = {
  startDate: string;
  playDays: number[];
  matchesPerDay: number;
  // Omitted: repeat weekdays. Present: use only these dates, in game-day order.
  playDates?: string[];
};

export function validateMatchdayConfig(c: MatchdayConfig) {
  if (!Number.isInteger(c.matchesPerDay) || c.matchesPerDay < 1 || c.matchesPerDay > 48) throw new Error('Choose between 1 and 48 fixtures per day.');
  if (typeof c.startDate !== 'string' || !c.startDate.endsWith('Z') || !Number.isFinite(Date.parse(c.startDate))) throw new Error('Choose a valid start time in UTC.');
  const year = new Date(c.startDate).getUTCFullYear();
  if (year < 2000 || year > 2200) throw new Error('Choose a start date between 2000 and 2200.');
  if (!Array.isArray(c.playDays) || c.playDays.length > 7 || new Set(c.playDays).size !== c.playDays.length || c.playDays.some(day => !Number.isInteger(day) || day < 0 || day > 6) || (c.playDates === undefined && !c.playDays.length)) throw new Error('Select at least one valid weekly game day.');
  if (c.playDates !== undefined) {
    if (!Array.isArray(c.playDates) || c.playDates.length > 10000) throw new Error('Provide a list of game dates.');
    for (const [index, date] of c.playDates.entries()) {
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date || date > '2200-12-31') throw new Error(`Choose a valid date for game day ${index + 1}.`);
      if (date < c.startDate.slice(0, 10)) throw new Error(`Game day ${index + 1} cannot be before the tournament start date.`);
      if (index > 0 && date <= c.playDates[index - 1]) throw new Error('Game dates must be different and in chronological order.');
    }
  }
}

export function weeklyGameDates(c: MatchdayConfig, count: number): string[] {
  if (!c.playDays.some(day => Number.isInteger(day) && day >= 0 && day <= 6) || !Number.isFinite(Date.parse(c.startDate))) return [];
  const date = new Date(c.startDate);
  const dates: string[] = [];
  while (dates.length < count) {
    if (c.playDays.includes(date.getUTCDay())) dates.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return dates;
}

export function planGameDates(c: MatchdayConfig, totalMatches: number) {
  validateMatchdayConfig(c);
  const requiredDays = Math.ceil(totalMatches / c.matchesPerDay);
  const dates = c.playDates ?? weeklyGameDates(c, requiredDays);
  const issues: string[] = [];
  if (dates.length !== requiredDays) issues.push(`This draw needs exactly ${requiredDays} game dates at ${c.matchesPerDay} fixtures per day; you have ${dates.length}.`);
  return { dates: dates.slice(0, requiredDays), requiredDays, issues, endDate: issues.length ? null : dates.at(-1) ?? null };
}

export function gameWeeks(dates: string[]) {
  const weeks = new Map<string, number>();
  for (const date of dates) {
    const monday = new Date(`${date}T00:00:00Z`);
    monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
    const key = monday.toISOString().slice(0, 10);
    weeks.set(key, (weeks.get(key) ?? 0) + 1);
  }
  return Array.from(weeks, ([start, days]) => ({ start, days }));
}
