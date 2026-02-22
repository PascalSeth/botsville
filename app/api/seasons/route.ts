import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  requireAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";
import { SeasonStatus } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - List all seasons
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Prisma.SeasonWhereInput = {};
    if (status && Object.values(SeasonStatus).includes(status as SeasonStatus)) {
      where.status = status as SeasonStatus;
    }

    const seasons = await prisma.season.findMany({
      where,
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: {
            tournaments: true,
            teamStandings: true,
          },
        },
      },
    });

    return apiSuccess(seasons);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch seasons";
    console.error("Get seasons error:", error);
    return apiError(message, 500);
  }
}

// POST - Create new season
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { name, startDate, endDate, status } = body;

    if (!name || !startDate || !endDate) {
      return apiError("Name, start date, and end date are required");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return apiError("Invalid date format");
    }

    if (end <= start) {
      return apiError("End date must be after start date");
    }

    // Check if name already exists
    const existing = await prisma.season.findUnique({
      where: { name },
    });

    if (existing) {
      return apiError("Season name already exists");
    }

    // If status is ACTIVE, ensure no other season is ACTIVE
    if (status === SeasonStatus.ACTIVE) {
      const activeSeason = await prisma.season.findFirst({
        where: { status: SeasonStatus.ACTIVE },
      });

      if (activeSeason) {
        return apiError("Another season is already active. Deactivate it first.");
      }
    }

    const season = await prisma.season.create({
      data: {
        name,
        startDate: start,
        endDate: end,
        status: (status || SeasonStatus.UPCOMING) as SeasonStatus,
      },
    });

    // Create audit log
    await createAuditLog(
      admin.id,
      "CREATE_SEASON",
      "Season",
      season.id,
      JSON.stringify({ name, startDate, endDate, status })
    );

    return apiSuccess(
      {
        message: "Season created successfully",
        season,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create season";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Create season error:", error);
    return apiError(message, 500);
  }
}



