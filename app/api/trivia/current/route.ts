import { apiError, apiSuccess, getCurrentUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const now = new Date();
    const trivia = await prisma.triviaFact.findFirst({
      where: {
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
      orderBy: { createdAt: "desc" },
    });

    if (!trivia) return apiSuccess({ trivia: null });

    const [trueCount, falseCount, userVote] = await Promise.all([
      prisma.triviaVote.count({ where: { triviaId: trivia.id, choice: true } }),
      prisma.triviaVote.count({ where: { triviaId: trivia.id, choice: false } }),
      user
        ? prisma.triviaVote.findUnique({
            where: { triviaId_userId: { triviaId: trivia.id, userId: user.id } },
            select: { choice: true },
          })
        : null,
    ]);

    return apiSuccess({
      trivia: {
        id: trivia.id,
        title: trivia.title,
        teaser: trivia.teaser,
        heroSlug: trivia.heroSlug,
        images: trivia.images,
        trueCount,
        falseCount,
        totalVotes: trueCount + falseCount,
        userChoice: userVote?.choice ?? null,
      },
    });
  } catch (error: unknown) {
    console.error("Trivia current GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch trivia", 500);
  }
}
