import { NextRequest } from "next/server";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { InviteStatus, GameRole } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// POST - Accept or decline invite
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { action, role, secondaryRole } = body; // action: "accept" | "decline"

    if (!action || !["accept", "decline"].includes(action)) {
      return apiError("Action must be 'accept' or 'decline'");
    }

    // Get invite
    const invite = await prisma.teamInvite.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            players: {
              where: { deletedAt: null },
            },
            captain: {
              select: {
                id: true,
                ign: true,
              },
            },
          },
        },
        toUser: {
          select: {
            id: true,
            ign: true,
          },
        },
      },
    });

    if (!invite) {
      return apiError("Invite not found", 404);
    }

    // Verify invite belongs to user
    if (invite.toUserId !== user.id && invite.toIGN !== user.ign) {
      return apiError("This invite is not for you", 403);
    }

    // Check if invite is still valid
    if (invite.status !== InviteStatus.PENDING) {
      return apiError("Invite has already been responded to");
    }

    if (invite.expiresAt < new Date()) {
      await prisma.teamInvite.update({
        where: { id },
        data: { status: InviteStatus.EXPIRED },
      });
      return apiError("Invite has expired");
    }

    if (action === "decline") {
      await prisma.teamInvite.update({
        where: { id },
        data: {
          status: InviteStatus.DECLINED,
          respondedAt: new Date(),
        },
      });

      // Notify captain
      await prisma.notification.create({
        data: {
          userId: invite.team.captainId!,
          type: "TEAM_INVITE_DECLINED",
          title: "Invite Declined",
          message: `${user.ign} declined your team invite`,
          linkUrl: `/teams/${invite.teamId}`,
        },
      });

      return apiSuccess({ message: "Invite declined" });
    }

    // Accept invite
    if (!role) {
      return apiError("Role is required when accepting invite");
    }

    if (!Object.values(GameRole).includes(role)) {
      return apiError("Invalid role");
    }

    // Check if user is already on a team
    const existingPlayer = await prisma.player.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
      },
    });

    if (existingPlayer) {
      return apiError("You are already on a team");
    }

    // Check team size
    if (invite.team.players.length >= 7) {
      return apiError("Team is full");
    }

    // Check if role is already taken by a starter
    const roleTaken = invite.team.players.find(
      (p) => p.role === role && !p.isSubstitute
    );

    let isSubstitute = false;
    if (roleTaken) {
      // Role conflict - add as substitute
      isSubstitute = true;
    }

    // Cancel all other pending invites for this user
    await prisma.teamInvite.updateMany({
      where: {
        toUserId: user.id,
        status: InviteStatus.PENDING,
        id: { not: id },
      },
      data: {
        status: InviteStatus.CANCELLED,
        respondedAt: new Date(),
      },
    });

    // Create player
    const player = await prisma.player.create({
      data: {
        teamId: invite.teamId,
        userId: user.id,
        ign: user.ign,
        role: role as GameRole,
        secondaryRole: secondaryRole ? (secondaryRole as GameRole) : null,
        isSubstitute,
      },
    });

    // Update invite
    await prisma.teamInvite.update({
      where: { id },
      data: {
        status: InviteStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });

    // Notify captain
    await prisma.notification.create({
      data: {
        userId: invite.team.captainId!,
        type: "TEAM_INVITE_ACCEPTED",
        title: "Invite Accepted",
        message: `${user.ign} joined your team`,
        linkUrl: `/teams/${invite.teamId}`,
      },
    });

    return apiSuccess(
      {
        message: "Invite accepted successfully",
        player,
        isSubstitute,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to respond to invite";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Respond to invite error:", error);
    return apiError(message, 500);
  }
}



