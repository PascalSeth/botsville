import { NextRequest } from "next/server";
import { PrismaClient } from "@/app/generated/prisma/client";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
  isValidIGN,
} from "@/lib/api-utils";
import { GameRole } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// PUT - Update player
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id, playerId } = await params;
    const body = await request.json();
    const {
      role,
      secondaryRole,
      signatureHero,
      photo,
      realName,
      isSubstitute,
    } = body;

    // Get player and team
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        team: {
          include: {
            players: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!player || player.deletedAt || player.teamId !== id) {
      return apiError("Player not found", 404);
    }

    // Verify captain or admin
    if (player.team.captainId !== user.id && !user.role) {
      // Allow players to update their own basic info
      if (player.userId !== user.id) {
        return apiError("Only the team captain can update players", 403);
      }
    }

    const updateData: Record<string, unknown> = {};

    if (role !== undefined) {
      if (!Object.values(GameRole).includes(role)) {
        return apiError("Invalid role");
      }
      // Check if role is already taken by another starter
      if (!isSubstitute && role !== player.role) {
        const roleTaken = player.team.players.find(
          (p) => p.id !== playerId && p.role === role && !p.isSubstitute
        );
        if (roleTaken) {
          return apiError(
            `Role ${role} is already filled by another starter`
          );
        }
      }
      updateData.role = role;
    }

    if (secondaryRole !== undefined) {
      updateData.secondaryRole = secondaryRole
        ? (secondaryRole as GameRole)
        : null;
    }

    if (signatureHero !== undefined) updateData.signatureHero = signatureHero || null;
    if (photo !== undefined) updateData.photo = photo || null;
    if (realName !== undefined) updateData.realName = realName || null;
    if (isSubstitute !== undefined) updateData.isSubstitute = Boolean(isSubstitute);

    if (Object.keys(updateData).length === 0) {
      return apiError("No fields to update");
    }

    const updated = await prisma.player.update({
      where: { id: playerId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            ign: true,
            photo: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            tag: true,
          },
        },
      },
    });

    return apiSuccess({
      message: "Player updated successfully",
      player: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Update player error:", error);
    const message = error instanceof Error ? error.message : "Failed to update player";
    return apiError(message, 500);
  }
}

// DELETE - Remove player from team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id, playerId } = await params;

    // Get player and team
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        team: {
          include: {
            players: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!player || player.deletedAt || player.teamId !== id) {
      return apiError("Player not found", 404);
    }

    // Verify captain or admin
    if (player.team.captainId !== user.id && !user.role) {
      // Allow players to leave themselves
      if (player.userId !== user.id) {
        return apiError("Only the team captain can remove players", 403);
      }
    }

    // Soft delete player
    await prisma.player.update({
      where: { id: playerId },
      data: { deletedAt: new Date() },
    });

    // If captain is leaving, transfer captaincy
    if (player.team.captainId === player.userId) {
      const remainingStarters = player.team.players.filter(
        (p) => p.id !== playerId && !p.isSubstitute && !p.deletedAt
      );

      if (remainingStarters.length > 0) {
        // Transfer to longest-serving starter
        const newCaptain = remainingStarters.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        )[0];

        await prisma.team.update({
          where: { id },
          data: { captainId: newCaptain.userId },
        });
      } else {
        // No starters left, archive team
        await prisma.team.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      }
    }

    return apiSuccess({
      message: "Player removed successfully",
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Remove player error:", error);
    const message = error instanceof Error ? error.message : "Failed to remove player";
    return apiError(message, 500);
  }
}



