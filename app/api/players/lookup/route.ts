import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ign = searchParams.get("ign");

    if (!ign || ign.trim().length < 2) {
      return apiError("Invalid IGN");
    }

    const player = await prisma.player.findFirst({
      where: { ign: { equals: ign.trim(), mode: "insensitive" } },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            deletedAt: true,
          },
        },
      },
    });

    const cacheHeaders = {
      "Cache-Control": "public, s-maxage=10, stale-while-revalidate=5"
    };

    if (!player) {
      return apiSuccess({ found: false }, 200, cacheHeaders);
    }

    // A player is active on a team if their player record is not soft-deleted,
    // and they have a team, and the team is not soft-deleted.
    const isPlayerActive = player.deletedAt === null && player.team && player.team.deletedAt === null;

    return apiSuccess({
      found: true,
      ign: player.ign,
      photo: player.photo,
      team: isPlayerActive ? { id: player.team!.id, name: player.team!.name } : null,
    }, 200, cacheHeaders);
  } catch (error) {
    console.error("Player lookup error:", error);
    return apiError("Failed to lookup player", 500);
  }
}
