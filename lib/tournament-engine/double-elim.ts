/**
 * Dynamic Double Elimination Bracket Builder
 * Supports N teams (e.g. 4, 6, 8, 12, 16...).
 * Generates Upper Bracket (UB), Lower Bracket (LB), Grand Final (GF),
 * and links them with nextMatch (winner) and loserNext (loser).
 */

export type DoubleElimMatchDef = {
  tempId: string;
  bracketType: "WINNER_BRACKET" | "LOSER_BRACKET" | "GRAND_FINAL";
  stageName: string;
  round: number;
  bracketPosition: number;
  bestOf: number;
  teamAId: string | null;
  teamBId: string | null;
  winnerId: string | null;
  isBye: boolean;
  nextTempId: string | null;
  loserNextTempId: string | null;
};

export function buildDoubleEliminationBracket(
  seedOrderedTeamIds: string[],
  options?: {
    seedingByesCount?: number;
    bestOfUpper?: number;
    bestOfLower?: number;
    bestOfFinal?: number;
  }
): DoubleElimMatchDef[] {
  const n = seedOrderedTeamIds.length;
  if (n < 4) {
    throw new Error("Double elimination requires at least 4 teams");
  }

  const {
    seedingByesCount = n % 2 !== 0 ? 1 : 0,
    bestOfUpper = 3,
    bestOfLower = 3,
    bestOfFinal = 7,
  } = options ?? {};

  const matches: DoubleElimMatchDef[] = [];
  let idCounter = 1;
  const genId = (prefix: string) => `${prefix}_${idCounter++}`;

  // Top seeds getting BYEs in UB Round 1
  const numByes = Math.min(seedingByesCount, Math.floor(n / 2));
  const activeRound1Teams = seedOrderedTeamIds.slice(numByes);
  const byeTeams = seedOrderedTeamIds.slice(0, numByes);

  // --- 1. UB Round 1 ---
  const ubR1Matches: DoubleElimMatchDef[] = [];
  for (let i = 0; i < Math.floor(activeRound1Teams.length / 2); i++) {
    const teamA = activeRound1Teams[i];
    const teamB = activeRound1Teams[activeRound1Teams.length - 1 - i];
    const m: DoubleElimMatchDef = {
      tempId: genId("UB_R1"),
      bracketType: "WINNER_BRACKET",
      stageName: "Upper Bracket R1",
      round: 1,
      bracketPosition: i + 1,
      bestOf: bestOfUpper,
      teamAId: teamA,
      teamBId: teamB,
      winnerId: null,
      isBye: false,
      nextTempId: null,
      loserNextTempId: null,
    };
    ubR1Matches.push(m);
    matches.push(m);
  }

  // --- 2. LB Round 1 (for losers of UB R1) ---
  const lbR1Matches: DoubleElimMatchDef[] = [];
  if (ubR1Matches.length >= 2) {
    for (let i = 0; i < Math.floor(ubR1Matches.length / 2); i++) {
      const m: DoubleElimMatchDef = {
        tempId: genId("LB_R1"),
        bracketType: "LOSER_BRACKET",
        stageName: "Lower Bracket R1",
        round: 1,
        bracketPosition: i + 1,
        bestOf: bestOfLower,
        teamAId: null,
        teamBId: null,
        winnerId: null,
        isBye: false,
        nextTempId: null,
        loserNextTempId: null,
      };
      lbR1Matches.push(m);
      matches.push(m);
    }
    // Link UB R1 losers -> LB R1
    for (let i = 0; i < ubR1Matches.length; i++) {
      const lbTarget = lbR1Matches[Math.floor(i / 2)];
      if (lbTarget) {
        ubR1Matches[i].loserNextTempId = lbTarget.tempId;
      }
    }
  }

  // --- 3. UB Semi-Finals / Round 2 ---
  const ubR2Matches: DoubleElimMatchDef[] = [];
  const ubR2Participants: (string | null)[] = [...byeTeams];
  ubR1Matches.forEach((m) => ubR2Participants.push(m.tempId));

  for (let i = 0; i < Math.floor(ubR2Participants.length / 2); i++) {
    const isByeA = byeTeams.includes(ubR2Participants[i * 2] as string);
    const isByeB = byeTeams.includes(ubR2Participants[i * 2 + 1] as string);

    const m: DoubleElimMatchDef = {
      tempId: genId("UB_R2"),
      bracketType: "WINNER_BRACKET",
      stageName: "Upper Bracket Semi-Final",
      round: 2,
      bracketPosition: i + 1,
      bestOf: bestOfUpper,
      teamAId: isByeA ? (ubR2Participants[i * 2] as string) : null,
      teamBId: isByeB ? (ubR2Participants[i * 2 + 1] as string) : null,
      winnerId: null,
      isBye: false,
      nextTempId: null,
      loserNextTempId: null,
    };
    ubR2Matches.push(m);
    matches.push(m);

    // Link UB R1 winners -> UB R2
    if (!isByeA && ubR1Matches[i * 2]) {
      ubR1Matches[i * 2].nextTempId = m.tempId;
    }
    if (!isByeB && ubR1Matches[i * 2 + 1]) {
      ubR1Matches[i * 2 + 1].nextTempId = m.tempId;
    }
  }

  // --- 4. UB Final ---
  const ubFinal: DoubleElimMatchDef = {
    tempId: genId("UB_FINAL"),
    bracketType: "WINNER_BRACKET",
    stageName: "Upper Bracket Final",
    round: 3,
    bracketPosition: 1,
    bestOf: bestOfUpper + 2,
    teamAId: null,
    teamBId: null,
    winnerId: null,
    isBye: false,
    nextTempId: null,
    loserNextTempId: null,
  };
  matches.push(ubFinal);

  ubR2Matches.forEach((m) => {
    m.nextTempId = ubFinal.tempId;
  });

  // --- 5. LB Semi-Final & LB Final ---
  const lbSemi: DoubleElimMatchDef = {
    tempId: genId("LB_SEMI"),
    bracketType: "LOSER_BRACKET",
    stageName: "Lower Bracket Semi-Final",
    round: 2,
    bracketPosition: 1,
    bestOf: bestOfLower,
    teamAId: null,
    teamBId: null,
    winnerId: null,
    isBye: false,
    nextTempId: null,
    loserNextTempId: null,
  };
  matches.push(lbSemi);

  // Link LB R1 winner -> LB Semi
  if (lbR1Matches.length > 0) {
    lbR1Matches.forEach((m) => (m.nextTempId = lbSemi.tempId));
  }

  // Link UB R2 losers -> LB Semi
  ubR2Matches.forEach((m) => (m.loserNextTempId = lbSemi.tempId));

  const lbFinal: DoubleElimMatchDef = {
    tempId: genId("LB_FINAL"),
    bracketType: "LOSER_BRACKET",
    stageName: "Lower Bracket Final",
    round: 3,
    bracketPosition: 1,
    bestOf: bestOfLower + 2,
    teamAId: null,
    teamBId: null,
    winnerId: null,
    isBye: false,
    nextTempId: null,
    loserNextTempId: null,
  };
  matches.push(lbFinal);

  lbSemi.nextTempId = lbFinal.tempId;
  ubFinal.loserNextTempId = lbFinal.tempId;

  // --- 6. Grand Final ---
  const grandFinal: DoubleElimMatchDef = {
    tempId: genId("GRAND_FINAL"),
    bracketType: "GRAND_FINAL",
    stageName: "Grand Final",
    round: 4,
    bracketPosition: 1,
    bestOf: bestOfFinal,
    teamAId: null,
    teamBId: null,
    winnerId: null,
    isBye: false,
    nextTempId: null,
    loserNextTempId: null,
  };
  matches.push(grandFinal);

  ubFinal.nextTempId = grandFinal.tempId;
  lbFinal.nextTempId = grandFinal.tempId;

  return matches;
}
