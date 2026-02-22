import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// GET - Get current user's team with full details
export async function GET(request: NextRequest) {
  try {
    const user = await requireActiveUser();

    // Check if user is a captain of a team
    const captainOf = await prisma.team.findFirst({
      where: {
        captainId: user.id,
        deletedAt: null,
      },
      include: {
        players: {
          where: { deletedAt: null },
          select: {
            id: true,
            ign: true,
            role: true,
            photo: true,
            isSubstitute: true,
            user: {
              select: {
                id: true,
                ign: true,
                photo: true,
              },
            },
          },
          orderBy: [
            { isSubstitute: "asc" },
            { role: "asc" },
          ],
        },
      },
    });

    if (captainOf) {
      return apiSuccess({
        ...captainOf,
        isCaptain: true,
      });
    }

    // Check if user is a player on a team
    const playerRecord = await prisma.player.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      include: {
        team: {
          include: {
            players: {
              where: { deletedAt: null },
              select: {
                id: true,
                ign: true,
                role: true,
                photo: true,
                isSubstitute: true,
                user: {
                  select: {
                    id: true,
                    ign: true,
                    photo: true,
                  },
                },
              },
              orderBy: [
                { isSubstitute: "asc" },
                { role: "asc" },
              ],
            },
          },
        },
      },
    });

    if (playerRecord?.team) {
      return apiSuccess({
        ...playerRecord.team,
        isCaptain: playerRecord.team.captainId === user.id,
      });
    }

    // No team found
    return apiSuccess(null);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Get my team error:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to fetch team",
      500
    );
  }
}
