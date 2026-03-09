import { NextRequest } from "next/server";
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
      ign,
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

    if (ign !== undefined) {
      const trimmed = String(ign).trim();
      if (!trimmed || !isValidIGN(trimmed)) {
        return apiError("Invalid IGN");
      }
      updateData.ign = trimmed;
    }

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

    // Handle isSubstitute toggle with validation
    if (isSubstitute !== undefined) {
      const wantsToBeStarter = !Boolean(isSubstitute);
      const currentlySubstitute = player.isSubstitute;
      
      // Promoting from sub to starter
      if (wantsToBeStarter && currentlySubstitute) {
        const currentStarters = player.team.players.filter(
          (p) => p.id !== playerId && !p.isSubstitute
        );
        
        // Check starter limit
        if (currentStarters.length >= 5) {
          return apiError(
            "Team already has 5 starters. Demote another player to substitute first."
          );
        }
        
        // Check role conflict - use the new role if provided, otherwise current role
        const targetRole = (role as string) ?? player.role;
        const roleConflict = currentStarters.find((p) => p.role === targetRole);
        if (roleConflict) {
          return apiError(
            `Cannot promote to starter: ${targetRole} role is already taken by ${roleConflict.ign}. Change role or demote that player first.`
          );
        }
      }
      
      updateData.isSubstitute = Boolean(isSubstitute);
    }

    // Handle transferring player to another team (preserve stats)
    if (transferToTeamId !== undefined) {
      // Only team captain or admin can transfer a player
      if (player.team.captainId !== user.id && !user.role) {
        return apiError("Only the team captain can transfer players", 403);
      }

      // Validate target team
      const targetTeam = await prisma.team.findUnique({
        where: { id: String(transferToTeamId) },
        include: { players: { where: { deletedAt: null } } },
      });

      if (!targetTeam || targetTeam.deletedAt) {
        return apiError("Target team not found", 404);
      }

      // Check target team size (max 9)
      if (targetTeam.players.length >= 9) {
        return apiError("Target team is full (maximum 9 players)");
      }

      // Prevent transferring into same team
      if (player.teamId === targetTeam.id) {
        return apiError("Player is already on that team");
      }

      // Ensure IGN uniqueness in target team
      const ignExists = targetTeam.players.find((p) => p.ign === player.ign && !p.deletedAt);
      if (ignExists) {
        return apiError("A player with the same IGN already exists on the target team");
      }

      // Perform transfer: update teamId while preserving stats
      const transferred = await prisma.player.update({
        where: { id: playerId },
        data: { teamId: targetTeam.id },
        include: {
          user: { select: { id: true, ign: true, photo: true } },
          team: { select: { id: true, name: true, tag: true } },
        },
      });

      // Notify both captains
      try {
        await prisma.notification.create({
          data: {
            userId: player.team.captainId!,
            type: "PLAYER_REMOVED",
            title: "Player Transferred",
            message: `${player.ign} was transferred to ${targetTeam.name}`,
            linkUrl: `/teams/${player.teamId}`,
          },
        });
      } catch (e) {
        // ignore notification errors
      }

      try {
        if (targetTeam.captainId) {
          await prisma.notification.create({
            data: {
              userId: targetTeam.captainId!,
              type: "PLAYER_JOINED",
              title: "Player Transferred In",
              message: `${player.ign} was transferred into your team`,
              linkUrl: `/teams/${targetTeam.id}`,
            },
          });
        }
      } catch (e) {
        // ignore
      }

      return apiSuccess({ message: "Player transferred successfully", player: transferred });
    }

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



