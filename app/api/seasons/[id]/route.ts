import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  requireAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";
import { SeasonStatus, AdminRoleType } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - Get season by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const season = await prisma.season.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tournaments: true,
            teamStandings: true,
            playerMvpRankings: true,
          },
        },
      },
    });

    if (!season) {
      return apiError("Season not found", 404);
    }

    return apiSuccess(season);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch season";
    console.error("Get season error:", error);
    return apiError(message, 500);
  }
}

// PUT - Update season
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);
    const { id } = await context.params;
    const body = await request.json();
    const { name, startDate, endDate, status } = body;

    const season = await prisma.season.findUnique({
      where: { id },
    });

    if (!season) {
      return apiError("Season not found", 404);
    }

    const updateData: Prisma.SeasonUpdateInput = {};
    if (name !== undefined) {
      // Check if name is unique (excluding current season)
      const existing = await prisma.season.findUnique({
        where: { name },
      });
      if (existing && existing.id !== id) {
        return apiError("Season name already exists");
      }
      updateData.name = name;
    }
    if (startDate !== undefined) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return apiError("Invalid start date format");
      }
      updateData.startDate = start;
    }
    if (endDate !== undefined) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return apiError("Invalid end date format");
      }
      updateData.endDate = end;
    }
    if (status !== undefined) {
      if (!Object.values(SeasonStatus).includes(status)) {
        return apiError("Invalid status");
      }

      // Activating a season must go through the /activate endpoint
      // so that competitive data resets run correctly.
      if (status === SeasonStatus.ACTIVE) {
        return apiError(
          "Use POST /api/seasons/{id}/activate to start a new season. This ensures standings, player stats, and scrim data are properly reset."
        );
      }

      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return apiError("No fields to update");
    }

    const updated = await prisma.season.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await createAuditLog(
      admin.id,
      "UPDATE_SEASON",
      "Season",
      id,
      JSON.stringify(updateData)
    );

    return apiSuccess({
      message: "Season updated successfully",
      season: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update season";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Update season error:", error);
    return apiError(message, 500);
  }
}



