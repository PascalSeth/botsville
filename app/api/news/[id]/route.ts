import { NextRequest } from "next/server";
import {
  requireAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";
import { NewsStatus, AdminRoleType } from "@/app/generated/prisma/enums";
import { canManageNews } from '@/lib/news-content';
import { NewsValidationError, validateNewsWrite } from '@/lib/news-validation';

import { prisma } from "@/lib/prisma";

// GET - Get article
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const article = await prisma.news.findUnique({
      where: { id },
      include: {
        reactions: {
          select: {
            emoji: true,
            userId: true,
          },
        },
        _count: {
          select: {
            reactions: true,
          },
        },
      },
    });

    if (!article || article.deletedAt) {
      return apiError("Article not found", 404);
    }

    // Check if user can view (published or admin)
    let user = null;
    try {
      const { requireActiveUser } = await import("@/lib/api-utils");
      user = await requireActiveUser();
    } catch {
      // Not authenticated - public access
    }
    
    if (!canManageNews(user?.role)) {
      if (article.status !== NewsStatus.PUBLISHED) {
        return apiError("Article not found", 404);
      }
    }

    const cacheHeaders = !canManageNews(user?.role) ? {
      "Cache-Control": "public, s-maxage=1, stale-while-revalidate=59"
    } : { 'Cache-Control': 'private, no-store' };

    return apiSuccess(article, 200, cacheHeaders);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch article";
    console.error("Get article error:", error);
    return apiError(message, 500);
  }
}

// PUT - Update article
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin([AdminRoleType.CONTENT_ADMIN, AdminRoleType.EDITOR, AdminRoleType.INTERVIEWER]);
    const { id } = await context.params;
    const payload = await request.json();

    const article = await prisma.news.findUnique({
      where: { id },
    });

    if (!article || article.deletedAt) {
      return apiError("Article not found", 404);
    }

    const { post, changes } = validateNewsWrite(payload, article);

    // Interviewers cannot turn an interview into another topic or format.
    if (admin.role === AdminRoleType.INTERVIEWER) {
      if (article.category !== 'INTERVIEW') {
        return apiError("Interviewers can only edit INTERVIEW category posts", 403);
      }
      if (post.category !== 'INTERVIEW' || post.format !== 'ARTICLE') {
        return apiError("Interviewers can only publish INTERVIEW category posts", 403);
      }
    }

    const updateData = {
      ...changes,
      ...(post.status === NewsStatus.PUBLISHED && !article.publishedAt ? { publishedAt: new Date() } : {}),
    };

    const updated = await prisma.news.update({
      where: { id, updatedAt: article.updatedAt, deletedAt: null },
      data: updateData,
    });

    // Create audit log
    await createAuditLog(
      admin.id,
      "UPDATE_NEWS",
      "News",
      id,
      JSON.stringify(updateData)
    );

    return apiSuccess({
      message: "Article updated successfully",
      article: updated,
    });
  } catch (error: unknown) {
    if (error instanceof NewsValidationError || error instanceof SyntaxError) return apiError(error.message, 400);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') return apiError('This post changed while you were editing. Reload it and try again.', 409);
    const message = error instanceof Error ? error.message : "Failed to update article";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Update article error:", error);
    return apiError(message, 500);
  }
}

// DELETE - Delete article
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin([AdminRoleType.CONTENT_ADMIN, AdminRoleType.EDITOR]);
    const { id } = await context.params;

    await prisma.news.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Create audit log
    await createAuditLog(
      admin.id,
      "DELETE_NEWS",
      "News",
      id,
      undefined
    );

    return apiSuccess({ message: "Article deleted successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete article";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Delete article error:", error);
    return apiError(message, 500);
  }
}

