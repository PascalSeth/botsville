import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireActiveUser } from "@/lib/api-utils";
import { StreamPlatform } from "@/app/generated/prisma/enums";

interface Params {
  params: Promise<{ id: string; videoId: string }>;
}

async function ensureOwnerOrAdmin(streamerId: string, userId: string, role?: string | null) {
  const streamer = await prisma.streamer.findUnique({
    where: { id: streamerId },
    select: { id: true, userId: true },
  });

  if (!streamer) {
    return { ok: false as const, error: apiError("Streamer not found", 404) };
  }

  const isOwner = streamer.userId === userId;
  const isAdmin = role === "SUPER_ADMIN" || role === "CONTENT_ADMIN";

  if (!isOwner && !isAdmin) {
    return {
      ok: false as const,
      error: apiError("Forbidden: You can only manage videos on your own profile", 403),
    };
  }

  return { ok: true as const };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireActiveUser();
    const { id, videoId } = await params;

    const auth = await ensureOwnerOrAdmin(id, user.id, user.role);
    if (!auth.ok) return auth.error;

    const existing = await prisma.streamerVideo.findFirst({
      where: { id: videoId, streamerId: id },
      select: { id: true },
    });

    if (!existing) {
      return apiError("Video not found", 404);
    }

    const body = await request.json();
    const {
      platform,
      title,
      description,
      videoId: embedVideoId,
      videoUrl,
      thumbnail,
      pinned,
      active,
    } = body as {
      platform?: keyof typeof StreamPlatform;
      title?: string;
      description?: string;
      videoId?: string;
      videoUrl?: string;
      thumbnail?: string | null;
      pinned?: boolean;
      active?: boolean;
    };

    if (platform && !Object.values(StreamPlatform).includes(platform)) {
      return apiError("Invalid platform", 400);
    }

    const updated = await prisma.streamerVideo.update({
      where: { id: videoId },
      data: {
        ...(platform ? { platform } : {}),
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(embedVideoId !== undefined ? { videoId: embedVideoId.trim() } : {}),
        ...(videoUrl !== undefined ? { videoUrl: videoUrl.trim() } : {}),
        ...(thumbnail !== undefined ? { thumbnail: thumbnail || null } : {}),
        ...(pinned !== undefined ? { pinned } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });

    return apiSuccess({ message: "Video updated", video: updated });
  } catch (error: unknown) {
    console.error("Streamer video PATCH error:", error);
    const message = error instanceof Error ? error.message : "Failed to update video";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    return apiError(message, 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireActiveUser();
    const { id, videoId } = await params;

    const auth = await ensureOwnerOrAdmin(id, user.id, user.role);
    if (!auth.ok) return auth.error;

    const existing = await prisma.streamerVideo.findFirst({
      where: { id: videoId, streamerId: id },
      select: { id: true },
    });

    if (!existing) {
      return apiError("Video not found", 404);
    }

    await prisma.streamerVideo.delete({
      where: { id: videoId },
    });

    return apiSuccess({ message: "Video deleted" });
  } catch (error: unknown) {
    console.error("Streamer video DELETE error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete video";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    return apiError(message, 500);
  }
}
