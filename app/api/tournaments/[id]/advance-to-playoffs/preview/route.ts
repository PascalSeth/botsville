import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const url = new URL(req.url);
    const teamsPerGroup = parseInt(url.searchParams.get("teamsPerGroup") || "2");

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

    // 2. Fetch H2H Map
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

    // Tiebreaker sorting function
    const sortStandings = (standings: typeof tournament.groupStandings) => {
      return [...standings].sort((a, b) => {
        if (b.groupPoints !== a.groupPoints) return b.groupPoints - a.groupPoints;
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
        if (b.wins !== a.wins) return b.wins - a.wins;
        return 0;
      });
    };

    // 3. Extract top teams per group
    const groups: Record<string, typeof tournament.groupStandings> = {};
    for (const gs of tournament.groupStandings) {
      const gName = gs.groupName || "Ungrouped";
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(gs);
    }

    const advancingTeams = [];
    for (const gName in groups) {
      const sortedGroup = sortStandings(groups[gName]);
      const advanced = sortedGroup.slice(0, teamsPerGroup);
      for (let i = 0; i < advanced.length; i++) {
        advancingTeams.push({
          ...advanced[i],
          groupRank: i + 1
        });
      }
    }

    if (advancingTeams.length < 2) {
      return NextResponse.json({ 
        error: `Insufficient teams for Playoffs. Needed at least 2, found ${advancingTeams.length}.` 
      }, { status: 400 });
    }

    const sortedAdvancing = advancingTeams.sort((a, b) => {
      if (a.groupRank !== b.groupRank) return a.groupRank - b.groupRank;
      const h2h = sortStandings([a, b]);
      return h2h[0].teamId === a.teamId ? -1 : 1;
    });

    const result = sortedAdvancing.map((t, index) => ({
      id: t.teamId,
      name: t.team.name,
      tag: t.team.tag || t.team.name,
      groupName: t.groupName || "Ungrouped",
      groupRank: t.groupRank,
      globalRank: index + 1
    }));

    // Calculate needed bracket size
    const totalAdvancing = result.length;
    let p = 2;
    while (p < totalAdvancing) p *= 2;
    const byesNeeded = p - totalAdvancing;

    return NextResponse.json({
      teams: result,
      totalAdvancing,
      bracketSize: p,
      byesNeeded
    });

  } catch (error) {
    console.error("Preview Playoffs Error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to preview tournament" 
    }, { status: 500 });
  }
}
