import { NextRequest } from "next/server";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
  formatHumanError,
} from "@/lib/api-utils";

import { GameRole } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { code } = await context.params;
    const body = await request.json();
    const { role, secondaryRole } = body;

    if (!role) {
      return apiError("Role is required");
    }

    if (!Object.values(GameRole).includes(role)) {
      return apiError("Invalid role");
    }

    // Find invite link
    // Find invite link and user's current player record in parallel
    const [link, playerRecord] = await Promise.all([
      prisma.teamInviteLink.findUnique({
        where: { code },
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
          usages: true,
        },
      }),
      prisma.player.findFirst({
        where: { userId: user.id },
      })
    ]);

    if (!link) {
      return apiError("Invalid invite code", 404);
    }

    if (!link.active) {
      return apiError("Invite link has been deactivated");
    }

    if (link.expiresAt < new Date()) {
      return apiError("Invite link has expired");
    }

    if (link.usedCount >= link.maxUses) {
      return apiError("Invite link has reached maximum uses");
    }

    // Check if user already used this link
    const alreadyUsed = link.usages.some((u) => u.userId === user.id);
    if (alreadyUsed) {
      return apiError("You have already used this invite link");
    }

    if (playerRecord && !playerRecord.deletedAt) {
      return apiError("You are already on a team");
    }

    // Check team size (max 20 players — 5 starters + up to 15 substitutes)
    if (link.team.players.length >= 20) {
      return apiError("Team is full (maximum 20 players)");
    }

    // Check if role is already taken by a starter
    const roleTaken = link.team.players.find(
      (p) => p.role === role && !p.isSubstitute
    );

    let isSubstitute = false;
    if (roleTaken) {
      isSubstitute = true;
    }

    // Create or restore player
    let player;
    if (playerRecord) {
      // Restore and update existing player record (preserves stats)
      player = await prisma.player.update({
        where: { id: playerRecord.id },
        data: {
          teamId: link.teamId,
          ign: user.ign,
          role: role as GameRole,
          secondaryRole: secondaryRole ? (secondaryRole as GameRole) : null,
          isSubstitute,
          deletedAt: null, // restore
        },
      });
    } else {
      // Create new player record
      player = await prisma.player.create({
        data: {
          teamId: link.teamId,
          userId: user.id,
          ign: user.ign,
          role: role as GameRole,
          secondaryRole: secondaryRole ? (secondaryRole as GameRole) : null,
          isSubstitute,
        },
      });
    }

    // Log usage
    await prisma.inviteLinkUsage.create({
      data: {
        linkId: link.id,
        userId: user.id,
      },
    });

    // Update link usage count
    await prisma.teamInviteLink.update({
      where: { id: link.id },
      data: {
        usedCount: { increment: 1 },
      },
    });

    // Notify captain
    await prisma.notification.create({
      data: {
        userId: link.team.captainId!,
        type: "INVITE_LINK_USED",
        title: "Player Joined via Invite Link",
        message: `${user.ign} joined your team using invite link`,
        linkUrl: `/teams/${link.teamId}`,
      },
    });

    return apiSuccess(
      {
        message: "Successfully joined team",
        player,
        isSubstitute,
      },
      201
    );
  } catch (error: unknown) {
    const formatted = formatHumanError(error);
    console.error("Join via invite link error:", error);
    return apiError(formatted, 500);
  }
}




