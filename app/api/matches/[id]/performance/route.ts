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

    // Group performances by gameNumber so we can apply upserts per game atomically
    const byGame: Record<number, any[]> = {};
    for (const perf of performances) {
      const { gameNumber } = perf;
      const g = parseInt(gameNumber);
      if (!byGame[g]) byGame[g] = [];
      byGame[g].push(perf);
    }

    const results: any[] = [];

    for (const gameNumStr of Object.keys(byGame)) {
      const gameNumber = parseInt(gameNumStr);
      const group = byGame[gameNumber];

      // Validate all records in group first
      const incomingPlayerIds = [] as string[];
      for (const perf of group) {
        const { playerId, hero, kills, deaths, assists, side, won } = perf;
        if (!playerId || !hero || kills === undefined || deaths === undefined || assists === undefined || side === undefined || won === undefined) {
          return apiError("All performance fields are required");
        }

        // Verify player belongs to one of the teams
        const player = await prisma.player.findUnique({ where: { id: playerId } });
        if (!player || (player.teamId !== match.teamAId && player.teamId !== match.teamBId)) {
          return apiError(`Player ${playerId} is not part of this match`);
        }

        incomingPlayerIds.push(playerId);
      }

      // Run transaction: delete removed player performances for this game, then upsert incoming ones
      const txOps: any[] = [];

      txOps.push(
        prisma.matchPerformance.deleteMany({
          where: {
            matchId: id,
            gameNumber,
            playerId: { notIn: incomingPlayerIds },
          },
        })
      );

      for (const perf of group) {
        const { playerId, hero, kills, deaths, assists, isMvp, side, won } = perf;
        txOps.push(
          prisma.matchPerformance.upsert({
            where: {
              matchId_gameNumber_playerId: {
                matchId: id,
                gameNumber,
                playerId,
              },
            },
            update: {
              hero,
              kills: parseInt(kills as any) || 0,
              deaths: parseInt(deaths as any) || 0,
              assists: parseInt(assists as any) || 0,
              isMvp: Boolean(isMvp),
              side: side === "A" || side === "BLUE" ? TeamSide.BLUE : TeamSide.RED,
              won: Boolean(won),
            },
            create: {
              matchId: id,
              gameNumber,
              playerId,
              hero,
              kills: parseInt(kills as any) || 0,
              deaths: parseInt(deaths as any) || 0,
              assists: parseInt(assists as any) || 0,
              isMvp: Boolean(isMvp),
              side: side === "A" || side === "BLUE" ? TeamSide.BLUE : TeamSide.RED,
              won: Boolean(won),
            },
          })
        );
      }

      const txResults = await prisma.$transaction(txOps);
      // collect upserted results (filter create/update results)
      for (const r of txResults) {
        if (Array.isArray(r)) continue;
        if (r && r.id) results.push(r);
      }
    }

    return apiSuccess({ message: "Performances saved", performances: results }, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to record performance";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Record performance error:", error);
    return apiError(message, 500);
  }
}

// DELETE - remove performances for a specific gameNumber
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { gameNumber } = body;

    if (gameNumber === undefined) return apiError('gameNumber is required');

    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) return apiError('Match not found', 404);

    const isReferee = user.role === AdminRoleType.REFEREE || user.role === AdminRoleType.TOURNAMENT_ADMIN || user.role === AdminRoleType.SUPER_ADMIN;
    if (!isReferee) return apiError('Only referees can remove performances', 403);

    const gm = parseInt(gameNumber as any);
    const deleted = await prisma.matchPerformance.deleteMany({ where: { matchId: id, gameNumber: gm } });

    return apiSuccess({ message: `Deleted ${deleted.count} performances for game ${gm}` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete performances';
    console.error('Delete performances error:', error);
    return apiError(message, 500);
  }
}



