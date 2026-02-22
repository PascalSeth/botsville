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
        // Return empty rankings if no active season
        return apiSuccess({
          rankings: [],
          season: null,
          pagination: { total: 0, limit, skip },
        });
      }
      targetSeasonId = activeSeason.id;
    }

    const [rankings, total] = await Promise.all([
      prisma.playerMvpRanking.findMany({
        where: { seasonId: targetSeasonId },
        include: {
          player: {
            select: {
              id: true,
              ign: true,
              role: true,
              secondaryRole: true,
              signatureHero: true,
              photo: true,
              realName: true,
              kda: true,
              winRate: true,
              mvpCount: true,
              user: {
                select: {
                  id: true,
                  ign: true,
                  photo: true,
                },
              },
              team: {
                select: {
                  id: true,
                  name: true,
                  tag: true,
                  color: true,
                },
              },
            },
          },
        },
        orderBy: [
          { rank: "asc" },
          { mvpCount: "desc" },
        ],
        take: limit,
        skip,
      }),
      prisma.playerMvpRanking.count({ where: { seasonId: targetSeasonId } }),
    ]);

    return apiSuccess({
      rankings,
      pagination: {
        total,
        limit,
        skip,
      },
    });
  } catch (error: unknown) {
    console.error("Get player leaderboard error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch leaderboard", 500);
  }
}


