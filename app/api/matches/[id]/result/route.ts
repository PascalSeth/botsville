import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess, createAuditLog } from "@/lib/api-utils";
import { MatchStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

type Tx = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

// ── Helpers ────────────────────────────────────────────────

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

async function upsertMonthly(
  tx: Tx,
  { teamId, seasonId, year, month, won, forfeit }: {
    teamId: string; seasonId: string; year: number; month: number; won: boolean; forfeit: boolean;
  }
) {
  const existing = await tx.monthlyStanding.findUnique({
    where: { seasonId_teamId_year_month: { seasonId, teamId, year, month } },
  });

  const delta: Prisma.MonthlyStandingUpdateInput = {
    wins: { increment: won ? 1 : 0 },
    losses: { increment: won ? 0 : 1 },
    forfeits: { increment: forfeit && !won ? 1 : 0 },
    points: { increment: won ? 2 : forfeit ? -1 : 0 },
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
        points: won ? 2 : forfeit ? -1 : 0,
        rank: 0,
      },
    });
  }
}

async function upsertTeamStanding(
  tx: Tx,
  { teamId, seasonId, won, forfeit }: {
    teamId: string; seasonId: string; won: boolean; forfeit: boolean;
  },
  existingStandings: { teamId: string; streak: string | null }[]
) {
  const existing = await tx.teamStanding.findUnique({
    where: { teamId_seasonId: { teamId, seasonId } },
  });

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
        points: { increment: won ? 2 : forfeit ? -1 : 0 },
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
        points: won ? 2 : forfeit ? -1 : 0,
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
    }: {
      winnerId: string;
      scoreA: number;
      scoreB: number;
      forfeit?: boolean;
      forfeitedTeamId?: string;
      overridePoints?: boolean;
      gameWinners?: { gameNumber: number; winnerTeamId: string }[];
    } = body;

    if (!winnerId || scoreA === undefined || scoreB === undefined) {
      return apiError("winnerId, scoreA, and scoreB are required");
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: {
          select: { seasonId: true, phase: true },
        },
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

    const loserId = winnerId === match.teamAId ? match.teamBId : match.teamAId;
    const isForfeit = forfeit === true;
    const actualForfeitedId = isForfeit ? (forfeitedTeamId ?? loserId) : null;

    const { seasonId } = match.tournament;
    const matchDate = new Date(match.scheduledTime);
    const year = matchDate.getFullYear();
    const month = matchDate.getMonth() + 1; // 1-based

    await prisma.$transaction(async (tx) => {
      // 1. Mark match as completed
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: isForfeit ? MatchStatus.FORFEITED : MatchStatus.COMPLETED,
          scoreA: Number(scoreA),
          scoreB: Number(scoreB),
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

        // ─── Upsert WINNER's TeamStanding ───────────────────
        await upsertTeamStanding(tx as Tx, { teamId: winnerId, seasonId, won: true, forfeit: false }, existingStandings);

        // ─── Upsert LOSER's TeamStanding ────────────────────
        await upsertTeamStanding(tx as Tx, { teamId: loserId, seasonId, won: false, forfeit: isForfeit }, existingStandings);

        // ─── MonthlyStanding for both teams ─────────────────
        if (seasonId) {
          await upsertMonthly(tx as Tx, { teamId: winnerId, seasonId, year, month, won: true, forfeit: false });
          await upsertMonthly(tx as Tx, { teamId: loserId, seasonId, year, month, won: false, forfeit: isForfeit });

          // ─── HeadToHead ─────────────────────────────────────
          await upsertH2H(tx as Tx, seasonId, winnerId, loserId);

          // ─── Recalculate ranks ───────────────────────────────
          await recalculateSeasonRanks(seasonId, tx as Tx);
          await recalculateMonthlyRanks(seasonId, year, month, tx as Tx);
        }
      }

      // ─── Notify both captains ────────────────────────────
      const [teamA, teamB] = await Promise.all([
        tx.team.findUnique({ where: { id: match.teamAId }, select: { captainId: true, name: true } }),
        tx.team.findUnique({ where: { id: match.teamBId }, select: { captainId: true, name: true } }),
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
    });

    // post-transaction: check if this match is tied to a challenge (friendly)
    const challengeRecord = await prisma.matchChallenge.findUnique({ where: { scheduledMatchId: matchId } });
    const isChallengeMatch = !!challengeRecord;

    await createAuditLog(
      admin.id,
      "SUBMIT_MATCH_RESULT",
      "Match",
      matchId,
      JSON.stringify({ winnerId, scoreA, scoreB, forfeit: isForfeit, overridePoints, isChallengeMatch })
    );

    const updatedMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { select: { id: true, name: true, tag: true } },
        teamB: { select: { id: true, name: true, tag: true } },
        winner: { select: { id: true, name: true, tag: true } },
      },
    });

    const message = isChallengeMatch && !overridePoints
      ? "Result submitted (challenge/friendly — standings not updated)"
      : "Result submitted and standings updated";

    return apiSuccess({ message, match: updatedMatch });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) return apiError("Unauthorized", 401);
    if (err instanceof Error && err.message.includes("Forbidden")) return apiError(err.message, 403);
    console.error("submit-result error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to submit result", 500);
  }
}
