import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError, apiSuccess, createAuditLog } from "@/lib/api-utils";
import { AdminRoleType, TournamentStatus } from "@/app/generated/prisma/enums";
import { invalidatePattern } from "@/lib/redis";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);
    const { id: tournamentId } = await context.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        stages: true,
      },
    });

    if (!tournament || tournament.deletedAt) {
      return apiError("Tournament not found", 404);
    }

    const body = await request.json().catch(() => ({}));
    const includeRegistrations = Boolean(body?.includeRegistrations);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Gather all matches for this tournament
      const tournamentMatches = await tx.match.findMany({
        where: { tournamentId },
        select: { id: true },
      });
      const matchIds = tournamentMatches.map((m) => m.id);

      let deletedMatchesCount = 0;
      if (matchIds.length > 0) {
        // Break foreign key constraints on matches
        await tx.matchScreenshot.deleteMany({ where: { matchId: { in: matchIds } } });
        await tx.matchDispute.deleteMany({ where: { matchId: { in: matchIds } } });
        await tx.matchPerformance.deleteMany({ where: { matchId: { in: matchIds } } });
        await tx.matchDraft.deleteMany({ where: { matchId: { in: matchIds } } });
        await tx.matchGameResult.deleteMany({ where: { matchId: { in: matchIds } } });
        await tx.matchMvp.deleteMany({ where: { matchId: { in: matchIds } } });
        await tx.matchChallenge.updateMany({
          where: { scheduledMatchId: { in: matchIds } },
          data: { scheduledMatchId: null },
        });

        // Break progression self-relations before deletion
        await tx.match.updateMany({
          where: { tournamentId },
          data: { nextMatchId: null, loserNextId: null },
        });

        const deletedMatches = await tx.match.deleteMany({ where: { tournamentId } });
        deletedMatchesCount = deletedMatches.count;
      }

      // 2. Clear group stage standings and groups
      const [deletedStandings, deletedGroups] = await Promise.all([
        tx.groupStageStanding.deleteMany({ where: { tournamentId } }),
        tx.tournamentGroup.deleteMany({ where: { tournamentId } }),
      ]);

      // 3. Clear tournament-level MVPs and fixture drafts
      await Promise.all([
        tx.tournamentMvp.deleteMany({ where: { tournamentId } }),
        tx.tournamentFixtureDraft.deleteMany({ where: { tournamentId } }),
      ]);

      // 4. Reset rounds and stages
      await tx.round.deleteMany({ where: { stage: { tournamentId } } });
      await tx.tournamentStage.deleteMany({ where: { tournamentId } });
      await tx.tournamentStage.create({
        data: {
          tournamentId,
          name: "Stage 1",
          order: 1,
          format: tournament.format,
          status: "UPCOMING",
        },
      });

      // 5. Handle registrations
      let registrationsCleared = 0;
      if (includeRegistrations) {
        await tx.waitlist.deleteMany({ where: { tournamentId } });
        const deletedRegs = await tx.tournamentRegistration.deleteMany({ where: { tournamentId } });
        registrationsCleared = deletedRegs.count;
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { filled: 0 },
        });
      } else {
        await tx.tournamentRegistration.updateMany({
          where: { tournamentId },
          data: { isEliminated: false },
        });
        const approvedCount = await tx.tournamentRegistration.count({
          where: { tournamentId, status: "APPROVED" },
        });
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { filled: approvedCount },
        });
      }

      // 6. Reset tournament status & orchestration metadata
      const updated = await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          status: TournamentStatus.OPEN,
          phase: null,
          matchesBeforeBracket: null,
          matchesPerTeam: null,
          teamsPerGroup: null,
          numGroups: null,
        },
      });

      return {
        matchesCleared: deletedMatchesCount,
        groupsCleared: deletedGroups.count,
        standingsCleared: deletedStandings.count,
        registrationsCleared,
        tournament: updated,
      };
    });

    await Promise.all([
      invalidatePattern(`tournament:matches:${tournamentId}:*`),
      invalidatePattern("tournaments:*"),
      createAuditLog(
        admin.id,
        "RESET_TOURNAMENT",
        "Tournament",
        tournamentId,
        JSON.stringify({
          includeRegistrations,
          matchesCleared: result.matchesCleared,
          groupsCleared: result.groupsCleared,
        })
      ),
    ]);

    return apiSuccess({
      message: `Tournament reset complete. Cleared ${result.groupsCleared} groups and ${result.matchesCleared} matches. You can now start over.`,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to reset tournament";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Reset tournament error:", error);
    return apiError(message, 500);
  }
}
