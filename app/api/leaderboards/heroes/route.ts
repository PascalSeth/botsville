import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { SeasonStatus, MetaTier } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("seasonId");
    const tierParam = searchParams.get("tier");
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
        // Return empty heroes if no active season
        return apiSuccess({
          heroes: [],
          season: null,
          pagination: { total: 0, limit, skip },
        });
      }
      targetSeasonId = activeSeason.id;
    }

    const where: { seasonId: string; tier?: MetaTier } = { seasonId: targetSeasonId };
    if (tierParam && Object.values(MetaTier).includes(tierParam as MetaTier)) {
      where.tier = tierParam as MetaTier;
    }

    const [heroes, total] = await Promise.all([
      prisma.heroMeta.findMany({
        where,
        orderBy: [
          { tier: "asc" },
          { pickRate: "desc" },
        ],
        take: limit,
        skip,
      }),
      prisma.heroMeta.count({ where }),
    ]);

    return apiSuccess({
      heroes,
      pagination: {
        total,
        limit,
        skip,
      },
    });
  } catch (error: unknown) {
    console.error("Get hero meta error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch hero meta", 500);
  }
}


