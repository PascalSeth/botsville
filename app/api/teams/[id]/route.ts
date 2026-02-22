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

// GET - Get team by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
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
            { isSubstitute: "asc" },
            { role: "asc" },
            { createdAt: "asc" },
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
      },
    });

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
    const { name, tag, region, color, logo, banner } = body;

    // Get team and verify captain
    const team = await prisma.team.findUnique({
      where: { id },
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



