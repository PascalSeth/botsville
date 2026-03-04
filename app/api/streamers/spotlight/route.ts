import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const streamers = await prisma.streamerSpotlight.findMany({
      where: {
        active: true,
        weekStart: { lte: now },
        weekEnd: { gte: now },
      },
      orderBy: { weekStart: "desc" },
      take: 3,
    });
    return apiSuccess({ streamers });
  } catch (error: unknown) {
    console.error("Streamer spotlight GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch streamers", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    if (!user.role) return apiError("Forbidden", 403);

    const body = await request.json();
    const { name, platform, handle, profileUrl, imageUrl, weekStart, weekEnd } = body;

    if (!name || !platform || !handle || !profileUrl || !weekStart || !weekEnd) {
      return apiError("Missing required fields");
    }

    const spotlight = await prisma.streamerSpotlight.create({
      data: {
        name,
        platform,
        handle,
        profileUrl,
        imageUrl: imageUrl || null,
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
        active: true,
      },
    });

    return apiSuccess({ message: "Streamer spotlight created", spotlight }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create streamer spotlight";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Streamer spotlight POST error:", error);
    return apiError(message, 500);
  }
}
