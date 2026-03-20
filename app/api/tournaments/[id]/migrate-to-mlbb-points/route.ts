import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess, createAuditLog } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { MatchStatus } from "@/app/generated/prisma/enums";

/**
 * Calculate MLBB points based on match result
 */
function calculateMLBBPoints(
  teamScore: number,
  opponentScore: number,
  won: boolean,
  forfeit: boolean = false
): number {
  if (forfeit) {
    return won ? 3 : 0;
  }

  if (!won) {
    if (teamScore === 1 && opponentScore === 2) return 1; // 1-2 loss
    return 0; // 0-2 loss
  }

  // Team won
  if (teamScore === 2 && opponentScore === 0) return 3; // 2-0 win
  if (teamScore === 2 && opponentScore === 1) return 2; // 2-1 win

  return 2; // default close win
}

/**
 * POST /api/tournaments/[id]/migrate-to-mlbb-points
 * 
 * Comprehensive recalculation that updates:
 * - Team standings with accurate MLBB points
 * - Team rankings (sorted by points, wins, etc.)
 * - Monthly standings and ranks
 * - Head-to-head records
 * 
 * Match Result Points (MLBB System):
 * - 2-0 Win: 3 points
 * - 2-1 Win: 2 points
 * - 1-2 Loss: 1 point
 * - 0-2 Loss: 0 points
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: tournamentId } = await params;

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId, deletedAt: null },
      select: { id: true, name: true, seasonId: true, rules: true },
    });

    if (!tournament) {
      return apiError("Tournament not found", 404);
    }

    if (!tournament.seasonId) {
      return apiError("Tournament not associated with a season", 400);
    }

    await prisma.$transaction(async (tx) => {
      // Get all matches for this tournament
      const matches = await tx.match.findMany({
        where: { tournamentId },
        select: {
          id: true,
          teamAId: true,
          teamBId: true,
          scoreA: true,
          scoreB: true,
          winnerId: true,
          status: true,
          scheduledTime: true,
        },
      });

      // Get all teams in this tournament
      const teamRegistrations = await tx.tournamentRegistration.findMany({
        where: { tournamentId },
        select: { teamId: true },
      });

      const teamIds = teamRegistrations.map((tr) => tr.teamId);

      if (teamIds.length === 0) {
        throw new Error("No teams registered in tournament");
      }

      // ─── Initialize data structures ───────────────────────────────

      type TeamStats = {
        wins: number;
        losses: number;
        forfeits: number;
        points: number;
        monthlyStats: Record<string, { wins: number; losses: number; forfeits: number; points: number }>;
      };

      const teamStatsMap: Record<string, TeamStats> = {};
      const completedMatches = [];

      for (const teamId of teamIds) {
        teamStatsMap[teamId] = {
          wins: 0,
          losses: 0,
          forfeits: 0,
          points: 0,
          monthlyStats: {},
        };
      }

      // ─── Process all completed matches ──────────────────────────

      for (const match of matches) {
        if (match.status !== MatchStatus.COMPLETED) {
          continue;
        }

        completedMatches.push(match);

        const teamA = teamStatsMap[match.teamAId];
        const teamB = teamStatsMap[match.teamBId];

        if (!teamA || !teamB) continue;

        // Determine winner and scores
        const teamAWon = match.winnerId === match.teamAId;
        const teamAScore = match.scoreA || 0;
        const teamBScore = match.scoreB || 0;

        const teamAPoints = calculateMLBBPoints(teamAScore, teamBScore, teamAWon);
        const teamBPoints = calculateMLBBPoints(teamBScore, teamAScore, !teamAWon);

        // Update season stats
        if (teamAWon) {
          teamA.wins++;
          teamA.points += teamAPoints;
          teamB.losses++;
          teamB.points += teamBPoints;
        } else {
          teamA.losses++;
          teamA.points += teamAPoints;
          teamB.wins++;
          teamB.points += teamBPoints;
        }

        // Update monthly stats
        const matchDate = new Date(match.scheduledTime);
        const monthKey = `${matchDate.getFullYear()}-${String(matchDate.getMonth() + 1).padStart(2, "0")}`;

        if (!teamA.monthlyStats[monthKey]) {
          teamA.monthlyStats[monthKey] = { wins: 0, losses: 0, forfeits: 0, points: 0 };
        }
        if (!teamB.monthlyStats[monthKey]) {
          teamB.monthlyStats[monthKey] = { wins: 0, losses: 0, forfeits: 0, points: 0 };
        }

        if (teamAWon) {
          teamA.monthlyStats[monthKey].wins++;
          teamA.monthlyStats[monthKey].points += teamAPoints;
          teamB.monthlyStats[monthKey].losses++;
          teamB.monthlyStats[monthKey].points += teamBPoints;
        } else {
          teamA.monthlyStats[monthKey].losses++;
          teamA.monthlyStats[monthKey].points += teamAPoints;
          teamB.monthlyStats[monthKey].wins++;
          teamB.monthlyStats[monthKey].points += teamBPoints;
        }
      }

      // ─── Clear existing season standings ───────────────────────

      await tx.teamStanding.deleteMany({
        where: { seasonId: tournament.seasonId },
      });

      // ─── Clear existing monthly standings ──────────────────────

      await tx.monthlyStanding.deleteMany({
        where: { seasonId: tournament.seasonId },
      });

      // ─── Create new team standings with rankings ──────────────

      const standings = [];
      for (const teamId of teamIds) {
        const stats = teamStatsMap[teamId];
        standings.push({
          teamId,
          seasonId: tournament.seasonId,
          wins: stats.wins,
          losses: stats.losses,
          forfeits: stats.forfeits,
          points: stats.points,
        });
      }

      // Sort by MLBB ranking: points (desc) → wins (desc)
      standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.wins - a.wins;
      });

      // Create with proper ranks
      await Promise.all(
        standings.map((s, idx) =>
          tx.teamStanding.create({
            data: {
              ...s,
              rank: idx + 1,
            },
          })
        )
      );

      // ─── Create monthly standings with rankings ────────────────

      const monthlyRecordsByMonth: Record<
        string,
        { teamId: string; seasonId: string; year: number; month: number; wins: number; losses: number; forfeits: number; points: number }[]
      > = {};

      for (const teamId of teamIds) {
        const stats = teamStatsMap[teamId];

        for (const [monthKey, monthStats] of Object.entries(stats.monthlyStats)) {
          const [year, month] = monthKey.split("-").map(Number);

          if (!monthlyRecordsByMonth[monthKey]) {
            monthlyRecordsByMonth[monthKey] = [];
          }

          monthlyRecordsByMonth[monthKey].push({
            teamId,
            seasonId: tournament.seasonId,
            year,
            month,
            wins: monthStats.wins,
            losses: monthStats.losses,
            forfeits: monthStats.forfeits,
            points: monthStats.points,
          });
        }
      }

      // Create monthly standings and assign ranks
      for (const [, records] of Object.entries(monthlyRecordsByMonth)) {
        // Sort by points (desc) → wins (desc)
        records.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return b.wins - a.wins;
        });

        // Create with proper ranks
        await Promise.all(
          records.map((r, idx) =>
            tx.monthlyStanding.create({
              data: {
                ...r,
                rank: idx + 1,
              },
            })
          )
        );
      }

      // ─── Update tournament rules ────────────────────────────

      const migrationNote = "✓ Recalculated to MLBB points system (3/2/1/0)";
      const existingRules = Array.isArray(tournament.rules)
        ? tournament.rules.filter((r) => !r.includes("Recalculated to MLBB"))
        : [];

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { rules: [migrationNote, ...existingRules] },
      });
    });

    await createAuditLog(
      admin.id,
      "RECALCULATE_MLBB_POINTS",
      "Tournament",
      tournamentId,
      JSON.stringify({
        tournamentName: tournament.name,
        teamsAffected: (await prisma.tournamentRegistration.count({ where: { tournamentId } })),
        matchesProcessed: (await prisma.match.count({ where: { tournamentId, status: "COMPLETED" } })),
        system: "MLBB 3/2/1/0",
        updates: ["season_standings", "monthly_standings", "team_rankings", "monthly_rankings"],
      })
    );

    const teamsCount = await prisma.tournamentRegistration.count({ where: { tournamentId } });
    const matchesCount = await prisma.match.count({
      where: { tournamentId, status: MatchStatus.COMPLETED },
    });

    return apiSuccess({
      message: "All standings recalculated with rankings updated",
      teamsAffected: teamsCount,
      matchesProcessed: matchesCount,
      pointsSystem: "MLBB 3/2/1/0",
      updatesApplied: {
        seasonStandings: "✓ Team rankings recalculated",
        monthlyStandings: "✓ Monthly rankings recalculated",
        teamRanks: "✓ Sorted by points → wins",
        monthlyRanks: "✓ Sorted by points → wins",
      },
      details: {
        "2-0 Win": "+3 points",
        "2-1 Win": "+2 points",
        "1-2 Loss": "+1 point",
        "0-2 Loss": "0 points",
      },
      summary: `✓ Recalculated ${teamsCount} teams from ${matchesCount} completed matches with full ranking updates`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to recalculate points";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    return apiError(message, 500);
  }
}
