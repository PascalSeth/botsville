import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { AdminRoleType } from "@/app/generated/prisma/enums";

/**
 * POST /api/tournaments/[id]/fix-bestof
 * Updates existing tournament matches:
 * - Playoff/bracket matches -> bestOf = 5
 * - Grand Final matches -> bestOf = 7
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);
    const { id: tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { matches: true },
    });

    if (!tournament) {
      return apiError("Tournament not found", 404);
    }

    let gfCount = 0;
    let playoffCount = 0;

    for (const match of tournament.matches) {
      const isGrandFinal =
        match.bracketType === "GRAND_FINAL" ||
        (match.stage && match.stage.toLowerCase().includes("grand final"));

      const isPlayoffOrBracket =
        match.bracketType === "WINNER_BRACKET" ||
        match.bracketType === "LOSER_BRACKET" ||
        (match.stage &&
          (match.stage.toLowerCase().includes("playoff") ||
            match.stage.toLowerCase().includes("semi") ||
            match.stage.toLowerCase().includes("quarter") ||
            match.stage.toLowerCase().includes("final")));

      if (isGrandFinal) {
        await prisma.match.update({
          where: { id: match.id },
          data: { bestOf: 7 },
        });
        gfCount++;
      } else if (isPlayoffOrBracket) {
        await prisma.match.update({
          where: { id: match.id },
          data: { bestOf: 5 },
        });
        playoffCount++;
      }
    }

    return apiSuccess({
      message: `Tournament series rules updated: ${playoffCount} playoff matches set to BO5, ${gfCount} Grand Final matches set to BO7.`,
      playoffCount,
      gfCount,
    });
  } catch (error) {
    console.error("Fix bestOf error:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to update match specifications",
      500
    );
  }
}
