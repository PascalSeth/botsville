import { apiError, apiSuccess, getCurrentUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const DAILY_LIMIT = 5; // 5 trivias per day

// Get start of today (midnight) in UTC
function getStartOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    const now = new Date();
    const startOfToday = getStartOfToday();

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

    // Get user's votes from TODAY only (for daily limit tracking)
    const todaysVotes = user
      ? await prisma.triviaVote.findMany({
          where: {
            userId: user.id,
            createdAt: { gte: startOfToday },
          },
          select: { triviaId: true, selectedAnswer: true, isCorrect: true, xpAwarded: true },
          orderBy: { createdAt: "desc" },
        })
      : [];

    const todayAnsweredIds = todaysVotes.map(v => v.triviaId);
    const dailyAnswered = todaysVotes.length;

    // Get user's total XP from ALL trivia (lifetime)
    const userTotalXp = user
      ? (await prisma.userXpEvent.aggregate({
          where: { userId: user.id, type: "TRIVIA_CORRECT" },
          _sum: { xp: true },
        }))._sum.xp ?? 0
      : 0;

    // Get today's XP
    const todayXp = user
      ? (await prisma.userXpEvent.aggregate({
          where: { userId: user.id, type: "TRIVIA_CORRECT", createdAt: { gte: startOfToday } },
          _sum: { xp: true },
        }))._sum.xp ?? 0
      : 0;

    // If user already hit daily limit, return empty with stats
    if (dailyAnswered >= DAILY_LIMIT) {
      return apiSuccess({
        trivias: [],
        userTotalXp,
        todayXp,
        dailyAnswered,
        dailyLimit: DAILY_LIMIT,
        allCompletedToday: true,
      });
    }

    // Filter out today's answered trivias and pick remaining up to daily limit
    const unansweredTrivias = allTrivias
      .filter(t => !todayAnsweredIds.includes(t.id))
      .slice(0, DAILY_LIMIT - dailyAnswered);

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
      todayXp,
      dailyAnswered,
      dailyLimit: DAILY_LIMIT,
      allCompletedToday: false,
    });
  } catch (error: unknown) {
    console.error("Trivia current GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch trivia", 500);
  }
}
