import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { XpEventType } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;

    const trivia = await prisma.triviaFact.findUnique({ where: { id } });
    if (!trivia || !trivia.isActive) return apiError("Trivia not found", 404);

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const alreadyAwarded = await prisma.userXpEvent.findFirst({
      where: {
        userId: user.id,
        type: XpEventType.TRIVIA_REVEAL,
        createdAt: { gte: dayStart },
        metadata: `trivia:${id}`,
      },
    });

    if (!alreadyAwarded) {
      await prisma.userXpEvent.create({
        data: {
          userId: user.id,
          type: XpEventType.TRIVIA_REVEAL,
          xp: 10,
          metadata: `trivia:${id}`,
        },
      });
    }

    const aggregate = await prisma.userXpEvent.aggregate({
      where: { userId: user.id },
      _sum: { xp: true },
    });

    return apiSuccess({
      reveal: trivia.reveal,
      xpAwarded: alreadyAwarded ? 0 : 10,
      totalXp: aggregate._sum.xp || 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to reveal trivia";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Trivia reveal POST error:", error);
    return apiError(message, 500);
  }
}
