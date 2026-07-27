import { NextRequest } from "next/server";
import {
  requireAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";
import {
  AdminRoleType,
  SeasonStatus,
  MatchChallengeStatus,
  MatchStatus,
  TournamentStatus,
} from "@/app/generated/prisma/enums";
import { invalidatePattern } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/seasons/[id]/activate
 *
 * Full season transition — activates a new UPCOMING season and starts everything fresh.
 *
 * What this does:
 *  1. Validates the target season is UPCOMING
 *  2. Finds and completes the currently ACTIVE season (if any):
 *     a. Generates season awards (champion, runner-up, MVP, etc.)
 *     b. Marks that season COMPLETED
 *     c. Closes all non-COMPLETED/CANCELLED tournaments from that season
 *     d. Cancels all UPCOMING matches belonging to those tournaments
 *  3. Activates the new season
 *  4. Resets competitive state (player cached stats, scrim availability, pending challenges)
 *  5. Busts all relevant Redis caches
 *  6. Creates an audit log entry
 *
 * What is NOT touched (preserved for history):
 *  - Match, MatchPerformance, MatchDraft, MatchGameResult records
 *  - TeamStanding / PlayerMvpRanking / MonthlyStanding (old season rows stay)
 *  - Team and Player identity records
 *  - User accounts, news, fan art, community posts
 *  - PrizeDistribution and PastTournament archive
 */
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin([
      AdminRoleType.TOURNAMENT_ADMIN,
      AdminRoleType.SUPER_ADMIN,
    ]);
    const { id: newSeasonId } = await context.params;

    // ── 1. Validate the target season ────────────────────────
    const newSeason = await prisma.season.findUnique({
      where: { id: newSeasonId },
    });

    if (!newSeason) {
      return apiError("Season not found", 404);
    }

    if (newSeason.status !== SeasonStatus.UPCOMING) {
      return apiError(
        `Season must be UPCOMING to activate. Current status: ${newSeason.status}`
      );
    }

    // ── 2. Find and complete the currently ACTIVE season ─────
    const activeSeason = await prisma.season.findFirst({
      where: { status: SeasonStatus.ACTIVE },
      include: {
        teamStandings: { include: { team: true } },
        playerMvpRankings: { include: { player: true } },
        tournaments: {
          where: {
            status: {
              notIn: [TournamentStatus.COMPLETED, TournamentStatus.CANCELLED],
            },
            deletedAt: null,
          },
          select: { id: true, name: true, status: true },
        },
      },
    });

    let completedSeasonSummary: {
      id: string;
      name: string;
      tournamentsClosed: number;
      matchesCancelled: number;
    } | null = null;

    if (activeSeason) {
      // ── 2a. Generate awards for the outgoing season ─────────
      const topTeams = [...activeSeason.teamStandings]
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.wins !== a.wins) return b.wins - a.wins;
          return (a.rank ?? 999) - (b.rank ?? 999);
        })
        .slice(0, 3);

      const topPlayer = [...activeSeason.playerMvpRankings]
        .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
        .at(0);

      // Best offender — most kills across the season's matches
      const bestOffenderPerf = await prisma.matchPerformance.findFirst({
        where: { match: { tournament: { seasonId: activeSeason.id } } },
        orderBy: { kills: "desc" },
        select: { playerId: true },
      });

      // Best defender — highest (assists+1)/deaths ratio
      const allPerfs = await prisma.matchPerformance.findMany({
        where: { match: { tournament: { seasonId: activeSeason.id } } },
        select: { playerId: true, assists: true, deaths: true },
      });

      const defenderScore = new Map<string, number>();
      for (const p of allPerfs) {
        const score = (p.assists + 1) / Math.max(1, p.deaths);
        defenderScore.set(p.playerId, (defenderScore.get(p.playerId) ?? 0) + score);
      }
      const bestDefenderId =
        [...defenderScore.entries()].sort((a, b) => b[1] - a[1]).at(0)?.[0] ?? null;

      await prisma.seasonAwards.upsert({
        where: { seasonId: activeSeason.id },
        create: {
          seasonId: activeSeason.id,
          championTeamId: topTeams[0]?.teamId ?? null,
          runnerUpTeamId: topTeams[1]?.teamId ?? null,
          thirdPlaceTeamId: topTeams[2]?.teamId ?? null,
          seasonMvpId: topPlayer?.playerId ?? null,
          bestOffenderId: bestOffenderPerf?.playerId ?? null,
          bestDefenderId,
        },
        update: {
          championTeamId: topTeams[0]?.teamId ?? null,
          runnerUpTeamId: topTeams[1]?.teamId ?? null,
          thirdPlaceTeamId: topTeams[2]?.teamId ?? null,
          seasonMvpId: topPlayer?.playerId ?? null,
          bestOffenderId: bestOffenderPerf?.playerId ?? null,
          bestDefenderId,
          updatedAt: new Date(),
        },
      });

      // ── 2b. Close open/ongoing tournaments from the old season
      const openTournamentIds = activeSeason.tournaments.map((t) => t.id);
      let matchesCancelled = 0;

      if (openTournamentIds.length > 0) {
        // Cancel all UPCOMING/LIVE matches in those tournaments
        const cancelResult = await prisma.match.updateMany({
          where: {
            tournamentId: { in: openTournamentIds },
            status: { in: [MatchStatus.UPCOMING, MatchStatus.LIVE] },
          },
          data: { status: MatchStatus.FORFEITED },
        });
        matchesCancelled = cancelResult.count;

        // Mark those tournaments as COMPLETED
        await prisma.tournament.updateMany({
          where: { id: { in: openTournamentIds } },
          data: { status: TournamentStatus.COMPLETED },
        });
      }

      // ── 2c. Mark old season as COMPLETED ────────────────────
      await prisma.season.update({
        where: { id: activeSeason.id },
        data: { status: SeasonStatus.COMPLETED },
      });

      completedSeasonSummary = {
        id: activeSeason.id,
        name: activeSeason.name,
        tournamentsClosed: openTournamentIds.length,
        matchesCancelled,
      };
    }

    // ── 3. Activate the new season ────────────────────────────
    await prisma.season.update({
      where: { id: newSeasonId },
      data: { status: SeasonStatus.ACTIVE },
    });

    // ── 4. Reset competitive state ───────────────────────────

    // 4a. Zero out cached player stats (kda, winRate, mvpCount, matchesPlayed)
    //     These caches represent current-season performance and start fresh each season.
    //     Historical data lives in MatchPerformance and is never deleted.
    const playerReset = await prisma.player.updateMany({
      where: { deletedAt: null },
      data: {
        kda: 0,
        winRate: 0,
        mvpCount: 0,
        matchesPlayed: 0,
      },
    });

    // 4b. Cancel all pending scrim match challenges
    const challengeReset = await prisma.matchChallenge.updateMany({
      where: {
        status: {
          in: [MatchChallengeStatus.PENDING, MatchChallengeStatus.ACCEPTED],
        },
      },
      data: { status: MatchChallengeStatus.CANCELLED },
    });

    // 4c. Clear all scrim availability records (teams must re-submit for the new season)
    const availabilityReset = await prisma.weeklyScrimAvailability.deleteMany({});

    // ── 5. Invalidate Redis caches ────────────────────────────
    await Promise.all([
      invalidatePattern("seasons:*"),
      invalidatePattern("leaderboard:*"),
      invalidatePattern("teams:*"),
      invalidatePattern("players:*"),
      invalidatePattern("standings:*"),
      invalidatePattern("hero_meta:*"),
      invalidatePattern("mvp:*"),
    ]);

    // ── 6. Audit log ─────────────────────────────────────────
    await createAuditLog(
      admin.id,
      "ACTIVATE_SEASON",
      "Season",
      newSeasonId,
      JSON.stringify({
        newSeason: newSeason.name,
        completedSeason: completedSeasonSummary,
        playersReset: playerReset.count,
        challengesCancelled: challengeReset.count,
        availabilityRowsCleared: availabilityReset.count,
      })
    );

    return apiSuccess({
      message: `${newSeason.name} is now ACTIVE. Season reset complete.`,
      newSeason: { id: newSeasonId, name: newSeason.name, status: "ACTIVE" },
      completedSeason: completedSeasonSummary,
      reset: {
        playersStatsZeroed: playerReset.count,
        challengesCancelled: challengeReset.count,
        scrimAvailabilityCleared: availabilityReset.count,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to activate season";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.startsWith("Forbidden")) return apiError(message, 403);
    console.error("[SEASON ACTIVATE ERROR]", error);
    return apiError(message, 500);
  }
}
