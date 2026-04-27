import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BracketType, MatchStatus } from "@/app/generated/prisma/enums";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Fetch all tournament matches and filter playoff ones in JS
    // This avoids complex Prisma NOT/contains query issues
    const allMatches = await prisma.match.findMany({
      where: { tournamentId },
      orderBy: [{ round: "desc" }, { bracketPosition: "asc" }]
    });

    // Playoff = explicit bracketType OR stage that doesn't include "group"
    const allPlayoffMatches = allMatches.filter(m =>
      m.bracketType === BracketType.WINNER_BRACKET ||
      m.bracketType === BracketType.GRAND_FINAL ||
      (
        m.bracketType === null &&
        m.stage != null &&
        !m.stage.toLowerCase().includes('group')
      )
    );

    if (allPlayoffMatches.length === 0) {
      return NextResponse.json({ 
        error: "Round 1 has not been seeded yet. Close this and use 'Auto Seed' or 'Manual Seed' first." 
      }, { status: 400 });
    }

    // Get the highest round number
    const currentRound = allPlayoffMatches[0].round ?? 0;
    const matchesInRound = allPlayoffMatches.filter(m => (m.round ?? 0) === currentRound);

    // Ensure all matches in this round are completed
    const uncompleted = matchesInRound.filter(m => m.status !== MatchStatus.COMPLETED);
    if (uncompleted.length > 0) {
      return NextResponse.json({ 
        error: `${uncompleted.length} match${uncompleted.length > 1 ? 'es' : ''} in the current round still need to be completed before you can advance.` 
      }, { status: 400 });
    }

    if (matchesInRound.length === 1) {
      return NextResponse.json({ error: "The Grand Final has already been generated." }, { status: 400 });
    }

    // Extract winners
    const winnerIds = matchesInRound.map(m => m.winnerId).filter(Boolean) as string[];

    if (winnerIds.length === 0) {
      return NextResponse.json({ 
        error: "No winners found in the current round. Make sure all matches are finalized with a winner." 
      }, { status: 400 });
    }

    const teams = await prisma.team.findMany({
      where: { id: { in: winnerIds } },
      select: { id: true, name: true, tag: true }
    });

    const result = matchesInRound.map((m, index) => {
      const team = teams.find(t => t.id === m.winnerId);
      if (!team) return null;
      return {
        id: team.id,
        name: team.name,
        tag: team.tag || team.name,
        groupName: `Match #${m.bracketPosition ?? index + 1}`,
        groupRank: 1,
        globalRank: index + 1
      };
    }).filter(Boolean);

    return NextResponse.json({
      teams: result,
      totalAdvancing: result.length,
    });

  } catch (error) {
    console.error("Preview Next Round Error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to preview next round" 
    }, { status: 500 });
  }
}
