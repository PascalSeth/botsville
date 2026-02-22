import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  requireAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
  isValidHexColor,
} from "@/lib/api-utils";
import { TournamentStatus } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - Get tournament details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        season: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        pointsFormulas: {
          orderBy: { placement: "asc" },
        },
        registrations: {
          where: {
            status: "APPROVED",
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
          },
          orderBy: { seed: "asc" },
        },
        _count: {
          select: {
            registrations: true,
            matches: true,
            waitlist: true,
          },
        },
      },
    });

    if (!tournament || tournament.deletedAt) {
      return apiError("Tournament not found", 404);
    }

    return apiSuccess(tournament);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch tournament";
    console.error("Get tournament error:", error);
    return apiError(message, 500);
  }
}

// PUT - Update tournament
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = await request.json();

    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament || tournament.deletedAt) {
      return apiError("Tournament not found", 404);
    }

    const updateData: Prisma.TournamentUpdateInput = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.subtitle !== undefined) updateData.subtitle = body.subtitle;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.isOnline !== undefined) updateData.isOnline = body.isOnline;
    if (body.date !== undefined) {
      const date = new Date(body.date);
      if (isNaN(date.getTime())) {
        return apiError("Invalid date format");
      }
      updateData.date = date;
    }
    if (body.registrationDeadline !== undefined) {
      const date = new Date(body.registrationDeadline);
      if (isNaN(date.getTime())) {
        return apiError("Invalid registrationDeadline format");
      }
      updateData.registrationDeadline = date;
    }
    if (body.slots !== undefined) updateData.slots = body.slots;
    if (body.status !== undefined) {
      if (!Object.values(TournamentStatus).includes(body.status)) {
        return apiError("Invalid status");
      }
      updateData.status = body.status;
    }
    if (body.color !== undefined) {
      if (body.color && !isValidHexColor(body.color)) {
        return apiError("Invalid color format");
      }
      updateData.color = body.color;
    }
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.heroImage !== undefined) updateData.heroImage = body.heroImage;
    if (body.banner !== undefined) updateData.banner = body.banner;
    if (body.rules !== undefined) updateData.rules = body.rules;
    if (body.prizePool !== undefined) updateData.prizePool = body.prizePool;

    if (Object.keys(updateData).length === 0) {
      return apiError("No fields to update");
    }

    const updated = await prisma.tournament.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await createAuditLog(
      admin.id,
      "UPDATE_TOURNAMENT",
      "Tournament",
      id,
      JSON.stringify(updateData)
    );

    return apiSuccess({
      message: "Tournament updated successfully",
      tournament: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update tournament";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Update tournament error:", error);
    return apiError(message, 500);
  }
}



