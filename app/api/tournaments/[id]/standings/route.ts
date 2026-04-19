import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // 1. Fetch Tournament Settings
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { tiebreakerSequence: true, seasonId: true }
    });

    if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

    // 2. Fetch all group stage standings first
    const groupStandings = await prisma.groupStageStanding.findMany({
      where: { tournamentId: id },
      include: {
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
      // Initial rough sort by points
      orderBy: [
        { groupName: "asc" },
        { groupPoints: "desc" },
      ],
    });

    // 3. Fetch H2H data if needed
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

    // 4. Custom Sort Logic
    // Sort within each group
    const groups = [...new Set(groupStandings.map(s => s.groupName))];
    const standingsByGroup: Record<string, any[]> = {};

    for (const groupName of groups) {
      const groupTeams = groupStandings.filter(s => s.groupName === groupName);
      
      groupTeams.sort((a, b) => {
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
            // Lower time is better
            const timeA = a.fastestWinSeconds ?? Infinity;
            const timeB = b.fastestWinSeconds ?? Infinity;
            if (timeA !== timeB) return timeA - timeB;
          }
        }

        // Final fallback: Wins count
        if (b.wins !== a.wins) return b.wins - a.wins;
        return 0;
      });

      standingsByGroup[groupName] = groupTeams.map((s, idx) => ({
        ...s,
        points: s.groupPoints,
        forfeits: 0,
        streak: null,
        tier: "Group",
        previousRank: null,
        rank: idx + 1
      }));
    }

    // Flatten for the legacy 'standings' UI
    const flatStandings = Object.values(standingsByGroup).flat();

    return NextResponse.json({ 
      tournamentId: id,
      groups: standingsByGroup,
      standings: flatStandings
    });


  } catch (error) {
    console.error("Error fetching tournament standings:", error);
    return NextResponse.json(
      { error: "Failed to fetch standings", details: String(error) },
      { status: 500 }
    );
  }
}
