import { NextRequest } from "next/server";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
  isValidIGN,
  notifyTeamMemberJoined,
} from "@/lib/api-utils";
import { GameRole } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - Get team players
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const team = await prisma.team.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!team) {
      return apiError("Team not found", 404);
    }

    const players = await prisma.player.findMany({
      where: {
        teamId: id,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            ign: true,
            photo: true,
          },
        },
      },
      orderBy: [
        { isSubstitute: "asc" },
        { role: "asc" },
        { createdAt: "asc" },
      ],
    });

    return apiSuccess(players);
  } catch (error: unknown) {
    console.error("Get team players error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch players";
    return apiError(message, 500);
  }
}

// POST - Add player to team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await params;
    const body = await request.json();
    const {
      ign,
      userId,
      role,
      secondaryRole,
      signatureHero,
      photo,
      realName,
      isSubstitute,
    } = body;

    // Validation
    if (!ign || !role) {
      return apiError("IGN and role are required");
    }

    if (!isValidIGN(ign)) {
      return apiError("Invalid IGN format");
    }

    if (!Object.values(GameRole).includes(role)) {
      return apiError("Invalid role");
    }

    if (secondaryRole && !Object.values(GameRole).includes(secondaryRole)) {
      return apiError("Invalid secondary role");
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

    if (team.captainId !== user.id && !user.role) {
      return apiError("Only the team captain can add players", 403);
    }

    // Check team size (max 9 players — 5 starters + up to 4 substitutes)
    if (team.players.length >= 9) {
      return apiError("Team is full (maximum 9 players)");
    }

    // Check if the user already has a player record by userId or case-insensitive IGN (active or soft-deleted)
    let existingPlayerRecord = userId ? await prisma.player.findFirst({
      where: { userId },
    }) : null;

    if (!existingPlayerRecord) {
      existingPlayerRecord = await prisma.player.findFirst({
        where: { ign: { equals: ign, mode: "insensitive" } },
      });
    }

    if (existingPlayerRecord) {
      if (!existingPlayerRecord.deletedAt) {
        if (existingPlayerRecord.teamId === id) {
          return apiError("Player is already on your team");
        } else {
          return apiError("IGN or User is already an active member of another team");
        }
      }
    }

    // Check if role slot is already filled by a starter
    if (!isSubstitute) {
      const roleTaken = team.players.find(
        (p) => p.role === role && !p.isSubstitute
      );
      if (roleTaken) {
        return apiError(
          `Role ${role} is already filled by a starter. Add as substitute or reassign roles.`
        );
      }
    }

    // Create or restore player
    let player;
    if (existingPlayerRecord) {
      // Restore and update existing player record (preserves stats)
      player = await prisma.player.update({
        where: { id: existingPlayerRecord.id },
        data: {
          teamId: id,
          ign,
          role: role as GameRole,
          secondaryRole: secondaryRole ? (secondaryRole as GameRole) : null,
          signatureHero: signatureHero || null,
          photo: photo || null,
          realName: realName || null,
          isSubstitute: Boolean(isSubstitute),
          deletedAt: null, // restore
        },
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
    } else {
      // Create new player record
      player = await prisma.player.create({
        data: {
          teamId: id,
          userId: userId || null,
          ign,
          role: role as GameRole,
          secondaryRole: secondaryRole ? (secondaryRole as GameRole) : null,
          signatureHero: signatureHero || null,
          photo: photo || null,
          realName: realName || null,
          isSubstitute: Boolean(isSubstitute),
        },
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
    }

    // Fire-and-forget: notify captain + existing members
    void notifyTeamMemberJoined({
      teamId: id,
      joinerIgn: player.ign,
      joinerUserId: player.userId,
      role: player.role,
    });

    return apiSuccess(
      {
        message: "Player added successfully",
        player,
      },
      201
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Add player error:", error);
    const message = error instanceof Error ? error.message : "Failed to add player";
    return apiError(message, 500);
  }
}



