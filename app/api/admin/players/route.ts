import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const isPlaceholder = searchParams.get("isPlaceholder") === "true";
    const teamId = searchParams.get("teamId");

    const where: Prisma.PlayerWhereInput = { deletedAt: null };

    if (isPlaceholder) {
      where.userId = null;
    }

    if (teamId) {
      where.teamId = teamId;
    }

    if (search.trim()) {
      where.ign = { contains: search.trim(), mode: "insensitive" };
    }

    const players = await prisma.player.findMany({
      where,
      include: {
        team: {
          select: { name: true, tag: true },
        },
      },
      orderBy: { ign: "asc" },
      take: 20,
    });

    return apiSuccess(players);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch players";
    return apiError(message, 500);
  }
}
