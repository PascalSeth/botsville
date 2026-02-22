import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || user.id;

    // Users can only view their own history unless they're admin
    if (userId !== user.id && !user.role) {
      return apiError("Forbidden", 403);
    }

    const history = await prisma.ignHistory.findMany({
      where: { userId },
      orderBy: { changedAt: "desc" },
      select: {
        id: true,
        oldIgn: true,
        changedAt: true,
      },
    });

    return apiSuccess(history);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch IGN history";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Get IGN history error:", error);
    return apiError(message, 500);
  }
}



