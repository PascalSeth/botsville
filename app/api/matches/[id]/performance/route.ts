import { NextRequest } from "next/server";
import {

  requireActiveUser,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { TeamSide, AdminRoleType } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - Get match performances
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const performances = await prisma.matchPerformance.findMany({
      where: { matchId: id },
      include: {
        player: {
          select: {
            id: true,
            ign: true,
            role: true,
            team: {
              select: {
                id: true,
                name: true,
                tag: true,
              },
            },
          },
        },
      },
      orderBy: [{ gameNumber: "asc" }, { player: { role: "asc" } }],
    });

    return apiSuccess(performances);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch performances";
    console.error("Get performances error:", error);
    return apiError(message, 500);
  }
}

// POST - Record match performance
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { performances } = body; // Array of performance objects

    if (!performances || !Array.isArray(performances)) {
      return apiError("Performances array is required");
    }

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        teamA: true,
        teamB: true,
      },
    });

    if (!match) {
      return apiError("Match not found", 404);
    }

    // Only referees and tournament admins can record performance
    const isReferee = user.role === AdminRoleType.REFEREE || user.role === AdminRoleType.TOURNAMENT_ADMIN || user.role === AdminRoleType.SUPER_ADMIN;

    if (!isReferee) {
      return apiError("Only referees can record match performance", 403);
    }

    // Validate and create performances
    const createdPerformances = [];
    for (const perf of performances) {
      const { gameNumber, playerId, hero, kills, deaths, assists, isMvp, side, won } = perf;

      if (!gameNumber || !playerId || !hero || kills === undefined || deaths === undefined || assists === undefined || side === undefined || won === undefined) {
        return apiError("All performance fields are required");
      }

      // Verify player belongs to one of the teams
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { team: true },
      });

      if (!player || (player.teamId !== match.teamAId && player.teamId !== match.teamBId)) {
        return apiError(`Player ${playerId} is not part of this match`);
      }

      // Check for duplicate
      const existing = await prisma.matchPerformance.findUnique({
        where: {
          matchId_gameNumber_playerId: {
            matchId: id,
            gameNumber: parseInt(gameNumber),
            playerId,
          },
        },
      });

      if (existing) {
        return apiError(`Performance already recorded for player ${playerId} in game ${gameNumber}`);
      }

      const created = await prisma.matchPerformance.create({
        data: {
          matchId: id,
          gameNumber: parseInt(gameNumber),
          playerId,
          hero,
          kills: parseInt(kills),
          deaths: parseInt(deaths),
          assists: parseInt(assists),
          isMvp: Boolean(isMvp),
          side: side as TeamSide,
          won: Boolean(won),
        },
      });

      createdPerformances.push(created);
    }

    return apiSuccess(
      {
        message: "Performances recorded successfully",
        performances: createdPerformances,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to record performance";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Record performance error:", error);
    return apiError(message, 500);
  }
}



