import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-utils";

import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!team) {
      return apiError("Team not found", 404);
    }

    const history = await prisma.teamNameHistory.findMany({
      where: { teamId: id },
      orderBy: { changedAt: "desc" },
    });

    return apiSuccess(history);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch name history";
    console.error("Get team name history error:", error);
    return apiError(message, 500);
  }
}



