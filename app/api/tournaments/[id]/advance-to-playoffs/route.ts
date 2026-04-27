import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MatchStatus, BracketType } from "@/app/generated/prisma/enums";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const body = await req.json().catch(() => ({}));
    const teamsPerGroup = parseInt(body.teamsPerGroup) || 2;

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

    let matchups: Array<{ seed1: any, seed2: any }> = [];

    if (body.manualMatchups && Array.isArray(body.manualMatchups)) {
      matchups = body.manualMatchups.map((m: any, i: number) => ({
        seed1: { seedPosition: i * 2 + 1, teamId: m.team1Id, teamName: m.team1Name || "Team A", teamTag: m.team1Name || "Team A" },
        seed2: m.team2Id ? { seedPosition: i * 2 + 2, teamId: m.team2Id, teamName: m.team2Name || "Team B", teamTag: m.team2Name || "Team B" } : { seedPosition: i * 2 + 2, teamId: "", teamName: "BYE", teamTag: "BYE" }
      }));
    } else {
      // 3. Extract top teams per group and group them by rank (1st places, 2nd places, etc.)
    const rankedTeams: Record<number, typeof tournament.groupStandings> = {};
    for (let i = 0; i < teamsPerGroup; i++) {
      rankedTeams[i] = [];
    }

    const groups: Record<string, typeof tournament.groupStandings> = {};
    for (const gs of tournament.groupStandings) {
      const gName = gs.groupName || "Ungrouped";
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(gs);
    }

    let totalAdvancing = 0;
    for (const gName in groups) {
      const sortedGroup = sortStandings(groups[gName]);
      const advanced = sortedGroup.slice(0, teamsPerGroup);
      for (let i = 0; i < advanced.length; i++) {
        rankedTeams[i].push(advanced[i]);
        totalAdvancing++;
      }
    }

    if (totalAdvancing < 2) {
      return NextResponse.json({ 
        error: `Insufficient teams for Playoffs. Needed at least 2, found ${totalAdvancing}.` 
      }, { status: 400 });
    }

    // 4. Bracket Generation Algorithm (Custom "1st Face 1st" Seeding)
    let p = 2;
    while (p < totalAdvancing) p *= 2;
    let byesRemaining = p - totalAdvancing;

    // Distribute teams and byes into buckets to ensure 1st face 1st
    const finalOrderedSeeds: Array<{ teamId: string, teamName: string, teamTag: string }> = [];

    for (let i = 0; i < teamsPerGroup; i++) {
      const teamsInRank = sortStandings(rankedTeams[i]);
      for (const t of teamsInRank) {
        finalOrderedSeeds.push({
          teamId: t.teamId,
          teamName: t.team.name,
          teamTag: t.team.tag || t.team.name
        });
      }
      // If odd number of teams in this rank, pad with a BYE so the next rank doesn't mix
      if (finalOrderedSeeds.length % 2 !== 0 && byesRemaining > 0) {
        finalOrderedSeeds.push({ teamId: "", teamName: "BYE", teamTag: "BYE" });
        byesRemaining--;
      }
    }

    // Add any remaining BYEs at the very end
    while (byesRemaining > 0) {
      finalOrderedSeeds.push({ teamId: "", teamName: "BYE", teamTag: "BYE" });
      byesRemaining--;
    }

    // Generate Matchups sequentially (1v2, 3v4, 5v6)
    // Generate Matchups sequentially (1v2, 3v4, 5v6)
    let currentSeed = 1;

    for (let i = 0; i < p; i += 2) {
      matchups.push({
        seed1: { ...finalOrderedSeeds[i], seedPosition: currentSeed++ },
        seed2: { ...finalOrderedSeeds[i + 1], seedPosition: currentSeed++ }
      });
    }
    } // End of else block

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);

    // Find max playDay from existing group stage matches so playoffs continue sequentially
    const lastGroupMatch = await prisma.match.findFirst({
      where: { tournamentId, bracketType: BracketType.GROUP_STAGE },
      orderBy: { playDay: "desc" }
    });
    const basePlayDay = (lastGroupMatch?.playDay ?? 0) + 1;

    const createdMatches: any[] = [];
    let totalMatches = 0;

    await prisma.$transaction(async (tx) => {
      // Clean up any existing bracket matches
      await tx.match.deleteMany({
        where: { 
          tournamentId, 
          bracketType: { in: [BracketType.WINNER_BRACKET, BracketType.GRAND_FINAL] }
        }
      });

      // Create Round 1
      for (let i = 0; i < matchups.length; i++) {
        const m = matchups[i];
        const hasBye = !m.seed1.teamId || !m.seed2.teamId;
        const realTeam = m.seed1.teamId ? m.seed1 : m.seed2;
        const otherTeam = m.seed1.teamId ? m.seed2 : m.seed1;

        const match = await tx.match.create({
          data: {
            tournamentId,
            teamAId: realTeam.teamId,
            teamBId: hasBye ? null : otherTeam.teamId,
            status: hasBye ? MatchStatus.COMPLETED : MatchStatus.UPCOMING,
            winnerId: hasBye ? realTeam.teamId : null,
            scoreA: hasBye ? (tournament.defaultBestOf || 3) : 0,
            bracketType: BracketType.WINNER_BRACKET,
            stage: hasBye ? `Round 1 (Bye)` : `Round 1: #${m.seed1.seedPosition} vs #${m.seed2.seedPosition}`,
            bracketPosition: i + 1,
            round: 0,
            playDay: basePlayDay,
            scheduledTime: new Date(tomorrow.getTime() + (i * 2 * 60 * 60 * 1000)),
            bestOf: tournament.defaultBestOf || 3,
          }
        });
        createdMatches.push(match);
      }

      totalMatches += createdMatches.length;

      // Only generate Round 1. Progressive rounds (like Grand Finals) should not be created
      // with placeholder teams until the winners are actually determined.
      
      // Update tournament phase
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { phase: "PLAYOFFS" }
      });
    });

    return NextResponse.json({
      success: true,
      message: `Successfully advanced to Playoffs. Created full bracket of ${totalMatches} matches (including byes).`,
      matches: createdMatches.length
    });

  } catch (error) {
    console.error("Advance to Playoffs Error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to advance tournament" 
    }, { status: 500 });
  }
}
