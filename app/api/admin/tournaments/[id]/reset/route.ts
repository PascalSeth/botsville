import { NextRequest } from "next/server";
import { requireSuperAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { id: true, name: true, deletedAt: true, seasonId: true },
    });

    if (!tournament || tournament.deletedAt) {
      return apiError("Tournament not found", 404);
    }

    const matchIds = (
      await prisma.match.findMany({
        where: { tournamentId: id },
        select: { id: true },
      })
    ).map((m) => m.id);

    // All teams registered for this tournament
    const affectedTeamIds = (
      await prisma.tournamentRegistration.findMany({
        where: { tournamentId: id },
        select: { teamId: true },
      })
    ).map((r) => r.teamId);

    // All PlayerMvpRanking records for this season — the leaderboard is
    // season-scoped, so a complete reset must wipe the whole season ranking.
    const seasonRankingPlayerIds = (
      await prisma.playerMvpRanking.findMany({
        where: { seasonId: tournament.seasonId },
        select: { playerId: true },
      })
    ).map((r) => r.playerId);

    await prisma.$transaction(async (tx) => {
      // ── Matches ────────────────────────────────────────────────
      if (matchIds.length > 0) {
        await tx.matchChallenge.updateMany({
          where: { scheduledMatchId: { in: matchIds } },
          data: { scheduledMatchId: null },
        });
        await tx.match.updateMany({
          where: { id: { in: matchIds } },
          data: { nextMatchId: null, loserNextId: null },
        });
        await tx.matchScreenshot.deleteMany({ where: { matchId: { in: matchIds } } });
        await tx.matchDispute.deleteMany({ where: { matchId: { in: matchIds } } });
        await tx.matchPerformance.deleteMany({ where: { matchId: { in: matchIds } } });
        await tx.matchDraft.deleteMany({ where: { matchId: { in: matchIds } } });
        // MatchGameResult + MatchMvp cascade from Match
        await tx.match.deleteMany({ where: { id: { in: matchIds } } });
      }

      // ── Groups / standings / awards ────────────────────────────
      await tx.tournamentGroup.deleteMany({ where: { tournamentId: id } });
      await tx.groupStageStanding.deleteMany({ where: { tournamentId: id } });
      await tx.tournamentMvp.deleteMany({ where: { tournamentId: id } });
      await tx.prizeDistribution.deleteMany({ where: { tournamentId: id } });
      await tx.waitlist.deleteMany({ where: { tournamentId: id } });

      // ── Hero meta — wipe season hero stats ────────────────────
      await tx.heroMeta.deleteMany({ where: { seasonId: tournament.seasonId } });

      // ── Player rankings — wipe entire season leaderboard ───────
      // The leaderboard queries ALL PlayerMvpRanking for the season,
      // so we must clear every record in this season, then zero the
      // cached stats on the Player rows that had rankings.
      await tx.playerMvpRanking.deleteMany({
        where: { seasonId: tournament.seasonId },
      });
      if (seasonRankingPlayerIds.length > 0) {
        await tx.player.updateMany({
          where: { id: { in: seasonRankingPlayerIds } },
          data: { kda: 0, winRate: 0, mvpCount: 0, matchesPlayed: 0 },
        });
      }

      // Also zero stats for players on registered teams (may not have
      // had a ranking row yet but still have cached stats from scrims etc.)
      if (affectedTeamIds.length > 0) {
        const teamPlayerIds = (
          await tx.player.findMany({
            where: { teamId: { in: affectedTeamIds }, deletedAt: null },
            select: { id: true },
          })
        ).map((p) => p.id);
        if (teamPlayerIds.length > 0) {
          await tx.player.updateMany({
            where: { id: { in: teamPlayerIds } },
            data: { kda: 0, winRate: 0, mvpCount: 0, matchesPlayed: 0 },
          });
        }
      }

      // ── Team season records ────────────────────────────────────
      if (affectedTeamIds.length > 0) {
        const remainingMatches = await tx.match.findMany({
          where: {
            tournament: { seasonId: tournament.seasonId },
            status: "COMPLETED",
            OR: [
              { teamAId: { in: affectedTeamIds } },
              { teamBId: { in: affectedTeamIds } },
            ],
          },
          select: { teamAId: true, teamBId: true, winnerId: true, forfeitedById: true, isDraw: true },
        });

        for (const teamId of affectedTeamIds) {
          const tm = remainingMatches.filter(
            (m) => m.teamAId === teamId || m.teamBId === teamId
          );
          await tx.teamSeasonRecord.updateMany({
            where: { teamId, seasonId: tournament.seasonId },
            data: {
              wins:     tm.filter((m) => m.winnerId === teamId && !m.forfeitedById).length,
              losses:   tm.filter((m) => m.winnerId && m.winnerId !== teamId && !m.forfeitedById).length,
              forfeits: tm.filter((m) => m.forfeitedById === teamId).length,
              draws:    tm.filter((m) => m.isDraw).length,
              points: 0,
              premiumPoints: 0,
              streak: null,
              rank: null,
            },
          });
        }

        // Strip this tournament's placement from tournamentPlaces JSON
        const seasonRecords = await tx.teamSeasonRecord.findMany({
          where: { teamId: { in: affectedTeamIds }, seasonId: tournament.seasonId },
          select: { id: true, tournamentPlaces: true },
        });
        for (const record of seasonRecords) {
          if (!record.tournamentPlaces) continue;
          try {
            const places = JSON.parse(record.tournamentPlaces) as Record<string, unknown>;
            if (id in places) {
              delete places[id];
              await tx.teamSeasonRecord.update({
                where: { id: record.id },
                data: { tournamentPlaces: JSON.stringify(places) },
              });
            }
          } catch { /* skip malformed */ }
        }
      }

      // ── Registrations ──────────────────────────────────────────
      await tx.tournamentRegistration.updateMany({
        where: { tournamentId: id },
        data: { seed: null, isEliminated: false },
      });

      const approvedCount = await tx.tournamentRegistration.count({
        where: { tournamentId: id, status: "APPROVED" },
      });

      // ── Tournament itself ───────────────────────────────────────
      await tx.tournament.update({
        where: { id },
        data: {
          status: "UPCOMING",
          phase: null,
          filled: approvedCount,
          numGroups: null,
          teamsPerGroup: null,
          matchesPerTeam: null,
          matchesBeforeBracket: null,
        },
      });

      await tx.adminAuditLog.create({
        data: {
          actorId: admin.id,
          action: "RESET_TOURNAMENT",
          targetType: "Tournament",
          targetId: id,
          details: `Reset tournament "${tournament.name}" — purged ${matchIds.length} match(es), wiped season player rankings (${seasonRankingPlayerIds.length} entries), hero meta, and zeroed stats for ${affectedTeamIds.length} team(s). Registrations preserved.`,
        },
      });
    }, { timeout: 30000 });

    return apiSuccess({
      message: `Tournament "${tournament.name}" has been reset to a fresh state.`,
      matchesDeleted: matchIds.length,
      rankingsCleared: seasonRankingPlayerIds.length,
    });
  } catch (error) {
    console.error("Tournament reset error:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to reset tournament",
      500
    );
  }
}
