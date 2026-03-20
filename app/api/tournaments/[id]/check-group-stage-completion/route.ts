import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { MatchStatus } from "@/app/generated/prisma/enums";

/**
 * GET /api/tournaments/[id]/check-group-stage-completion
 * 
 * Checks if a tournament's group stage is complete and if bracket should be auto-generated.
 * 
 * Returns:
 * - groupStageComplete: true/false
 * - totalGroupMatches: number of group stage matches expected
 * - completedGroupMatches: number of completed group stage matches
 * - shouldAutoGenerateBracket: true if all group matches are complete
 * - topQualifiers: top teams ranked by points (seeds for bracket)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: tournamentId } = await params;

    // Get tournament with match data
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        matches: {
          select: {
            id: true,
            status: true,
            round: true,
            bracketType: true,
          },
        },
        registrations: {
          where: { status: "APPROVED" },
          select: { teamId: true },
        },
      },
    });

    if (!tournament) {
      return apiError("Tournament not found", 404);
    }

    // ─── Smart Detection: Is this a group stage tournament? ─────────────────
    // Works for both new tournaments (with round field) and old tournaments (without)

    // Check 1: Does it have any bracket matches yet?
    const bracketMatches = tournament.matches.filter(
      (m) => m.bracketType !== null && m.bracketType !== "GROUP_STAGE"
    );
    const hasAnyBracketMatches = bracketMatches.length > 0;

    // Check 2: Does it have completed/in-progress matches?
    const completedMatches = tournament.matches.filter(
      (m) => m.status === MatchStatus.COMPLETED || m.status === MatchStatus.FORFEITED
    );
    const hasCompletedMatches = completedMatches.length > 0;

    // Smart detection: If NO bracket matches AND has completed matches = group stage tournament
    const isGroupStageTournament = !hasAnyBracketMatches && hasCompletedMatches;

    if (!isGroupStageTournament) {
      const reason = hasAnyBracketMatches
        ? "Bracket matches already exist"
        : "Tournament has no completed matches yet";

      return apiSuccess({
        tournamentId,
        groupStageComplete: false,
        totalGroupMatches: tournament.matches.length,
        completedGroupMatches: completedMatches.length,
        shouldAutoGenerateBracket: false,
        reason,
        registeredTeamCount: tournament.registrations.length,
      });
    }

    // Count group stage matches (matches without bracketType or new tournaments with round)
    const groupMatches = tournament.matches.filter(
      (m) => m.bracketType === null || m.round !== null
    );

    const completedGroupMatches = groupMatches.filter(
      (m) => m.status === MatchStatus.COMPLETED || m.status === MatchStatus.FORFEITED
    ).length;

    const totalGroupMatches = groupMatches.length;
    const groupStageComplete = totalGroupMatches > 0 && completedGroupMatches === totalGroupMatches;

    // If bracket already started, don't auto-generate
    const bracketAlreadyStarted = bracketMatches.length > 0;
    const shouldAutoGenerateBracket = groupStageComplete && !bracketAlreadyStarted;

    // Get top qualifiers for seeding
    let topQualifiers: Array<{ teamId: string; name: string; points: number; wins: number; rank: number }> = [];

    if (shouldAutoGenerateBracket) {
      const standings = await prisma.teamStanding.findMany({
        where: {
          seasonId: tournament.seasonId,
        },
        include: {
          team: {
            select: { name: true },
          },
        },
        orderBy: [{ points: "desc" }, { wins: "desc" }],
      });

      // Use top 8 standings (or as many as registered if less than 8)
      topQualifiers = standings.slice(0, tournament.registrations.length).map((s) => ({
        teamId: s.teamId,
        name: s.team.name,
        points: s.points,
        wins: s.wins,
        rank: s.rank || 0,
      }));
    }

    return apiSuccess({
      tournamentId,
      groupStageComplete,
      totalGroupMatches,
      completedGroupMatches,
      bracketAlreadyStarted,
      shouldAutoGenerateBracket,
      topQualifiers,
      registeredTeamCount: tournament.registrations.length,
      message: shouldAutoGenerateBracket
        ? `Group stage complete! ${completedGroupMatches}/${totalGroupMatches} matches done. Ready to auto-generate bracket.`
        : groupStageComplete
          ? "Group stage complete but bracket already started."
          : `Group stage in progress: ${completedGroupMatches}/${totalGroupMatches} matches completed.`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to check group stage completion";
    return apiError(msg, 500);
  }
}
