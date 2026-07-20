import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { invalidatePattern } from "@/lib/redis";
import { TeamStatus } from "@/app/generated/prisma/enums";


export async function DELETE(_request: NextRequest) {

  try {
    const user = await requireActiveUser();

    const team = await prisma.team.findFirst({
      where: {
        captainId: user.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!team) {
      return apiError("Team not found", 404);
    }

    await prisma.team.update({
      where: { id: team.id },
      data: {
        deletedAt: new Date(),
        status: TeamStatus.INACTIVE,
      },
    });



    // Hard-delete all player records for this team so members are fully freed
    // (stats history is preserved in other tables; Player is just the active roster slot)
    await prisma.player.deleteMany({
      where: { teamId: team.id },
    });

    // Cancel any pending invites/applications so they don't block re-joining
    await prisma.teamInvite.updateMany({
      where: { teamId: team.id, status: 'PENDING' },
      data: { status: 'DECLINED' },
    });

    // Cancel any active match challenges involving this team
    await prisma.matchChallenge.updateMany({
      where: {
        OR: [{ challengerTeamId: team.id }, { challengedTeamId: team.id }],
        status: { in: ['PENDING', 'ACCEPTED', 'SCHEDULED'] },
      },
      data: { status: 'CANCELLED' },
    });

    // Deactivate any active invite links
    await prisma.teamInviteLink.updateMany({
      where: { teamId: team.id, active: true },
      data: { active: false },
    });


    // Invalidate cached team and leaderboard listings
    await invalidatePattern("teams:*");
    await invalidatePattern("leaderboard:*");

    return apiSuccess({ message: "Team disbanded successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Disband team error:", error);
    const message = error instanceof Error ? error.message : "Failed to disband team";
    return apiError(message, 500);
  }
}
