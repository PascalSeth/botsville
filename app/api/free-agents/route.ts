import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { MainRole } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - Browse free agents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mainRole = searchParams.get("mainRole");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const region = searchParams.get("region");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    const where: Prisma.UserWhereInput = {
      openToOffers: true,
      deletedAt: null,
      status: "ACTIVE",
      // Not currently on a team
      player: null,
    };

    if (mainRole && Object.values(MainRole).includes(mainRole as MainRole)) {
      where.mainRole = mainRole as MainRole;
    }

    // Note: Region filtering would require joining with team or player data
    // For now, we'll filter by user region preference if available

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          ign: true,
          mainRole: true,
          photo: true,
          openToOffers: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.user.count({ where }),
    ]);

    return apiSuccess({
      freeAgents: users,
      pagination: {
        total,
        limit,
        skip,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch free agents";
    console.error("Get free agents error:", error);
    return apiError(message, 500);
  }
}

// PUT - Toggle free agent status
export async function PUT(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const { openToOffers } = body;

    if (typeof openToOffers !== "boolean") {
      return apiError("openToOffers must be a boolean");
    }

    // Check if user is already on a team
    const player = await prisma.player.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
      },
    });

    if (player && openToOffers) {
      return apiError("Cannot mark as free agent while on a team");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { openToOffers },
      select: {
        id: true,
        ign: true,
        openToOffers: true,
      },
    });

    return apiSuccess({
      message: `Free agent status ${openToOffers ? "enabled" : "disabled"}`,
      user: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update free agent status";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Toggle free agent error:", error);
    return apiError(message, 500);
  }
}



