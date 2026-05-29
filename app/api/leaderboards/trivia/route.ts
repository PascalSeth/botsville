import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    // Fetch active users who have trivia votes
    const users = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        triviaVotes: {
          some: {},
        },
      },
      select: {
        id: true,
        ign: true,
        photo: true,
        region: true,
        rankBadge: true,
        mainRole: true,
        triviaVotes: {
          select: {
            isCorrect: true,
            xpAwarded: true,
            createdAt: true,
          },
        },
      },
    });

    // Compute metrics in-memory
    const rankings = users.map((u) => {
      const totalAnswers = u.triviaVotes.length;
      const correctAnswers = u.triviaVotes.filter((v) => v.isCorrect).length;
      const totalXp = u.triviaVotes.reduce((sum, v) => sum + v.xpAwarded, 0);
      const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

      // Determine the most recent activity timestamp
      const lastVote = u.triviaVotes.reduce((latest, current) => {
        return !latest || current.createdAt > latest.createdAt ? current : latest;
      }, null as typeof u.triviaVotes[0] | null);

      return {
        id: u.id,
        ign: u.ign,
        photo: u.photo,
        region: u.region,
        rankBadge: u.rankBadge,
        mainRole: u.mainRole,
        totalAnswers,
        correctAnswers,
        totalXp,
        accuracy,
        lastActiveAt: lastVote ? lastVote.createdAt.toISOString() : null,
      };
    });

    // Sort rankings: Highest XP first, then highest accuracy, then most correct answers
    rankings.sort((a, b) => {
      if (b.totalXp !== a.totalXp) return b.totalXp - a.totalXp;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return b.correctAnswers - a.correctAnswers;
    });

    const total = rankings.length;
    const paged = rankings.slice(skip, skip + limit).map((r, idx) => ({
      ...r,
      rank: skip + idx + 1,
    }));

    return apiSuccess({
      rankings: paged,
      pagination: {
        total,
        limit,
        skip,
      },
    }, 200, {
      "Cache-Control": "public, s-maxage=1, stale-while-revalidate=59"
    });
  } catch (error: unknown) {
    console.error("Get trivia leaderboard API error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch trivia rankings", 500);
  }
}
