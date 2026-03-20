import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { SeasonStatus } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("seasonId");
    const tournamentStatus = searchParams.get("tournamentStatus")?.split(",") || [];
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

    // Build where clause (tournament status filter not applicable to aggregated rankings)
    const rankingWhere: Record<string, unknown> = { seasonId: targetSeasonId };

    // Fetch rankings ordered by computed metrics (mvp, kda, winRate) instead of relying solely on stored rank.
    // This avoids showing rank=0 (uninitialized) entries at the top.
    const [rows, total] = await Promise.all([
      prisma.playerMvpRanking.findMany({
        where: rankingWhere,
        select: {
          id: true,
          // keep stored rank for reference but compute display rank below
          rank: true,
          mvpCount: true,
          kda: true,
          winRate: true,
          hero: true,
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
          { mvpCount: "desc" },
          { kda: "desc" },
          { winRate: "desc" },
        ],
      }),
      prisma.playerMvpRanking.count({ where: rankingWhere }),
    ]);

    // Apply pagination in-memory (safer when sorting by computed fields)
    const paged = rows.slice(skip, skip + limit).map((r, idx) => ({
      ...r,
      rank: skip + idx + 1, // compute display rank based on ordering
    }));

    return apiSuccess({
      rankings: paged,
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


