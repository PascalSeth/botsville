import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { InviteStatus } from "@/app/generated/prisma/enums";
import { findUserByEmailOrIgn } from "@/lib/auth";

import { prisma } from "@/lib/prisma";

// GET - List team invites (sent)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Verify team and captain
    const team = await prisma.team.findUnique({
      where: { id },
      select: { id: true, captainId: true },
    });

    if (!team || team.captainId !== user.id) {
      return apiError("Only team captain can view invites", 403);
    }

    const where: Prisma.TeamInviteWhereInput = { teamId: id };
    if (status && Object.values(InviteStatus).includes(status as InviteStatus)) {
      where.status = status as InviteStatus;
    }

    const invites = await prisma.teamInvite.findMany({
      where,
      include: {
        toUser: {
          select: {
            id: true,
            ign: true,
            photo: true,
          },
        },
      },
      orderBy: { sentAt: "desc" },
    });

    return apiSuccess(invites);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch invites";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Get team invites error:", error);
    return apiError(message, 500);
  }
}

// POST - Send team invite by IGN
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { toIGN, message } = body;

    if (!toIGN) {
      return apiError("Target IGN is required");
    }

    // Get team and verify captain
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        players: {
          where: { deletedAt: null },
        },
      },
    });

    if (!team || team.deletedAt) {
      return apiError("Team not found", 404);
    }

    if (team.captainId !== user.id) {
      return apiError("Only team captain can send invites", 403);
    }

    // Check team size
    if (team.players.length >= 7) {
      return apiError("Team is full");
    }

    // Find target user by IGN
    const targetUser = await findUserByEmailOrIgn(toIGN);
    if (!targetUser) {
      return apiError("Player not found");
    }

    // Check if user is already on a team
    const existingPlayer = await prisma.player.findFirst({
      where: {
        userId: targetUser.id,
        deletedAt: null,
      },
    });

    if (existingPlayer) {
      return apiError("Player is already on a team");
    }

    // Check for duplicate pending invite
    const duplicateInvite = await prisma.teamInvite.findFirst({
      where: {
        teamId: id,
        toIGN,
        status: InviteStatus.PENDING,
      },
    });

    if (duplicateInvite) {
      return apiError("Invite already sent to this player");
    }

    // Check if player has 3+ pending invites
    const pendingCount = await prisma.teamInvite.count({
      where: {
        toIGN,
        status: InviteStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingCount >= 3) {
      return apiError("Player has too many pending invites. Please wait for them to respond.");
    }

    // Create invite
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours

    const invite = await prisma.teamInvite.create({
      data: {
        teamId: id,
        fromUserId: user.id,
        toIGN,
        toUserId: targetUser.id,
        message: message || null,
        expiresAt,
        status: InviteStatus.PENDING,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            tag: true,
            logo: true,
          },
        },
        toUser: {
          select: {
            id: true,
            ign: true,
            photo: true,
          },
        },
      },
    });

    // Create notification for target user
    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        type: "TEAM_INVITE_RECEIVED",
        title: `Team Invite from ${team.name}`,
        message: message || `${team.name} (${team.tag}) has invited you to join their team`,
        linkUrl: `/teams/${id}`,
      },
    });

    return apiSuccess(
      {
        message: "Invite sent successfully",
        invite,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send invite";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Send invite error:", error);
    return apiError(message, 500);
  }
}



