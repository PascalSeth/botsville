import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { CommunityReactionType } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { type } = body;

    if (!type || !Object.values(CommunityReactionType).includes(type)) {
      return apiError("Invalid reaction type");
    }

    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post || post.deletedAt) return apiError("Post not found", 404);

    const reaction = await prisma.communityReaction.upsert({
      where: { postId_userId: { postId: id, userId: user.id } },
      update: { type },
      create: { postId: id, userId: user.id, type },
    });

    const reactions = await prisma.communityReaction.findMany({ where: { postId: id } });
    const upvoteCount = reactions.filter((value) => value.type === CommunityReactionType.UPVOTE).length;
    const downvoteCount = reactions.filter((value) => value.type === CommunityReactionType.DOWNVOTE).length;

    await prisma.communityPost.update({
      where: { id },
      data: {
        upvoteCount,
        downvoteCount,
        reactionScore: upvoteCount - downvoteCount,
      },
    });

    return apiSuccess({ message: "Reaction saved", reaction, upvoteCount, downvoteCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to react";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Community reaction POST error:", error);
    return apiError(message, 500);
  }
}
