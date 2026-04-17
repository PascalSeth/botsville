import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MatchStatus, BracketType } from "@/app/generated/prisma/enums";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // 1. Fetch Tournament Settings
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        groupStandings: {
          include: { team: true }
        }
      }
    });

    if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

    // 2. Determine Ranking (Re-implement sorting logic from standings/route.ts)
    const h2hMap: Record<string, Record<string, number>> = {};
    if (tournament.tiebreakerSequence.includes("H2H")) {
      const h2hs = await prisma.headToHead.findMany({
        where: { seasonId: tournament.seasonId }
      });
      for (const h of h2hs) {
        h2hMap[h.teamAId] ??= {};
        h2hMap[h.teamBId] ??= {};
        h2hMap[h.teamAId][h.teamBId] = h.teamAWins;
        h2hMap[h.teamBId][h.teamAId] = h.teamBWins;
      }
    }

    const sortedStandings = [...tournament.groupStandings].sort((a, b) => {
      // Step 1: Points
      if (b.groupPoints !== a.groupPoints) return b.groupPoints - a.groupPoints;

      // Step 2-4: Ordered Tiebreakers
      for (const tb of tournament.tiebreakerSequence) {
        if (tb === "H2H") {
          const aWinsVsB = h2hMap[a.teamId]?.[b.teamId] ?? 0;
          const bWinsVsA = h2hMap[b.teamId]?.[a.teamId] ?? 0;
          if (aWinsVsB !== bWinsVsA) return bWinsVsA - aWinsVsB;
        } else if (tb === "GD") {
          const gdA = a.gameWins - a.gameLosses;
          const gdB = b.gameWins - b.gameLosses;
          if (gdA !== gdB) return gdB - gdA;
        } else if (tb === "TIME") {
          const timeA = a.fastestWinSeconds ?? Infinity;
          const timeB = b.fastestWinSeconds ?? Infinity;
          if (timeA !== timeB) return timeA - timeB;
        }
      }

      // Final fallback: Wins count
      if (b.wins !== a.wins) return b.wins - a.wins;
      return 0;
    });

    const top4 = sortedStandings.slice(0, 4);

    if (top4.length < 4) {
      return NextResponse.json({ 
        error: `Insufficient teams for Playoffs. Needed 4, found ${top4.length}.` 
      }, { status: 400 });
    }

    // 3. Create Semi-Final Matches
    // 1st vs 4th, 2nd vs 3rd
    const matchups = [
      { team1Id: top4[0].teamId, team2Id: top4[3].teamId, label: "Semi-Final 1" },
      { team1Id: top4[1].teamId, team2Id: top4[2].teamId, label: "Semi-Final 2" },
    ];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0); // Default 6PM matches

    const createdMatches: any[] = [];


    await prisma.$transaction(async (tx) => {
      // Clean up any existing bracket matches for this stage to avoid double-seeding
      await tx.match.deleteMany({
        where: { 
          tournamentId, 
          bracketType: BracketType.WINNER_BRACKET,
          stage: "Semi-Finals"
        }
      });

      for (let i = 0; i < matchups.length; i++) {
        const m = matchups[i];
        const match = await tx.match.create({
          data: {
            tournamentId,
            teamAId: m.team1Id,
            teamBId: m.team2Id,
            status: MatchStatus.UPCOMING,
            bracketType: BracketType.WINNER_BRACKET,
            stage: "Semi-Finals",
            bracketPosition: i + 1,
            scheduledTime: new Date(tomorrow.getTime() + (i * 2 * 60 * 60 * 1000)), // stagger by 2 hours
            bestOf: tournament.defaultBestOf || 3,
          }
        });
        createdMatches.push(match);
      }
      
      // Update tournament phase
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { phase: "PLAYOFFS" }
      });
    });

    return NextResponse.json({
      success: true,
      message: `Successfully advanced to Playoffs. Created ${createdMatches.length} Semi-Final matches.`,
      matches: createdMatches.map(m => ({ id: m.id, teams: `${m.teamAId} vs ${m.teamBId}` }))
    });

  } catch (error) {
    console.error("Advance to Playoffs Error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to advance tournament" 
    }, { status: 500 });
  }
}
