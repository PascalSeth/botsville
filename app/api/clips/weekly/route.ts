import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireActiveUser } from "@/lib/api-utils";
import { CommunityPostType } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

function getWeekBounds(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay();
  const diffToMonday = (day + 6) % 7;
  const weekStart = new Date(current);
  weekStart.setDate(current.getDate() - diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
}

export async function GET(_request: NextRequest) {
  try {
    const { weekStart, weekEnd } = getWeekBounds();
    const featured = await prisma.clipOfWeek.findFirst({
      where: { weekStart: { lte: weekStart }, weekEnd: { gte: weekEnd } },
      include: {
        post: { include: { author: { select: { id: true, ign: true, photo: true } } } },
        winner: { select: { id: true, ign: true, photo: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (featured) return apiSuccess({ featured });

    const topClip = await prisma.communityPost.findFirst({
      where: {
        type: CommunityPostType.CLIP,
        deletedAt: null,
        createdAt: { gte: weekStart, lte: weekEnd },
      },
      include: { author: { select: { id: true, ign: true, photo: true } } },
      orderBy: [{ reactionScore: "desc" }, { upvoteCount: "desc" }, { createdAt: "desc" }],
    });

    return apiSuccess({ featured: topClip ? { post: topClip } : null });
  } catch (error: unknown) {
    console.error("Clip weekly GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch clip of week", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    if (!user.role) return apiError("Forbidden", 403);

    const body = await request.json();
    const { postId, bannerText } = body;
    if (!postId) return apiError("postId is required");

    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post || post.type !== CommunityPostType.CLIP || post.deletedAt) return apiError("Clip post not found", 404);

    const { weekStart, weekEnd } = getWeekBounds();
    const winner = await prisma.user.findUnique({ where: { id: post.authorId } });
    if (!winner) return apiError("Winner not found", 404);

    const clipOfWeek = await prisma.clipOfWeek.upsert({
      where: { postId },
      update: { weekStart, weekEnd, bannerText: bannerText || null },
      create: {
        postId,
        winnerId: winner.id,
        weekStart,
        weekEnd,
        bannerText: bannerText || null,
      },
    });

    await prisma.communityPost.update({ where: { id: postId }, data: { isClipOfWeek: true } });

    return apiSuccess({ message: "Clip of the week set", clipOfWeek });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to set clip of the week";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Clip weekly POST error:", error);
    return apiError(message, 500);
  }
}
