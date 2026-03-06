import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { getCurrentUser, requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { CommunityPostType } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { broadcastToChannel } from "@/lib/socket-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "30");
    const skip = parseInt(searchParams.get("skip") || "0");

    const where: Prisma.CommunityPostWhereInput = { deletedAt: null };
    if (type && Object.values(CommunityPostType).includes(type as CommunityPostType)) {
      where.type = type as CommunityPostType;
    }

    const user = await getCurrentUser();

    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        where,
        include: {
          author: { select: { id: true, ign: true, photo: true } },
          _count: { select: { comments: true, reactions: true } },
        },
        orderBy: [{ reactionScore: "desc" }, { createdAt: "desc" }],
        take: limit,
        skip,
      }),
      prisma.communityPost.count({ where }),
    ]);

    let reactionMap: Record<string, string | null> = {};
    if (user?.id && posts.length) {
      const reactions = await prisma.communityReaction.findMany({
        where: { userId: user.id, postId: { in: posts.map((p) => p.id) } },
        select: { postId: true, type: true },
      });
      reactionMap = reactions.reduce<Record<string, string | null>>((acc, r) => {
        acc[r.postId] = r.type;
        return acc;
      }, {});
    }

    const hydratedPosts = posts.map((p) => ({ ...p, userReactionType: reactionMap[p.id] ?? null }));
    return apiSuccess({ posts: hydratedPosts, pagination: { total, limit, skip } });
  } catch (error: unknown) {
    console.error("Community posts GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch posts", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const { type, title, content, mediaUrl, heroSlug, tags } = body;

    if (!type || !Object.values(CommunityPostType).includes(type)) {
      return apiError("Invalid post type");
    }
    if (!content || typeof content !== "string") {
      return apiError("Content is required");
    }

    const post = await prisma.communityPost.create({
      data: {
        authorId: user.id,
        type,
        title: title || null,
        content,
        mediaUrl: mediaUrl || null,
        heroSlug: heroSlug || null,
        tags: Array.isArray(tags) ? tags : [],
      },
      include: {
        author: { select: { id: true, ign: true, photo: true } },
        _count: { select: { comments: true, reactions: true } },
      },
    });

    // Broadcast to all connected clients so feeds update in real time
    try {
      void broadcastToChannel('community', 'new-post', post);
    } catch { /* ignore — broadcast not available */ }

    return apiSuccess({ message: "Post created", post }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create post";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Community posts POST error:", error);
    return apiError(message, 500);
  }
}
