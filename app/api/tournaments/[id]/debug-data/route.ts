import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tournaments/[id]/debug-data
 * 
 * Debug endpoint to show what data exists in the tournament
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        seasonId: true,
      },
    });

    if (!tournament) {
      return apiError("Tournament not found", 404);
    }

    // Get teams registered
    const teamRegistrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId },
      select: {
        id: true,
        teamId: true,
        status: true,
        team: { select: { name: true } },
      },
    });

    // Get all matches
    const allMatches = await prisma.match.findMany({
      where: { tournamentId },
      select: {
        id: true,
        teamAId: true,
        teamBId: true,
        scoreA: true,
        scoreB: true,
        winnerId: true,
        status: true,
        createdAt: true,
      },
    });

    // Get completed matches
    const completedMatches = allMatches.filter(
      (m) => m.status === "COMPLETED"
    );

    // Get existing standings
    const standings = await prisma.teamStanding.findMany({
      where: { seasonId: tournament.seasonId },
      select: {
        teamId: true,
        wins: true,
        losses: true,
        points: true,
      },
    });

    return apiSuccess({
      tournament,
      stats: {
        totalTeamsRegistered: teamRegistrations.length,
        teamsByStatus: Object.fromEntries(
          [
            ...new Map(
              teamRegistrations.map((t) => [
                t.status,
                (teamRegistrations.filter((x) => x.status === t.status) || [])
                  .length,
              ])
            ),
          ].sort()
        ),
        totalMatches: allMatches.length,
        completedMatches: completedMatches.length,
        pendingMatches: allMatches.filter(
          (m) => m.status !== "COMPLETED"
        ).length,
        standingsRecords: standings.length,
      },
      samples: {
        firstFiveTeams: teamRegistrations.slice(0, 5),
        firstFiveMatches: allMatches.slice(0, 5),
        completedMatchesSample: completedMatches.slice(0, 5),
        existingStandingsSample: standings.slice(0, 5),
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get debug data";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    return apiError(message, 500);
  }
}
