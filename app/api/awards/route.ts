import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  requireAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";
import { GameRole, AdminRoleType } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - List awards
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("seasonId");
    const role = searchParams.get("role");

    const where: Prisma.BestRoleAwardWhereInput = {};
    if (seasonId) where.seasonId = seasonId;
    if (role && Object.values(GameRole).includes(role as GameRole)) {
      where.role = role as GameRole;
    }

    const awards = await prisma.bestRoleAward.findMany({
      where,
      include: {
        player: {
          select: {
            id: true,
            ign: true,
            role: true,
            photo: true,
            team: {
              select: {
                id: true,
                name: true,
                tag: true,
              },
            },
          },
        },
        season: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ seasonId: "desc" }, { role: "asc" }],
    });

    return apiSuccess(awards);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch awards";
    console.error("Get awards error:", error);
    return apiError(message, 500);
  }
}

// POST - Create award
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);
    const body = await request.json();
    const { role, awardTitle, playerId, seasonId, hero } = body;

    if (!role || !awardTitle || !playerId || !seasonId) {
      return apiError("Role, award title, player ID, and season ID are required");
    }

    if (!Object.values(GameRole).includes(role)) {
      return apiError("Invalid role");
    }

    // Check if award already exists for this role and season
    const existing = await prisma.bestRoleAward.findUnique({
      where: {
        role_seasonId: {
          role: role as GameRole,
          seasonId,
        },
      },
    });

    if (existing) {
      return apiError("Award already exists for this role and season");
    }

    // Verify player exists
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return apiError("Player not found", 404);
    }

    const award = await prisma.bestRoleAward.create({
      data: {
        role: role as GameRole,
        awardTitle,
        playerId,
        seasonId,
        hero: hero || null,
      },
      include: {
        player: {
          select: {
            id: true,
            ign: true,
            role: true,
          },
        },
        season: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Notify player
    if (player.userId) {
      await prisma.notification.create({
        data: {
          userId: player.userId,
          type: "AWARD_RECEIVED",
          title: "Award Received",
          message: `You received the ${awardTitle} award for ${seasonId}`,
          linkUrl: `/awards`,
        },
      });
    }

    // Create audit log
    await createAuditLog(
      admin.id,
      "CREATE_AWARD",
      "BestRoleAward",
      award.id,
      JSON.stringify({ role, playerId, seasonId })
    );

    return apiSuccess(
      {
        message: "Award created successfully",
        award,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create award";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Create award error:", error);
    return apiError(message, 500);
  }
}



