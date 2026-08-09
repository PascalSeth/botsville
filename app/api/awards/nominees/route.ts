import { NextRequest } from "next/server";
import { getCurrentUser, apiError, apiSuccess } from "@/lib/api-utils";
import { GameRole, SeasonStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { cacheResult } from "@/lib/redis";

// GET — nominees grouped by role with vote counts for a given (or active) season
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);

    const seasonIdParam = searchParams.get("seasonId");
    const roleFilter = searchParams.get("role");

    const cacheKey = `awards:nominees:${seasonIdParam || "active"}:${roleFilter || "all"}`;

    const { season, players, voteCountMap } = await cacheResult(
      cacheKey,
      async () => {
        let seasonId = seasonIdParam;
        if (!seasonId) {
          const active = await prisma.season.findFirst({
            where: { status: SeasonStatus.ACTIVE },
            select: { id: true, name: true, status: true },
          });
          if (active) {
            seasonId = active.id;
          } else {
            const recent = await prisma.season.findFirst({
              orderBy: { updatedAt: 'desc' },
              select: { id: true, name: true, status: true },
            });
            if (recent) seasonId = recent.id;
          }
        }

        let seasonObj: { id: string; name: string; status: string } | null = null;
        if (seasonId) {
          seasonObj = await prisma.season.findUnique({
            where: { id: seasonId },
            select: { id: true, name: true, status: true },
          });
        }

        const playerWhere: Record<string, unknown> = {
          deletedAt: null,
          team: {
            deletedAt: null,
            status: "ACTIVE",
          },
        };
        if (roleFilter && Object.values(GameRole).includes(roleFilter as GameRole)) {
          playerWhere.role = roleFilter as GameRole;
        }

        const fetchedPlayers = await prisma.player.findMany({
          where: playerWhere,
          select: {
            id: true,
            ign: true,
            realName: true,
            role: true,
            secondaryRole: true,
            signatureHero: true,
            photo: true,
            kda: true,
            winRate: true,
            mvpCount: true,
            matchesPlayed: true,
            team: {
              select: {
                id: true,
                name: true,
                tag: true,
                logo: true,
                color: true,
              },
            },
          },
          orderBy: { ign: "asc" },
        });

        const vMap: Record<string, number> = {};
        if (seasonId && seasonObj) {
          const voteCounts = await prisma.roleVote.groupBy({
            by: ["playerId", "role"],
            where: { seasonId },
            _count: { id: true },
          });
          for (const vc of voteCounts) {
            vMap[`${vc.playerId}:${vc.role}`] = vc._count.id;
          }
        }

        return { season: seasonObj, players: fetchedPlayers, voteCountMap: vMap };
      },
      { ttl: 60 }
    );

    // Fetch personal user votes dynamically if authenticated
    const userVotes: Record<string, string> = {};
    if (user && season?.id) {
      const myVotes = await prisma.roleVote.findMany({
        where: { userId: user.id, seasonId: season.id },
        select: { role: true, playerId: true },
      });
      for (const v of myVotes) userVotes[v.role] = v.playerId;
    }

    // Group players by role
    const roles: GameRole[] = [GameRole.EXP, GameRole.JUNGLE, GameRole.MID, GameRole.GOLD, GameRole.ROAM];
    const grouped: Record<string, unknown[]> = {};
    for (const role of roles) {
      grouped[role] = players
        .filter((p) => p.role === role)
        .map((p) => ({
          ...p,
          votes: voteCountMap[`${p.id}:${role}`] ?? 0,
          votedByMe: userVotes[role] === p.id,
        }))
        .sort((a, b) => (b as { votes: number }).votes - (a as { votes: number }).votes);
    }

    return apiSuccess({
      season,
      grouped,
      userVotes,
      isVotingOpen: season?.status === "ACTIVE",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch nominees";
    console.error("Nominees error:", error);
    return apiError(message, 500);
  }
}
