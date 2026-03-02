import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const goals = await prisma.rankGoal.findMany({
      where: { userId: user.id },
      include: { snapshots: { orderBy: { recordedAt: "asc" } } },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    });
    return apiSuccess({ goals });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch rank goals";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Rank goals GET error:", error);
    return apiError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const { currentRank, targetRank, matchesPlayed } = body;

    if (!currentRank || !targetRank) return apiError("currentRank and targetRank are required");

    await prisma.rankGoal.updateMany({ where: { userId: user.id, active: true }, data: { active: false } });

    const goal = await prisma.rankGoal.create({
      data: {
        userId: user.id,
        currentRank,
        targetRank,
        matchesPlayed: typeof matchesPlayed === "number" ? matchesPlayed : 0,
        active: true,
      },
    });

    return apiSuccess({ message: "Rank goal created", goal }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create rank goal";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Rank goals POST error:", error);
    return apiError(message, 500);
  }
}
