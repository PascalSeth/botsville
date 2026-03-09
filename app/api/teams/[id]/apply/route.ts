import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// POST - Player applies to join a team
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;

    // Find team and its captain
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team || team.deletedAt) {
      return apiError("Team not found", 404);
    }

    // Check user not already on a team
    const existingPlayer = await prisma.player.findFirst({
      where: { userId: user.id, deletedAt: null },
    });
    if (existingPlayer) {
      return apiError("You already belong to a team and cannot apply.");
    }

    // Prevent duplicate pending application from same user
    const duplicate = await prisma.teamInvite.findFirst({
      where: {
        teamId: id,
        fromUserId: user.id,
        status: "PENDING",
      },
    });
    if (duplicate) {
      return apiError("You have already applied to this team");
    }

    // Build application as a teamInvite record (repurposing invites for applications)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const invite = await prisma.teamInvite.create({
      data: {
        teamId: id,
        fromUserId: user.id,
        toIGN: user.ign,
        toUserId: team.captainId || null,
        message: null,
        expiresAt,
        status: "PENDING",
      },
      include: {
        team: { select: { id: true, name: true, tag: true } },
      },
    });

    console.log('[my-team][apply] Invite created', { inviteId: invite.id, teamId: invite.team.id, toIGN: invite.toIGN, toUserId: invite.toUserId });

    // Notify captain if present — link to the captain's My Team page
    if (team.captainId) {
      console.log('[my-team][apply] Creating notification for captain', { captainId: team.captainId, inviteId: invite.id });
      await prisma.notification.create({
        data: {
          userId: team.captainId,
          type: "TEAM_INVITE_RECEIVED",
          title: `New application to ${invite.team.name}`,
          message: `${user.ign} has applied to join ${invite.team.name}`,
          linkUrl: `/my-team`,
        },
      });
    }

    return apiSuccess({ message: "Application submitted", invite }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to apply to team";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Apply to team error:", error);
    return apiError(message, 500);
  }
}
