import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { MatchStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { recalculateTeamSeasonStandings } from "@/lib/standings-utils";

/**
 * POST /api/seasons/[id]/recalculate-all
 * 
 * The "Nuclear Option":
 * 1. Finds all completed matches in the season.
 * 2. Recalculates Points, Wins, Losses for every team.
 * 3. Rebuilds TeamStanding and MonthlyStanding from scratch.
 * 4. Ensures everything is 100% consistent with match results.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: seasonId } = await params;

    // Fetch all teams registered for this season
    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournament: { seasonId }, status: "APPROVED" },
      select: { teamId: true },
    });
    
    const teamIds = Array.from(new Set(registrations.map(r => r.teamId)));

    // 1. Recalculate everything for every team (Idempotent)
    console.time("recalculate_utility");
    for (const teamId of teamIds) {
      await recalculateTeamSeasonStandings(teamId, seasonId);
    }
    console.timeEnd("recalculate_utility");

    // 2. Global Ranking & Podium Sweep
    // After everything is recalculated, we need to set the global ranks correctly
    await prisma.$transaction(async (tx) => {
      // Step A: Fetch current standings to sort and rank
      const currentStandings = await tx.teamStanding.findMany({
        where: { seasonId },
        orderBy: [
          { points: 'desc' },
          { wins: 'desc' },
          { losses: 'asc' }
        ]
      });

      // Step B: Update ranks in database
      for (let i = 0; i < currentStandings.length; i++) {
        await tx.teamStanding.update({
          where: { id: currentStandings[i].id },
          data: { rank: i + 1 }
        });
      }

      // Step C: Update Season Awards Podium (Top 3)
      if (currentStandings.length > 0) {
        const champion = currentStandings[0]?.teamId;
        const runnerUp = currentStandings[1]?.teamId;
        const thirdPlace = currentStandings[2]?.teamId;

        await tx.seasonAwards.upsert({
          where: { seasonId },
          create: {
            seasonId,
            championTeamId: champion || null,
            runnerUpTeamId: runnerUp || null,
            thirdPlaceTeamId: thirdPlace || null,
          },
          update: {
            championTeamId: champion || null,
            runnerUpTeamId: runnerUp || null,
            thirdPlaceTeamId: thirdPlace || null,
            updatedAt: new Date(),
          },
        });
      }
    });

    return apiSuccess({ 
      message: "Season and Monthly standings successfully synchronized.", 
      teamsProcessed: teamIds.length 
    });
    console.timeEnd("db_update");

    return apiSuccess({ message: "Season and Monthly standings fully recalculated.", matchesProcessed: matches.length });
  } catch (err) {
    console.error("recalculate-all error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to recalculate", 500);
  }
}
