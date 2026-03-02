import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireActiveUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    if (typeof body.choice !== "boolean") {
      return apiError("choice must be boolean (true or false)", 400);
    }

    const now = new Date();
    const trivia = await prisma.triviaFact.findFirst({
      where: {
        id,
        isActive: true,
        OR: [
          { periodFrom: null, periodTo: null },
          {
            AND: [
              { OR: [{ periodFrom: null }, { periodFrom: { lte: now } }] },
              { OR: [{ periodTo: null }, { periodTo: { gte: now } }] },
            ],
          },
        ],
      },
    });

    if (!trivia) return apiError("Trivia not found", 404);

    const existing = await prisma.triviaVote.findUnique({
      where: { triviaId_userId: { triviaId: id, userId: user.id } },
      select: { choice: true },
    });

    if (existing) {
      const [trueCountExisting, falseCountExisting] = await Promise.all([
        prisma.triviaVote.count({ where: { triviaId: id, choice: true } }),
        prisma.triviaVote.count({ where: { triviaId: id, choice: false } }),
      ]);

      return apiError(
        JSON.stringify({
          message: "You already voted on this trivia",
          userChoice: existing.choice,
          trueCount: trueCountExisting,
          falseCount: falseCountExisting,
          totalVotes: trueCountExisting + falseCountExisting,
        }),
        409
      );
    }

    await prisma.triviaVote.create({ data: { triviaId: id, userId: user.id, choice: body.choice } });

    const [trueCount, falseCount] = await Promise.all([
      prisma.triviaVote.count({ where: { triviaId: id, choice: true } }),
      prisma.triviaVote.count({ where: { triviaId: id, choice: false } }),
    ]);

    return apiSuccess({
      triviaId: id,
      userChoice: body.choice,
      trueCount,
      falseCount,
      totalVotes: trueCount + falseCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit trivia vote";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message === "Account has been banned" || message === "Account is suspended") return apiError(message, 403);
    console.error("Trivia vote POST error:", error);
    return apiError(message, 500);
  }
}
