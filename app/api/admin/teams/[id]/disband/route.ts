import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { invalidatePattern } from "@/lib/redis";
import { TeamStatus } from "@/app/generated/prisma/enums";


export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const admin = await requireAdmin();
    const resolvedParams = await (context.params as any);
    const id = resolvedParams?.id;

    if (!id) {
      return apiError("Team ID is required", 400);
    }

    const team = await prisma.team.findUnique({
      where: { id },
      select: { id: true, name: true, deletedAt: true },
    });

    if (!team) {
      return apiError("Team not found", 404);
    }

    if (team.deletedAt) {
      // Team was already marked deleted — clean up any remaining roster/invites/challenges
      await prisma.player.deleteMany({ where: { teamId: id } });
      await prisma.teamInvite.updateMany({ where: { teamId: id, status: 'PENDING' }, data: { status: 'DECLINED' } });
      await prisma.matchChallenge.updateMany({
        where: {
          OR: [{ challengerTeamId: id }, { challengedTeamId: id }],
          status: { in: ['PENDING', 'ACCEPTED', 'SCHEDULED'] },
        },
        data: { status: 'CANCELLED' },
      });
      await invalidatePattern("teams:*");
      await invalidatePattern("leaderboard:*");

      return apiSuccess({ message: "Team disbanded successfully" });
    }

    await prisma.team.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: TeamStatus.INACTIVE,
      },
    });


    // Hard-delete all player records so members are fully freed to join other teams
    await prisma.player.deleteMany({
      where: { teamId: id },
    });

    // Cancel pending invites/applications for the team
    await prisma.teamInvite.updateMany({
      where: { teamId: id, status: 'PENDING' },
      data: { status: 'DECLINED' },
    });

    // Cancel active match challenges involving this team
    await prisma.matchChallenge.updateMany({
      where: {
        OR: [{ challengerTeamId: id }, { challengedTeamId: id }],
        status: { in: ['PENDING', 'ACCEPTED', 'SCHEDULED'] },
      },
      data: { status: 'CANCELLED' },
    });

    // Deactivate any active invite links
    await prisma.teamInviteLink.updateMany({
      where: { teamId: id, active: true },
      data: { active: false },
    });

    await prisma.adminAuditLog.create({
      data: {
        actorId: admin.id,
        action: "DISBAND_TEAM",
        targetType: "Team",
        targetId: team.id,
        details: `Disbanded team ${team.name}`,
      },
    });

    // Invalidate cached team and leaderboard listings
    await invalidatePattern("teams:*");
    await invalidatePattern("leaderboard:*");

    return apiSuccess({ message: "Team disbanded successfully" });
  } catch (error) {
    console.error("Admin disband team error:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to disband team",
      500
    );
  }
}

