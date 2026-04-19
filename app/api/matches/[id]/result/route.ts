import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess, createAuditLog } from "@/lib/api-utils";
import { MatchStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

type Tx = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

// ── Helpers ────────────────────────────────────────────────

function calculateMatchPoints(
  teamScore: number,
  opponentScore: number,
  won: boolean,
  forfeit: boolean = false,
  pointSystem: string | null = "STANDARD",
  isDraw: boolean = false
): number {
  if (forfeit) {
    return won ? 3 : 0;
  }

  if (isDraw) {
    return 1;
  }

  if (pointSystem === "MLBB_WEIGHTED") {
    if (!won) {
      // Team lost: If they won at least 1 game, they get 1 point
      return teamScore > 0 ? 1 : 0;
    }
    // Team won: If opponent won 0 games (sweep), they get 3 points. Otherwise 2.
    return opponentScore === 0 ? 3 : 2;
  }

  // Standard 3/1/0
  if (won) return 3;
  return 0; // Losses / Draws handled at higher level if needed, but standard is 3 for win
}

function updateStreak(current: string | null, won: boolean): string {
  if (!current) return won ? "W1" : "L1";
  const letter = current[0];
  const count = parseInt(current.slice(1)) || 1;
  if ((won && letter === "W") || (!won && letter === "L")) return `${letter}${count + 1}`;
  return won ? "W1" : "L1";
}

async function recalculateSeasonRanks(seasonId: string, tx: Tx) {
  const [standings, h2hs] = await Promise.all([
    tx.teamStanding.findMany({ where: { seasonId } }),
    tx.headToHead.findMany({ where: { seasonId } }),
  ]);

  // Build h2h wins lookup: teamId → {opponentId: winsAgainstThem}
  const h2hMap: Record<string, Record<string, number>> = {};
  for (const h of h2hs) {
    h2hMap[h.teamAId] ??= {};
    h2hMap[h.teamBId] ??= {};
    h2hMap[h.teamAId][h.teamBId] = h.teamAWins;
    h2hMap[h.teamBId][h.teamAId] = h.teamBWins;
  }

  const sorted = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    // H2H tiebreaker (only applies when exactly two teams are tied)
    const aWinsVsB = h2hMap[a.teamId]?.[b.teamId] ?? 0;
    const bWinsVsA = h2hMap[b.teamId]?.[a.teamId] ?? 0;
    if (aWinsVsB !== bWinsVsA) return bWinsVsA - aWinsVsB;
    // Fallback: most wins
    if (b.wins !== a.wins) return b.wins - a.wins;
    // Fallback 2: fewest forfeits
    return a.forfeits - b.forfeits;
  });

  await Promise.all(
    sorted.map((s, idx) =>
      tx.teamStanding.update({
        where: { id: s.id },
        data: { previousRank: s.rank, rank: idx + 1 },
      })
    )
  );
}

/**
 * Orchestrator: Check if any team is mathematically eliminated from Top 4
 */
async function updateSelectionContention(tournamentId: string, tx: Tx) {
  // 1. Get standings
  const standings = await tx.groupStageStanding.findMany({
    where: { tournamentId },
    orderBy: [{ groupPoints: "desc" }, { wins: "desc" }]
  });

  if (standings.length === 0) return;

  // 2. Get total RR matches per team (11 teams = 10 matches)
  const tournament = await tx.tournament.findUnique({
    where: { id: tournamentId },
    include: { _count: { select: { registrations: true } } }
  });
  
  const totalTeams = tournament?._count.registrations || 0;
  const matchesPerTeam = totalTeams - 1;

  // 3. For each team, calculate "Max Possible Points"
  for (const s of standings) {
    const gamesPlayed = s.wins + s.losses + s.draws;
    const remainingGames = matchesPerTeam - gamesPlayed;
    const maxPoints = s.groupPoints + (remainingGames * 3); // Assuming 3 pts for clear win

    // Threshold Check: If maxPoints < the points of the 4th place team currently, they are cut
    // (A bit more complex in real math, but this is the idea)
    const fourthPlacePoints = standings[3]?.groupPoints || 0;
    
    if (maxPoints < fourthPlacePoints) {
      await tx.tournamentRegistration.update({
        where: { tournamentId_teamId: { tournamentId, teamId: s.teamId } },
        data: { isEliminated: true }
      });
    }
  }
}

async function recalculateMonthlyRanks(seasonId: string, year: number, month: number, tx: Tx) {
  const standings = await tx.monthlyStanding.findMany({ where: { seasonId, year, month } });
  const sorted = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.wins - a.wins;
  });
  await Promise.all(
    sorted.map((s, idx) => tx.monthlyStanding.update({ where: { id: s.id }, data: { rank: idx + 1 } }))
  );
}

/**
 * Upsert GroupStageStanding for a group-stage match.
 * Called from the result route so standings update immediately on submission.
 */
async function upsertGroupStageStanding(
  tx: Tx,
  {
    tournamentId,
    teamAId,
    teamBId,
    winnerId,
    scoreA,
    scoreB,
    pointSystem,
    gameResults,
  }: {
    tournamentId: string;
    teamAId: string;
    teamBId: string | null;
    winnerId: string;
    scoreA: number;
    scoreB: number;
    pointSystem: string | null;
    gameResults: { winnerTeamId: string; durationSeconds: number | null }[];
  }
) {
  if (!teamBId) return; // need two teams

  // Find the group both teams share
  const groupA = await tx.tournamentGroup.findFirst({
    where: { tournamentId, teams: { some: { teamId: teamAId } } },
  });
  const groupB = await tx.tournamentGroup.findFirst({
    where: { tournamentId, teams: { some: { teamId: teamBId } } },
  });

  if (!groupA || !groupB || groupA.id !== groupB.id) return; // not same group — skip

  const groupName = groupA.name;

  // Calculate points using the tournament's point system
  let pointsA = 0;
  let pointsB = 0;
  if (pointSystem === "MLBB_WEIGHTED") {
    if (winnerId === teamAId) {
      pointsA = scoreB === 0 ? 3 : 2;
      pointsB = scoreB > 0 ? 1 : 0;
    } else if (winnerId === teamBId) {
      pointsB = scoreA === 0 ? 3 : 2;
      pointsA = scoreA > 0 ? 1 : 0;
    } else {
      pointsA = 1; pointsB = 1;
    }
  } else {
    // Standard 3/1/0
    pointsA = winnerId === teamAId ? 3 : 0;
    pointsB = winnerId === teamBId ? 3 : 0;
  }

  // Game-level stats (tie-breakers)
  const gamesWonByA = scoreA;
  const gamesWonByB = scoreB;

  const minWinTimeA = gameResults
    .filter((gr) => gr.winnerTeamId === teamAId && gr.durationSeconds !== null)
    .reduce((min, gr) => Math.min(min, gr.durationSeconds!), Infinity);
  const minWinTimeB = gameResults
    .filter((gr) => gr.winnerTeamId === teamBId && gr.durationSeconds !== null)
    .reduce((min, gr) => Math.min(min, gr.durationSeconds!), Infinity);

  // Upsert Team A
  await tx.groupStageStanding.upsert({
    where: { tournamentId_groupName_teamId: { tournamentId, groupName, teamId: teamAId } },
    update: {
      wins: { increment: winnerId === teamAId ? 1 : 0 },
      losses: { increment: winnerId === teamBId ? 1 : 0 },
      groupPoints: { increment: pointsA },
      gameWins: { increment: gamesWonByA },
      gameLosses: { increment: gamesWonByB },
      ...(minWinTimeA !== Infinity ? { fastestWinSeconds: minWinTimeA } : {}),
    },
    create: {
      tournamentId,
      groupName,
      teamId: teamAId,
      wins: winnerId === teamAId ? 1 : 0,
      losses: winnerId === teamBId ? 1 : 0,
      draws: 0,
      groupPoints: pointsA,
      gameWins: gamesWonByA,
      gameLosses: gamesWonByB,
      fastestWinSeconds: minWinTimeA !== Infinity ? minWinTimeA : null,
    },
  });

  // Upsert Team B
  await tx.groupStageStanding.upsert({
    where: { tournamentId_groupName_teamId: { tournamentId, groupName, teamId: teamBId } },
    update: {
      wins: { increment: winnerId === teamBId ? 1 : 0 },
      losses: { increment: winnerId === teamAId ? 1 : 0 },
      groupPoints: { increment: pointsB },
      gameWins: { increment: gamesWonByB },
      gameLosses: { increment: gamesWonByA },
      ...(minWinTimeB !== Infinity ? { fastestWinSeconds: minWinTimeB } : {}),
    },
    create: {
      tournamentId,
      groupName,
      teamId: teamBId,
      wins: winnerId === teamBId ? 1 : 0,
      losses: winnerId === teamAId ? 1 : 0,
      draws: 0,
      groupPoints: pointsB,
      gameWins: gamesWonByB,
      gameLosses: gamesWonByA,
      fastestWinSeconds: minWinTimeB !== Infinity ? minWinTimeB : null,
    },
  });
}

async function upsertMonthly(
  tx: Tx,
  {
    teamId,
    seasonId,
    year,
    month,
    won,
    forfeit,
    teamScore,
    opponentScore,
    pointSystem,
    isDraw = false,
  }: {
    teamId: string;
    seasonId: string;
    year: number;
    month: number;
    won: boolean;
    forfeit: boolean;
    teamScore: number;
    opponentScore: number;
    pointSystem: string | null;
    isDraw?: boolean;
  }
) {
  const existing = await tx.monthlyStanding.findUnique({
    where: { seasonId_teamId_year_month: { seasonId, teamId, year, month } },
  });

  // Use defined points system
  const pointsAwarded = calculateMatchPoints(teamScore, opponentScore, won, forfeit, pointSystem, isDraw);

  const delta: Prisma.MonthlyStandingUpdateInput = {
    wins: { increment: won ? 1 : 0 },
    losses: { increment: won ? 0 : 1 },
    forfeits: { increment: forfeit && !won ? 1 : 0 },
    points: { increment: pointsAwarded },
  };

  if (existing) {
    await tx.monthlyStanding.update({ where: { id: existing.id }, data: delta });
  } else {
    await tx.monthlyStanding.create({
      data: {
        seasonId,
        teamId,
        year,
        month,
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
        forfeits: forfeit && !won ? 1 : 0,
        points: pointsAwarded,
        rank: 0,
      },
    });
  }
}

async function upsertTeamStanding(
  tx: Tx,
  {
    teamId,
    seasonId,
    won,
    forfeit,
    teamScore,
    opponentScore,
    pointSystem,
    isDraw = false,
  }: {
    teamId: string;
    seasonId: string;
    won: boolean;
    forfeit: boolean;
    teamScore: number;
    opponentScore: number;
    pointSystem: string | null;
    isDraw?: boolean;
  },
  existingStandings: { teamId: string; streak: string | null }[]
) {
  const existing = await tx.teamStanding.findUnique({
    where: { teamId_seasonId: { teamId, seasonId } },
  });

  // Use defined points system
  const pointsAwarded = calculateMatchPoints(teamScore, opponentScore, won, forfeit, pointSystem, isDraw);

  // Find the current max rank for new entries
  const maxRank = existingStandings.length > 0 ? existingStandings.length : 0;
  const currentStreak = existing?.streak ?? null;

  if (existing) {
    await tx.teamStanding.update({
      where: { id: existing.id },
      data: {
        wins: { increment: won ? 1 : 0 },
        losses: { increment: won ? 0 : 1 },
        forfeits: { increment: forfeit && !won ? 1 : 0 },
        points: { increment: pointsAwarded },
        streak: updateStreak(currentStreak, won),
      },
    });
  } else {
    // Create new team standing if it doesn't exist
    await tx.teamStanding.create({
      data: {
        teamId,
        seasonId,
        rank: maxRank + 1, // New teams start at the bottom
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
        forfeits: forfeit && !won ? 1 : 0,
        points: pointsAwarded,
        streak: updateStreak(null, won),
      },
    });
  }
}

async function upsertH2H(tx: Tx, seasonId: string, winnerTeamId: string, loserTeamId: string) {
  // Canonical order: smaller id is always teamA
  const [teamAId, teamBId, winnerIsA] =
    winnerTeamId < loserTeamId
      ? [winnerTeamId, loserTeamId, true]
      : [loserTeamId, winnerTeamId, false];

  const existing = await tx.headToHead.findUnique({
    where: { seasonId_teamAId_teamBId: { seasonId, teamAId, teamBId } },
  });

  if (existing) {
    await tx.headToHead.update({
      where: { id: existing.id },
      data: winnerIsA ? { teamAWins: { increment: 1 } } : { teamBWins: { increment: 1 } },
    });
  } else {
    await tx.headToHead.create({
      data: {
        seasonId,
        teamAId,
        teamBId,
        teamAWins: winnerIsA ? 1 : 0,
        teamBWins: winnerIsA ? 0 : 1,
      },
    });
  }
}

// POST /api/matches/[id]/result
// Body: { winnerId, scoreA, scoreB, forfeit?, forfeitedTeamId? }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: matchId } = await params;
    const body = await request.json();
    const {
      winnerId,
      scoreA,
      scoreB,
      forfeit = false,
      forfeitedTeamId,
      overridePoints = false,
      gameWinners,
      team1Score: manualTeam1Score,
      team2Score: manualTeam2Score,
      isDraw: manualIsDraw = false,
    }: {
      winnerId: string;
      scoreA: number;
      scoreB: number;
      forfeit?: boolean;
      forfeitedTeamId?: string;
      overridePoints?: boolean;
      gameWinners?: { gameNumber: number; winnerTeamId: string; durationSeconds?: number }[];
      team1Score?: number;
      team2Score?: number;
      isDraw?: boolean;
    } = body;


    if (!winnerId || scoreA === undefined || scoreB === undefined) {
      return apiError("winnerId, scoreA, and scoreB are required");
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: {
          select: { seasonId: true, phase: true, pointSystem: true },
        },
        gameResults: { select: { winnerTeamId: true, durationSeconds: true } },
      },
    });

    if (!match) return apiError("Match not found", 404);
    if (match.status === MatchStatus.COMPLETED || match.status === MatchStatus.FORFEITED) {
      return apiError("Match result has already been submitted");
    }
    if (winnerId !== match.teamAId && winnerId !== match.teamBId) {
      return apiError("winnerId must be one of the two competing teams");
    }
    if (forfeit && forfeitedTeamId && forfeitedTeamId === winnerId) {
      return apiError("forfeitedTeamId cannot be the winner");
    }

    const loserId: string | null = winnerId === match.teamAId ? match.teamBId : match.teamAId;
    const isForfeit = forfeit === true;
    const actualForfeitedId = isForfeit ? (forfeitedTeamId ?? loserId) : null;

    const { seasonId } = match.tournament;
    const matchDate = new Date(match.scheduledTime);
    const year = matchDate.getFullYear();
    const month = matchDate.getMonth() + 1; // 1-based

    // Check if this is a challenge match (will be used for auto-trigger decision)
    const challengeRecord = await prisma.matchChallenge.findUnique({ where: { scheduledMatchId: matchId } });
    const isChallengeMatch = !!challengeRecord;
    
    // Determine if we should apply points to standings
    const applyPoints = !isChallengeMatch || overridePoints;

    await prisma.$transaction(async (tx) => {
      // 1. Mark match as completed
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: isForfeit ? MatchStatus.FORFEITED : MatchStatus.COMPLETED,
          scoreA: Number(scoreA),
          scoreB: Number(scoreB),
          team1Score: manualTeam1Score ?? Number(scoreA),
          team2Score: manualTeam2Score ?? Number(scoreB),
          isDraw: manualIsDraw,
          winner: { connect: { id: winnerId } },
          forfeitedById: actualForfeitedId,
        },
      });

      // 2. Create MatchGameResult records for each game winner
      if (gameWinners && gameWinners.length > 0) {
        // Delete any existing game results first
        await tx.matchGameResult.deleteMany({ where: { matchId } });
        
        // Create new game results
        for (const gw of gameWinners) {
          await tx.matchGameResult.create({
            data: {
              matchId,
              gameNumber: gw.gameNumber,
              winnerTeamId: gw.winnerTeamId,
              durationSeconds: gw.durationSeconds || null,
            },
          });
        }

      }

      // determine if this match was scheduled from a challenge (friendly)
      const challenge = await tx.matchChallenge.findUnique({ where: { scheduledMatchId: matchId } });
      const isChallengeMatch = !!challenge;
      const applyPoints = !isChallengeMatch || overridePoints === true;

      if (applyPoints) {
        // Get existing standings to determine rank for new entries
        const existingStandings = await tx.teamStanding.findMany({
          where: { seasonId },
          select: { teamId: true, streak: true },
        });

        // Determine scores for winner and loser
        const winnerScore = winnerId === match.teamAId ? Number(scoreA) : Number(scoreB);
        const loserScore = winnerId === match.teamAId ? Number(scoreB) : Number(scoreA);

        // ─── Upsert WINNER's TeamStanding ───────────────────
        await upsertTeamStanding(
          tx as Tx,
          {
            teamId: winnerId,
            seasonId,
            won: true,
            forfeit: false,
            teamScore: winnerScore,
            opponentScore: loserScore,
            pointSystem: match.tournament.pointSystem,
          },
          existingStandings
        );

        // ─── Upsert LOSER's TeamStanding ────────────────────
        if (loserId) {
          await upsertTeamStanding(
            tx as Tx,
            {
              teamId: loserId,
              seasonId,
              won: false,
              forfeit: isForfeit,
              teamScore: loserScore,
              opponentScore: winnerScore,
              pointSystem: match.tournament.pointSystem,
              isDraw: manualIsDraw,
            },
            existingStandings
          );
        }

        // ─── MonthlyStanding for both teams ─────────────────
        if (seasonId) {
          await upsertMonthly(tx as Tx, {
            teamId: winnerId,
            seasonId,
            year,
            month,
            won: !manualIsDraw,
            forfeit: false,
            teamScore: winnerScore,
            opponentScore: loserScore,
            pointSystem: match.tournament.pointSystem,
            isDraw: manualIsDraw,
          });
          if (loserId) {
            await upsertMonthly(tx as Tx, {
              teamId: loserId,
              seasonId,
              year,
              month,
              won: false,
              forfeit: isForfeit,
              teamScore: loserScore,
              opponentScore: winnerScore,
              pointSystem: match.tournament.pointSystem,
              isDraw: manualIsDraw,
            });

            // ─── HeadToHead ─────────────────────────────────────
            if (!manualIsDraw) {
              await upsertH2H(tx as Tx, seasonId, winnerId, loserId);
            }
          }

          // ─── Recalculate ranks ───────────────────────────────
          await recalculateSeasonRanks(seasonId, tx as Tx);
          await recalculateMonthlyRanks(seasonId, year, month, tx as Tx);
          
          // Selection V2: Update Contention Flags
          await updateSelectionContention(match.tournamentId, tx as Tx);
        }

        // ─── Group Stage Standings ───────────────────────────
        // Only for matches tagged as GROUP_STAGE bracket type.
        // This runs regardless of applyPoints so non-season tournaments
        // still get their group table updated.
        if (match.bracketType === "GROUP_STAGE" && match.teamBId) {
          await upsertGroupStageStanding(tx as Tx, {
            tournamentId: match.tournamentId,
            teamAId: match.teamAId,
            teamBId: match.teamBId,
            winnerId,
            scoreA: Number(scoreA),
            scoreB: Number(scoreB),
            pointSystem: match.tournament.pointSystem ?? null,
            gameResults: match.gameResults,
          });
        }
      }

      // ─── Notify both captains ────────────────────────────
      const [teamA, teamB] = await Promise.all([
        tx.team.findUnique({ where: { id: match.teamAId }, select: { captainId: true, name: true } }),
        match.teamBId 
          ? tx.team.findUnique({ where: { id: match.teamBId }, select: { captainId: true, name: true } })
          : Promise.resolve(null),
      ]);

      const winnerTeam = winnerId === match.teamAId ? teamA : teamB;
      const loserTeam = winnerId === match.teamAId ? teamB : teamA;
      const resultMsg = isForfeit
        ? `${winnerTeam?.name} wins by forfeit against ${loserTeam?.name}`
        : `${winnerTeam?.name} won ${scoreA}-${scoreB} against ${loserTeam?.name}`;

      for (const captain of [teamA?.captainId, teamB?.captainId]) {
        if (captain) {
          await tx.notification.create({
            data: {
              userId: captain,
              type: "MATCH_RESULT_SUBMITTED",
              title: "Match Result Posted",
              message: resultMsg,
              linkUrl: `/matches/${matchId}`,
            },
          });
        }
      }
    }, { timeout: 30000 });

    const updatedMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { select: { id: true, name: true, tag: true } },
        teamB: { select: { id: true, name: true, tag: true } },
        winner: { select: { id: true, name: true, tag: true } },
      },
    });

    // Log the action
    await createAuditLog(
      admin.id,
      "SUBMIT_MATCH_RESULT",
      "Match",
      matchId,
      JSON.stringify({ winnerId, scoreA, scoreB, forfeit: isForfeit, overridePoints, isChallengeMatch })
    );

    // ─── Auto-trigger bracket generation if group stage is complete ─────
    const messages: string[] = [];
    if (applyPoints) {  // Only for non-challenge matches
      try {
        // Smart detection: Check if this is a group stage tournament
        const allTournamentMatches = await prisma.match.findMany({
          where: { tournamentId: match.tournamentId },
          select: {
            id: true,
            status: true,
            bracketType: true,
            round: true,
          },
        });

        // Detect bracket matches (any with bracketType set to non-null)
        const bracketMatches = allTournamentMatches.filter(
          (m) => m.bracketType !== null && m.bracketType !== "GROUP_STAGE"
        );
        const hasAnyBracketMatches = bracketMatches.length > 0;

        // Detect group stage matches (either have round field OR are non-bracket matches)
        const groupMatches = allTournamentMatches.filter(
          (m) => m.bracketType === null || m.round !== null
        );
        const completedGroupMatches = groupMatches.filter(
          (m) => m.status === MatchStatus.COMPLETED || m.status === MatchStatus.FORFEITED
        ).length;

        // Group stage is complete if:
        // 1. Has group matches
        // 2. All group matches are completed
        // 3. No bracket matches exist yet
        const groupStageComplete = 
          groupMatches.length > 0 && 
          completedGroupMatches === groupMatches.length &&
          !hasAnyBracketMatches;

        if (groupStageComplete) {
          try {
            // Get standings for seeding
            const standings = await prisma.groupStageStanding.findMany({
              where: { tournamentId: match.tournamentId },
              include: {
                team: { select: { id: true, name: true, tag: true } },
              },
              orderBy: [{ groupPoints: "desc" }, { wins: "desc" }],
              take: 4, // Exactly 4 for V2
            });

            if (standings.length === 4) {
              // Create Selection V2 Playoffs: 1v4, 2v3
              const matchups = [
                { seed1: standings[0], seed2: standings[3] },
                { seed1: standings[1], seed2: standings[2] },
              ];

              await prisma.$transaction(async (tx) => {
                for (let i = 0; i < matchups.length; i++) {
                  const m = matchups[i];
                  await tx.match.create({
                    data: {
                      tournamentId: match.tournamentId,
                      teamAId: m.seed1.teamId,
                      teamBId: m.seed2.teamId,
                      scheduledTime: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
                      status: MatchStatus.UPCOMING,
                      bestOf: 3,
                      stage: `Semi-Finals`,
                      bracketType: "WINNER_BRACKET",
                      bracketPosition: i + 1,
                    },
                  });
                }
              });

              messages.push("Group stage complete! Top 4 Selection Bracket generated.");
            }
          } catch (autoBracketError) {
            console.warn("Auto-bracket generation failed (non-blocking):", autoBracketError);
          }
        }
      } catch (detectionError) {
        console.warn("Group stage completion detection failed (non-blocking):", detectionError);
        // Continue without auto-bracket generation
      }
    }

    const message = isChallengeMatch && !overridePoints
      ? "Result submitted (challenge/friendly — standings not updated)"
      : messages.length > 0
        ? messages.join(" ") + " Standings updated."
        : "Result submitted and standings updated";

    return apiSuccess({ message, match: updatedMatch, autoActions: messages });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) return apiError("Unauthorized", 401);
    if (err instanceof Error && err.message.includes("Forbidden")) return apiError(err.message, 403);
    console.error("submit-result error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to submit result", 500);
  }
}

/**
 * Generate bracket matchups with proper seeding
 * Standard 8-team bracket: 1vs8, 4vs5, 2vs7, 3vs6
 */
function generateBracketMatchups(
  seeds: Array<{ seedPosition: number; teamId: string; teamName: string; teamTag: string }>
) {
  if (seeds.length < 2) return [];

  // Pad to 8 if needed
  while (seeds.length < 8) {
    seeds.push({
      seedPosition: seeds.length + 1,
      teamId: "",
      teamName: "BYE",
      teamTag: "BYE",
    });
  }

  // Standard bracket seeding: 1v8, 4v5, 2v7, 3v6
  const matchups = [
    { seed1: seeds[0], seed2: seeds[7] },
    { seed1: seeds[3], seed2: seeds[4] },
    { seed1: seeds[1], seed2: seeds[6] },
    { seed1: seeds[2], seed2: seeds[5] },
  ];

  return matchups.filter((m) => m.seed1.teamId && m.seed2.teamId); // Filter out BYE teams
}

// PUT /api/matches/[id]/result
// Edit an existing match result (reverses old result, applies new one)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: matchId } = await params;
    const body = await request.json();
    const {
      winnerId,
      scoreA,
      scoreB,
      forfeit = false,
      forfeitedTeamId,
      overridePoints = false,
      gameWinners,
      team1Score: manualTeam1Score,
      team2Score: manualTeam2Score,
      isDraw: manualIsDraw = false,
    }: {
      winnerId: string;
      scoreA: number;
      scoreB: number;
      forfeit?: boolean;
      forfeitedTeamId?: string;
      overridePoints?: boolean;
      gameWinners?: { gameNumber: number; winnerTeamId: string; durationSeconds?: number }[];
      team1Score?: number;
      team2Score?: number;
      isDraw?: boolean;
    } = body;


    if (!winnerId || scoreA === undefined || scoreB === undefined) {
      return apiError("winnerId, scoreA, and scoreB are required");
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: {
          select: { seasonId: true, phase: true, pointSystem: true },
        },
        winner: { select: { id: true } },
      },
    });

    if (!match) return apiError("Match not found", 404);
    if (match.status !== MatchStatus.COMPLETED && match.status !== MatchStatus.FORFEITED) {
      return apiError("Can only edit completed or forfeited matches");
    }
    if (winnerId !== match.teamAId && winnerId !== match.teamBId) {
      return apiError("winnerId must be one of the two competing teams");
    }
    if (forfeit && forfeitedTeamId && forfeitedTeamId === winnerId) {
      return apiError("forfeitedTeamId cannot be the winner");
    }

    const oldWinnerId = match.winner?.id ?? match.teamAId; // fallback if winner is null
    const oldLoserId = oldWinnerId === match.teamAId ? match.teamBId : match.teamAId;
    const oldWasForfeited = match.status === MatchStatus.FORFEITED;
    
    // Get old scores to calculate how many points to revert
    const oldWinnerScore = oldWinnerId === match.teamAId ? (match.scoreA || 0) : (match.scoreB || 0);
    const oldLoserScore = oldWinnerId === match.teamAId ? (match.scoreB || 0) : (match.scoreA || 0);
    const oldWinnerPoints = calculateMatchPoints(oldWinnerScore, oldLoserScore, true, false, match.tournament.pointSystem);
    const oldLoserPoints = calculateMatchPoints(oldLoserScore, oldWinnerScore, false, oldWasForfeited, match.tournament.pointSystem);

    const newLoserId = winnerId === match.teamAId ? match.teamBId : match.teamAId;
    const newIsForfeit = forfeit === true;
    const newActualForfeitedId = newIsForfeit ? (forfeitedTeamId ?? newLoserId) : null;
    
    // Determine new scores for winner and loser
    const newWinnerScore = winnerId === match.teamAId ? Number(scoreA) : Number(scoreB);
    const newLoserScore = winnerId === match.teamAId ? Number(scoreB) : Number(scoreA);
    const newWinnerPoints = calculateMatchPoints(newWinnerScore, newLoserScore, true, false, match.tournament.pointSystem);
    const newLoserPoints = calculateMatchPoints(newLoserScore, newWinnerScore, false, newIsForfeit, match.tournament.pointSystem);

    const { seasonId } = match.tournament;
    const matchDate = new Date(match.scheduledTime);
    const year = matchDate.getFullYear();
    const month = matchDate.getMonth() + 1;

    await prisma.$transaction(async (tx) => {
      // Determine if this was a challenge match (friendly)
      const challenge = await tx.matchChallenge.findUnique({ where: { scheduledMatchId: matchId } });
      const isChallengeMatch = !!challenge;
      const applyPoints = !isChallengeMatch || overridePoints === true;

      if (applyPoints && seasonId) {
        // ─── REVERT OLD RESULT ──────────────────────────────────

        // Revert old winner's standings
        const oldWinnerStanding = await tx.teamStanding.findUnique({
          where: { teamId_seasonId: { teamId: oldWinnerId, seasonId } },
        });
        if (oldWinnerStanding) {
          const oldWinnerWins = oldWinnerStanding.wins - 1;
          const oldWinnerPointsAdjust = oldWinnerStanding.points - oldWinnerPoints; // Subtract the MLBB points
          await tx.teamStanding.update({
            where: { id: oldWinnerStanding.id },
            data: {
              wins: Math.max(0, oldWinnerWins),
              points: Math.max(0, oldWinnerPointsAdjust),
            },
          });
        }

        // Revert old loser's standings
        if (oldLoserId) {
          const oldLoserStanding = await tx.teamStanding.findUnique({
            where: { teamId_seasonId: { teamId: oldLoserId, seasonId } },
          });
          if (oldLoserStanding) {
            const oldLoserLosses = oldLoserStanding.losses - 1;
            const oldLoserPointsAdjust = oldLoserStanding.points - oldLoserPoints; // Subtract the MLBB points
            await tx.teamStanding.update({
              where: { id: oldLoserStanding.id },
              data: {
                losses: Math.max(0, oldLoserLosses),
                forfeits: oldWasForfeited
                  ? Math.max(0, oldLoserStanding.forfeits - 1)
                  : oldLoserStanding.forfeits,
                points: Math.max(0, oldLoserPointsAdjust),
              },
            });
          }
        }

        // Revert old monthly standings
        const oldWinnerMonthly = await tx.monthlyStanding.findUnique({
          where: {
            seasonId_teamId_year_month: {
              seasonId,
              teamId: oldWinnerId,
              year,
              month,
            },
          },
        });
        if (oldWinnerMonthly) {
          await tx.monthlyStanding.update({
            where: { id: oldWinnerMonthly.id },
            data: {
              wins: Math.max(0, oldWinnerMonthly.wins - 1),
              points: Math.max(0, oldWinnerMonthly.points - oldWinnerPoints),
            },
          });
        }

        if (oldLoserId) {
          const oldLoserMonthly = await tx.monthlyStanding.findUnique({
            where: {
              seasonId_teamId_year_month: {
                seasonId,
                teamId: oldLoserId,
                year,
                month,
              },
            },
          });
          if (oldLoserMonthly) {
            await tx.monthlyStanding.update({
              where: { id: oldLoserMonthly.id },
              data: {
                losses: Math.max(0, oldLoserMonthly.losses - 1),
                forfeits: oldWasForfeited
                  ? Math.max(0, oldLoserMonthly.forfeits - 1)
                  : oldLoserMonthly.forfeits,
                points: Math.max(0, oldLoserMonthly.points - oldLoserPoints),
              },
            });
          }
        }

        // Revert old H2H (only if both existed)
        if (oldLoserId) {
          const h2hKey =
            oldWinnerId < oldLoserId
              ? { seasonId_teamAId_teamBId: { seasonId, teamAId: oldWinnerId, teamBId: oldLoserId } }
              : { seasonId_teamAId_teamBId: { seasonId, teamAId: oldLoserId, teamBId: oldWinnerId } };
          const oldH2H = await tx.headToHead.findUnique({ where: h2hKey });
          if (oldH2H) {
            const isWinnerTeamA = oldWinnerId === oldH2H.teamAId;
            await tx.headToHead.update({
              where: { id: oldH2H.id },
              data: isWinnerTeamA
                ? { teamAWins: Math.max(0, oldH2H.teamAWins - 1) }
                : { teamBWins: Math.max(0, oldH2H.teamBWins - 1) },
            });
          }
        }

        // ─── APPLY NEW RESULT ──────────────────────────────────

        // Apply new winner's standings
        const newWinnerStanding = await tx.teamStanding.findUnique({
          where: { teamId_seasonId: { teamId: winnerId, seasonId } },
        });
        if (newWinnerStanding) {
          await tx.teamStanding.update({
            where: { id: newWinnerStanding.id },
            data: {
              wins: { increment: 1 },
              points: { increment: newWinnerPoints },
            },
          });
        }

        // Apply new loser's standings
        if (newLoserId) {
          const newLoserStanding = await tx.teamStanding.findUnique({
            where: { teamId_seasonId: { teamId: newLoserId, seasonId } },
          });
          if (newLoserStanding) {
            await tx.teamStanding.update({
              where: { id: newLoserStanding.id },
              data: {
                losses: { increment: 1 },
                forfeits: newIsForfeit ? { increment: 1 } : newLoserStanding.forfeits,
                points: { increment: newLoserPoints },
              },
            });
          }
        }

        // Apply new monthly standings
        const newWinnerMonthly = await tx.monthlyStanding.findUnique({
          where: {
            seasonId_teamId_year_month: {
              seasonId,
              teamId: winnerId,
              year,
              month,
            },
          },
        });
        if (newWinnerMonthly) {
          await tx.monthlyStanding.update({
            where: { id: newWinnerMonthly.id },
            data: {
              wins: { increment: 1 },
              points: { increment: newWinnerPoints },
            },
          });
        } else {
          await tx.monthlyStanding.create({
            data: {
              seasonId,
              teamId: winnerId,
              year,
              month,
              wins: 1,
              losses: 0,
              forfeits: 0,
              points: newWinnerPoints,
              rank: 0,
            },
          });
        }

        if (newLoserId) {
          const newLoserMonthly = await tx.monthlyStanding.findUnique({
            where: {
              seasonId_teamId_year_month: {
                seasonId,
                teamId: newLoserId,
                year,
                month,
              },
            },
          });
          if (newLoserMonthly) {
            await tx.monthlyStanding.update({
              where: { id: newLoserMonthly.id },
              data: {
                losses: { increment: 1 },
                forfeits: newIsForfeit ? { increment: 1 } : newLoserMonthly.forfeits,
                points: { increment: newLoserPoints },
              },
            });
          } else {
            await tx.monthlyStanding.create({
              data: {
                seasonId,
                teamId: newLoserId,
                year,
                month,
                wins: 0,
                losses: 1,
                forfeits: newIsForfeit ? 1 : 0,
                points: newLoserPoints,
                rank: 0,
              },
            });
          }
        }

        // Apply new H2H
        if (newLoserId) {
          const newH2hKey =
            winnerId < newLoserId
              ? { seasonId_teamAId_teamBId: { seasonId, teamAId: winnerId, teamBId: newLoserId } }
              : { seasonId_teamAId_teamBId: { seasonId, teamAId: newLoserId, teamBId: winnerId } };
          const newH2H = await tx.headToHead.findUnique({ where: newH2hKey });
          if (newH2H) {
            const isWinnerTeamA = winnerId === newH2H.teamAId;
            await tx.headToHead.update({
              where: { id: newH2H.id },
              data: isWinnerTeamA
                ? { teamAWins: { increment: 1 } }
                : { teamBWins: { increment: 1 } },
            });
          } else {
            const isWinnerTeamA = winnerId < newLoserId;
            await tx.headToHead.create({
              data: {
                seasonId,
                teamAId: isWinnerTeamA ? winnerId : newLoserId,
                teamBId: isWinnerTeamA ? newLoserId : winnerId,
                teamAWins: isWinnerTeamA ? 1 : 0,
                teamBWins: isWinnerTeamA ? 0 : 1,
              },
            });
          }
        }

        // Recalculate ranks
        await recalculateSeasonRanks(seasonId, tx as Tx);
        await recalculateMonthlyRanks(seasonId, year, month, tx as Tx);
      }

      // Update the match record
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: newIsForfeit ? MatchStatus.FORFEITED : MatchStatus.COMPLETED,
          scoreA: Number(scoreA),
          scoreB: Number(scoreB),
          winner: { connect: { id: winnerId } },
          forfeitedById: newActualForfeitedId,
        },
      });

      // Update game results
      if (gameWinners && gameWinners.length > 0) {
        await tx.matchGameResult.deleteMany({ where: { matchId } });
        for (const gw of gameWinners) {
          await tx.matchGameResult.create({
            data: {
              matchId,
              gameNumber: gw.gameNumber,
              winnerTeamId: gw.winnerTeamId,
            },
          });
        }
      }
    }, { timeout: 30000 });

    await createAuditLog(
      admin.id,
      "EDIT_MATCH_RESULT",
      "Match",
      matchId,
      JSON.stringify({
        oldWinnerId,
        newWinnerId: winnerId,
        scoreA,
        scoreB,
        forfeit: newIsForfeit,
        overridePoints,
      })
    );

    const updatedMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { select: { id: true, name: true, tag: true } },
        teamB: { select: { id: true, name: true, tag: true } },
        winner: { select: { id: true, name: true, tag: true } },
        gameResults: { orderBy: { gameNumber: "asc" } },
      },
    });

    return apiSuccess({
      message: "Result updated and standings recalculated",
      match: updatedMatch,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) return apiError("Unauthorized", 401);
    if (err instanceof Error && err.message.includes("Forbidden")) return apiError(err.message, 403);
    console.error("edit-result error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to edit result", 500);
  }
}
