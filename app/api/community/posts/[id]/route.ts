import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const post = await prisma.communityPost.findFirst({
      where: { id, deletedAt: null },
      include: {
        author: { select: { id: true, ign: true, photo: true } },
        comments: {
          where: { deletedAt: null, parentId: null },
          include: {
            user: { select: { id: true, ign: true, photo: true } },
            replies: {
              where: { deletedAt: null },
              include: { user: { select: { id: true, ign: true, photo: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!post) return apiError("Post not found", 404);
    return apiSuccess(post);
  } catch (error: unknown) {
    console.error("Community post GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch post", 500);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { title, content } = body;

    const existing = await prisma.communityPost.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) return apiError("Post not found", 404);
    if (existing.authorId !== user.id) return apiError("Forbidden", 403);

    const post = await prisma.communityPost.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        content: content ?? existing.content,
      },
    });

    return apiSuccess({ message: "Post updated", post });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update post";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Community post PATCH error:", error);
    return apiError(message, 500);
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;

    const existing = await prisma.communityPost.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) return apiError("Post not found", 404);
    if (existing.authorId !== user.id) return apiError("Forbidden", 403);

    await prisma.communityPost.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return apiSuccess({ message: "Post deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete post";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Community post DELETE error:", error);
    return apiError(message, 500);
  }
}
