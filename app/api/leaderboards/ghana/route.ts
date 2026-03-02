import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { MainRole } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

function isGhanaRegion(value: string | null | undefined) {
  if (!value) return false;
  return ["accra", "kumasi", "takoradi", "tema", "cape coast", "tamale"].includes(value.toLowerCase());
}

export async function GET(_request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: {
        id: true,
        ign: true,
        photo: true,
        region: true,
        rankBadge: true,
        mainRole: true,
        player: {
          select: {
            id: true,
            role: true,
            winRate: true,
            mvpCount: true,
            signatureHero: true,
          },
        },
      },
    });

    const ghanaPlayers = users.filter((value) => isGhanaRegion(value.region));

    const topMythicPlayers = ghanaPlayers
      .filter((value) => (value.rankBadge || "").includes("MYTHIC"))
      .sort((a, b) => (b.player?.winRate || 0) - (a.player?.winRate || 0))
      .slice(0, 20);

    const highestWinRateByHero = ghanaPlayers
      .filter((value) => Boolean(value.player?.signatureHero))
      .map((value) => ({
        hero: value.player?.signatureHero,
        ign: value.ign,
        winRate: value.player?.winRate || 0,
      }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 20);

    const mostSavageThisWeek = ghanaPlayers
      .map((value) => ({
        ign: value.ign,
        mvpCount: value.player?.mvpCount || 0,
      }))
      .sort((a, b) => b.mvpCount - a.mvpCount)
      .slice(0, 20);

    const bestTankInGhana = ghanaPlayers
      .filter((value) => value.mainRole === MainRole.ROAM)
      .sort((a, b) => (b.player?.winRate || 0) - (a.player?.winRate || 0))
      .slice(0, 20);

    return apiSuccess({
      topMythicPlayers,
      highestWinRateByHero,
      mostSavageThisWeek,
      bestTankInGhana,
    });
  } catch (error: unknown) {
    console.error("Ghana leaderboard GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch Ghana leaderboards", 500);
  }
}
