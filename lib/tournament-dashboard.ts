export const TOURNAMENT_STATUS_LABELS = {
  UPCOMING: 'Scheduled', OPEN: 'Registration open', CLOSED: 'Registration closed',
  ONGOING: 'In progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
} as const;

export const TOURNAMENT_FORMAT_LABELS = {
  SINGLE_ELIMINATION: 'Single elimination', DOUBLE_ELIMINATION: 'Double elimination',
  ROUND_ROBIN: 'Round robin', GROUP_STAGE: 'Groups + playoffs', SWISS: 'Swiss',
  SWISS_PLAYOFFS: 'Swiss + playoffs',
} as const;

export type DeskTournamentStatus = keyof typeof TOURNAMENT_STATUS_LABELS;
export type DeskTournamentFormat = keyof typeof TOURNAMENT_FORMAT_LABELS;
export type TournamentDeskView = 'active' | 'attention' | 'all' | 'archive';
export const ACTIVE_TOURNAMENT_STATUSES: DeskTournamentStatus[] = ['UPCOMING', 'OPEN', 'CLOSED', 'ONGOING'];
export const REVIEW_MATCH_STATUSES = ['RESULT_SUBMITTED', 'DISPUTED', 'VERIFIED'] as const;

export type DeskTournament = {
  id: string; name: string; subtitle: string | null;
  status: DeskTournamentStatus; format: DeskTournamentFormat;
  date: string; registrationDeadline: string; slots: number;
  banner: string | null; heroImage: string | null; isOnline: boolean; location: string; prizePool: string | null;
  season: { id: string; name: string };
  stages: { id: string; name: string; status: string; order: number }[];
  counts: {
    approved: number; pending: number; waitlist: number;
    matches: number; completed: number; live: number; review: number; disputed: number;
  };
};

export type DeskIssue = { label: string; detail: string; href: string; action: string; urgent: boolean };

export function tournamentIssues(tournament: DeskTournament, now: number): DeskIssue[] {
  if (tournament.status === 'CANCELLED') return [];
  const issues: DeskIssue[] = [];
  const base = '/dashboard/tournaments/' + tournament.id;
  const matches = '/dashboard/matches?tournamentId=' + encodeURIComponent(tournament.id) + '&view=REVIEW';
  const counts = tournament.counts;
  if (counts.disputed > 0) issues.push({ label: counts.disputed + ' disputed ' + (counts.disputed === 1 ? 'result' : 'results'), detail: 'Resolve the result before progressing the bracket.', href: matches, action: 'Review results', urgent: true });
  if (counts.review > counts.disputed) {
    const count = counts.review - counts.disputed;
    issues.push({ label: count + ' ' + (count === 1 ? 'result needs' : 'results need') + ' review', detail: 'Submitted, verified or played matches still need finalisation.', href: matches, action: 'Review results', urgent: false });
  }
  if (!ACTIVE_TOURNAMENT_STATUSES.includes(tournament.status)) return issues;
  if (counts.pending > 0) issues.push({ label: counts.pending + ' pending ' + (counts.pending === 1 ? 'team' : 'teams'), detail: 'Review entries before they join the approved field.', href: base + '#registrations', action: 'Review teams', urgent: false });
  if (tournament.status === 'OPEN' && Date.parse(tournament.registrationDeadline) <= now) issues.push({ label: 'Registration deadline passed', detail: 'Close registration or update the deadline in settings.', href: base + '/edit', action: 'Review deadline', urgent: true });
  if (['CLOSED', 'ONGOING'].includes(tournament.status) && counts.matches === 0) issues.push({ label: 'No fixtures scheduled', detail: counts.approved < 2 ? 'Approve at least two teams before building the schedule.' : 'Build the bracket or generate the first round.', href: base + (counts.approved < 2 ? '#registrations' : '#bracket'), action: counts.approved < 2 ? 'Review teams' : 'Set up fixtures', urgent: true });
  if (['UPCOMING', 'OPEN', 'CLOSED'].includes(tournament.status) && Date.parse(tournament.date) <= now) issues.push({ label: 'Start date passed', detail: 'Check the schedule and tournament status.', href: base + '#bracket', action: 'Review tournament', urgent: true });
  return issues.sort((a, b) => Number(b.urgent) - Number(a.urgent));
}

export function tournamentNextAction(tournament: DeskTournament, now: number) {
  const issue = tournamentIssues(tournament, now)[0];
  if (issue) return { label: issue.action, href: issue.href };
  const base = '/dashboard/tournaments/' + tournament.id;
  if (tournament.status === 'ONGOING') return { label: 'Manage matches', href: '/dashboard/matches?tournamentId=' + encodeURIComponent(tournament.id) };
  if (tournament.status === 'OPEN') return { label: 'Manage entries', href: base + '#registrations' };
  if (tournament.status === 'CLOSED') return { label: 'Manage bracket', href: base + '#bracket' };
  if (tournament.status === 'COMPLETED') return { label: 'View standings', href: base + '#standings' };
  return { label: 'Open tournament', href: base };
}

export type TournamentDeskPayload = {
  tournaments: DeskTournament[];
  pagination: { total: number; page: number; pageSize: number };
  viewCounts: Record<TournamentDeskView, number>;
  summary: { live: number; open: number; pending: number; review: number };
  attention: DeskTournament[];
  attentionTotal: number;
  seasons: { id: string; name: string; status: string; startDate: string; endDate: string }[];
  fixtures: { id: string; scheduledTime: string; status: string; tournament: { id: string; name: string }; teamA: { name: string; tag: string }; teamB: { name: string; tag: string } | null }[];
  generatedAt: string;
};

