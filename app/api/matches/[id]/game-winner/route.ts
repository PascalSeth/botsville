import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { AdminRoleType } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { TeamSide } from "@/app/generated/prisma/enums";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { gameNumber, winnerId } = body;

    if (gameNumber === undefined || !winnerId) return apiError('gameNumber and winnerId are required');

    // Only referees/tournament admins or super admin can set persisted game winners
    const allowed = user.role === AdminRoleType.REFEREE || user.role === AdminRoleType.TOURNAMENT_ADMIN || user.role === AdminRoleType.SUPER_ADMIN;
    if (!allowed) return apiError('Only referees or tournament admins can set game winners', 403);

    const match = await prisma.match.findUnique({ where: { id }, select: { teamAId: true, teamBId: true } });
    if (!match) return apiError('Match not found', 404);
    if (winnerId !== match.teamAId && winnerId !== match.teamBId) return apiError('winnerId must be one of the competing teams', 400);

    const gm = typeof gameNumber === 'string' ? parseInt(gameNumber) : Number(gameNumber);

    // Determine which side corresponds to the winner team (teamA -> BLUE, teamB -> RED)
    const winnerSide = winnerId === match.teamAId ? TeamSide.BLUE : TeamSide.RED;

    // Mark performances as won where side matches the winnerSide OR player's teamId matches winnerId.
    // This is robust to substitutions or missing side values on the performance rows.
    const updatedWinner = await prisma.matchPerformance.updateMany({
      where: {
        matchId: id,
        gameNumber: gm,
        OR: [
          { side: winnerSide },
          { player: { teamId: winnerId } },
        ],
      },
      data: { won: true },
    });

    // Mark all other performances for this match/game as losses
    const updatedLoser = await prisma.matchPerformance.updateMany({
      where: {
        matchId: id,
        gameNumber: gm,
        NOT: [
          {
            OR: [
              { side: winnerSide },
              { player: { teamId: winnerId } },
            ],
          },
        ],
      },
      data: { won: false },
    });

    return apiSuccess({ message: `Set game ${gm} winner`, updated: { winnerCount: updatedWinner.count, loserCount: updatedLoser.count } });
  } catch (err: unknown) {
    console.error('Set game winner error:', err);
    const message = err instanceof Error ? err.message : 'Failed to set game winner';
    return apiError(message, 500);
  }
}
