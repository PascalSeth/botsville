import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { SeasonStatus } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("seasonId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    // If no seasonId provided, get the active season
    let targetSeasonId = seasonId;
    if (!targetSeasonId) {
      const activeSeason = await prisma.season.findFirst({
        where: { status: SeasonStatus.ACTIVE },
        select: { id: true },
      });
      targetSeasonId = activeSeason?.id ?? null;
    }

    const [teams, standings, season] = await Promise.all([
      prisma.team.findMany({
        where: {
          deletedAt: null,
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          tag: true,
          logo: true,
          banner: true,
          color: true,
          region: true,
          totalPrizeMoney: true,
          trophies: true,
        },
        orderBy: [{ name: "asc" }],
      }),
      targetSeasonId
        ? prisma.teamStanding.findMany({
            where: { seasonId: targetSeasonId },
            select: {
              id: true,
              teamId: true,
              rank: true,
              wins: true,
              losses: true,
              points: true,
              tier: true,
            },
          })
        : Promise.resolve([]),
      targetSeasonId
        ? prisma.season.findUnique({
            where: { id: targetSeasonId },
            select: {
              id: true,
              name: true,
              status: true,
            },
          })
        : Promise.resolve(null),
    ]);

    const standingByTeamId = new Map(standings.map((entry) => [entry.teamId, entry]));
    const maxStoredRank = standings.reduce((max, entry) => Math.max(max, entry.rank), 0);
    let nextUnranked = maxStoredRank + 1;

    const merged = teams
      .slice()
      .sort((left, right) => {
        const leftStanding = standingByTeamId.get(left.id);
        const rightStanding = standingByTeamId.get(right.id);

        if (leftStanding && rightStanding) {
          if (leftStanding.rank !== rightStanding.rank) {
            return leftStanding.rank - rightStanding.rank;
          }
          return rightStanding.points - leftStanding.points;
        }

        if (leftStanding) return -1;
        if (rightStanding) return 1;

        return left.name.localeCompare(right.name);
      })
      .map((team) => {
        const standing = standingByTeamId.get(team.id);

        return {
          id: standing?.id ?? `team-${team.id}`,
          rank: standing?.rank ?? nextUnranked++,
          wins: standing?.wins ?? 0,
          losses: standing?.losses ?? 0,
          points: standing?.points ?? 0,
          tier: standing?.tier ?? "C",
          team,
        };
      });

    const dedupedMerged = Array.from(
      new Map(merged.map((entry) => [entry.team.id, entry])).values()
    );

    const paginated = dedupedMerged.slice(skip, skip + limit);

    return apiSuccess({
      standings: paginated,
      season,
      pagination: {
        total: dedupedMerged.length,
        limit,
        skip,
      },
    });
  } catch (error: unknown) {
    console.error("Get team leaderboard error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch leaderboard", 500);
  }
}


