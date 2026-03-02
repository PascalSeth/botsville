import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const comments = await prisma.communityComment.findMany({
      where: { postId: id, deletedAt: null, parentId: null },
      include: {
        user: { select: { id: true, ign: true, photo: true } },
        replies: {
          where: { deletedAt: null },
          include: { user: { select: { id: true, ign: true, photo: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess({ comments });
  } catch (error: unknown) {
    console.error("Community comments GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch comments", 500);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { content, parentId } = body;

    if (!content || typeof content !== "string") {
      return apiError("Comment content is required");
    }

    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post || post.deletedAt) return apiError("Post not found", 404);

    if (parentId) {
      const parent = await prisma.communityComment.findFirst({ where: { id: parentId, postId: id, deletedAt: null } });
      if (!parent) return apiError("Parent comment not found", 404);
    }

    const comment = await prisma.communityComment.create({
      data: { postId: id, userId: user.id, content, parentId: parentId || null },
      include: { user: { select: { id: true, ign: true, photo: true } } },
    });

    return apiSuccess({ message: "Comment created", comment }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to comment";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Community comments POST error:", error);
    return apiError(message, 500);
  }
}
