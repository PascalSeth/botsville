import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireActiveUser } from "@/lib/api-utils";
import { StreamPlatform } from "@/app/generated/prisma/enums";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get("active") !== "false";

    const streamer = await prisma.streamer.findFirst({
      where: { id, active: true },
      select: {
        id: true,
        name: true,
      },
    });

    if (!streamer) {
      return apiError("Streamer not found", 404);
    }

    const videos = await prisma.streamerVideo.findMany({
      where: {
        streamerId: id,
        ...(onlyActive ? { active: true } : {}),
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });

    return apiSuccess({ streamer, videos });
  } catch (error: unknown) {
    console.error("Streamer videos GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch videos", 500);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await requireActiveUser();
    const { id } = await params;

    const body = await request.json();
    const {
      platform,
      title,
      description,
      videoId,
      videoUrl,
      thumbnail,
      pinned,
      active,
    } = body;

    if (!platform || !title?.trim() || !videoId?.trim() || !videoUrl?.trim()) {
      return apiError("platform, title, videoId and videoUrl are required", 400);
    }

    if (!Object.values(StreamPlatform).includes(platform)) {
      return apiError("Invalid platform", 400);
    }

    const streamer = await prisma.streamer.findUnique({ where: { id } });
    if (!streamer) {
      return apiError("Streamer not found", 404);
    }

    const isOwner = streamer.userId === user.id;
    const isAdmin = user.role === "SUPER_ADMIN" || user.role === "CONTENT_ADMIN";

    if (!isOwner && !isAdmin) {
      return apiError("Forbidden: You can only upload videos to your own profile", 403);
    }

    const video = await prisma.streamerVideo.create({
      data: {
        streamerId: id,
        platform,
        title: title.trim(),
        description: description?.trim() || null,
        videoId: videoId.trim(),
        videoUrl: videoUrl.trim(),
        thumbnail: thumbnail || null,
        pinned: pinned ?? false,
        active: active ?? true,
      },
    });

    return apiSuccess({ message: "Video added", video }, 201);
  } catch (error: unknown) {
    console.error("Streamer videos POST error:", error);
    const message = error instanceof Error ? error.message : "Failed to add video";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    return apiError(message, 500);
  }
}
