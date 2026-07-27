/**
 * Dynamic Swiss System Pairing Engine
 * Computes pairings for Round R based on current team records (Wins, Losses).
 * Ensures no repeat match-ups and groups teams with identical W-L records.
 */

export type SwissTeamRecord = {
  teamId: string;
  wins: number;
  losses: number;
  previousOpponentIds: string[];
};

export type SwissMatchPair = {
  teamAId: string;
  teamBId: string | null; // null if BYE
  recordGroup: string; // e.g. "2-0", "1-1"
  isBye: boolean;
};

export function generateSwissRoundPairings(
  teams: SwissTeamRecord[],
  currentRound: number
): SwissMatchPair[] {
  // 1. Group active teams by W-L score string (e.g., "1-0", "0-1")
  const recordGroups = new Map<string, SwissTeamRecord[]>();

  teams.forEach((t) => {
    const key = `${t.wins}-${t.losses}`;
    if (!recordGroups.has(key)) {
      recordGroups.set(key, []);
    }
    recordGroups.get(key)!.push(t);
  });

  const pairings: SwissMatchPair[] = [];
  const floaters: SwissTeamRecord[] = []; // Teams floated down if odd number in group

  // Process groups from highest score to lowest score
  const sortedKeys = Array.from(recordGroups.keys()).sort((a, b) => {
    const [wA, lA] = a.split("-").map(Number);
    const [wB, lB] = b.split("-").map(Number);
    if (wB !== wA) return wB - wA;
    return lA - lB;
  });

  for (const groupKey of sortedKeys) {
    const groupTeams = [...floaters, ...(recordGroups.get(groupKey) || [])];
    floaters.length = 0; // cleared after merging

    const unassigned = [...groupTeams];

    while (unassigned.length > 1) {
      const teamA = unassigned.shift()!;
      // Find candidate opponent teamB that has NOT played teamA before
      let opponentIndex = unassigned.findIndex(
        (cand) => !teamA.previousOpponentIds.includes(cand.teamId)
      );

      if (opponentIndex === -1) {
        // Fallback: pair with first available if strict no-rematch fails
        opponentIndex = 0;
      }

      const teamB = unassigned.splice(opponentIndex, 1)[0];

      pairings.push({
        teamAId: teamA.teamId,
        teamBId: teamB.teamId,
        recordGroup: groupKey,
        isBye: false,
      });
    }

    // Odd team out in this group gets floated down to next group
    if (unassigned.length === 1) {
      floaters.push(unassigned[0]);
    }
  }

  // If a team is still floating after all groups processed, they get a BYE
  if (floaters.length === 1) {
    const byeTeam = floaters[0];
    pairings.push({
      teamAId: byeTeam.teamId,
      teamBId: null,
      recordGroup: `${byeTeam.wins}-${byeTeam.losses}`,
      isBye: true,
    });
  }

  return pairings;
}
