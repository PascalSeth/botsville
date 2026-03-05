import { apiError, apiSuccess, getCurrentUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const DAILY_LIMIT = 5; // 5 trivias per day

export async function GET() {
  try {
    const user = await getCurrentUser();
    const now = new Date();

    // Get all active trivias
    const allTrivias = await prisma.triviaFact.findMany({
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

    if (!allTrivias.length) {
      return apiSuccess({ trivias: [], userTotalXp: 0, dailyAnswered: 0, dailyLimit: DAILY_LIMIT });
    }

    // Get user's answered trivia IDs
    const answeredTriviaIds = user
      ? (await prisma.triviaVote.findMany({
          where: { userId: user.id },
          select: { triviaId: true },
        })).map(v => v.triviaId)
      : [];

    // Get user's total XP from trivia
    const userTotalXp = user
      ? (await prisma.userXpEvent.aggregate({
          where: { userId: user.id, type: "TRIVIA_CORRECT" },
          _sum: { xp: true },
        }))._sum.xp ?? 0
      : 0;

    // Filter out answered trivias and pick up to 5
    const unansweredTrivias = allTrivias
      .filter(t => !answeredTriviaIds.includes(t.id))
      .slice(0, DAILY_LIMIT);

    // Get stats for each trivia
    const triviaIds = unansweredTrivias.map(t => t.id);
    const [attemptCounts, correctCounts] = await Promise.all([
      prisma.triviaVote.groupBy({
        by: ["triviaId"],
        where: { triviaId: { in: triviaIds } },
        _count: true,
      }),
      prisma.triviaVote.groupBy({
        by: ["triviaId"],
        where: { triviaId: { in: triviaIds }, isCorrect: true },
        _count: true,
      }),
    ]);

    const attemptMap = new Map(attemptCounts.map(a => [a.triviaId, a._count]));
    const correctMap = new Map(correctCounts.map(c => [c.triviaId, c._count]));

    const trivias = unansweredTrivias.map(trivia => ({
      id: trivia.id,
      title: trivia.title,
      teaser: trivia.teaser,
      choices: trivia.choices,
      heroSlug: trivia.heroSlug,
      images: trivia.images,
      category: trivia.category,
      totalAttempts: attemptMap.get(trivia.id) ?? 0,
      correctCount: correctMap.get(trivia.id) ?? 0,
    }));

    return apiSuccess({
      trivias,
      userTotalXp,
      dailyAnswered: answeredTriviaIds.length,
      dailyLimit: DAILY_LIMIT,
    });
  } catch (error: unknown) {
    console.error("Trivia current GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch trivia", 500);
  }
}
