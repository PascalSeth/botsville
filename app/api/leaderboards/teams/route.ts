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
      if (!activeSeason) {
        // Return empty standings if no active season
        return apiSuccess({
          standings: [],
          season: null,
          pagination: { total: 0, limit, skip },
        });
      }
      targetSeasonId = activeSeason.id;
    }

    const [standings, season, total] = await Promise.all([
      prisma.teamStanding.findMany({
        where: { seasonId: targetSeasonId },
        include: {
          team: {
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
          },
        },
        orderBy: [
          { rank: "asc" },
          { points: "desc" },
        ],
        take: limit,
        skip,
      }),
      prisma.season.findUnique({
        where: { id: targetSeasonId },
        select: {
          id: true,
          name: true,
          status: true,
        },
      }),
      prisma.teamStanding.count({ where: { seasonId: targetSeasonId } }),
    ]);

    return apiSuccess({
      standings,
      season,
      pagination: {
        total,
        limit,
        skip,
      },
    });
  } catch (error: unknown) {
    console.error("Get team leaderboard error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch leaderboard", 500);
  }
}


