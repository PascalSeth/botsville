import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { PollStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { optionId } = body;

    if (!optionId) return apiError("optionId is required");

    const poll = await prisma.poll.findUnique({ where: { id }, include: { options: true } });
    if (!poll) return apiError("Poll not found", 404);
    if (poll.status !== PollStatus.ACTIVE) return apiError("Poll is not active");
    if (poll.expiresAt && poll.expiresAt < new Date()) return apiError("Poll has expired");

    const option = poll.options.find((value) => value.id === optionId);
    if (!option) return apiError("Invalid option");

    await prisma.$transaction(async (transaction) => {
      const existing = await transaction.pollVote.findUnique({
        where: { pollId_userId: { pollId: id, userId: user.id } },
      });

      if (existing) {
        if (existing.optionId === optionId) return;

        await transaction.pollOption.update({ where: { id: existing.optionId }, data: { voteCount: { decrement: 1 } } });
        await transaction.pollVote.update({ where: { id: existing.id }, data: { optionId } });
        await transaction.pollOption.update({ where: { id: optionId }, data: { voteCount: { increment: 1 } } });
        return;
      }

      await transaction.pollVote.create({
        data: {
          pollId: id,
          optionId,
          userId: user.id,
        },
      });
      await transaction.pollOption.update({ where: { id: optionId }, data: { voteCount: { increment: 1 } } });
    });

    return apiSuccess({ message: "Vote recorded" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to vote";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Poll vote POST error:", error);
    return apiError(message, 500);
  }
}
