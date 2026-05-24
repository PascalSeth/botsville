import { prisma } from '@/lib/prisma';

export interface ProCandidate {
  id: string;
  name: string;
  role: 'COACH' | 'PLAYER';
  team: string;
  avatar: string;
  title: string;
  bio: string;
  metaFocus: string;
  achievements: string[];
}

export const PRO_CANDIDATES: ProCandidate[] = [
  {
    id: 'coach-yeb',
    name: 'COACH YEB',
    role: 'COACH',
    team: 'ONIC Esports',
    avatar: 'from-purple-600 to-indigo-900 border-purple-500/50 shadow-purple-500/10',
    title: 'Tactical Drafting Legend',
    bio: 'Renowned for stellar rotations, drafting counter-meta setups, and guiding ONIC to multiple MPL ID championship titles.',
    metaFocus: 'Counter-Drafting & Lane Cut Timings',
    achievements: ['3x MPL ID Champion', 'MSC Champion', 'M4 Finalist'],
  },
  {
    id: 'coach-duckey',
    name: 'COACH DUCKEY',
    role: 'COACH',
    team: 'AP.Bren',
    avatar: 'from-amber-500 to-yellow-800 border-amber-500/50 shadow-amber-500/10',
    title: 'Championship Mastermind',
    bio: 'The legendary head coach who guided AP.Bren to both M2 and M5 World Championship glory with distinct, dominant rosters.',
    metaFocus: 'Macro Rotations & Objective Priority',
    achievements: ['2x M-World Champion', '3x MPL PH Champion', 'SEA Games Gold'],
  },
  {
    id: 'ohmyv33nus',
    name: 'OHMYV33NUS',
    role: 'PLAYER',
    team: 'Blacklist International',
    avatar: 'from-cyan-500 to-blue-800 border-cyan-500/50 shadow-cyan-500/10',
    title: 'The Queen of Roam',
    bio: 'Pioneered the MLBB support-centric meta, leading Blacklist International with world-class shotcalling and unmatched Estes priority.',
    metaFocus: 'Shotcalling & Support UBE Strategy',
    achievements: ['M3 World Champion', '3x MPL PH Champion', 'MSC Finalist'],
  },
  {
    id: 'kairi',
    name: 'KAIRI',
    role: 'PLAYER',
    team: 'ONIC Esports',
    avatar: 'from-pink-600 to-rose-900 border-pink-500/50 shadow-pink-500/10',
    title: 'Lightning Speed Jungler',
    bio: 'Regarded globally as one of the most mechanically gifted assassin and utility jungler players in Mobile Legends history.',
    metaFocus: 'Assassin Mechanics & Retri Smite Battles',
    achievements: ['3x MPL ID MVP', 'MSC MVP', 'M5 Finalist'],
  },
  {
    id: 'skyler',
    name: 'SKYLER',
    role: 'PLAYER',
    team: 'RRQ Hoshi',
    avatar: 'from-emerald-500 to-teal-800 border-emerald-500/50 shadow-emerald-500/10',
    title: 'Precision Gold Marksman',
    bio: "RRQ Hoshi's star marksman celebrated for immaculate laning phases and carrying high-stakes late-game teamfights.",
    metaFocus: 'Positioning & Turret Siege Pressure',
    achievements: ['MPL ID Best Gold Laner', 'M4 Podium Finish', 'MSC Bronze Medal'],
  },
  {
    id: 'sanford',
    name: 'SANFORD',
    role: 'PLAYER',
    team: 'AP.Bren',
    avatar: 'from-red-600 to-orange-850 border-red-500/50 shadow-red-500/10',
    title: 'EXP Lane Frontline Playmaker',
    bio: "AP.Bren's explosive young EXP laner renowned for flawless setups and backline flanks on Chou, Yu Zhong, and Lapu-Lapu.",
    metaFocus: 'EXP Lane Priority & Backline Engagement',
    achievements: ['M5 World Champion', 'MPL PH Champion', 'IeSF World Champion'],
  },
];

// ─── Type returned by aggregation ────────────────────────────────────────────

export interface CandidateAggregation extends ProCandidate {
  voteCount: number;
  votePercentage: number;
  hasUserVoted: boolean;
}

export interface VoteStats {
  candidates: CandidateAggregation[];
  totalVotes: number;
  userVotedId: string | null;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

/**
 * Returns aggregated vote stats for all candidates.
 * If currentUserId is provided the caller's current vote is highlighted.
 */
export async function getAggregatedVotes(currentUserId?: string): Promise<VoteStats> {
  // 1. Parallel fetch: per-candidate counts + optional user row
  const [grouped, userRow] = await Promise.all([
    prisma.proInterviewVote.groupBy({
      by: ['candidateId'],
      _count: { candidateId: true },
    }),
    currentUserId
      ? prisma.proInterviewVote.findUnique({ where: { userId: currentUserId } })
      : Promise.resolve(null),
  ]);

  // Build a quick lookup map: candidateId → count
  const countMap: Record<string, number> = {};
  for (const group of grouped) {
    countMap[group.candidateId] = group._count.candidateId;
  }

  const totalVotes = Object.values(countMap).reduce((sum, n) => sum + n, 0);
  const userVotedId = userRow?.candidateId ?? null;

  const candidates: CandidateAggregation[] = PRO_CANDIDATES.map((c) => {
    const voteCount = countMap[c.id] ?? 0;
    return {
      ...c,
      voteCount,
      votePercentage: totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0,
      hasUserVoted: userVotedId === c.id,
    };
  });

  // Sort: highest votes first, then alphabetically
  candidates.sort((a, b) =>
    b.voteCount !== a.voteCount ? b.voteCount - a.voteCount : a.name.localeCompare(b.name),
  );

  return { candidates, totalVotes, userVotedId };
}

// ─── Vote mutation helpers ────────────────────────────────────────────────────

/**
 * Casts or switches a vote for the given user.
 * Uses upsert so concurrent requests are race-condition safe — the DB
 * unique constraint on userId is the single source of truth.
 */
export async function castVote(userId: string, candidateId: string): Promise<void> {
  await prisma.proInterviewVote.upsert({
    where: { userId },
    create: { userId, candidateId },
    update: { candidateId },
  });
}

/**
 * Removes a user's vote entirely (toggle-off).
 */
export async function removeVote(userId: string): Promise<void> {
  // deleteMany instead of delete so it silently no-ops if the row is already gone
  await prisma.proInterviewVote.deleteMany({ where: { userId } });
}

/**
 * Returns the candidateId the user has currently voted for, or null.
 */
export async function getUserVote(userId: string): Promise<string | null> {
  const row = await prisma.proInterviewVote.findUnique({ where: { userId } });
  return row?.candidateId ?? null;
}
