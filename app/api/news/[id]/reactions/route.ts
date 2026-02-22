import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";

import { prisma } from "@/lib/prisma";

// POST - Add reaction
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { emoji } = body;

    const validEmojis = ["👍", "🔥", "💀"];
    if (!emoji || !validEmojis.includes(emoji)) {
      return apiError("Invalid emoji. Must be 👍, 🔥, or 💀");
    }

    const article = await prisma.news.findUnique({
      where: { id },
    });

    if (!article || article.deletedAt || article.status !== "PUBLISHED") {
      return apiError("Article not found", 404);
    }

    // Check if user already reacted
    const existing = await prisma.newsReaction.findUnique({
      where: {
        newsId_userId: {
          newsId: id,
          userId: user.id,
        },
      },
    });

    if (existing) {
      // Update reaction
      const reaction = await prisma.newsReaction.update({
        where: { id: existing.id },
        data: { emoji },
      });

      return apiSuccess({
        message: "Reaction updated",
        reaction,
      });
    }

    // Create reaction
    const reaction = await prisma.newsReaction.create({
      data: {
        newsId: id,
        userId: user.id,
        emoji,
      },
    });

    return apiSuccess(
      {
        message: "Reaction added",
        reaction,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add reaction";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Add reaction error:", error);
    return apiError(message, 500);
  }
}

// DELETE - Remove reaction
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;

    await prisma.newsReaction.deleteMany({
      where: {
        newsId: id,
        userId: user.id,
      },
    });

    return apiSuccess({ message: "Reaction removed" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to remove reaction";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Remove reaction error:", error);
    return apiError(message, 500);
  }
}



