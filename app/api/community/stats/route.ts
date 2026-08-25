import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { cacheResult } from "@/lib/redis";

export async function GET(request: NextRequest) {
  try {
    const stats = await cacheResult(
      "community:live-stats",
      async () => {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const [
          totalUsers,
          totalTeams,
          todayJoinedCount,
          activeTournament,
          recentUser,
          upcomingMatch,
        ] = await Promise.all([
          // 1. Total registered users
          prisma.user.count({ where: { deletedAt: null } }),

          // 2. Total active teams
          prisma.team.count({ where: { deletedAt: null, status: "ACTIVE" } }),

          // 3. Today's joined count
          prisma.user.count({
            where: {
              deletedAt: null,
              createdAt: { gte: startOfToday },
            },
          }),

          // 4. Current active or latest tournament
          prisma.tournament.findFirst({
            where: { deletedAt: null },
            orderBy: [{ status: "asc" }, { createdAt: "desc" }],
            select: {
              id: true,
              name: true,
              prizePool: true,
              status: true,
            },
          }),

          // 5. Most recent user joined
          prisma.user.findFirst({
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            select: {
              ign: true,
              mainRole: true,
              createdAt: true,
            },
          }),

          // 6. Upcoming match
          prisma.match.findFirst({
            where: { status: "UPCOMING" },
            orderBy: { scheduledTime: "asc" },
            select: {
              id: true,
              scheduledTime: true,
              teamA: {
                select: { name: true, tag: true },
              },
              teamB: {
                select: { name: true, tag: true },
              },
            },
          }),
        ]);

        return {
          totalUsers,
          totalTeams,
          todayJoinedCount,
          activeTournament: activeTournament
            ? {
                name: activeTournament.name,
                prizePool: activeTournament.prizePool || null,
                status: activeTournament.status,
              }
            : null,
          recentUser: recentUser
            ? {
                ign: recentUser.ign,
                mainRole: recentUser.mainRole || "PLAYER",
                createdAt: recentUser.createdAt,
              }
            : null,
          upcomingMatch: upcomingMatch
            ? {
                teamA: upcomingMatch.teamA.name || upcomingMatch.teamA.tag,
                teamB: upcomingMatch.teamB ? (upcomingMatch.teamB.name || upcomingMatch.teamB.tag) : "RESTING",
                scheduledTime: upcomingMatch.scheduledTime,
              }
            : null,
        };
      },
      { ttl: 15 }
    );

    return apiSuccess(stats);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch live stats";
    console.error("Live community stats error:", error);
    return apiError(message, 500);
  }
}
