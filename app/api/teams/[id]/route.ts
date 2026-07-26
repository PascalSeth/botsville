import { NextRequest } from "next/server";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
  isValidTeamTag,
  isValidHexColor,
  isValidRegion,
} from "@/lib/api-utils";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;


// GET - Get team by ID, Tag, Invite Link Code, or Invite ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const teamInclude = {
      captain: {
        select: {
          id: true,
          ign: true,
          photo: true,
        },
      },
      players: {
        where: { deletedAt: null },
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
          { isSubstitute: "asc" as const },
          { role: "asc" as const },
          { createdAt: "asc" as const },
        ],
      },
      _count: {
        select: {
          players: true,
          registrations: true,
          matchesAsA: true,
          matchesAsB: true,
        },
      },
    };

    // 1. Try finding team directly by UUID/ID
    let team = await prisma.team.findUnique({
      where: { id },
      include: teamInclude,
    });

    // 2. If not found, try finding team by Tag
    if (!team) {
      team = await prisma.team.findFirst({
        where: { tag: { equals: id, mode: "insensitive" }, deletedAt: null },
        include: teamInclude,
      });
    }

    // 3. If not found, try finding by Invite Link Code (TeamInviteLink)
    if (!team) {
      const inviteLink = await prisma.teamInviteLink.findUnique({
        where: { code: id.toUpperCase() },
        select: { teamId: true },
      });
      if (inviteLink?.teamId) {
        team = await prisma.team.findUnique({
          where: { id: inviteLink.teamId },
          include: teamInclude,
        });
      }
    }

    // 4. If not found, try finding by direct TeamInvite ID
    if (!team) {
      const directInvite = await prisma.teamInvite.findUnique({
        where: { id },
        select: { teamId: true },
      });
      if (directInvite?.teamId) {
        team = await prisma.team.findUnique({
          where: { id: directInvite.teamId },
          include: teamInclude,
        });
      }
    }

    if (!team || team.deletedAt) {
      return apiError("Team not found", 404);
    }

    return apiSuccess(team);
  } catch (error: unknown) {
    console.error("Get team error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch team";
    return apiError(message, 500);
  }
}

// PUT - Update team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await params;
    const body = await request.json();
    const { name, tag, region, color, logo, banner, isRecruiting, captainId } = body;

    // Get team and verify captain
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        players: {
          where: { deletedAt: null },
          select: { id: true, userId: true, ign: true },
        },
      },
    });

    if (!team || team.deletedAt) {
      return apiError("Team not found", 404);
    }

    if (team.captainId !== user.id && !user.role) {
      return apiError("Only the team captain can update the team", 403);
    }

    const updateData: Record<string, unknown> = {};
    const nameHistory: { oldName?: string; oldTag?: string } = {};

    if (name !== undefined && name !== team.name) {
      // Check if name is unique
      const nameExists = await prisma.team.findUnique({
        where: { name },
      });
      if (nameExists) {
        return apiError("Team name already taken");
      }
      nameHistory.oldName = team.name;
      updateData.name = name;
    }

    if (tag !== undefined) {
      const tagUpper = tag.toUpperCase();
      if (tagUpper !== team.tag) {
        // Check if tag is unique
        const tagExists = await prisma.team.findUnique({
          where: { tag: tagUpper },
        });
        if (tagExists) {
          return apiError("Team tag already taken");
        }
        if (!isValidTeamTag(tagUpper)) {
          return apiError("Team tag must be 3-5 uppercase alphanumeric characters");
        }
        nameHistory.oldTag = team.tag;
        updateData.tag = tagUpper;
      }
    }

    if (region !== undefined) {
      if (!isValidRegion(region)) {
        return apiError("Invalid region");
      }
      updateData.region = region;
    }

    if (color !== undefined) {
      if (color && !isValidHexColor(color)) {
        return apiError("Invalid color format");
      }
      updateData.color = color || null;
    }

    if (logo !== undefined) updateData.logo = logo || null;
    if (banner !== undefined) updateData.banner = banner || null;
    if (isRecruiting !== undefined) {
      if (typeof isRecruiting !== "boolean") {
        return apiError("isRecruiting must be a boolean");
      }
      updateData.isRecruiting = isRecruiting;
    }

    // Captain transfer - only current captain can transfer
    if (captainId !== undefined && captainId !== team.captainId) {
      // Only current captain can transfer captaincy (not admins)
      if (team.captainId !== user.id) {
        return apiError("Only the current captain can transfer captaincy", 403);
      }
      // Verify new captain is a player on this team with a linked user account
      const newCaptainPlayer = team.players.find((p) => p.userId === captainId);
      if (!newCaptainPlayer) {
        return apiError("New captain must be a player on this team with a linked account");
      }
      updateData.captainId = captainId;
    }

    if (Object.keys(updateData).length === 0) {
      return apiError("No fields to update");
    }

    // Save name/tag history if changed
    if (nameHistory.oldName || nameHistory.oldTag) {
      await prisma.teamNameHistory.create({
        data: {
          teamId: id,
          oldName: nameHistory.oldName || team.name,
          oldTag: nameHistory.oldTag || team.tag,
        },
      });
    }

    const updated = await prisma.team.update({
      where: { id },
      data: updateData,
      include: {
        captain: {
          select: {
            id: true,
            ign: true,
            photo: true,
          },
        },
      },
    });

    return apiSuccess({
      message: "Team updated successfully",
      team: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Update team error:", error);
    const message = error instanceof Error ? error.message : "Failed to update team";
    return apiError(message, 500);
  }
}



