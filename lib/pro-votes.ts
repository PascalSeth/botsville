import { prisma } from '@/lib/prisma';

export interface ProCandidate {
  id: string;
  name: string;
  role: 'COACH' | 'PLAYER';
  team: string;
  teamTag?: string | null;
  teamLogo?: string | null;
  teamColor?: string | null;
  avatar: string;
  photo?: string | null;
  title: string;
  bio: string;
  metaFocus: string;
  achievements: string[];
  isCommunity?: boolean;
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
    isCommunity: false,
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
    isCommunity: false,
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
    isCommunity: false,
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
    isCommunity: false,
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
 * Returns aggregated vote stats for all candidates (both community players & pro legends).
 * If currentUserId is provided the caller's current vote is highlighted.
 */
export async function getAggregatedVotes(currentUserId?: string): Promise<VoteStats> {
  // 1. Parallel fetch: db players, per-candidate counts + optional user row
  const [dbPlayers, grouped, userRow] = await Promise.all([
    prisma.player.findMany({
      where: { deletedAt: null },
      include: {
        team: {
          select: { id: true, name: true, tag: true, logo: true, color: true },
        },
        user: {
          select: { id: true, ign: true, photo: true },
        },
      },
      orderBy: { matchesPlayed: 'desc' },
    }),
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

  // Convert community database players into ProCandidate models
  const communityCandidates: ProCandidate[] = dbPlayers.map((p) => {
    const color = p.team?.color || '#e8a000';
    return {
      id: p.id,
      name: p.ign,
      role: 'PLAYER',
      team: p.team ? `[${p.team.tag}] ${p.team.name}` : 'Free Agent',
      teamTag: p.team?.tag,
      teamLogo: p.team?.logo,
      teamColor: color,
      avatar: 'from-[#12121a] to-[#08080c] border-amber-500/30',
      photo: p.photo || p.user?.photo || null,
      title: p.signatureHero
        ? `${p.role} Laner · ${p.signatureHero}`
        : `${p.role} Specialist`,
      bio: `Community Player on ${p.team?.name || 'Botsville MLBB Esports League'}.`,
      metaFocus: `Main Role: ${p.role}${p.signatureHero ? ` · ${p.signatureHero}` : ''}`,
      achievements: [
        `${p.winRate}% Win Rate`,
        `${p.mvpCount} MVP Badges`,
        `${p.matchesPlayed} Matches`,
      ],
      isCommunity: true,
    };
  });

  // Combine static PRO_CANDIDATES and dynamic community players
  const candidateMap = new Map<string, ProCandidate>();
  for (const c of PRO_CANDIDATES) {
    candidateMap.set(c.id, c);
  }
  for (const c of communityCandidates) {
    if (!candidateMap.has(c.id)) {
      candidateMap.set(c.id, c);
    }
  }

  const allCandidatesList = Array.from(candidateMap.values());

  const candidates: CandidateAggregation[] = allCandidatesList.map((c) => {
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
    b.voteCount !== a.voteCount ? b.voteCount - a.voteCount : a.name.localeCompare(b.name)
  );

  return { candidates, totalVotes, userVotedId };
}

// ─── Vote mutation helpers ────────────────────────────────────────────────────

/**
 * Casts or switches a vote for the given user.
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
  await prisma.proInterviewVote.deleteMany({ where: { userId } });
}

/**
 * Resets interview votes for a specific candidate or for all candidates (admin function).
 */
export async function resetProVotes(candidateId?: string): Promise<void> {
  if (candidateId) {
    await prisma.proInterviewVote.deleteMany({ where: { candidateId } });
  } else {
    await prisma.proInterviewVote.deleteMany({});
  }
}

/**
 * Returns the candidateId the user has currently voted for, or null.
 */
export async function getUserVote(userId: string): Promise<string | null> {
  const row = await prisma.proInterviewVote.findUnique({ where: { userId } });
  return row?.candidateId ?? null;
}
