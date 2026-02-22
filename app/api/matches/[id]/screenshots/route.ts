import { NextRequest } from "next/server";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { AdminRoleType } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - Get match screenshots
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const screenshots = await prisma.matchScreenshot.findMany({
      where: { matchId: id },
      orderBy: [{ gameNumber: "asc" }, { uploadedAt: "asc" }],
    });

    return apiSuccess(screenshots);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch screenshots";
    console.error("Get screenshots error:", error);
    return apiError(message, 500);
  }
}

// POST - Upload screenshot
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { gameNumber, imageUrl } = body;

    if (!gameNumber || !imageUrl) {
      return apiError("Game number and image URL are required");
    }

    const match = await prisma.match.findUnique({
      where: { id },
    });

    if (!match) {
      return apiError("Match not found", 404);
    }

    // Only referees and tournament admins can upload screenshots
    const isReferee = user.role === AdminRoleType.REFEREE || user.role === AdminRoleType.TOURNAMENT_ADMIN || user.role === AdminRoleType.SUPER_ADMIN;

    if (!isReferee) {
      return apiError("Only referees can upload screenshots", 403);
    }

    const screenshot = await prisma.matchScreenshot.create({
      data: {
        matchId: id,
        gameNumber: parseInt(gameNumber),
        imageUrl,
        uploadedBy: user.id,
      },
    });

    return apiSuccess(
      {
        message: "Screenshot uploaded successfully",
        screenshot,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to upload screenshot";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Upload screenshot error:", error);
    return apiError(message, 500);
  }
}



