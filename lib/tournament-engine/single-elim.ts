/**
 * Dynamic Single Elimination Bracket Builder
 * Accepts N team IDs (ordered by seed rank 1 to N).
 * Expands to nearest power of 2 (e.g. 5 teams -> 8 slots with 3 BYEs for top seeds).
 */

export type SingleElimMatchSlot = {
  round: number;
  matchIndex: number;
  teamAId: string | null;
  teamBId: string | null;
  stageName: string;
  isBye: boolean;
  winnerId: string | null;
};

export function buildSingleEliminationBracket(seedOrderedTeamIds: string[]): {
  totalRounds: number;
  rounds: SingleElimMatchSlot[][];
} {
  const n = seedOrderedTeamIds.length;
  if (n < 2) {
    throw new Error("At least 2 teams required for single elimination");
  }

  // Calculate bracket capacity (nearest power of 2 >= n)
  let bracketCapacity = 2;
  while (bracketCapacity < n) {
    bracketCapacity *= 2;
  }

  const byesCount = bracketCapacity - n;
  const totalRounds = Math.log2(bracketCapacity);

  // Standard seed pairs generator for power of 2 bracket
  // For 8 slots: [[1, 8], [4, 5], [2, 7], [3, 6]]
  function getSeedPairs(size: number): number[] {
    let seeds = [1, 2];
    for (let i = 0; i < Math.log2(size) - 1; i++) {
      const nextSeeds: number[] = [];
      for (const s of seeds) {
        nextSeeds.push(s);
        nextSeeds.push(2 * seeds.length + 1 - s);
      }
      seeds = nextSeeds;
    }
    return seeds;
  }

  const seedPositions = getSeedPairs(bracketCapacity);

  // Map seed number to teamId or null (BYE)
  const seedToTeamMap = new Map<number, string | null>();
  for (let s = 1; s <= bracketCapacity; s++) {
    if (s <= n) {
      seedToTeamMap.set(s, seedOrderedTeamIds[s - 1]);
    } else {
      seedToTeamMap.set(s, null); // BYE
    }
  }

  const rounds: SingleElimMatchSlot[][] = [];

  // Round 1 matches
  const round1: SingleElimMatchSlot[] = [];
  for (let i = 0; i < bracketCapacity / 2; i++) {
    const seedA = seedPositions[i * 2];
    const seedB = seedPositions[i * 2 + 1];

    const teamA = seedToTeamMap.get(seedA) ?? null;
    const teamB = seedToTeamMap.get(seedB) ?? null;

    const isBye = !teamA || !teamB;
    const winnerId = isBye ? (teamA || teamB) : null;

    const stageName =
      totalRounds === 1
        ? "Grand Final"
        : totalRounds === 2
        ? "Semi-Final"
        : `Round 1 (#${seedA} vs #${seedB})`;

    round1.push({
      round: 1,
      matchIndex: i,
      teamAId: teamA,
      teamBId: teamB,
      stageName: isBye ? `${stageName} (Bye)` : stageName,
      isBye,
      winnerId,
    });
  }
  rounds.push(round1);

  // Subsequent rounds (placeholders until winners advance)
  let currentMatchesCount = bracketCapacity / 4;
  for (let r = 2; r <= totalRounds; r++) {
    const roundMatches: SingleElimMatchSlot[] = [];
    const isFinal = r === totalRounds;
    const isSemi = r === totalRounds - 1;

    const stageName = isFinal
      ? "Grand Final"
      : isSemi
      ? "Semi-Final"
      : `Round ${r}`;

    for (let i = 0; i < currentMatchesCount; i++) {
      roundMatches.push({
        round: r,
        matchIndex: i,
        teamAId: null,
        teamBId: null,
        stageName,
        isBye: false,
        winnerId: null,
      });
    }
    rounds.push(roundMatches);
    currentMatchesCount /= 2;
  }

  return { totalRounds, rounds };
}
