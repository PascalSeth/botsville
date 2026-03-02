import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { rankBadge, stars, matchesPlayed } = body;

    const goal = await prisma.rankGoal.findFirst({ where: { id, userId: user.id } });
    if (!goal) return apiError("Rank goal not found", 404);
    if (!rankBadge) return apiError("rankBadge is required");

    const snapshot = await prisma.rankSnapshot.create({
      data: {
        rankGoalId: id,
        userId: user.id,
        rankBadge,
        stars: typeof stars === "number" ? stars : 0,
      },
    });

    const updatedGoal = await prisma.rankGoal.update({
      where: { id },
      data: {
        currentRank: rankBadge,
        matchesPlayed:
          typeof matchesPlayed === "number"
            ? matchesPlayed
            : goal.matchesPlayed + 1,
      },
    });

    return apiSuccess({ message: "Snapshot added", snapshot, goal: updatedGoal }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add snapshot";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Rank snapshots POST error:", error);
    return apiError(message, 500);
  }
}
