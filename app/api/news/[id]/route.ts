import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  requireAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";
import { NewsStatus, NewsCategory, AdminRoleType } from "@/app/generated/prisma/enums";

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
    
    if (!user || !user.role) {
      if (article.status !== NewsStatus.PUBLISHED) {
        return apiError("Article not found", 404);
      }
    }

    return apiSuccess(article);
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
    const admin = await requireAdmin(AdminRoleType.CONTENT_ADMIN);
    const { id } = await context.params;
    const body = await request.json();

    const article = await prisma.news.findUnique({
      where: { id },
    });

    if (!article || article.deletedAt) {
      return apiError("Article not found", 404);
    }

    const updateData: Prisma.NewsUpdateInput = {};
    
    if (body.category !== undefined) {
      if (!Object.values(NewsCategory).includes(body.category)) {
        return apiError("Invalid category");
      }
      updateData.category = body.category;
    }
    if (body.title !== undefined) updateData.title = body.title;
    if (body.subtitle !== undefined) updateData.subtitle = body.subtitle;
    if (body.body !== undefined) updateData.body = body.body;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.featured !== undefined) updateData.featured = body.featured;
    if (body.status !== undefined) {
      if (!Object.values(NewsStatus).includes(body.status)) {
        return apiError("Invalid status");
      }
      if (body.status === NewsStatus.PUBLISHED && !article.publishedAt) {
        updateData.publishedAt = new Date();
      }
      updateData.status = body.status;
    }

    if (Object.keys(updateData).length === 0) {
      return apiError("No fields to update");
    }

    const updated = await prisma.news.update({
      where: { id },
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
    const admin = await requireAdmin(AdminRoleType.CONTENT_ADMIN);
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

