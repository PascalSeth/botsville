import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, requireAdmin } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    // requireAdmin inherently throws or returns apiError if unauthorized/forbidden
    // Wait, let's verify if requireAdmin returns an error response or just throws an Error/returns user.
    // If it returns user, we can proceed. If it throws, try-catch handles it.


    const body = await req.json();
    const { sourceTeamId, targetTeamId } = body;

    if (!sourceTeamId || !targetTeamId) {
      return apiError('sourceTeamId and targetTeamId are required');
    }

    if (sourceTeamId === targetTeamId) {
      return apiError('Source and target teams must be different');
    }

    // Fetch both teams
    const sourceTeam = await prisma.team.findUnique({
      where: { id: sourceTeamId },
      include: { players: { where: { deletedAt: null } } }
    });

    const targetTeam = await prisma.team.findUnique({
      where: { id: targetTeamId },
      include: { players: { where: { deletedAt: null } } }
    });

    if (!sourceTeam) return apiError('Source team not found', 404);
    if (!targetTeam) return apiError('Target team not found', 404);

    // Validate size limit (max 20 total)
    const totalPlayers = sourceTeam.players.length + targetTeam.players.length;
    if (totalPlayers > 20) {
      return apiError(`Cannot merge: combined player count (${totalPlayers}) exceeds the maximum limit of 20 players.`);
    }

    // Perform the merge in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Move all source team players to the target team and make them substitutes
      if (sourceTeam.players.length > 0) {
        await tx.player.updateMany({
          where: { teamId: sourceTeamId, deletedAt: null },
          data: {
            teamId: targetTeamId,
            isSubstitute: true
          }
        });
      }

      // 2. Mark source team as INACTIVE (soft-delete behavior to preserve history)
      await tx.team.update({
        where: { id: sourceTeamId },
        data: {
          status: 'INACTIVE',
          isRecruiting: false,
          deletedAt: new Date()
        }
      });
      
    });

    return apiSuccess({
      message: `Successfully merged ${sourceTeam.name} into ${targetTeam.name}.`,
      sourceTeamId,
      targetTeamId,
      transferredCount: sourceTeam.players.length
    });

  } catch (error: any) {
    console.error('Error merging teams:', error);
    return apiError(error.message || 'Internal server error', 500);
  }
}
